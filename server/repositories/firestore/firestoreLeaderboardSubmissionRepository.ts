import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { ILeaderboardSubmissionRepository } from '../interfaces/ILeaderboardSubmissionRepository';
import type { LeaderboardSubmissionTxInput, LeaderboardSubmissionTxResult } from '../../models/leaderboardModels';

export class FirestoreLeaderboardSubmissionRepository implements ILeaderboardSubmissionRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  async executeLeaderboardSubmission(input: LeaderboardSubmissionTxInput): Promise<LeaderboardSubmissionTxResult> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const sessionDocRef = db.collection('experimentSessions').doc(input.activeSessionId);
    const leaderboardDocRef = db.collection('leaderboardResults').doc(input.leaderboardDocId);

    const leaderboardDoc = {
      displayName: input.displayName,
      assessmentType: input.assessmentType,
      scoreMetric: input.scoreMetric,
      ageGroup: input.authoritativeAgeGroup,
      provenanceToken: input.provenanceToken,
      hidden: false,
      createdAt: FieldValue.serverTimestamp()
    };

    await db.runTransaction(async (tx) => {
      tx.set(leaderboardDocRef, leaderboardDoc);
      tx.set(sessionDocRef, {
        leaderboardSubmitted: true,
        leaderboardDocId: input.leaderboardDocId,
        leaderboardSubmittedAt: input.now,
        scoreMetric: input.scoreMetric,
        trialsDigest: input.trialsDigest || '',
        provenanceToken: input.provenanceToken,
        derivedMetrics: input.metrics
      }, { merge: true });
    });

    return {
      success: true,
      docId: input.leaderboardDocId,
      scoreMetric: input.scoreMetric,
      provenanceToken: input.provenanceToken,
      trialsDigest: input.trialsDigest,
      derivedMetrics: input.metrics
    };
  }
}
