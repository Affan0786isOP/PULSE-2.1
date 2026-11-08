import type { Firestore } from 'firebase-admin/firestore';
import type { IResearchSubmissionRepository } from '../interfaces/IResearchSubmissionRepository';
import type { ResearchSubmissionTxInput, ResearchSubmissionTxResult } from '../../models/submissionModels';
import type { ExperimentSessionRecord } from '../../models/sessionModels';
import { normalizeAssessmentType } from '../../engines/assessmentTypes';
import { SessionAlreadyConsumedError } from '../../models/replayContracts';
import { getAssessmentVersionMetadata } from '../../../shared/contracts/common';
import { normalizeLeaderboardAssessmentType } from '../../../shared/domain/leaderboardEligibility';

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export class FirestoreResearchSubmissionRepository implements IResearchSubmissionRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  async executeSubmissionTransaction(input: ResearchSubmissionTxInput): Promise<ResearchSubmissionTxResult> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const sessionDocRef = db.collection('experimentSessions').doc(input.sessionId);
    const publicDatasetDocRef = db.collection('publicDataset').doc(input.docId);
    const assessmentResultDocRef = db.collection('assessmentResults').doc(input.docId);
    const summaryDocRef = db.collection('publicDatasetMeta').doc('summary');
    const versionMetadata = getAssessmentVersionMetadata(input.assessmentType);
    const canonicalAssessmentType = normalizeLeaderboardAssessmentType(input.assessmentType);
    if (!canonicalAssessmentType) throw new Error('INVALID_ASSESSMENT_TYPE');

    const rawProgressionTrials = input.publicDatasetDoc.progressionTrials;
    const summaryTrialCount = Array.isArray(rawProgressionTrials)
      ? rawProgressionTrials.length
      : (isSafeNonNegativeInteger(input.publicDatasetDoc.totalTrials) ? input.publicDatasetDoc.totalTrials : 0);

    await db.runTransaction(async (tx) => {
      // Read every document before the first transaction write.
      const sessionSnap = await tx.get(sessionDocRef);
      const summarySnap = await tx.get(summaryDocRef);
      if (!sessionSnap.exists) {
        throw new Error('SESSION_NOT_FOUND');
      }
      const sData = sessionSnap.data() as ExperimentSessionRecord;
      if (sData.uid !== input.userId) {
        throw new Error('SESSION_UID_MISMATCH');
      }
      if (normalizeAssessmentType(sData.assessmentType) !== normalizeAssessmentType(input.assessmentType)) {
        throw new Error('SESSION_TYPE_MISMATCH');
      }
      if (Date.now() > sData.expiresAt + 60000) {
        throw new Error('SESSION_EXPIRED');
      }
      if (sData.consumed) {
        throw new SessionAlreadyConsumedError(sData);
      }

      // A backfill locks this document before scanning publicDataset. Firestore
      // retries a concurrent transaction that read the old lock state, ensuring
      // the backfill either includes the committed record or blocks the submit.
      if (summarySnap.exists) {
        const summary = summarySnap.data() as Record<string, unknown>;
        const isLockExpired = typeof summary.migrationStartedAt === 'number' && (Date.now() - summary.migrationStartedAt) > 10 * 60 * 1000;
        if (summary.migrationInProgress === true && !isLockExpired) {
          throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
        }

        const counts = summary.counts && typeof summary.counts === 'object'
          ? summary.counts as Record<string, unknown>
          : null;
        const totalRecords = summary.totalRecords;
        const totalTrials = summary.totalTrials;
        const currentCount = counts?.[canonicalAssessmentType];
        const canonicalTypes = [
          'visual-reaction',
          'direction',
          'color-recognition',
          'block-memory',
          'number-memory'
        ];
        if (
          summary.schemaVersion !== 1 ||
          !isSafeNonNegativeInteger(totalRecords) ||
          !isSafeNonNegativeInteger(totalTrials) ||
          !counts ||
          canonicalTypes.some(type => !isSafeNonNegativeInteger(counts[type])) ||
          !isSafeNonNegativeInteger(currentCount)
        ) {
          throw new Error('DATASET_SUMMARY_RECONCILIATION_REQUIRED');
        }

        tx.set(summaryDocRef, {
          schemaVersion: 1,
          totalRecords: totalRecords + 1,
          totalTrials: totalTrials + summaryTrialCount,
          counts: {
            ...counts,
            [canonicalAssessmentType]: currentCount + 1
          },
          lastUpdatedAt: input.completedAtTimestamp
        }, { merge: true });
      }

      // Write canonical publicDataset document with shared docId
      tx.set(publicDatasetDocRef, input.publicDatasetDoc);

      // Write canonical assessmentResults document with shared docId
      tx.set(assessmentResultDocRef, {
        sessionId: input.sessionId,
        participantId: input.userId,
        assessmentType: input.assessmentType,
        ageGroup: input.ageGroup,
        ...versionMetadata,
        derivedMetrics: input.derivedMetrics,
        temporalDynamics: input.derivedMetrics['temporalDynamics'] ?? null,
        scoreMetric: input.currentScore,
        isNewPersonalBest: input.isNewPersonalBest,
        completedAtTimestamp: input.completedAtTimestamp,
        completedAtMonth: input.completedAtMonth,
        provenanceToken: input.provenanceToken,
        trialsDigest: input.trialsDigest,
        createdAt: input.completedAtTimestamp
      });

      // Write canonical assessmentTrials documents
      for (const tp of input.trialPayloads) {
        const assessmentTrialRef = db.collection('assessmentTrials').doc(tp.id);
        tx.set(assessmentTrialRef, {
          ...tp.data,
          sessionId: input.sessionId
        });
      }

      // Mark session consumed
      tx.set(sessionDocRef, {
        sessionId: input.sessionId,
        uid: input.userId,
        assessmentType: input.assessmentType,
        ageGroup: input.ageGroup,
        createdAt: sData.createdAt || input.completedAtTimestamp,
        expiresAt: sData.expiresAt || (input.completedAtTimestamp + 15 * 60 * 1000),
        consumed: true,
        consumedAt: input.completedAtTimestamp,
        researchDocId: input.docId,
        derivedMetrics: input.derivedMetrics,
        scoreMetric: input.currentScore,
        isNewPersonalBest: input.isNewPersonalBest,
        previousPersonalBest: input.previousPersonalBest,
        personalBest: input.personalBest,
        provenanceToken: input.provenanceToken,
        trialsDigest: input.trialsDigest
      }, { merge: true });
    });

    return {
      success: true,
      docId: input.docId,
      sessionId: input.sessionId,
      completedAtTimestamp: input.completedAtTimestamp,
      completedAtMonth: input.completedAtMonth,
      provenanceToken: input.provenanceToken,
      trialsDigest: input.trialsDigest,
      derivedMetrics: input.derivedMetrics,
      scoreMetric: input.currentScore,
      isNewPersonalBest: input.isNewPersonalBest,
      previousPersonalBest: input.previousPersonalBest,
      personalBest: input.personalBest
    };
  }
}
