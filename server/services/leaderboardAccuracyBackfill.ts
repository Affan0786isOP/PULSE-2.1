import { normalizeAssessmentType } from '../engines/assessmentTypes';
import { VALID_ASSESSMENT_TYPES } from '../config/constants';
import {
  isValidLeaderboardScoreMetric,
  normalizeLeaderboardAccuracy
} from '../../shared/domain/leaderboardEligibility';
import type { ILeaderboardAccuracyBackfillRepository } from '../repositories/interfaces/ILeaderboardAccuracyBackfillRepository';
import type {
  LeaderboardAccuracyBackfillBatchInput,
  LeaderboardAccuracyBackfillBatchReport,
  LeaderboardAccuracyBackfillDecision
} from '../models/leaderboardAccuracyBackfill';

export const MAX_LEADERBOARD_ACCURACY_BACKFILL_BATCH_SIZE = 25;
export const DEFAULT_LEADERBOARD_ACCURACY_BACKFILL_BATCH_SIZE = 10;

function sameIfPresent(left: unknown, right: unknown): boolean {
  return left == null || right == null || left === right;
}

function validAccuracy(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function validAssessmentType(value: string): boolean {
  return VALID_ASSESSMENT_TYPES.includes(value as (typeof VALID_ASSESSMENT_TYPES)[number]);
}

/** Pure validation logic: no database access and no writes. */
export function evaluateLeaderboardAccuracyBackfillCandidate(
  publicRow: Record<string, unknown> | null,
  metadata: Record<string, unknown> | null
): LeaderboardAccuracyBackfillDecision {
  if (!publicRow || !metadata) return { kind: 'skip', reason: 'missing-counterpart' };

  if (metadata.publicEntry !== true || metadata.submissionReceiptOnly === true) {
    return { kind: 'skip', reason: 'not-an-active-public-entry' };
  }

  const publicType = normalizeAssessmentType(String(publicRow.assessmentType || ''));
  const privateType = normalizeAssessmentType(String(metadata.assessmentType || ''));
  if (!validAssessmentType(publicType) || publicType !== privateType || !validAssessmentType(privateType)) {
    return { kind: 'skip', reason: 'assessment-type-mismatch' };
  }

  const publicScore = typeof publicRow.scoreMetric === 'number' ? publicRow.scoreMetric : Number.NaN;
  const privateScore = typeof metadata.scoreMetric === 'number' ? metadata.scoreMetric : Number.NaN;
  if (
    !Number.isFinite(publicScore) ||
    publicScore !== privateScore ||
    !isValidLeaderboardScoreMetric(publicType, publicScore)
  ) {
    return { kind: 'skip', reason: 'score-mismatch-or-invalid' };
  }

  if (
    typeof publicRow.provenanceToken !== 'string' ||
    !publicRow.provenanceToken ||
    publicRow.provenanceToken !== metadata.provenanceToken
  ) {
    return { kind: 'skip', reason: 'provenance-mismatch' };
  }

  if (
    !sameIfPresent(publicRow.displayName, metadata.displayName) ||
    !sameIfPresent(publicRow.ageGroup, metadata.ageGroup) ||
    ((publicRow.hidden === true) !== (metadata.hidden === true))
  ) {
    return { kind: 'skip', reason: 'public-private-field-mismatch' };
  }

  const accuracy = normalizeLeaderboardAccuracy(metadata.derivedMetrics);
  if (accuracy === null) return { kind: 'skip', reason: 'no-valid-source-accuracy' };

  // Never overwrite a non-null value, even if invalid. Conflicts need manual review.
  if (publicRow.accuracy !== undefined && publicRow.accuracy !== null) {
    if (validAccuracy(publicRow.accuracy) && publicRow.accuracy === accuracy) {
      return { kind: 'alreadyCorrect' };
    }
    return {
      kind: 'skip',
      reason: validAccuracy(publicRow.accuracy) ? 'conflicting-existing-accuracy' : 'invalid-existing-accuracy'
    };
  }

  return { kind: 'wouldUpdate', accuracy };
}

/** Business orchestration over the repository abstraction. Dry-run never writes. */
export class LeaderboardAccuracyBackfillService {
  constructor(private readonly repository: ILeaderboardAccuracyBackfillRepository) {}

  async runBatch(input: LeaderboardAccuracyBackfillBatchInput): Promise<LeaderboardAccuracyBackfillBatchReport> {
    const limit = Number.isInteger(input.limit)
      ? Math.max(1, Math.min(MAX_LEADERBOARD_ACCURACY_BACKFILL_BATCH_SIZE, input.limit))
      : DEFAULT_LEADERBOARD_ACCURACY_BACKFILL_BATCH_SIZE;

    const page = await this.repository.listPublicEntryIds(input.cursor, limit);
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

    for (const entryId of page.ids) {
      counts.scanned++;
      try {
        const outcome = await this.repository.processEntry(
          entryId,
          input.mode,
          evaluateLeaderboardAccuracyBackfillCandidate
        );
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
      } catch {
        counts.failed++;
        counts.skipped++;
        skipReasons['transaction-failed'] = (skipReasons['transaction-failed'] || 0) + 1;
      }
    }

    return {
      success: true,
      mode: input.mode,
      counts,
      skipReasons,
      nextCursor: page.nextCursor,
      done: page.done
    };
  }
}
