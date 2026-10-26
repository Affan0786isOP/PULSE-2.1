import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import type {
  LeaderboardAccuracyBackfillDecision,
  LeaderboardAccuracyBackfillMode,
  LeaderboardAccuracyBackfillPage,
  LeaderboardAccuracyBackfillRowResult
} from '../../models/leaderboardAccuracyBackfill';
import type { ILeaderboardAccuracyBackfillRepository } from '../interfaces/ILeaderboardAccuracyBackfillRepository';
import { normalizeLeaderboardAssessmentType } from '../../../shared/domain/leaderboardEligibility';

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
      const publicData = publicSnapshot.exists
        ? (publicSnapshot.data() || {}) as Record<string, unknown>
        : null;
      let privateData = privateSnapshot.exists
        ? (privateSnapshot.data() || {}) as Record<string, unknown>
        : null;
      let decision = evaluate(publicData, privateData);

      // Some legacy public entries predate leaderboardPrivateMeta. Before skipping,
      // look for a server-owned submission session that explicitly points to this row.
      // Accept its metrics only when the session's leaderboard attestation token,
      // assessment, age cohort, and available score all match the public record.
      if (
        publicData &&
        decision.kind === 'skip' &&
        (decision.reason === 'missing-counterpart' || decision.reason === 'no-valid-source-accuracy')
      ) {
        const [linkedEntrySessions, legacyLinkedSessions] = await Promise.all([
          transaction.get(db.collection('experimentSessions')
            .where('leaderboardSubmissionEntryId', '==', entryId)
            .limit(25)),
          transaction.get(db.collection('experimentSessions')
            .where('leaderboardDocId', '==', entryId)
            .limit(25))
        ]);

        const sessionRows = new Map<string, Record<string, unknown>>();
        for (const snapshot of [linkedEntrySessions, legacyLinkedSessions]) {
          for (const doc of snapshot.docs) {
            sessionRows.set(doc.id, (doc.data() || {}) as Record<string, unknown>);
          }
        }

        const publicToken = typeof publicData.provenanceToken === 'string' ? publicData.provenanceToken : '';
        const publicType = normalizeLeaderboardAssessmentType(publicData.assessmentType);
        const publicAgeGroup = String(publicData.ageGroup || '');
        const publicScore = typeof publicData.scoreMetric === 'number' ? publicData.scoreMetric : Number.NaN;
        const candidateSearchComplete = linkedEntrySessions.size < 25 && legacyLinkedSessions.size < 25;
        const matchedSessions = candidateSearchComplete
          ? Array.from(sessionRows.values()).filter(session => {
              const pointsToEntry =
                session.leaderboardSubmissionEntryId === entryId ||
                session.leaderboardDocId === entryId;
              const sessionToken = typeof session.leaderboardSubmissionProvenanceToken === 'string'
                ? session.leaderboardSubmissionProvenanceToken
                : '';
              const candidateScore = typeof session.leaderboardSubmissionScoreMetric === 'number'
                ? session.leaderboardSubmissionScoreMetric
                : (typeof session.scoreMetric === 'number' ? session.scoreMetric : null);
              const sessionMetrics = session.leaderboardSubmissionDerivedMetrics ?? session.derivedMetrics;
              return pointsToEntry &&
                session.leaderboardSubmitted === true &&
                publicToken.length > 0 &&
                sessionToken === publicToken &&
                publicType !== null &&
                normalizeLeaderboardAssessmentType(session.assessmentType) === publicType &&
                String(session.ageGroup || '') === publicAgeGroup &&
                (candidateScore === null || candidateScore === publicScore) &&
                !!sessionMetrics &&
                typeof sessionMetrics === 'object' &&
                !Array.isArray(sessionMetrics);
            })
          : [];

        // A unique exact match is required; ambiguous or truncated historical source searches stay skipped.
        if (matchedSessions.length === 1) {
          const sourceSession = matchedSessions[0];
          const sourceMetrics = sourceSession.leaderboardSubmissionDerivedMetrics ?? sourceSession.derivedMetrics;
          privateData = {
            ...(privateData || {}),
            publicEntry: true,
            submissionReceiptOnly: false,
            displayName: publicData.displayName,
            assessmentType: sourceSession.assessmentType,
            scoreMetric: publicScore,
            ageGroup: sourceSession.ageGroup,
            provenanceToken: sourceSession.leaderboardSubmissionProvenanceToken,
            hidden: publicData.hidden === true,
            derivedMetrics: sourceMetrics
          };
          decision = evaluate(publicData, privateData);
        }
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
