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
    // Private metadata uses the same document ID, but never lives in the publicly readable collection.
    const requestedPrivateMetaRef = db.collection('leaderboardPrivateMeta').doc(input.leaderboardDocId);
    const ownerIndexRef = db.collection('leaderboardOwnerIndex').doc(ownerIndexDocumentId(input.userId, input.assessmentType));

    // Only fields required to render a public ranking live in leaderboardResults.
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

    // This collection is covered by the default-deny Firestore rules. Owner IDs,
    // session identifiers, raw metrics/digests, idempotency keys and review flags
    // must not be placed on the publicly-readable leaderboardResults document.
    const privateMetaDoc = {
      ownerUid: input.userId,
      sessionId: input.activeSessionId,
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

      // Shared deterministic guard both serializes simultaneous first submissions
      // and blocks writes while an owner-initiated erasure is running.
      const ownerIndexSnap = await tx.get(ownerIndexRef);
      if (ownerIndexSnap.data()?.deleting === true) {
        throw new AppError('Participant leaderboard erasure is in progress. Please retry later.', 409);
      }

      const ownerMetaQuery = db.collection('leaderboardPrivateMeta').where('ownerUid', '==', input.userId);
      const ownerMetaSnap = await tx.get(ownerMetaQuery);
      const existingRows = ownerMetaSnap.docs
        .filter(doc => doc.id !== input.leaderboardDocId && doc.data().assessmentType === input.assessmentType)
        .sort((a, b) => {
          const aScore = Number(a.data().scoreMetric);
          const bScore = Number(b.data().scoreMetric);
          if (aScore === bScore) return a.id.localeCompare(b.id);
          return isSpeedAssessment(input.assessmentType) ? aScore - bScore : bScore - aScore;
        });

      const idempotencyMatch = input.idempotencyKey
        ? existingRows.find(doc => doc.data().idempotencyKey === input.idempotencyKey)
        : undefined;
      const bestExisting = idempotencyMatch || existingRows[0];

      let responseDocId = input.leaderboardDocId;
      let responsePendingReview = input.requiresModeration === true;

      if (!bestExisting) {
        tx.set(requestedLeaderboardDocRef, publicLeaderboardDoc);
        tx.set(requestedPrivateMetaRef, privateMetaDoc);
      } else {
        const existingData = bestExisting.data();
        const existingScore = Number(existingData.scoreMetric);
        if (
          !idempotencyMatch &&
          Number.isFinite(existingScore) &&
          isBetterScore(input.assessmentType, input.scoreMetric, existingScore)
        ) {
          const oldPublicRowRef = db.collection('leaderboardResults').doc(bestExisting.id);
          tx.delete(oldPublicRowRef);
          tx.delete(bestExisting.ref);

          responsePendingReview = existingData.hidden === true || input.requiresModeration === true;
          tx.set(requestedLeaderboardDocRef, {
            ...publicLeaderboardDoc,
            hidden: responsePendingReview
          });
          tx.set(requestedPrivateMetaRef, {
            ...privateMetaDoc,
            hidden: responsePendingReview,
            updatedAt: input.now
          });
          responseDocId = input.leaderboardDocId;
        } else {
          // Same idempotency key, worse score, or tie: retain the existing public-best
          // row, but keep the returned result bound to this submission attempt.
          // Its score, digest, token and metrics must never replace this session's
          // authoritative research result.
          responseDocId = bestExisting.id;
          responsePendingReview = existingData.hidden === true;
        }
      }

      tx.set(sessionDocRef, {
        leaderboardSubmitted: true,
        leaderboardDocId: responseDocId,
        leaderboardSubmittedAt: input.now,
        // Preserve the source research fields (scoreMetric, trialsDigest,
        // provenanceToken and derivedMetrics). Leaderboard data is namespaced
        // separately so opting in cannot corrupt the assessment result.
        leaderboardSubmissionId: input.leaderboardDocId,
        leaderboardSubmissionScoreMetric: input.scoreMetric,
        leaderboardSubmissionProvenanceToken: input.provenanceToken,
        leaderboardSubmissionTrialsDigest: input.trialsDigest || '',
        leaderboardSubmissionDerivedMetrics: input.metrics
      }, { merge: true });

      tx.set(ownerIndexRef, {
        ownerUid: input.userId,
        assessmentType: input.assessmentType,
        leaderboardDocId: responseDocId,
        updatedAt: input.now
      }, { merge: true });

      result = {
        success: true,
        // These fields describe the current submitted attempt, not the retained
        // public-best row from an earlier session.
        docId: input.leaderboardDocId,
        leaderboardDocId: responseDocId,
        scoreMetric: input.scoreMetric,
        provenanceToken: input.provenanceToken,
        trialsDigest: input.trialsDigest || '',
        derivedMetrics: input.metrics,
        pendingReview: responsePendingReview
      };
    });

    if (!result) throw new Error('LEADERBOARD_SUBMISSION_TRANSACTION_NO_RESULT');
    return result;
  }
}
