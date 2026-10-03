import { describe, it, expect, beforeAll } from 'vitest';
import { normalizeAssessmentType } from '../../server/engines/assessmentTypes';
import { seedPRNG } from '../../server/engines/prng';
import { deriveForeperiodCategory, generateVrtForeperiod } from '../../server/engines/reactionCalculator';
import { validateAndDeriveAssessmentFromTrials } from '../../server/engines/assessmentEngine';
import {
  signProvenancePayload,
  safeCompareHex,
  computeCanonicalTrialsDigest,
} from '../../server/services/provenanceService';
import { isValidLeaderboardScoreMetric } from '../../server/services/leaderboardService';
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
    expect(validateAndDeriveAssessmentFromTrials('number-memory', 'Adults (26–40)', new Array(101).fill({}), session).success).toBe(false);
    expect(validateAndDeriveAssessmentFromTrials('number-memory', 'Adults (26–40)', 'x' as any, session).success).toBe(false);
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
