import type { DerivationContext, DerivationResult } from './types';
import { seedPRNG } from './prng';
export function validateColorRecognitionTrial(
  t: any,
  index: number,
  expectedWord: string,
  expectedColor: string,
  expectedCondition: 'congruent' | 'incongruent',
  expectedInstruction: 'WORD' | 'COLOR'
): { success: boolean; error?: string; userResponse?: string; isResponded?: boolean; isCorrect?: boolean; derivedFalseStart?: boolean; derivedTimedOut?: boolean } {
  const COLORS = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE'];

  if (typeof t.wordName !== 'string' || !t.wordName.trim()) {
    return { success: false, error: `Trial ${index + 1} is missing required 'wordName' field.` };
  }
  if (typeof t.wordColor !== 'string' || !t.wordColor.trim()) {
    return { success: false, error: `Trial ${index + 1} is missing required 'wordColor' field.` };
  }
  if (typeof t.condition !== 'string' || !t.condition.trim()) {
    return { success: false, error: `Trial ${index + 1} is missing required 'condition' field.` };
  }
  if (typeof t.instruction !== 'string' || !t.instruction.trim()) {
    return { success: false, error: `Trial ${index + 1} is missing required 'instruction' field.` };
  }

  const clientWord = t.wordName.trim().toUpperCase();
  const clientColor = t.wordColor.trim().toUpperCase();
  const clientCond = t.condition.trim().toLowerCase();
  const clientInst = t.instruction.trim().toUpperCase();

  if (!COLORS.includes(clientWord)) {
    return { success: false, error: `Trial ${index + 1} has invalid wordName '${t.wordName}'.` };
  }
  if (!COLORS.includes(clientColor)) {
    return { success: false, error: `Trial ${index + 1} has invalid wordColor '${t.wordColor}'.` };
  }
  if (clientCond !== 'congruent' && clientCond !== 'incongruent') {
    return { success: false, error: `Trial ${index + 1} has invalid condition '${t.condition}'.` };
  }
  if (clientInst !== 'WORD' && clientInst !== 'COLOR') {
    return { success: false, error: `Trial ${index + 1} has invalid instruction '${t.instruction}'.` };
  }

  if (clientWord !== expectedWord) {
    return { success: false, error: `Trial ${index + 1} wordName mismatch (${t.wordName} vs expected ${expectedWord}).` };
  }
  if (clientColor !== expectedColor) {
    return { success: false, error: `Trial ${index + 1} wordColor mismatch (${t.wordColor} vs expected ${expectedColor}).` };
  }
  if (clientCond !== expectedCondition) {
    return { success: false, error: `Trial ${index + 1} condition mismatch (${t.condition} vs expected ${expectedCondition}).` };
  }
  if (clientInst !== expectedInstruction) {
    return { success: false, error: `Trial ${index + 1} instruction mismatch (${t.instruction} vs expected ${expectedInstruction}).` };
  }

  let rawRt: number | null = null;
  if (t.rawReactionTime !== null && t.rawReactionTime !== undefined && !Number.isNaN(Number(t.rawReactionTime))) {
    rawRt = Number(t.rawReactionTime);
  } else if (t.rawLatencyMs !== null && t.rawLatencyMs !== undefined && !Number.isNaN(Number(t.rawLatencyMs))) {
    rawRt = Number(t.rawLatencyMs);
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

  const expectedCorrectResponse = expectedInstruction === 'WORD' ? expectedWord : expectedColor;
  let isCorrect = false;
  let isResponded = false;
  let cleanUserResp: string | undefined = undefined;

  if (!derivedFalseStart && !derivedTimedOut) {
    if (typeof t.userResponse !== 'string' || !t.userResponse.trim()) {
      return { success: false, error: `Trial ${index + 1} is missing required 'userResponse' for responded trial.` };
    }
    cleanUserResp = t.userResponse.trim().toUpperCase();
    if (!COLORS.includes(cleanUserResp)) {
      return { success: false, error: `Trial ${index + 1} has invalid userResponse '${t.userResponse}'.` };
    }
    if (rawRt === null || !Number.isFinite(rawRt) || rawRt < 80.0 || rawRt >= 3000.0) {
      return { success: false, error: `Trial ${index + 1} has invalid reactionTime (${rawRt}) for completed trial.` };
    }
    isCorrect = cleanUserResp === expectedCorrectResponse;
    isResponded = true;
  } else {
    if (t.userResponse !== undefined && t.userResponse !== null) {
      if (typeof t.userResponse !== 'string') {
        return { success: false, error: `Trial ${index + 1} has invalid userResponse type on non-responded trial.` };
      }
      const trimmed = t.userResponse.trim().toUpperCase();
      if (trimmed && !COLORS.includes(trimmed)) {
        return { success: false, error: `Trial ${index + 1} has invalid userResponse '${t.userResponse}'.` };
      }
      cleanUserResp = trimmed;
    }
  }

  return { success: true, userResponse: cleanUserResp, isResponded, isCorrect, derivedFalseStart, derivedTimedOut };
}

export function deriveColorRecognitionMetrics(ctx: DerivationContext): DerivationResult {
  const { trials, ageGroup, session, sessionId } = ctx;
    if (trials.length !== 15) {
      return { success: false, error: `Color recognition test requires exactly 15 trials (received ${trials.length}).` };
    }

    // Reconstruct congruent/incongruent plans sequence
    const prngPlans = seedPRNG(sessionId + "-color-plans");
    const is8Congruent = prngPlans() < 0.5;
    const congruentCount = is8Congruent ? 8 : 7;
    const incongruentCount = 15 - congruentCount;
    const plans: { condition: 'congruent' | 'incongruent', instruction: 'WORD' | 'COLOR' }[] = [];
    for (let j = 0; j < congruentCount; j++) {
      plans.push({ condition: 'congruent', instruction: j % 2 === 0 ? 'WORD' : 'COLOR' });
    }
    for (let j = 0; j < incongruentCount; j++) {
      plans.push({ condition: 'incongruent', instruction: j % 2 === 0 ? 'WORD' : 'COLOR' });
    }
    for (let j = plans.length - 1; j > 0; j--) {
      const r = Math.floor(prngPlans() * (j + 1));
      const tmp = plans[j];
      plans[j] = plans[r];
      plans[r] = tmp;
    }

    let correctCount = 0;
    const validRTs: number[] = [];
    const congruentTrials: any[] = [];
    const incongruentTrials: any[] = [];

    for (let i = 0; i < trials.length; i++) {
      const t = trials[i];
      const plan = plans[i];

      // Seeded PRNG for the individual trial
      const prngTrial = seedPRNG(sessionId + "-color-trial-" + i);
      const COLORS = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE'];
      const wordIdx = Math.floor(prngTrial() * COLORS.length);
      let colorIdx = wordIdx;
      if (plan.condition === 'incongruent') {
        const offset = Math.floor(prngTrial() * (COLORS.length - 1)) + 1;
        colorIdx = (wordIdx + offset) % COLORS.length;
      }

      const expectedWord = COLORS[wordIdx];
      const expectedColor = COLORS[colorIdx];
      const expectedInstruction = plan.instruction;

      const valRes = validateColorRecognitionTrial(
        t,
        i,
        expectedWord,
        expectedColor,
        plan.condition,
        expectedInstruction
      );
      if (!valRes.success) {
        return { success: false, error: valRes.error };
      }

      let rawRtPhysiological: number | null = null;
      if (t.rawReactionTime !== null && t.rawReactionTime !== undefined && !Number.isNaN(Number(t.rawReactionTime))) {
        rawRtPhysiological = Number(t.rawReactionTime);
      } else if (t.rawLatencyMs !== null && t.rawLatencyMs !== undefined && !Number.isNaN(Number(t.rawLatencyMs))) {
        rawRtPhysiological = Number(t.rawLatencyMs);
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

      t.wordName = expectedWord;
      t.wordColor = expectedColor;
      t.condition = plan.condition;
      t.instruction = expectedInstruction;
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

      if (valRes.isCorrect && (correctedRt !== null || rawRtPhysiological !== null)) {
        correctCount++;
        validRTs.push(correctedRt !== null ? correctedRt : rawRtPhysiological!);
        if (plan.condition === 'congruent') {
          congruentTrials.push(t);
        } else {
          incongruentTrials.push(t);
        }
      }
    }

    const validTrialsCount = trials.filter(t => !t.falseStart && !t.timedOut).length;
    const accuracy = validTrialsCount > 0 ? Math.round(((correctCount / validTrialsCount) * 100.0) * 100) / 100 : 0;

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

    let congruentAvg: number | undefined = undefined;
    let incongruentAvg: number | undefined = undefined;
    let interferenceCost: number | undefined = undefined;

    if (congruentTrials.length > 0) {
      const cSum = congruentTrials.reduce((acc, t) => acc + Number(t.reactionTime), 0);
      congruentAvg = Math.round((cSum / congruentTrials.length) * 100) / 100;
    }
    if (incongruentTrials.length > 0) {
      const iSum = incongruentTrials.reduce((acc, t) => acc + Number(t.reactionTime), 0);
      incongruentAvg = Math.round((iSum / incongruentTrials.length) * 100) / 100;
    }
    if (congruentAvg !== undefined && incongruentAvg !== undefined) {
      interferenceCost = Math.round((incongruentAvg - congruentAvg) * 100) / 100;
    }

    const derivedMetrics: Record<string, any> = {
      accuracy,
      correctCount
    };
    if (avg !== null) derivedMetrics.averageReactionTime = avg;
    if (fastest !== null) derivedMetrics.fastestReactionTime = fastest;
    if (slowest !== null) derivedMetrics.slowestReactionTime = slowest;
    if (median !== null) derivedMetrics.medianReactionTime = median;
    if (congruentAvg !== undefined) derivedMetrics.congruentAvg = congruentAvg;
    if (incongruentAvg !== undefined) derivedMetrics.incongruentAvg = incongruentAvg;
    if (interferenceCost !== undefined) derivedMetrics.interferenceCost = interferenceCost;

    return {
      success: true,
      derivedMetrics
    };
}
