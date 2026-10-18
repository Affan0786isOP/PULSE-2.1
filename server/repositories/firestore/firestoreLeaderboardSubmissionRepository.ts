import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import type { ILeaderboardSubmissionRepository } from '../interfaces/ILeaderboardSubmissionRepository';
import type { LeaderboardSubmissionTxInput, LeaderboardSubmissionTxResult } from '../../models/leaderboardModels';
import type { ExperimentSessionRecord } from '../../models/sessionModels';
import { AppError, LeaderboardAlreadySubmittedError } from '../../models/replayContracts';

function isSpeedAssessment(assessmentType: string): boolean {
  return assessmentType === 'visual-reaction' ||
    assessmentType === 'direction' ||
    assessmentType === 'color-recognition';
}

function isBetterScore(assessmentType: string, candidate: number, current: number): boolean {
  return isSpeedAssessment(assessmentType) ? candidate < current : candidate > current;
}

function ownerIndexDocumentId(userId: string, assessmentType: string): string {
  return crypto.createHash('sha256').update(`${userId}:${assessmentType}`).digest('hex');
}

export class FirestoreLeaderboardSubmissionRepository implements ILeaderboardSubmissionRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  async executeLeaderboardSubmission(input: LeaderboardSubmissionTxInput): Promise<LeaderboardSubmissionTxResult> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');

    const sessionDocRef = db.collection('experimentSessions').doc(input.activeSessionId);
    const requestedLeaderboardDocRef = db.collection('leaderboardResults').doc(input.leaderboardDocId);
    const requestedPrivateMetaRef = db.collection('leaderboardPrivateMeta').doc(input.leaderboardDocId);
    const ownerIndexRef = db.collection('leaderboardOwnerIndex').doc(ownerIndexDocumentId(input.userId, input.assessmentType));

    const publicLeaderboardDoc = {
      displayName: input.displayName,
      assessmentType: input.assessmentType,
      scoreMetric: input.scoreMetric,
      ageGroup: input.authoritativeAgeGroup,
      provenanceToken: input.provenanceToken,
      provenanceVersion: 2,
      hidden: input.requiresModeration === true,
      createdAt: FieldValue.serverTimestamp()
    };

    const privateMetaDoc = {
      ownerUid: input.userId,
      sessionId: input.activeSessionId,
      displayName: input.displayName,
      attestedDisplayName: input.displayName,
      assessmentType: input.assessmentType,
      scoreMetric: input.scoreMetric,
      ageGroup: input.authoritativeAgeGroup,
      provenanceToken: input.provenanceToken,
      provenanceVersion: 2,
      trialsDigest: input.trialsDigest || '',
      derivedMetrics: input.metrics,
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
      qualityFlags: input.qualityFlags || [],
      moderationReason: (input.qualityFlags || []).join(', '),
      hidden: input.requiresModeration === true,
      publicEntry: true,
      submissionReceiptOnly: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: input.now
    };

    let result: LeaderboardSubmissionTxResult | null = null;

    await db.runTransaction(async tx => {
      const sessionSnap = await tx.get(sessionDocRef);
      if (!sessionSnap.exists) throw new AppError('Experiment session not found', 404);

      const sData = sessionSnap.data() as ExperimentSessionRecord;
      if (sData.uid !== input.userId) {
        throw new AppError('Session UID mismatch with authenticated user', 403);
      }
      if (sData.leaderboardSubmitted) throw new LeaderboardAlreadySubmittedError(sData);

      // The owner index serializes submissions against participant erasure.
      const ownerIndexSnap = await tx.get(ownerIndexRef);
      if (ownerIndexSnap.data()?.deleting === true) {
        throw new AppError('Participant leaderboard erasure is in progress. Please retry later.', 409);
      }

      const ownerMetaQuery = db.collection('leaderboardPrivateMeta').where('ownerUid', '==', input.userId);
      const ownerMetaSnap = await tx.get(ownerMetaQuery);
      const ownedMetaDocs = ownerMetaSnap.docs.filter(doc =>
        doc.data().assessmentType === input.assessmentType
      );

      // Receipt-only records are retained for idempotent replay and provenance
      // verification, but never participate in best-score comparisons.
      const persistedRows = ownedMetaDocs.filter(doc => doc.data().publicEntry !== false);
      const publicSnapshots = await Promise.all(persistedRows.map(doc =>
        tx.get(db.collection('leaderboardResults').doc(doc.id))
      ));
      const ownedRows = persistedRows.map((doc, index) => ({
        id: doc.id,
        ref: doc.ref,
        meta: doc.data() as Record<string, unknown>,
        publicSnap: publicSnapshots[index],
        publicData: publicSnapshots[index].exists ? (publicSnapshots[index].data() || {}) as Record<string, unknown> : null
      })).filter(row => row.publicData !== null);

      const sortByScore = <T extends { id: string; meta: Record<string, unknown>; publicData: Record<string, unknown> | null }>(rows: T[]) => rows.sort((a, b) => {
        const aScore = Number(a.meta.scoreMetric ?? a.publicData?.scoreMetric);
        const bScore = Number(b.meta.scoreMetric ?? b.publicData?.scoreMetric);
        if (aScore === bScore) return a.id.localeCompare(b.id);
        return isSpeedAssessment(input.assessmentType) ? aScore - bScore : bScore - aScore;
      });

      const visibleRows = sortByScore(ownedRows.filter(row =>
        row.publicData?.hidden === false
      ));
      const currentVisibleBest = visibleRows[0] || null;

      const idempotencyMatch = input.idempotencyKey
        ? ownedMetaDocs
            .filter(doc => doc.data().idempotencyKey === input.idempotencyKey)
            .sort((a, b) => {
              const aTime = Number(a.data().updatedAt) || 0;
              const bTime = Number(b.data().updatedAt) || 0;
              return aTime - bTime || a.id.localeCompare(b.id);
            })[0]
        : undefined;

      let attemptId = input.leaderboardDocId;
      let scoreMetric = input.scoreMetric;
      let provenanceToken = input.provenanceToken;
      let trialsDigest = input.trialsDigest || '';
      let metrics = input.metrics;
      let responsePendingReview = input.requiresModeration === true;
      let responseDocId: string | null = currentVisibleBest?.id || null;

      if (idempotencyMatch) {
        // Reusing a key returns the original immutable attempt receipt rather
        // than inventing a second ID/token for a row that was never written.
        const prior = idempotencyMatch.data();
        attemptId = idempotencyMatch.id;
        scoreMetric = Number(prior.scoreMetric);
        provenanceToken = String(prior.provenanceToken || '');
        trialsDigest = String(prior.trialsDigest || '');
        metrics = (prior.derivedMetrics || {}) as Record<string, unknown>;
        responsePendingReview = prior.hidden === true;
      } else if (input.requiresModeration === true) {
        // Keep the approved best visible while a better-but-suspicious candidate
        // is pending review. Pending candidates remain in the admin queue.
        tx.set(requestedLeaderboardDocRef, publicLeaderboardDoc);
        tx.set(requestedPrivateMetaRef, privateMetaDoc);
      } else if (currentVisibleBest) {
        const existingScore = Number(currentVisibleBest.meta.scoreMetric ?? currentVisibleBest.publicData?.scoreMetric);
        if (Number.isFinite(existingScore) && isBetterScore(input.assessmentType, input.scoreMetric, existingScore)) {
          // Keep the old receipt privately so earlier session retries can be
          // resolved without returning a dead document ID. Remove duplicate
          // legacy visible rows too; migration will have already normalized them
          // in ordinary deployments, but this keeps writes self-healing.
          for (const oldRow of visibleRows) {
            tx.delete(db.collection('leaderboardResults').doc(oldRow.id));
            tx.set(oldRow.ref, {
              ...oldRow.meta,
              publicEntry: false,
              submissionReceiptOnly: true,
              supersededBy: input.leaderboardDocId,
              hidden: false,
              updatedAt: input.now
            }, { merge: true });
          }
          tx.set(requestedLeaderboardDocRef, { ...publicLeaderboardDoc, hidden: false });
          tx.set(requestedPrivateMetaRef, { ...privateMetaDoc, hidden: false });
          responseDocId = input.leaderboardDocId;
        } else {
          // Persist the attempt receipt privately, but do not pretend it is a
          // separate public leaderboard entry.
          tx.set(requestedPrivateMetaRef, {
            ...privateMetaDoc,
            publicEntry: false,
            submissionReceiptOnly: true,
            hidden: false,
            supersededBy: currentVisibleBest.id
          });
        }
      } else {
        // No approved visible best exists. A non-flagged candidate can be
        // published; any older pending records remain available for review.
        tx.set(requestedLeaderboardDocRef, { ...publicLeaderboardDoc, hidden: false });
        tx.set(requestedPrivateMetaRef, { ...privateMetaDoc, hidden: false });
        responseDocId = input.leaderboardDocId;
      }

      const leaderboardProvenanceToken = responseDocId
        ? (responseDocId === input.leaderboardDocId && !idempotencyMatch && input.requiresModeration !== true
          ? input.provenanceToken
          : String(
              ownedRows.find(row => row.id === responseDocId)?.publicData?.provenanceToken ||
              (idempotencyMatch?.id === responseDocId ? idempotencyMatch.data().provenanceToken : '') ||
              ''
            ))
        : null;

      tx.set(sessionDocRef, {
        leaderboardSubmitted: true,
        leaderboardDocId: responseDocId,
        leaderboardSubmittedAt: input.now,
        leaderboardSubmissionId: attemptId,
        leaderboardSubmissionEntryId: responseDocId,
        leaderboardSubmissionPendingReview: responsePendingReview,
        leaderboardSubmissionScoreMetric: scoreMetric,
        leaderboardSubmissionProvenanceToken: provenanceToken,
        leaderboardSubmissionTrialsDigest: trialsDigest,
        leaderboardSubmissionDerivedMetrics: metrics
      }, { merge: true });

      tx.set(ownerIndexRef, {
        ownerUid: input.userId,
        assessmentType: input.assessmentType,
        leaderboardDocId: responseDocId,
        updatedAt: input.now
      }, { merge: true });

      result = {
        success: true,
        docId: attemptId,
        attemptId,
        leaderboardDocId: responseDocId,
        leaderboardEntryId: responseDocId,
        entryAvailable: responseDocId !== null,
        receiptAvailable: true,
        scoreMetric,
        provenanceToken,
        attemptProvenanceToken: provenanceToken,
        leaderboardProvenanceToken,
        trialsDigest,
        derivedMetrics: metrics,
        pendingReview: responsePendingReview
      };
    });

    if (!result) throw new Error('LEADERBOARD_SUBMISSION_TRANSACTION_NO_RESULT');
    return result;
  }
}
