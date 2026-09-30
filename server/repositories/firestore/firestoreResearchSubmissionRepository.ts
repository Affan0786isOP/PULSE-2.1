import type { Firestore } from 'firebase-admin/firestore';
import type { IResearchSubmissionRepository } from '../interfaces/IResearchSubmissionRepository';
import type { ResearchSubmissionTxInput, ResearchSubmissionTxResult } from '../../models/submissionModels';
import type { ExperimentSessionRecord } from '../../models/sessionModels';
import { normalizeAssessmentType } from '../../engines/assessmentTypes';
import { SessionAlreadyConsumedError } from '../../models/replayContracts';

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

    await db.runTransaction(async (tx) => {
      const sessionSnap = await tx.get(sessionDocRef);
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

      // Write canonical publicDataset document with shared docId
      tx.set(publicDatasetDocRef, input.publicDatasetDoc);

      // Write canonical assessmentResults document with shared docId
      tx.set(assessmentResultDocRef, {
        sessionId: input.sessionId,
        participantId: input.userId,
        assessmentType: input.assessmentType,
        ageGroup: input.ageGroup,
        assessmentVersion: 'v1.0.0',
        protocolVersion: 'v1.0.0',
        datasetSchemaVersion: 'v1.0.0',
        metricsVersion: 'v1.0.0',
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
