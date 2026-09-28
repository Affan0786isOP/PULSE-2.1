import type { DerivationContext, DerivationResult } from './types';
import { VRT_SHORT_FOREPERIOD_MIN_MS, VRT_SHORT_FOREPERIOD_MAX_MS, VRT_LONG_FOREPERIOD_MIN_MS, VRT_LONG_FOREPERIOD_MAX_MS } from '../config/constants';
import { seedPRNG } from './prng';
export function validateReactionMetrics(metrics: any): boolean {
  if (!metrics || typeof metrics !== 'object') return false;
  const { averageReactionTime, fastestReactionTime, slowestReactionTime, medianReactionTime } = metrics;
  return typeof averageReactionTime === 'number' && averageReactionTime >= 80.0 && averageReactionTime <= 3600000.0 &&
    typeof fastestReactionTime === 'number' && fastestReactionTime >= 80.0 && fastestReactionTime <= averageReactionTime &&
    typeof slowestReactionTime === 'number' && slowestReactionTime >= averageReactionTime && slowestReactionTime <= 3600000.0 &&
    typeof medianReactionTime === 'number' && medianReactionTime >= 80.0 && medianReactionTime <= 3600000.0 &&
    fastestReactionTime <= medianReactionTime && medianReactionTime <= slowestReactionTime;
}

export function deriveForeperiodCategory(foreperiodMs: number | null | undefined): 'SHORT' | 'LONG' | null {
  if (typeof foreperiodMs !== 'number' || !Number.isFinite(foreperiodMs) || !Number.isInteger(foreperiodMs)) return null;
  if (foreperiodMs >= 100 && foreperiodMs <= 500) return 'SHORT';
  if (foreperiodMs >= 501 && foreperiodMs <= 3000) return 'LONG';
  return null;
}

export function generateVrtForeperiod(prng: () => number): { foreperiodMs: number; foreperiodCategory: 'SHORT' | 'LONG' } {
  const isShort = prng() < 0.5;
  const foreperiodMs = isShort
    ? Math.floor(prng() * (VRT_SHORT_FOREPERIOD_MAX_MS - VRT_SHORT_FOREPERIOD_MIN_MS + 1)) + VRT_SHORT_FOREPERIOD_MIN_MS
    : Math.floor(prng() * (VRT_LONG_FOREPERIOD_MAX_MS - VRT_LONG_FOREPERIOD_MIN_MS + 1)) + VRT_LONG_FOREPERIOD_MIN_MS;
  const foreperiodCategory: 'SHORT' | 'LONG' = foreperiodMs <= 500 ? 'SHORT' : 'LONG';
  return { foreperiodMs, foreperiodCategory };
}

export function validateVisualReactionTrial(
  t: any,
  index: number,
  expectedForeperiod: { foreperiodMs: number; foreperiodCategory: 'SHORT' | 'LONG' }
): { success: boolean; error?: string; foreperiodMs?: number; foreperiodCategory?: 'SHORT' | 'LONG' } {
  const rawFp = t.foreperiodMs !== null && t.foreperiodMs !== undefined
    ? Number(t.foreperiodMs)
    : (t.foreperiod !== null && t.foreperiod !== undefined ? Number(t.foreperiod) : null);

  if (rawFp === null || typeof rawFp !== 'number' || !Number.isFinite(rawFp) || !Number.isInteger(rawFp) || rawFp < 100 || rawFp > 3000) {
    return { success: false, error: `Invalid or missing foreperiod duration in trial ${index + 1}. Must be an integer between 100ms and 3000ms.` };
  }

  if (rawFp !== expectedForeperiod.foreperiodMs) {
    return { success: false, error: `Trial ${index + 1} foreperiod duration mismatch (${rawFp}ms vs expected server-authoritative ${expectedForeperiod.foreperiodMs}ms).` };
  }

  const expectedCategory = deriveForeperiodCategory(rawFp);
  if (!expectedCategory || expectedCategory !== expectedForeperiod.foreperiodCategory) {
    return { success: false, error: `Invalid foreperiod category derivation for ${rawFp}ms in trial ${index + 1}.` };
  }

  if (t.foreperiodCategory !== undefined && t.foreperiodCategory !== null && t.foreperiodCategory !== expectedForeperiod.foreperiodCategory) {
    return { success: false, error: `Foreperiod category mismatch in trial ${index + 1}: got ${t.foreperiodCategory} for ${rawFp}ms (expected ${expectedForeperiod.foreperiodCategory}).` };
  }

  return { success: true, foreperiodMs: expectedForeperiod.foreperiodMs, foreperiodCategory: expectedForeperiod.foreperiodCategory };
}

export function deriveVisualReactionMetrics(ctx: DerivationContext): DerivationResult {
  const { trials, ageGroup, session, sessionId } = ctx;
    let falseStartsCount = 0;
    const validRTs: number[] = [];
    const chronoValidTrials: any[] = [];

    for (let i = 0; i < trials.length; i++) {
      const t = trials[i];

      const trialNumber = Number(t.trialNumber);
      let attemptNumber = 1;
      if (i > 0) {
        const prevTrialNumber = Number(trials[i - 1].trialNumber);
        const prevAttempt = Number(trials[i - 1].attemptNumber) || 1;
        attemptNumber = (trialNumber === prevTrialNumber) ? prevAttempt + 1 : 1;
      }

      const prng = seedPRNG(`${sessionId}-reaction-delays-t${trialNumber}-a${attemptNumber}`);
      const expectedForeperiod = generateVrtForeperiod(prng);

      const valRes = validateVisualReactionTrial(t, i, expectedForeperiod);
      if (!valRes.success) {
        return { success: false, error: valRes.error };
      }

      t.foreperiodMs = valRes.foreperiodMs;
      t.foreperiodCategory = valRes.foreperiodCategory;

      const rawStimulus = t.stimulusTimestamp !== null && t.stimulusTimestamp !== undefined ? Number(t.stimulusTimestamp) : null;
      const hasStimulus = (rawStimulus !== null && Number.isFinite(rawStimulus) && rawStimulus > 0) || (typeof t.stimulusPresentedAt === 'number' && Number.isFinite(t.stimulusPresentedAt) && t.stimulusPresentedAt > 0);

      const rawResponse = t.responseTimestamp !== null && t.responseTimestamp !== undefined ? Number(t.responseTimestamp) : null;
      const hasResponse = (rawResponse !== null && Number.isFinite(rawResponse) && rawResponse > 0) || (typeof t.responseDetectedAt === 'number' && Number.isFinite(t.responseDetectedAt) && t.responseDetectedAt > 0);

      const correctedRt = typeof t.reactionTime === 'number' && Number.isFinite(t.reactionTime)
        ? Number(t.reactionTime)
        : (typeof t.reactionTimeMs === 'number' && Number.isFinite(t.reactionTimeMs) ? Number(t.reactionTimeMs) : null);

      const rawRtPhysiological = typeof t.rawReactionTime === 'number' && Number.isFinite(t.rawReactionTime)
        ? Number(t.rawReactionTime)
        : (typeof t.rawLatencyMs === 'number' && Number.isFinite(t.rawLatencyMs)
            ? Number(t.rawLatencyMs)
            : (typeof t.rawLatency === 'number' && Number.isFinite(t.rawLatency)
                ? Number(t.rawLatency)
                : correctedRt));

      let isFalseStart = false;
      let isTimedOut = false;
      let isValid = false;
      let canonicalValidity: 'VALID' | 'FALSE_START_PRE_STIMULUS' | 'ANTICIPATORY_TOO_FAST' | 'TIMEOUT';
      let canonicalQualityFlag: 'ANTICIPATORY_RT' | 'TIMEOUT_EXCEEDED' | 'PREMATURE_TRIGGER' | null;

      if (!hasStimulus || (hasStimulus && hasResponse && rawStimulus !== null && rawResponse !== null && rawResponse < rawStimulus)) {
        // Pre-stimulus false start: response occurred prior to or without stimulus presentation
        isFalseStart = true;
        isTimedOut = false;
        isValid = false;
        canonicalValidity = 'FALSE_START_PRE_STIMULUS';
        canonicalQualityFlag = 'PREMATURE_TRIGGER';
      } else if (!hasResponse || rawRtPhysiological === null || rawRtPhysiological >= 3000.0 || (rawStimulus !== null && rawResponse !== null && (rawResponse - rawStimulus) >= 3000.0)) {
        // Timeout: stimulus presented, but response was missing or exceeded 3000ms
        isFalseStart = false;
        isTimedOut = true;
        isValid = false;
        canonicalValidity = 'TIMEOUT';
        canonicalQualityFlag = 'TIMEOUT_EXCEEDED';
      } else if (rawRtPhysiological < 80.0 || (rawStimulus !== null && rawResponse !== null && (rawResponse - rawStimulus) < 80.0)) {
        // Anticipatory physiological false start (< 80ms)
        isFalseStart = true;
        isTimedOut = false;
        isValid = false;
        canonicalValidity = 'ANTICIPATORY_TOO_FAST';
        canonicalQualityFlag = 'ANTICIPATORY_RT';
      } else {
        // Physiologically valid reaction (80ms <= RT < 3000ms)
        isFalseStart = false;
        isTimedOut = false;
        isValid = true;
        canonicalValidity = 'VALID';
        canonicalQualityFlag = null;
      }

      // Canonicalize server-derived state onto trial object for persistence & digest
      t.falseStart = isFalseStart;
      t.timedOut = isTimedOut;
      t.valid = isValid;
      t.validity = canonicalValidity;
      t.qualityFlag = canonicalQualityFlag;
      t.correct = isValid;
      t.accuracy = isValid ? 1 : 0;

      if (isFalseStart) {
        falseStartsCount++;
      } else if (isValid) {
        const analyticalRt = correctedRt !== null ? correctedRt : rawRtPhysiological!;
        validRTs.push(analyticalRt);
        chronoValidTrials.push({ ...t, reactionTime: analyticalRt });
      }
    }

    if (validRTs.length !== 10) {
      return { success: false, error: `Visual reaction test requires exactly 10 physiological reaction time trials (80ms - 3000ms), received ${validRTs.length}.` };
    }

    const sortedRTs = [...validRTs].sort((a, b) => a - b);
    const sum = sortedRTs.reduce((acc, v) => acc + v, 0);
    const avg = Math.round((sum / sortedRTs.length) * 100) / 100;
    const fastest = Math.round(sortedRTs[0] * 100) / 100;
    const slowest = Math.round(sortedRTs[sortedRTs.length - 1] * 100) / 100;

    const mid = Math.floor(sortedRTs.length / 2);
    const median = sortedRTs.length % 2 !== 0
      ? Math.round(sortedRTs[mid] * 100) / 100
      : Math.round(((sortedRTs[mid - 1] + sortedRTs[mid]) / 2.0) * 100) / 100;

    const variance = sortedRTs.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / sortedRTs.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / avg) * 100;
    const consistency = Math.max(0, Math.min(100, Math.round((100 - cv) * 100) / 100));

    // Scientific Temporal Dynamics calculations
    // 1. Foreperiod sensitivity (Pearson correlation r between foreperiod and RT)
    let foreperiodSensitivity: number | null = null;
    if (chronoValidTrials.length >= 3) {
      const xs = chronoValidTrials.map(t => Number(t.foreperiodMs ?? t.foreperiod ?? 0));
      const ys = chronoValidTrials.map(t => Number(t.reactionTime));
      const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
      const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
      let num = 0;
      let denX = 0;
      let denY = 0;
      for (let k = 0; k < xs.length; k++) {
        const dx = xs[k] - meanX;
        const dy = ys[k] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }
      const den = Math.sqrt(denX * denY);
      if (den > 0) {
        foreperiodSensitivity = Number((num / den).toFixed(4));
      }
    }

    // 2. Short and long foreperiod observation windows
    const shortWindowTrials = chronoValidTrials.filter(t => {
      const fp = Number(t.foreperiodMs ?? t.foreperiod ?? 0);
      return fp >= 100 && fp <= 500;
    });
    const longWindowTrials = chronoValidTrials.filter(t => {
      const fp = Number(t.foreperiodMs ?? t.foreperiod ?? 0);
      return fp >= 501 && fp <= 3000;
    });

    const shortWindow = {
      windowRangeMs: [100, 500],
      sampleAvailable: shortWindowTrials.length > 0,
      count: shortWindowTrials.length,
      meanRt: shortWindowTrials.length > 0
        ? Number((shortWindowTrials.reduce((a, b) => a + Number(b.reactionTime), 0) / shortWindowTrials.length).toFixed(2))
        : null,
      status: shortWindowTrials.length > 0 ? 'available' : 'insufficient_data'
    };

    const longWindow = {
      windowRangeMs: [501, 3000],
      sampleAvailable: longWindowTrials.length > 0,
      count: longWindowTrials.length,
      meanRt: longWindowTrials.length > 0
        ? Number((longWindowTrials.reduce((a, b) => a + Number(b.reactionTime), 0) / longWindowTrials.length).toFixed(2))
        : null,
      status: longWindowTrials.length > 0 ? 'available' : 'insufficient_data'
    };

    // 3. Foreperiod transition cost (delta RT following >= 1500ms foreperiod shift)
    let foreperiodTransitionCost: number | null = null;
    const transitionDeltas: number[] = [];
    for (let k = 1; k < chronoValidTrials.length; k++) {
      const prevFp = Number(chronoValidTrials[k - 1].foreperiodMs ?? chronoValidTrials[k - 1].foreperiod ?? 0);
      const currFp = Number(chronoValidTrials[k].foreperiodMs ?? chronoValidTrials[k].foreperiod ?? 0);
      if (Math.abs(currFp - prevFp) >= 1500) {
        const prevRt = Number(chronoValidTrials[k - 1].reactionTime);
        const currRt = Number(chronoValidTrials[k].reactionTime);
        transitionDeltas.push(currRt - prevRt);
      }
    }
    if (transitionDeltas.length >= 2) {
      foreperiodTransitionCost = Number((transitionDeltas.reduce((a, b) => a + b, 0) / transitionDeltas.length).toFixed(2));
    }

    // 4. Adaptation slope (linear regression slope of RT across chronological valid trial sequence)
    let adaptationSlope: number | null = null;
    if (chronoValidTrials.length >= 2) {
      const N = chronoValidTrials.length;
      const meanT = (N + 1) / 2;
      const ys = chronoValidTrials.map(t => Number(t.reactionTime));
      const meanY = ys.reduce((a, b) => a + b, 0) / N;
      let num = 0;
      let den = 0;
      for (let k = 0; k < N; k++) {
        const tIdx = k + 1;
        const dt = tIdx - meanT;
        const dy = ys[k] - meanY;
        num += dt * dy;
        den += dt * dt;
      }
      if (den > 0) {
        adaptationSlope = Number((num / den).toFixed(2));
      }
    }

    // 5. Habituation index (ratio of mean RT of last 5 valid trials / mean RT of first 5 valid trials)
    let habituationIndex: number | null = null;
    if (chronoValidTrials.length === 10) {
      const first5 = chronoValidTrials.slice(0, 5).map(t => Number(t.reactionTime));
      const last5 = chronoValidTrials.slice(5, 10).map(t => Number(t.reactionTime));
      const meanFirst5 = first5.reduce((a, b) => a + b, 0) / 5;
      const meanLast5 = last5.reduce((a, b) => a + b, 0) / 5;
      if (meanFirst5 > 0) {
        habituationIndex = Number((meanLast5 / meanFirst5).toFixed(3));
      }
    }

    // 6. Temporal stability (1 - CV clamped to [0, 1])
    const temporalStability = Math.max(0, Math.min(1, Number((1 - (stdDev / avg)).toFixed(2))));

    const temporalDynamics = {
      foreperiodSensitivity,
      shortWindow,
      longWindow,
      foreperiodTransitionCost,
      temporalSurpriseCost: null,
      adaptationSlope,
      habituationIndex,
      temporalStability,
      analysisVersion: 'temporal-v1'
    };

    return {
      success: true,
      derivedMetrics: {
        averageReactionTime: avg,
        fastestReactionTime: fastest,
        slowestReactionTime: slowest,
        medianReactionTime: median,
        consistency,
        totalFalseStarts: falseStartsCount,
        temporalDynamics
      }
    };
}
