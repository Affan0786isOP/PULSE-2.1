import { normalizeAssessmentType } from '../engines/assessmentTypes';
import { VALID_ASSESSMENT_TYPES } from '../config/constants';
import {
  isValidLeaderboardScoreMetric,
  normalizeLeaderboardAccuracy
} from '../../shared/domain/leaderboardEligibility';
import { safeCompareHex, signProvenancePayload } from './provenanceService';
import type { ILeaderboardAccuracyBackfillRepository } from '../repositories/interfaces/ILeaderboardAccuracyBackfillRepository';
import type {
  LeaderboardAccuracyBackfillBatchInput,
  LeaderboardAccuracyBackfillBatchReport,
  LeaderboardAccuracyBackfillDecision,
  LeaderboardAccuracyBackfillLegacySessionCandidates
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

/** Pure validation logic for the public/private pair. */
function evaluateCandidateCore(
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

/**
 * Recover a candidate only when its immutable, server-owned session can reproduce
 * the exact leaderboard HMAC. A research provenance token is not a leaderboard token
 * and is deliberately never treated as one.
 */
function recoverVerifiedLegacyMetrics(
  publicRow: Record<string, unknown>,
  candidates?: LeaderboardAccuracyBackfillLegacySessionCandidates
): Record<string, unknown> | null {
  if (!candidates?.complete || !candidates.entryId || candidates.sessions.length === 0) return null;

  const entryId = candidates.entryId;
  const publicToken = typeof publicRow.provenanceToken === 'string' ? publicRow.provenanceToken : '';
  const publicType = normalizeAssessmentType(String(publicRow.assessmentType || ''));
  const publicAgeGroup = String(publicRow.ageGroup || '');
  const publicScore = typeof publicRow.scoreMetric === 'number' ? publicRow.scoreMetric : Number.NaN;
  const displayName = typeof publicRow.displayName === 'string' ? publicRow.displayName : '';
  if (
    !publicToken ||
    !publicType ||
    !validAssessmentType(publicType) ||
    !Number.isFinite(publicScore) ||
    !isValidLeaderboardScoreMetric(publicType, publicScore) ||
    !displayName ||
    !publicAgeGroup
  ) return null;

  const verified: Array<{ session: Record<string, unknown>; metrics: Record<string, unknown> }> = [];
  for (const session of candidates.sessions) {
    const linksToEntry =
      session.leaderboardSubmissionEntryId === entryId ||
      session.leaderboardDocId === entryId ||
      session.leaderboardSubmissionId === entryId;
    if (!linksToEntry || session.leaderboardSubmitted !== true) continue;

    const sessionType = normalizeAssessmentType(String(session.assessmentType || ''));
    if (!sessionType || sessionType !== publicType) continue;
    if (String(session.ageGroup || '') !== publicAgeGroup) continue;

    const sessionScore = typeof session.leaderboardSubmissionScoreMetric === 'number'
      ? session.leaderboardSubmissionScoreMetric
      : (typeof session.scoreMetric === 'number' ? session.scoreMetric : Number.NaN);
    if (!Number.isFinite(sessionScore) || sessionScore !== publicScore) continue;

    const metricsValue = session.leaderboardSubmissionDerivedMetrics ?? session.derivedMetrics;
    if (!metricsValue || typeof metricsValue !== 'object' || Array.isArray(metricsValue)) continue;
    if (normalizeLeaderboardAccuracy(metricsValue) === null) continue;

    const trialsDigestValue = session.leaderboardSubmissionTrialsDigest ?? session.trialsDigest;
    const trialsDigest = typeof trialsDigestValue === 'string' ? trialsDigestValue.trim() : '';
    if (!trialsDigest) continue;

    const storedLeaderboardToken = typeof session.leaderboardSubmissionProvenanceToken === 'string'
      ? session.leaderboardSubmissionProvenanceToken.trim()
      : '';
    // If the dedicated leaderboard token exists, it must agree with the public row.
    if (storedLeaderboardToken && !safeCompareHex(storedLeaderboardToken, publicToken)) continue;

    const tokenPayload = `lb:v2:${entryId}:${publicType}:${publicAgeGroup}:${publicScore.toFixed(2)}:${displayName.replace(/:/g, '_')}:${trialsDigest}`;
    try {
      const computedToken = signProvenancePayload(tokenPayload);
      if (!safeCompareHex(computedToken, publicToken)) continue;
    } catch {
      // Missing configuration or invalid signing setup means no verified recovery.
      continue;
    }

    verified.push({ session, metrics: metricsValue as Record<string, unknown> });
  }

  // A single cryptographically verified source is required. Ambiguous sessions remain skipped.
  if (verified.length !== 1) return null;
  const { session, metrics } = verified[0];
  return {
    publicEntry: true,
    submissionReceiptOnly: false,
    displayName,
    assessmentType: publicType,
    scoreMetric: publicScore,
    ageGroup: publicAgeGroup,
    provenanceToken: publicToken,
    hidden: publicRow.hidden === true,
    derivedMetrics: metrics
  };
}

/** Pure evaluator with an optional, bounded set of legacy session candidates. */
export function evaluateLeaderboardAccuracyBackfillCandidate(
  publicRow: Record<string, unknown> | null,
  metadata: Record<string, unknown> | null,
  legacySessions?: LeaderboardAccuracyBackfillLegacySessionCandidates
): LeaderboardAccuracyBackfillDecision {
  const decision = evaluateCandidateCore(publicRow, metadata);
  if (
    !publicRow ||
    decision.kind !== 'skip' ||
    (decision.reason !== 'missing-counterpart' && decision.reason !== 'no-valid-source-accuracy')
  ) {
    return decision;
  }

  const recoveredMetadata = recoverVerifiedLegacyMetrics(publicRow, legacySessions);
  if (!recoveredMetadata) return decision;
  return evaluateCandidateCore(publicRow, recoveredMetadata);
}

/** Business orchestration over the repository abstraction. Dry-run never writes. */
export class LeaderboardAccuracyBackfillService {
  constructor(private readonly repository: ILeaderboardAccuracyBackfillRepository) {}

  async runBatch(input: LeaderboardAccuracyBackfillBatchInput): Promise<LeaderboardAccuracyBackfillBatchReport> {
    const limit = Number.isInteger(input.limit)
      ? Math.max(1, Math.min(MAX_LEADERBOARD_ACCURACY_BACKFILL_BATCH_SIZE, input.limit))
      : DEFAULT_LEADERBOARD_ACCURACY_BACKFILL_BATCH_SIZE;

    const page = await this.repository.listPublicEntryIds(input.cursor, limit);
    if (input.mode === 'apply') {
      const expected = input.expectedEntryIds;
      const matchesPreview = Array.isArray(expected) && expected.length === page.ids.length &&
        expected.every((id, index) => id === page.ids[index]);
      if (!matchesPreview) {
        throw new Error('BACKFILL_BATCH_CHANGED');
      }
    }

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
      entryIds: page.ids,
      nextCursor: page.nextCursor,
      done: page.done
    };
  }
}
