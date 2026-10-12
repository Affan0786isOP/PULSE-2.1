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

export class FirestoreLeaderboardSubmissionRepository implements ILeaderboardSubmissionRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  async executeLeaderboardSubmission(input: LeaderboardSubmissionTxInput): Promise<LeaderboardSubmissionTxResult> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const sessionDocRef = db.collection('experimentSessions').doc(input.activeSessionId);
    const requestedLeaderboardDocRef = db.collection('leaderboardResults').doc(input.leaderboardDocId);
    // This deterministic index doc serializes concurrent submissions from the
    // same participant and assessment, even when the owner has no row yet.
    const ownerIndexId = crypto.createHash('sha256')
      .update(`${input.userId}:${input.assessmentType}`)
      .digest('hex');
    const ownerIndexRef = db.collection('leaderboardOwnerIndex').doc(ownerIndexId);

    const requestedLeaderboardDoc = {
      displayName: input.displayName,
      assessmentType: input.assessmentType,
      scoreMetric: input.scoreMetric,
      ageGroup: input.authoritativeAgeGroup,
      provenanceToken: input.provenanceToken,
      provenanceVersion: 2,
      trialsDigest: input.trialsDigest || '',
      derivedMetrics: input.metrics,
      ownerUid: input.userId,
      sessionId: input.activeSessionId,
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
      qualityFlags: input.qualityFlags || [],
      moderationReason: (input.qualityFlags || []).join(', '),
      hidden: input.requiresModeration === true,
      createdAt: FieldValue.serverTimestamp()
    };

    let result: LeaderboardSubmissionTxResult | null = null;

    await db.runTransaction(async (tx) => {
      const sessionSnap = await tx.get(sessionDocRef);
      if (!sessionSnap.exists) {
        throw new AppError('Experiment session not found', 404);
      }

      const sData = sessionSnap.data() as ExperimentSessionRecord;
      if (sData.uid !== input.userId) {
        throw new AppError('Session UID mismatch with authenticated user', 403);
      }
      if (sData.leaderboardSubmitted) {
        throw new LeaderboardAlreadySubmittedError(sData);
      }

      // A transactional read makes concurrent first submissions for this same
      // participant/assessment conflict and retry, preventing duplicate rows.
      const ownerIndexSnap = await tx.get(ownerIndexRef);
      if (ownerIndexSnap.data()?.deleting === true) {
        throw new AppError('Participant leaderboard erasure is in progress. Please retry later.', 409);
      }

      // Query only the submitting user's rows. The owner field is private and is
      // deliberately excluded from the public LeaderboardEntryRecord/API shape.
      const ownerRows = await tx.get(
        db.collection('leaderboardResults').where('ownerUid', '==', input.userId)
      );
      const existingRows = ownerRows.docs
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
      let responseScore = input.scoreMetric;
      let responseToken = input.provenanceToken;
      let responseDigest = input.trialsDigest || '';
      let responseMetrics = input.metrics;
      let responsePendingReview = input.requiresModeration === true;

      if (!bestExisting) {
        tx.set(requestedLeaderboardDocRef, requestedLeaderboardDoc);
      } else {
        const existingData = bestExisting.data();
        const existingScore = Number(existingData.scoreMetric);
        if (
          !idempotencyMatch &&
          Number.isFinite(existingScore) &&
          isBetterScore(input.assessmentType, input.scoreMetric, existingScore)
        ) {
          // Replace the prior best under the new ID so provenance can bind to the exact row.
          tx.delete(bestExisting.ref);
          responsePendingReview = existingData.hidden === true || input.requiresModeration === true;
          tx.set(requestedLeaderboardDocRef, {
            ...requestedLeaderboardDoc,
            hidden: responsePendingReview
          });
          responseDocId = input.leaderboardDocId;
        } else {
          // Same idempotency key, a worse score, or a tie: return the existing row.
          responseDocId = bestExisting.id;
          responseScore = existingScore;
          responseToken = String(existingData.provenanceToken || '');
          responseDigest = String(existingData.trialsDigest || '');
          responseMetrics = (existingData.derivedMetrics && typeof existingData.derivedMetrics === 'object')
            ? existingData.derivedMetrics as Record<string, unknown>
            : {};
          responsePendingReview = existingData.hidden === true;
        }
      }

      tx.set(sessionDocRef, {
        leaderboardSubmitted: true,
        leaderboardDocId: responseDocId,
        leaderboardSubmittedAt: input.now,
        scoreMetric: responseScore,
        trialsDigest: responseDigest,
        provenanceToken: responseToken,
        derivedMetrics: responseMetrics
      }, { merge: true });
      tx.set(ownerIndexRef, {
        ownerUid: input.userId,
        assessmentType: input.assessmentType,
        leaderboardDocId: responseDocId,
        updatedAt: input.now
      }, { merge: true });

      result = {
        success: true,
        docId: responseDocId,
        scoreMetric: responseScore,
        provenanceToken: responseToken,
        trialsDigest: responseDigest,
        derivedMetrics: responseMetrics,
        pendingReview: responsePendingReview
      };
    });

    if (!result) throw new Error('LEADERBOARD_SUBMISSION_TRANSACTION_NO_RESULT');
    return result;
  }
}
