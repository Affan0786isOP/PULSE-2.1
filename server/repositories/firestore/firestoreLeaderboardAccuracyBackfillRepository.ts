import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import type {
  LeaderboardAccuracyBackfillDecision,
  LeaderboardAccuracyBackfillMode,
  LeaderboardAccuracyBackfillPage,
  LeaderboardAccuracyBackfillRowResult
} from '../../models/leaderboardAccuracyBackfill';
import type { ILeaderboardAccuracyBackfillRepository } from '../interfaces/ILeaderboardAccuracyBackfillRepository';

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
      privateData: Record<string, unknown> | null
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
      const decision = evaluate(
        publicSnapshot.exists ? (publicSnapshot.data() || {}) as Record<string, unknown> : null,
        privateSnapshot.exists ? (privateSnapshot.data() || {}) as Record<string, unknown> : null
      );

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
