import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import type {
  LeaderboardAccuracyBackfillDecision,
  LeaderboardAccuracyBackfillMode,
  LeaderboardAccuracyBackfillPage,
  LeaderboardAccuracyBackfillRowResult,
  LeaderboardAccuracyBackfillLegacySessionCandidates
} from '../../models/leaderboardAccuracyBackfill';
import type { ILeaderboardAccuracyBackfillRepository } from '../interfaces/ILeaderboardAccuracyBackfillRepository';
import { normalizeAssessmentType } from '../../engines/assessmentTypes';

export class FirestoreLeaderboardAccuracyBackfillRepository implements ILeaderboardAccuracyBackfillRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  async listPublicEntryIds(cursor: string | null, limit: number): Promise<LeaderboardAccuracyBackfillPage> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');

    let query = db.collection('leaderboardResults')
      .orderBy(FieldPath.documentId())
      .limit(limit);
    if (cursor) query = query.startAfter(cursor);

    const page = await query.get();
    const ids = page.docs.map(doc => doc.id);
    const done = page.size < limit;
    return {
      ids,
      nextCursor: done || ids.length === 0 ? null : ids[ids.length - 1],
      done
    };
  }

  async processEntry(
    entryId: string,
    mode: LeaderboardAccuracyBackfillMode,
    evaluate: (
      publicData: Record<string, unknown> | null,
      privateData: Record<string, unknown> | null,
      legacySessions?: LeaderboardAccuracyBackfillLegacySessionCandidates
    ) => LeaderboardAccuracyBackfillDecision
  ): Promise<LeaderboardAccuracyBackfillRowResult> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');

    const publicRef = db.collection('leaderboardResults').doc(entryId);
    const privateRef = db.collection('leaderboardPrivateMeta').doc(entryId);

    return db.runTransaction(async transaction => {
      const [publicSnapshot, privateSnapshot] = await Promise.all([
        transaction.get(publicRef),
        transaction.get(privateRef)
      ]);
      const publicData = publicSnapshot.exists
        ? (publicSnapshot.data() || {}) as Record<string, unknown>
        : null;
      let privateData = privateSnapshot.exists
        ? (privateSnapshot.data() || {}) as Record<string, unknown>
        : null;
      let decision = evaluate(publicData, privateData);

      // Some legacy public entries predate leaderboardPrivateMeta or lack usable
      // accuracy metrics. Collect only sessions explicitly linked to this entry;
      // the service reconstructs and verifies the exact leaderboard HMAC.
      if (
        publicData &&
        decision.kind === 'skip' &&
        (decision.reason === 'missing-counterpart' || decision.reason === 'no-valid-source-accuracy')
      ) {
        const [linkedEntrySessions, legacyLinkedSessions, submissionIdSessions] = await Promise.all([
          transaction.get(db.collection('experimentSessions')
            .where('leaderboardSubmissionEntryId', '==', entryId)
            .limit(25)),
          transaction.get(db.collection('experimentSessions')
            .where('leaderboardDocId', '==', entryId)
            .limit(25)),
          transaction.get(db.collection('experimentSessions')
            .where('leaderboardSubmissionId', '==', entryId)
            .limit(25))
        ]);

        const sessionRows = new Map<string, Record<string, unknown>>();
        for (const snapshot of [linkedEntrySessions, legacyLinkedSessions, submissionIdSessions]) {
          for (const doc of snapshot.docs) {
            sessionRows.set(doc.id, (doc.data() || {}) as Record<string, unknown>);
          }
        }

        // Some historical leaderboard entries have no retained experiment session.
        // assessmentResults preserves the server-derived metrics and trial digest;
        // a match is accepted only if those fields reproduce the exact leaderboard HMAC.
        const researchType = normalizeAssessmentType(String(publicData.assessmentType || ''));
        const researchAgeGroup = String(publicData.ageGroup || '');
        const researchScore = typeof publicData.scoreMetric === 'number' ? publicData.scoreMetric : Number.NaN;
        const researchQuery = researchType && researchAgeGroup && Number.isFinite(researchScore)
          ? db.collection('assessmentResults')
              .where('assessmentType', '==', researchType)
              .where('ageGroup', '==', researchAgeGroup)
              .where('scoreMetric', '==', researchScore)
              .limit(100)
          : null;
        const researchSnapshot = researchQuery ? await transaction.get(researchQuery) : { docs: [], size: 0 };

        const candidates: LeaderboardAccuracyBackfillLegacySessionCandidates = {
          entryId,
          sessions: Array.from(sessionRows.values()),
          researchResults: researchSnapshot.docs.map((doc: { data(): unknown }) =>
            (doc.data() || {}) as Record<string, unknown>
          ),
          complete: linkedEntrySessions.size < 25 &&
            legacyLinkedSessions.size < 25 &&
            submissionIdSessions.size < 25 &&
            researchSnapshot.size < 100
        };
        decision = evaluate(publicData, privateData, candidates);
      }

      if (decision.kind === 'skip' || decision.kind === 'alreadyCorrect') return decision;
      if (mode === 'dry-run') return { kind: 'dryRun' };

      // The transaction has confirmed that the public document exists. update()
      // cannot create a missing document, and accuracy is the only modified field.
      if (!publicSnapshot.exists) return { kind: 'skip', reason: 'missing-counterpart' };
      transaction.update(publicRef, { accuracy: decision.accuracy });
      return { kind: 'updated' };
    });
  }
}
