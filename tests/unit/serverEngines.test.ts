import { describe, it, expect, beforeAll } from 'vitest';
import { normalizeAssessmentType } from '../../server/engines/assessmentTypes';
import { CANONICAL_ASSESSMENT_IDS, getAssessmentVersionMetadata } from '../../shared/contracts/common';
import { seedPRNG } from '../../server/engines/prng';
import { deriveForeperiodCategory, generateVrtForeperiod, deriveVisualReactionMetrics } from '../../server/engines/reactionCalculator';
import { deriveDirectionMetrics } from '../../server/engines/flankerCalculator';
import { validateAndDeriveAssessmentFromTrials, ASSESSMENT_TRIAL_LIMITS } from '../../server/engines/assessmentEngine';
import {
  signProvenancePayload,
  safeCompareHex,
  computeCanonicalTrialsDigest,
} from '../../server/services/provenanceService';
import { isValidLeaderboardScoreMetric } from '../../shared/domain/leaderboardEligibility';
import { isOptedInLeaderboardUser } from '../../shared/domain/leaderboardEligibility';
import { getIdempotency, setIdempotency, isValidIdempotencyKey } from '../../server/services/idempotencyService';
import { parseCookies, isTruthyRoutingFlag, isMobileUserAgent } from '../../server/middleware/deviceRouting';

beforeAll(() => {
  process.env.PULSE_PROVENANCE_SECRET = 'unit-test-secret';
});

describe('assessment type normalisation', () => {
  it('maps legacy aliases to canonical protocol ids', () => {
    expect(normalizeAssessmentType('Reaction_Test')).toBe('visual-reaction');
    expect(normalizeAssessmentType('direction-reflex')).toBe('direction');
    expect(normalizeAssessmentType('colour recognition')).toBe('color-recognition');
    expect(normalizeAssessmentType('block')).toBe('block-memory');
    expect(normalizeAssessmentType('number')).toBe('number-memory');
  });
});

describe('deterministic server PRNG & foreperiods', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const a = seedPRNG('s1'), b = seedPRNG('s1'), c = seedPRNG('s2');
    const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual([c(), c(), c()]);
  });

  it('categorises foreperiods at the 500/501ms boundary and rejects out-of-range values', () => {
    expect(deriveForeperiodCategory(100)).toBe('SHORT');
    expect(deriveForeperiodCategory(500)).toBe('SHORT');
    expect(deriveForeperiodCategory(501)).toBe('LONG');
    expect(deriveForeperiodCategory(3000)).toBe('LONG');
    expect(deriveForeperiodCategory(99)).toBeNull();
    expect(deriveForeperiodCategory(3001)).toBeNull();
    expect(deriveForeperiodCategory(250.5)).toBeNull();
    expect(deriveForeperiodCategory(null)).toBeNull();
  });

  it('generates in-range foreperiods with a consistent category', () => {
    const prng = seedPRNG('vrt-seed');
    for (let i = 0; i < 200; i++) {
      const { foreperiodMs, foreperiodCategory } = generateVrtForeperiod(prng);
      expect(foreperiodMs).toBeGreaterThanOrEqual(100);
      expect(foreperiodMs).toBeLessThanOrEqual(3000);
      expect(deriveForeperiodCategory(foreperiodMs)).toBe(foreperiodCategory);
    }
  });
});

describe('canonical assessment version metadata', () => {
  it('versions only the raw-latency assessment protocols at v1.1.0', () => {
    for (const assessmentType of CANONICAL_ASSESSMENT_IDS) {
      const metadata = getAssessmentVersionMetadata(assessmentType);
      const rawLatencyAssessment = ['visual-reaction', 'direction', 'color-recognition'].includes(assessmentType);
      expect(metadata).toEqual({
        assessmentVersion: 'v1.0.0',
        protocolVersion: rawLatencyAssessment ? 'v1.1.0' : 'v1.0.0',
        datasetSchemaVersion: 'v1.0.0',
        metricsVersion: rawLatencyAssessment ? 'v1.1.0' : 'v1.0.0',
      });
    }

    expect(() => getAssessmentVersionMetadata('unknown-assessment')).toThrow(/Unsupported canonical assessment type/);
  });
});

describe('provenance service (HMAC-SHA256)', () => {
  it('signs deterministically and verifies in constant time', () => {
    const sig = signProvenancePayload('payload');
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(safeCompareHex(sig, signProvenancePayload('payload'))).toBe(true);
    expect(safeCompareHex(sig, signProvenancePayload('payload2'))).toBe(false);
    expect(safeCompareHex(sig, '')).toBe(false);
  });

  it('throws when no secret is configured', () => {
    const prev = { p: process.env.PULSE_PROVENANCE_SECRET, s: process.env.SESSION_SECRET };
    delete process.env.PULSE_PROVENANCE_SECRET; delete process.env.SESSION_SECRET;
    expect(() => signProvenancePayload('x')).toThrow(/PULSE_PROVENANCE_SECRET/);
    process.env.PULSE_PROVENANCE_SECRET = prev.p;
    if (prev.s !== undefined) process.env.SESSION_SECRET = prev.s;
  });

  it('produces a stable trials digest that changes when a trial changes', () => {
    const trials = [{ trialNumber: 1, reactionTime: 250 }, { trialNumber: 2, reactionTime: 300 }];
    const d1 = computeCanonicalTrialsDigest(trials);
    expect(d1).toBe(computeCanonicalTrialsDigest(JSON.parse(JSON.stringify(trials))));
    expect(computeCanonicalTrialsDigest([{ trialNumber: 1, reactionTime: 250 }, { trialNumber: 2, reactionTime: 301 }])).not.toBe(d1);
  });

  it('preserves a fixed historical digest for numeric display-offset metadata', () => {
    const historicalTrials = [{
      trialNumber: 1,
      reactionTime: 250,
      rawReactionTime: 241.67,
      displayDelayOffsetMs: 8.33,
      displayDelayOffsetEstimated: true,
      displayDelayOffsetSource: 'measured',
      test: 'visual-reaction',
      valid: true,
    }];

    // Fixed golden SHA-256 generated from the pre-v1.1.0 canonical normalization.
    expect(computeCanonicalTrialsDigest(historicalTrials))
      .toBe('394a4998ade0ad3314d803e6e767695a2d3fc91c770afd63a44a482a614b54ca');
  });

  it('produces deterministic digests for new null-offset trials without rewriting historical values', () => {
    const newTrials = [{
      trialNumber: 1,
      reactionTime: 250,
      rawReactionTime: 250,
      displayDelayOffsetMs: null,
      displayDelayOffsetEstimated: null,
      displayDelayOffsetSource: null,
      test: 'visual-reaction',
      valid: true,
    }];
    const first = computeCanonicalTrialsDigest(newTrials);
    expect(first).toBe(computeCanonicalTrialsDigest(JSON.parse(JSON.stringify(newTrials))));
    expect(first).not.toBe(computeCanonicalTrialsDigest([{
      trialNumber: 1,
      reactionTime: 250,
      rawReactionTime: 241.67,
      displayDelayOffsetMs: 8.33,
      displayDelayOffsetEstimated: true,
      displayDelayOffsetSource: 'measured',
      test: 'visual-reaction',
      valid: true,
    }]));
  });
});

describe('assessment engine (server-side derivation, no HTTP)', () => {
  const now = Date.now();
  const session = { sessionId: 'S-unit', createdAt: now - 1000, expiresAt: now + 900000 };

  function numberMemoryTrials(pattern: boolean[]) {
    const out: any[] = []; let level = 1; const attempts: Record<number, number> = {};
    pattern.forEach((correct, i) => {
      const seqLen = level + 2; attempts[level] = attempts[level] || 0;
      const prng = seedPRNG(`${session.sessionId}-number-${level}-${attempts[level]++}`);
      let seq = ''; for (let k = 0; k < seqLen; k++) seq += Math.floor(prng() * 10).toString();
      const wrong = seq.split('').reverse().join('');
      out.push({
        trialNumber: i + 1, trialIndex: i + 1, level, generatedSequence: seq,
        playerSequence: correct ? seq : (wrong === seq ? seq + '9' : wrong),
        stimulusTimestamp: now + i * 5000, responseTimestamp: now + i * 5000 + 700, reactionTime: 700,
      });
      if (correct) level++;
    });
    return out;
  }

  it('rejects empty, oversized and non-array trial sequences', () => {
    expect(validateAndDeriveAssessmentFromTrials('number-memory', 'Adults (26–40)', [], session).success).toBe(false);
    expect(validateAndDeriveAssessmentFromTrials('number-memory', 'Adults (26–40)', new Array(106).fill({}), session).success).toBe(false);
    expect(validateAndDeriveAssessmentFromTrials('number-memory', 'Adults (26–40)', 'x' as any, session).success).toBe(false);
  });

  it('enforces assessment-specific trial limits (BUG-06)', () => {
    expect(ASSESSMENT_TRIAL_LIMITS['visual-reaction']).toBe(30);
    expect(ASSESSMENT_TRIAL_LIMITS['direction']).toBe(30);
    expect(ASSESSMENT_TRIAL_LIMITS['color-recognition']).toBe(40);
    expect(ASSESSMENT_TRIAL_LIMITS['block-memory']).toBe(105);
    expect(ASSESSMENT_TRIAL_LIMITS['number-memory']).toBe(105);

    expect(validateAndDeriveAssessmentFromTrials('visual-reaction', 'Adults (26–40)', new Array(31).fill({}), session).success).toBe(false);
    expect(validateAndDeriveAssessmentFromTrials('direction', 'Adults (26–40)', new Array(31).fill({}), session).success).toBe(false);
    expect(validateAndDeriveAssessmentFromTrials('color-recognition', 'Adults (26–40)', new Array(41).fill({}), session).success).toBe(false);
  });

  it('rejects unsupported assessment types', () => {
    const r = validateAndDeriveAssessmentFromTrials('bogus', 'Adults (26–40)', numberMemoryTrials([true]), session);
    expect(r).toEqual({ success: false, error: 'Unsupported assessmentType' });
  });

  it('derives number-memory metrics from server-generated sequences', () => {
    const r = validateAndDeriveAssessmentFromTrials('number-memory', 'Adults (26–40)', numberMemoryTrials([true, true, true]), session);
    expect(r.success).toBe(true);
    expect(r.derivedMetrics?.highestLevel).toBe(3);
    expect(r.derivedMetrics?.totalCorrect).toBe(3);
  });

  it('ends the run on the third failure and rejects trials submitted after it', () => {
    const ok = validateAndDeriveAssessmentFromTrials('number-memory', 'Adults (26–40)', numberMemoryTrials([true, false, false, false]), session);
    expect(ok.success).toBe(true);
    const tooMany = validateAndDeriveAssessmentFromTrials('number-memory', 'Adults (26–40)', numberMemoryTrials([false, false, false, true]), session);
    expect(tooMany.success).toBe(false);
  });

  it('rejects a tampered generatedSequence', () => {
    const trials = numberMemoryTrials([true]);
    trials[0].generatedSequence = '000';
    expect(validateAndDeriveAssessmentFromTrials('number-memory', 'Adults (26–40)', trials, session).success).toBe(false);
  });

  it('counts false starts across entire raw observation array in visual reaction (BUG-07)', () => {
    const sessionId = 'vrt-fs-test';
    const trials: any[] = [];
    const baseTime = 1700000000000;

    // Trial 1 Attempt 1: False start (pre-stimulus trigger)
    const fp1a1 = generateVrtForeperiod(seedPRNG(`${sessionId}-reaction-delays-t1-a1`));
    trials.push({
      trialNumber: 1,
      attemptNumber: 1,
      stimulusTimestamp: baseTime + 1000,
      responseTimestamp: baseTime + 500, // response before stimulus!
      reactionTime: 0,
      foreperiodMs: fp1a1.foreperiodMs,
      foreperiodCategory: fp1a1.foreperiodCategory
    });

    // Trial 1 Attempt 2: Valid reaction
    const fp1a2 = generateVrtForeperiod(seedPRNG(`${sessionId}-reaction-delays-t1-a2`));
    trials.push({
      trialNumber: 1,
      attemptNumber: 2,
      stimulusTimestamp: baseTime + 2000,
      responseTimestamp: baseTime + 2250,
      reactionTime: 250,
      foreperiodMs: fp1a2.foreperiodMs,
      foreperiodCategory: fp1a2.foreperiodCategory
    });

    // Trials 2 to 10: Valid reactions
    for (let i = 2; i <= 10; i++) {
      const fp = generateVrtForeperiod(seedPRNG(`${sessionId}-reaction-delays-t${i}-a1`));
      trials.push({
        trialNumber: i,
        attemptNumber: 1,
        stimulusTimestamp: baseTime + i * 2000,
        responseTimestamp: baseTime + i * 2000 + 240,
        reactionTime: 240,
        foreperiodMs: fp.foreperiodMs,
        foreperiodCategory: fp.foreperiodCategory
      });
    }

    const res = deriveVisualReactionMetrics({
      trials,
      ageGroup: 'Adults (26–40)',
      sessionId,
      session: { sessionId }
    });

    expect(res.success).toBe(true);
    expect(res.derivedMetrics?.totalFalseStarts).toBe(1);
  });

  it('deduplicates direction trials by logical position so retry spam cannot inflate accuracy (BUG-08)', () => {
    const sessionId = 'flanker-dedupe-test';
    const trials: any[] = [];
    const DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

    // Trial 1 Attempt 1: Correct
    const prng1a1 = seedPRNG(`${sessionId}-direction-0-a1`);
    prng1a1(); // windowDelay
    const expectedDir1 = DIRECTIONS[Math.floor(prng1a1() * DIRECTIONS.length)];
    trials.push({
      trialNumber: 1,
      attemptNumber: 1,
      targetDirection: expectedDir1,
      userResponse: expectedDir1,
      reactionTime: 350,
      stimulusTimestamp: 1000,
      responseTimestamp: 1350
    });

    // Trial 1 Attempt 2: Retry spam with correct response
    const prng1a2 = seedPRNG(`${sessionId}-direction-0-a2`);
    prng1a2();
    const expectedDir1a2 = DIRECTIONS[Math.floor(prng1a2() * DIRECTIONS.length)];
    trials.push({
      trialNumber: 1,
      attemptNumber: 2,
      targetDirection: expectedDir1a2,
      userResponse: expectedDir1a2,
      reactionTime: 320,
      stimulusTimestamp: 2000,
      responseTimestamp: 2320
    });

    // Trials 2 to 10: Correct responses
    for (let i = 2; i <= 10; i++) {
      const logicalIdx = i - 1;
      const prng = seedPRNG(`${sessionId}-direction-${logicalIdx}-a1`);
      prng();
      const expectedDir = DIRECTIONS[Math.floor(prng() * DIRECTIONS.length)];
      trials.push({
        trialNumber: i,
        attemptNumber: 1,
        targetDirection: expectedDir,
        userResponse: expectedDir,
        reactionTime: 300,
        stimulusTimestamp: i * 2000,
        responseTimestamp: i * 2000 + 300
      });
    }

    const res = deriveDirectionMetrics({
      trials,
      ageGroup: 'Adults (26–40)',
      sessionId,
      session: { sessionId }
    });

    expect(res.success).toBe(true);
    // Accuracy should be exactly 100%, totalCorrect must be 10 (not 11!)
    expect(res.derivedMetrics?.accuracy).toBe(100);
    expect(res.derivedMetrics?.totalCorrect).toBe(10);
  });
});

describe('leaderboard rules', () => {
  it('only lists opted-in display names', () => {
    expect(isOptedInLeaderboardUser('Alice')).toBe(true);
    for (const n of ['', 'anonymous', 'Guest', 'unknown', 'Participant 42', null, undefined]) {
      expect(isOptedInLeaderboardUser(n as any)).toBe(false);
    }
  });
  it('rejects non-numeric score metrics', () => {
    expect(isValidLeaderboardScoreMetric('visual-reaction', 'fast')).toBe(false);
    expect(isValidLeaderboardScoreMetric('visual-reaction', NaN)).toBe(false);
  });
});

describe('idempotency store', () => {
  it('returns cached results, expires them, and validates keys', async () => {
    setIdempotency('k1', { ok: true });
    expect(getIdempotency('k1')).toEqual({ ok: true });
    setIdempotency('k2', { ok: true }, -1);
    expect(getIdempotency('k2')).toBeNull();
    expect(getIdempotency('missing')).toBeNull();
    expect(isValidIdempotencyKey('abc')).toBe(true);
    expect(isValidIdempotencyKey('')).toBe(false);
    expect(isValidIdempotencyKey('x'.repeat(129))).toBe(false);
    expect(isValidIdempotencyKey(5)).toBe(false);
  });
});

describe('device routing helpers', () => {
  it('parses cookies incl. malformed encodings', () => {
    expect(parseCookies('a=1; b=hello%20world; c=%E0%A4%A')).toEqual({ a: '1', b: 'hello world', c: '%E0%A4%A' });
    expect(parseCookies(undefined)).toEqual({});
  });
  it('interprets routing flags', () => {
    expect(isTruthyRoutingFlag('1')).toBe(true);
    expect(isTruthyRoutingFlag('TRUE')).toBe(true);
    expect(isTruthyRoutingFlag('0')).toBe(false);
    expect(isTruthyRoutingFlag(undefined)).toBe(false);
  });
  it('detects mobile user agents and Client Hints', () => {
    const req = (h: Record<string, string>) => ({ headers: h }) as any;
    expect(isMobileUserAgent(req({ 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' }))).toBe(true);
    expect(isMobileUserAgent(req({ 'sec-ch-ua-mobile': '?1' }))).toBe(true);
    expect(isMobileUserAgent(req({ 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }))).toBe(false);
    expect(isMobileUserAgent(req({}))).toBe(false);
  });
});
