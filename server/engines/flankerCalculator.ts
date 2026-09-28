import type { DerivationContext, DerivationResult } from './types';
import { seedPRNG } from './prng';
export function validateDirectionTrial(
  t: any,
  index: number,
  expectedDir: string
): { success: boolean; error?: string; userResponse?: string; isResponded?: boolean; isCorrect?: boolean; derivedFalseStart?: boolean; derivedTimedOut?: boolean } {
  const DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

  if (typeof t.targetDirection !== 'string' || !t.targetDirection.trim()) {
    return { success: false, error: `Trial ${index + 1} is missing required 'targetDirection' field.` };
  }

  const clientTarget = t.targetDirection.trim().toUpperCase();
  if (!DIRECTIONS.includes(clientTarget)) {
    return { success: false, error: `Trial ${index + 1} has invalid targetDirection '${t.targetDirection}'.` };
  }

  if (clientTarget !== expectedDir) {
    return { success: false, error: `Trial ${index + 1} targetDirection mismatch (${t.targetDirection} vs expected ${expectedDir.toLowerCase()}).` };
  }

  let rawRt: number | null = null;
  if (t.rawReactionTime !== null && t.rawReactionTime !== undefined && !Number.isNaN(Number(t.rawReactionTime))) {
    rawRt = Number(t.rawReactionTime);
  } else if (t.rawLatencyMs !== null && t.rawLatencyMs !== undefined && !Number.isNaN(Number(t.rawLatencyMs))) {
    rawRt = Number(t.rawLatencyMs);
  } else if (t.rawLatency !== null && t.rawLatency !== undefined && !Number.isNaN(Number(t.rawLatency))) {
    rawRt = Number(t.rawLatency);
  } else if (t.reactionTime !== null && t.reactionTime !== undefined && !Number.isNaN(Number(t.reactionTime))) {
    rawRt = Number(t.reactionTime);
  } else if (t.reactionTimeMs !== null && t.reactionTimeMs !== undefined && !Number.isNaN(Number(t.reactionTimeMs))) {
    rawRt = Number(t.reactionTimeMs);
  }

  const rawStim = typeof t.stimulusTimestamp === 'number' && Number.isFinite(t.stimulusTimestamp) && t.stimulusTimestamp > 0
    ? t.stimulusTimestamp
    : (typeof t.stimulusPresentedAt === 'number' && Number.isFinite(t.stimulusPresentedAt) && t.stimulusPresentedAt > 0 ? t.stimulusPresentedAt : null);
  const rawResp = typeof t.responseTimestamp === 'number' && Number.isFinite(t.responseTimestamp) && t.responseTimestamp > 0
    ? t.responseTimestamp
    : (typeof t.responseDetectedAt === 'number' && Number.isFinite(t.responseDetectedAt) && t.responseDetectedAt > 0 ? t.responseDetectedAt : null);

  const hasStimulus = rawStim !== null;
  const hasResponse = rawResp !== null || (typeof t.userResponse === 'string' && t.userResponse.trim().length > 0);

  const derivedFalseStart = !hasStimulus || (hasStimulus && rawStim !== null && rawResp !== null && rawResp < rawStim) || (rawRt !== null && rawRt < 80.0);
  const derivedTimedOut = !derivedFalseStart && (!hasResponse || rawRt === null || rawRt >= 3000.0 || (rawStim !== null && rawResp !== null && (rawResp - rawStim) >= 3000.0));

  let isCorrect = false;
  let isResponded = false;
  let cleanUserResp: string | undefined = undefined;

  if (!derivedFalseStart && !derivedTimedOut) {
    if (typeof t.userResponse !== 'string' || !t.userResponse.trim()) {
      return { success: false, error: `Trial ${index + 1} is missing required 'userResponse' for responded trial.` };
    }
    cleanUserResp = t.userResponse.trim().toUpperCase();
    if (!DIRECTIONS.includes(cleanUserResp)) {
      return { success: false, error: `Trial ${index + 1} has invalid userResponse '${t.userResponse}'.` };
    }
    if (rawRt === null || !Number.isFinite(rawRt) || rawRt < 80.0 || rawRt >= 3000.0) {
      return { success: false, error: `Trial ${index + 1} has invalid reactionTime (${rawRt}) for completed trial.` };
    }
    isCorrect = cleanUserResp === expectedDir;
    isResponded = true;
  } else {
    if (t.userResponse !== undefined && t.userResponse !== null) {
      if (typeof t.userResponse !== 'string') {
        return { success: false, error: `Trial ${index + 1} has invalid userResponse type on non-responded trial.` };
      }
      const trimmed = t.userResponse.trim().toUpperCase();
      if (trimmed && !DIRECTIONS.includes(trimmed)) {
        return { success: false, error: `Trial ${index + 1} has invalid userResponse '${t.userResponse}'.` };
      }
      cleanUserResp = trimmed;
    }
  }

  return { success: true, userResponse: cleanUserResp, isResponded, isCorrect, derivedFalseStart, derivedTimedOut };
}

export function deriveDirectionMetrics(ctx: DerivationContext): DerivationResult {
  const { trials, ageGroup, session, sessionId } = ctx;
    let totalCorrect = 0;
    const completedLogicalPositions = new Set<number>();
    const validRTs: number[] = [];

    for (let i = 0; i < trials.length; i++) {
      const t = trials[i];

      if (typeof t.trialNumber !== 'number' || !Number.isInteger(t.trialNumber) || t.trialNumber < 1 || t.trialNumber > 10) {
        return { success: false, error: `Trial ${i + 1} has invalid or missing trialNumber.` };
      }
      const logicalIdx = t.trialNumber - 1;

      const prng = seedPRNG(sessionId + "-direction-" + logicalIdx);
      const windowDelay = prng() * (3000 - 1000) + 1000;
      const DIRECTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
      const expectedDir = DIRECTIONS[Math.floor(prng() * DIRECTIONS.length)];

      const valRes = validateDirectionTrial(t, i, expectedDir);
      if (!valRes.success) {
        return { success: false, error: valRes.error };
      }

      let rawRtPhysiological: number | null = null;
      if (t.rawReactionTime !== null && t.rawReactionTime !== undefined && !Number.isNaN(Number(t.rawReactionTime))) {
        rawRtPhysiological = Number(t.rawReactionTime);
      } else if (t.rawLatencyMs !== null && t.rawLatencyMs !== undefined && !Number.isNaN(Number(t.rawLatencyMs))) {
        rawRtPhysiological = Number(t.rawLatencyMs);
      } else if (t.rawLatency !== null && t.rawLatency !== undefined && !Number.isNaN(Number(t.rawLatency))) {
        rawRtPhysiological = Number(t.rawLatency);
      } else if (t.reactionTime !== null && t.reactionTime !== undefined && !Number.isNaN(Number(t.reactionTime))) {
        rawRtPhysiological = Number(t.reactionTime);
      } else if (t.reactionTimeMs !== null && t.reactionTimeMs !== undefined && !Number.isNaN(Number(t.reactionTimeMs))) {
        rawRtPhysiological = Number(t.reactionTimeMs);
      }

      const correctedRt = t.reactionTime !== null && t.reactionTime !== undefined
        ? Number(t.reactionTime)
        : (t.reactionTimeMs !== null && t.reactionTimeMs !== undefined ? Number(t.reactionTimeMs) : null);

      let canonicalValidity = 'VALID';
      let canonicalQualityFlag: string | null = null;
      if (valRes.derivedFalseStart) {
        if (rawRtPhysiological !== null && rawRtPhysiological < 80.0) {
          canonicalValidity = 'FALSE_START_PHYSIOLOGICAL';
          canonicalQualityFlag = 'ANTICIPATORY_RESPONSE';
        } else {
          canonicalValidity = 'FALSE_START_PRE_STIMULUS';
          canonicalQualityFlag = 'PREMATURE_TRIGGER';
        }
      } else if (valRes.derivedTimedOut) {
        canonicalValidity = 'TIMEOUT';
        canonicalQualityFlag = 'TIMEOUT_EXCEEDED';
      } else if (!valRes.isCorrect) {
        canonicalValidity = 'INCORRECT';
        canonicalQualityFlag = 'ACCURACY_ERROR';
      } else {
        canonicalValidity = 'VALID';
        canonicalQualityFlag = null;
      }

      t.targetDirection = expectedDir;
      if (valRes.userResponse) {
        t.userResponse = valRes.userResponse;
      }
      t.falseStart = valRes.derivedFalseStart;
      t.timedOut = valRes.derivedTimedOut;
      t.correct = valRes.isCorrect === true;
      t.correctness = valRes.isCorrect === true;
      t.accuracy = valRes.isCorrect ? 1 : 0;
      t.valid = !valRes.derivedFalseStart && !valRes.derivedTimedOut && rawRtPhysiological !== null && rawRtPhysiological >= 80.0 && rawRtPhysiological < 3000.0;
      t.validity = canonicalValidity;
      t.qualityFlag = canonicalQualityFlag;

      if (!valRes.derivedFalseStart) {
        completedLogicalPositions.add(logicalIdx);
      }

      if (valRes.isCorrect && (correctedRt !== null || rawRtPhysiological !== null)) {
        totalCorrect++;
        validRTs.push(correctedRt !== null ? correctedRt : rawRtPhysiological!);
      }
    }

    if (completedLogicalPositions.size !== 10) {
      return { success: false, error: `Direction test requires exactly 10 completed logical trials (received ${completedLogicalPositions.size}).` };
    }

    const validTrialsCount = trials.filter(t => !t.falseStart && !t.timedOut).length;
    if (validTrialsCount === 0) {
      return { success: false, error: 'No valid trials found for Direction test.' };
    }
    const accuracy = Math.round(((totalCorrect / validTrialsCount) * 100.0) * 100) / 100;

    validRTs.sort((a, b) => a - b);
    const sum = validRTs.reduce((acc, v) => acc + v, 0);
    const avg = validRTs.length > 0 ? Math.round((sum / validRTs.length) * 100) / 100 : null;
    const fastest = validRTs.length > 0 ? Math.round(validRTs[0] * 100) / 100 : null;
    const slowest = validRTs.length > 0 ? Math.round(validRTs[validRTs.length - 1] * 100) / 100 : null;

    const mid = Math.floor(validRTs.length / 2);
    const median = validRTs.length > 0
      ? (validRTs.length % 2 !== 0
        ? Math.round(validRTs[mid] * 100) / 100
        : Math.round(((validRTs[mid - 1] + validRTs[mid]) / 2.0) * 100) / 100)
      : null;

    const falseStartsCount = trials.filter(t => t.falseStart).length;
    const derivedMetrics: Record<string, any> = {
      accuracy,
      totalCorrect,
      totalTrials: 10,
      totalIncorrect: Math.max(0, 10 - totalCorrect),
      totalFalseStarts: falseStartsCount
    };
    if (avg !== null) derivedMetrics.averageReactionTime = avg;
    if (fastest !== null) derivedMetrics.fastestReactionTime = fastest;
    if (slowest !== null) derivedMetrics.slowestReactionTime = slowest;
    if (median !== null) derivedMetrics.medianReactionTime = median;

    return {
      success: true,
      derivedMetrics
    };
}
