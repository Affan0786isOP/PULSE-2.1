import { FieldPath, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { normalizeAssessmentType } from '../engines/assessmentTypes';
import { VALID_ASSESSMENT_TYPES } from '../config/constants';
import { isValidLeaderboardScoreMetric, normalizeLeaderboardAccuracy } from '../../shared/domain/leaderboardEligibility';

export const MAX_LEADERBOARD_ACCURACY_BACKFILL_BATCH_SIZE = 25;
export const DEFAULT_LEADERBOARD_ACCURACY_BACKFILL_BATCH_SIZE = 10;

export type LeaderboardAccuracyBackfillMode = 'dry-run' | 'apply';

export interface LeaderboardAccuracyBackfillBatchInput {
  mode: LeaderboardAccuracyBackfillMode;
  cursor: string | null;
  limit: number;
}

export interface LeaderboardAccuracyBackfillBatchReport {
  success: true;
  mode: LeaderboardAccuracyBackfillMode;
  counts: {
    scanned: number;
    eligible: number;
    wouldUpdate: number;
    updated: number;
    alreadyCorrect: number;
    skipped: number;
    failed: number;
  };
  skipReasons: Record<string, number>;
  nextCursor: string | null;
  done: boolean;
}

type RowOutcome = { kind: 'skip'; reason: string } |
  { kind: 'alreadyCorrect' } |
  { kind: 'dryRun' } |
  { kind: 'updated' };

function skipped(reason: string): RowOutcome {
  return { kind: 'skip', reason };
}

function sameIfPresent(left: unknown, right: unknown): boolean {
  return left == null || right == null || left === right;
}

function validAccuracy(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function validAssessmentType(value: string): boolean {
  return VALID_ASSESSMENT_TYPES.includes(value as (typeof VALID_ASSESSMENT_TYPES)[number]);
}

async function processRow(
  db: Firestore,
  rowSnapshot: QueryDocumentSnapshot,
  mode: LeaderboardAccuracyBackfillMode
): Promise<RowOutcome> {
  try {
    return await db.runTransaction(async transaction => {
      const publicRef = rowSnapshot.ref;
      const privateRef = db.collection('leaderboardPrivateMeta').doc(rowSnapshot.id);
      const [publicSnapshot, privateSnapshot] = await Promise.all([
        transaction.get(publicRef),
        transaction.get(privateRef)
      ]);

      if (!publicSnapshot.exists || !privateSnapshot.exists) return skipped('missing-counterpart');

      const row = publicSnapshot.data() || {};
      const metadata = privateSnapshot.data() || {};

      if (metadata.publicEntry !== true || metadata.submissionReceiptOnly === true) {
        return skipped('not-an-active-public-entry');
      }

      const publicType = normalizeAssessmentType(String(row.assessmentType || ''));
      const privateType = normalizeAssessmentType(String(metadata.assessmentType || ''));
      if (!validAssessmentType(publicType) || publicType !== privateType || !validAssessmentType(privateType)) {
        return skipped('assessment-type-mismatch');
      }

      const publicScore = typeof row.scoreMetric === 'number' ? row.scoreMetric : Number.NaN;
      const privateScore = typeof metadata.scoreMetric === 'number' ? metadata.scoreMetric : Number.NaN;
      if (
        !Number.isFinite(publicScore) ||
        publicScore !== privateScore ||
        !isValidLeaderboardScoreMetric(publicType, publicScore)
      ) {
        return skipped('score-mismatch-or-invalid');
      }

      if (
        typeof row.provenanceToken !== 'string' ||
        !row.provenanceToken ||
        row.provenanceToken !== metadata.provenanceToken
      ) {
        return skipped('provenance-mismatch');
      }

      if (
        !sameIfPresent(row.displayName, metadata.displayName) ||
        !sameIfPresent(row.ageGroup, metadata.ageGroup) ||
        ((row.hidden === true) !== (metadata.hidden === true))
      ) {
        return skipped('public-private-field-mismatch');
      }

      const accuracy = normalizeLeaderboardAccuracy(metadata.derivedMetrics);
      if (accuracy === null) return skipped('no-valid-source-accuracy');

      // Never overwrite a non-null value, even if it is invalid. Conflicts require manual review.
      if (row.accuracy !== undefined && row.accuracy !== null) {
        if (validAccuracy(row.accuracy) && row.accuracy === accuracy) {
          return { kind: 'alreadyCorrect' };
        }
        return skipped(validAccuracy(row.accuracy) ? 'conflicting-existing-accuracy' : 'invalid-existing-accuracy');
      }

      if (mode === 'dry-run') return { kind: 'dryRun' };

      // Transaction reads above confirm this public document exists. update() cannot create it.
      // This is deliberately the only field modified by this migration.
      transaction.update(publicRef, { accuracy });
      return { kind: 'updated' };
    });
  } catch {
    return skipped('transaction-failed');
  }
}

/** Process one bounded batch. Dry-run mode performs no writes. */
export async function runLeaderboardAccuracyBackfillBatch(
  db: Firestore,
  input: LeaderboardAccuracyBackfillBatchInput
): Promise<LeaderboardAccuracyBackfillBatchReport> {
  const limit = Number.isInteger(input.limit)
    ? Math.max(1, Math.min(MAX_LEADERBOARD_ACCURACY_BACKFILL_BATCH_SIZE, input.limit))
    : DEFAULT_LEADERBOARD_ACCURACY_BACKFILL_BATCH_SIZE;

  const counts = {
    scanned: 0,
    eligible: 0,
    wouldUpdate: 0,
    updated: 0,
    alreadyCorrect: 0,
    skipped: 0,
    failed: 0
  };
  const skipReasons: Record<string, number> = {};

  let query = db.collection('leaderboardResults')
    .orderBy(FieldPath.documentId())
    .limit(limit);
  if (input.cursor) query = query.startAfter(input.cursor);

  const page = await query.get();
  for (const rowSnapshot of page.docs) {
    counts.scanned++;
    const outcome = await processRow(db, rowSnapshot, input.mode);

    if (outcome.kind === 'skip') {
      counts.skipped++;
      skipReasons[outcome.reason] = (skipReasons[outcome.reason] || 0) + 1;
      if (outcome.reason === 'transaction-failed') counts.failed++;
      continue;
    }

    counts.eligible++;
    if (outcome.kind === 'dryRun') counts.wouldUpdate++;
    if (outcome.kind === 'updated') counts.updated++;
    if (outcome.kind === 'alreadyCorrect') counts.alreadyCorrect++;
  }

  const done = page.size < limit;
  return {
    success: true,
    mode: input.mode,
    counts,
    skipReasons,
    nextCursor: done || page.docs.length === 0 ? null : page.docs[page.docs.length - 1].id,
    done
  };
}
