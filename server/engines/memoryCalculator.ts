import type { DerivationContext, DerivationResult } from './types';
import { seedPRNG } from './prng';

export function validateBlockMemoryTrial(
  t: any,
  index: number,
  expectedLevel: number,
  seqLen: number,
  expectedSeq: number[]
): { success: boolean; error?: string; isCorrect?: boolean } {
  if (typeof t.level !== 'number' || !Number.isInteger(t.level) || t.level < 1) {
    return { success: false, error: `Trial ${index + 1} is missing or has invalid 'level' field.` };
  }

  if (t.level !== expectedLevel) {
    return { success: false, error: `Trial ${index + 1} has unexpected level (${t.level}). Expected level: ${expectedLevel}.` };
  }

  if (t.sequenceLength !== undefined && t.sequenceLength !== null) {
    if (typeof t.sequenceLength !== 'number' || !Number.isInteger(t.sequenceLength) || t.sequenceLength !== seqLen) {
      return { success: false, error: `Trial ${index + 1} sequenceLength (${t.sequenceLength}) mismatch. Expected ${seqLen}.` };
    }
  }

  if (!Array.isArray(t.generatedSequence)) {
    return { success: false, error: `Trial ${index + 1} is missing required 'generatedSequence' array.` };
  }
  if (t.generatedSequence.length !== expectedSeq.length || !t.generatedSequence.every((val: any, i: number) => Number(val) === expectedSeq[i])) {
    return { success: false, error: `Trial ${index + 1} generatedSequence mismatch.` };
  }

  if (!Array.isArray(t.playerSequence)) {
    return { success: false, error: `Trial ${index + 1} is missing required 'playerSequence' array.` };
  }
  if (t.playerSequence.length > 50) {
    return { success: false, error: `Trial ${index + 1} playerSequence length (${t.playerSequence.length}) exceeds maximum allowable length (50).` };
  }
  for (let pIdx = 0; pIdx < t.playerSequence.length; pIdx++) {
    const val = t.playerSequence[pIdx];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val > 8) {
      return { success: false, error: `Trial ${index + 1} playerSequence contains invalid block ID (${val}) at index ${pIdx}. Must be an integer between 0 and 8.` };
    }
  }

  if (t.correct !== undefined && t.correct !== null && typeof t.correct !== 'boolean') {
    return { success: false, error: `Trial ${index + 1} has invalid 'correct' flag type.` };
  }
  if (t.correctness !== undefined && t.correctness !== null && typeof t.correctness !== 'boolean') {
    return { success: false, error: `Trial ${index + 1} has invalid 'correctness' flag type.` };
  }

  const isCorrect = t.playerSequence.length === expectedSeq.length &&
    t.playerSequence.every((val: any, i: number) => Number(val) === expectedSeq[i]);

  return { success: true, isCorrect };
}

export function validateNumberMemoryTrial(
  t: any,
  index: number,
  expectedLevel: number,
  seqLen: number,
  expectedSeq: string
): { success: boolean; error?: string; isCorrect?: boolean } {
  if (typeof t.level !== 'number' || !Number.isInteger(t.level) || t.level < 1) {
    return { success: false, error: `Trial ${index + 1} is missing or has invalid 'level' field.` };
  }

  if (t.level !== expectedLevel) {
    return { success: false, error: `Trial ${index + 1} has unexpected level (${t.level}). Expected level: ${expectedLevel}.` };
  }

  if (t.sequenceLength !== undefined && t.sequenceLength !== null) {
    if (typeof t.sequenceLength !== 'number' || !Number.isInteger(t.sequenceLength) || t.sequenceLength !== seqLen) {
      return { success: false, error: `Trial ${index + 1} sequenceLength (${t.sequenceLength}) mismatch. Expected ${seqLen}.` };
    }
  }

  if (typeof t.generatedSequence !== 'string' || !t.generatedSequence) {
    return { success: false, error: `Trial ${index + 1} is missing required 'generatedSequence' string.` };
  }
  if (t.generatedSequence !== expectedSeq) {
    return { success: false, error: `Trial ${index + 1} generatedSequence mismatch.` };
  }

  if (typeof t.playerSequence !== 'string') {
    return { success: false, error: `Trial ${index + 1} is missing required 'playerSequence' string.` };
  }
  if (!/^\d*$/.test(t.playerSequence)) {
    return { success: false, error: `Trial ${index + 1} playerSequence contains invalid characters. Must contain only digits.` };
  }
  if (t.playerSequence.length > 50) {
    return { success: false, error: `Trial ${index + 1} playerSequence length (${t.playerSequence.length}) exceeds maximum allowable length (50).` };
  }

  if (t.correct !== undefined && t.correct !== null && typeof t.correct !== 'boolean') {
    return { success: false, error: `Trial ${index + 1} has invalid 'correct' flag type.` };
  }
  if (t.correctness !== undefined && t.correctness !== null && typeof t.correctness !== 'boolean') {
    return { success: false, error: `Trial ${index + 1} has invalid 'correctness' flag type.` };
  }

  const isCorrect = t.playerSequence === expectedSeq;

  return { success: true, isCorrect };
}

export function deriveBlockMemoryMetrics(ctx: DerivationContext): DerivationResult {
  const { trials, ageGroup, session, sessionId } = ctx;
    if (trials.length < 1 || trials.length > 103) {
      return { success: false, error: `Block memory trial count (${trials.length}) is outside valid range (1-103).` };
    }

    let failuresCount = 0;
    let expectedLevel = 1;
    let totalCorrect = 0;
    const correctLevels: number[] = [];
    const levelAttempts: Record<number, number> = {};

    for (let idx = 0; idx < trials.length; idx++) {
      const t = trials[idx];
      const level = Number(t.level);
      const seqLen = level + 1;

      if (!levelAttempts[level]) levelAttempts[level] = 0;
      const attemptIdx = levelAttempts[level]++;

      const prng = seedPRNG(sessionId + "-block-" + level + "-" + attemptIdx);
      const expectedSeq: number[] = [];
      for (let k = 0; k < seqLen; k++) {
        let next: number;
        do {
          next = Math.floor(prng() * 9);
        } while (k > 0 && next === expectedSeq[k - 1]);
        expectedSeq.push(next);
      }

      const valRes = validateBlockMemoryTrial(t, idx, expectedLevel, seqLen, expectedSeq);
      if (!valRes.success) {
        return { success: false, error: valRes.error };
      }

      const isCorrect = valRes.isCorrect;

      t.generatedSequence = expectedSeq;
      t.sequenceLength = seqLen;
      t.accuracy = isCorrect ? 1 : 0;
      t.correct = isCorrect;
      t.correctness = isCorrect;
      const isAborted = t.validity === 'ABORTED' || t.timedOut === true || t.falseStart === true;
      const isValidAttempt = !isAborted;
      t.valid = isValidAttempt;
      t.validity = isValidAttempt ? (isCorrect ? 'VALID' : 'INCORRECT') : (t.validity || 'ABORTED');
      t.qualityFlag = isValidAttempt ? (isCorrect ? null : 'ACCURACY_ERROR') : t.qualityFlag;

      if (isCorrect) {
        totalCorrect++;
        correctLevels.push(level);
        expectedLevel = level + 1;
      } else {
        failuresCount++;
        if (failuresCount > 3) {
          return { success: false, error: `Trial sequence exceeds maximum allowed failures (3 lives limit).` };
        }
        if (failuresCount === 3 && idx !== trials.length - 1) {
          return { success: false, error: `Assessment must terminate immediately upon 3rd failure.` };
        }
      }
    }

    const highestLevel = correctLevels.length > 0 ? Math.max(...correctLevels) : 0;
    const longestSeq = highestLevel > 0 ? highestLevel + 1 : 0;
    const totalAttempts = trials.length;
    const overallAccuracy = Math.round(((totalCorrect * 100.0) / totalAttempts) * 100) / 100;
    const firstTrial = trials[0];
    const lastTrial = trials[trials.length - 1];

    const assessmentStart = typeof firstTrial.assessmentStartedAt === 'number' && Number.isFinite(firstTrial.assessmentStartedAt)
      ? firstTrial.assessmentStartedAt
      : (typeof firstTrial.previousTrialEndedAt === 'number' && Number.isFinite(firstTrial.previousTrialEndedAt)
        ? firstTrial.previousTrialEndedAt
        : (typeof session?.createdAt === 'number' ? session.createdAt : Number(firstTrial.stimulusTimestamp)));
    const lastResponse = Number(lastTrial.responseTimestamp) || Date.now();
    const totalTimeMs = Math.max(100, Math.min(3600000, lastResponse - assessmentStart));

    return {
      success: true,
      derivedMetrics: {
        highestLevel,
        longestSeq,
        totalCorrect,
        totalAttempts,
        overallAccuracy,
        totalTimeMs
      }
    };
}

export function deriveNumberMemoryMetrics(ctx: DerivationContext): DerivationResult {
  const { trials, ageGroup, session, sessionId } = ctx;
    if (trials.length < 1 || trials.length > 103) {
      return { success: false, error: `Number memory trial count (${trials.length}) is outside valid range (1-103).` };
    }

    let failuresCount = 0;
    let expectedLevel = 1;
    let totalCorrect = 0;
    const correctLevels: number[] = [];
    const levelAttempts: Record<number, number> = {};

    for (let idx = 0; idx < trials.length; idx++) {
      const t = trials[idx];
      const level = Number(t.level);
      const seqLen = level + 2;

      if (!levelAttempts[level]) levelAttempts[level] = 0;
      const attemptIdx = levelAttempts[level]++;

      const prng = seedPRNG(sessionId + "-number-" + level + "-" + attemptIdx);
      let expectedSeq = '';
      for (let k = 0; k < seqLen; k++) {
        expectedSeq += Math.floor(prng() * 10).toString();
      }

      const valRes = validateNumberMemoryTrial(t, idx, expectedLevel, seqLen, expectedSeq);
      if (!valRes.success) {
        return { success: false, error: valRes.error };
      }

      const isCorrect = valRes.isCorrect;

      t.generatedSequence = expectedSeq;
      t.sequenceLength = seqLen;
      t.accuracy = isCorrect ? 1 : 0;
      t.correct = isCorrect;
      t.correctness = isCorrect;
      const isAborted = t.validity === 'ABORTED' || t.timedOut === true || t.falseStart === true;
      const isValidAttempt = !isAborted;
      t.valid = isValidAttempt;
      t.validity = isValidAttempt ? (isCorrect ? 'VALID' : 'INCORRECT') : (t.validity || 'ABORTED');
      t.qualityFlag = isValidAttempt ? (isCorrect ? null : 'ACCURACY_ERROR') : t.qualityFlag;

      if (isCorrect) {
        totalCorrect++;
        correctLevels.push(level);
        expectedLevel = level + 1;
      } else {
        failuresCount++;
        if (failuresCount > 3) {
          return { success: false, error: `Trial sequence exceeds maximum allowed failures (3 lives limit).` };
        }
        if (failuresCount === 3 && idx !== trials.length - 1) {
          return { success: false, error: `Assessment must terminate immediately upon 3rd failure.` };
        }
      }
    }

    const highestLevel = correctLevels.length > 0 ? Math.max(...correctLevels) : 0;
    const longestSeq = highestLevel > 0 ? highestLevel + 2 : 0;
    const totalAttempts = trials.length;
    const overallAccuracy = Math.round(((totalCorrect * 100.0) / totalAttempts) * 100) / 100;
    const firstTrial = trials[0];
    const lastTrial = trials[trials.length - 1];

    const assessmentStart = typeof firstTrial.assessmentStartedAt === 'number' && Number.isFinite(firstTrial.assessmentStartedAt)
      ? firstTrial.assessmentStartedAt
      : (typeof firstTrial.previousTrialEndedAt === 'number' && Number.isFinite(firstTrial.previousTrialEndedAt)
        ? firstTrial.previousTrialEndedAt
        : (typeof session?.createdAt === 'number' ? session.createdAt : Number(firstTrial.stimulusTimestamp)));
    const lastResponse = Number(lastTrial.responseTimestamp) || Date.now();
    const totalTimeMs = Math.max(100, Math.min(3600000, lastResponse - assessmentStart));

    return {
      success: true,
      derivedMetrics: {
        highestLevel,
        longestSeq,
        totalCorrect,
        totalAttempts,
        overallAccuracy,
        totalTimeMs
      }
    };
}
