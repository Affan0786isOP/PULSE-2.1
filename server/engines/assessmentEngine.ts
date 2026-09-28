import { MAX_TRIALS_PER_SESSION } from '../config/constants';
import { normalizeAssessmentType } from './assessmentTypes';
import { deriveVisualReactionMetrics } from './reactionCalculator';
import { deriveDirectionMetrics } from './flankerCalculator';
import { deriveColorRecognitionMetrics } from './stroopCalculator';
import { deriveBlockMemoryMetrics, deriveNumberMemoryMetrics } from './memoryCalculator';

export function validateAndDeriveAssessmentFromTrials(
  assessmentType: string,
  ageGroup: string,
  trials: any[],
  session?: any
): { success: boolean; error?: string; derivedMetrics?: Record<string, any> } {
  if (!Array.isArray(trials) || trials.length === 0) {
    return { success: false, error: 'Trial sequence must be a non-empty array.' };
  }

  if (trials.length > MAX_TRIALS_PER_SESSION) {
    return { success: false, error: `Trial sequence exceeds maximum allowed limit (${MAX_TRIALS_PER_SESSION} trials).` };
  }

  const sessionId = session ? session.sessionId : 'default_seed';

  // 1. Structural, chronological, and physiological verification of every individual trial observation
  let lastStimulus = 0;
  let lastResponse = 0;
  const sessionWindowMargin = 30000; // 30s allowance for network/clock skew

  for (let i = 0; i < trials.length; i++) {
    const t = trials[i];
    if (!t || typeof t !== 'object' || Array.isArray(t)) {
      return { success: false, error: `Trial at index ${i} is not a valid object.` };
    }

    const trialNumber = Number(t.trialNumber);
    if (!Number.isInteger(trialNumber) || trialNumber < 1) {
      return { success: false, error: `Invalid trialNumber at index ${i}. Must be a positive integer.` };
    }
    if (i === 0) {
      if (trialNumber !== 1) {
        return { success: false, error: `Invalid trialNumber at index 0 (received ${trialNumber}, expected 1). First observation must start at logical trial 1.` };
      }
    } else {
      const prevTrialNumber = Number(trials[i - 1].trialNumber);
      if (trialNumber !== prevTrialNumber && trialNumber !== prevTrialNumber + 1) {
        return { success: false, error: `Invalid trialNumber sequence at index ${i} (received ${trialNumber}, expected ${prevTrialNumber} or ${prevTrialNumber + 1}).` };
      }
    }

    const expectedChronoIndex = i + 1;
    if (t.trialIndex !== undefined && t.trialIndex !== null) {
      const trialIndex = Number(t.trialIndex);
      if (!Number.isInteger(trialIndex) || trialIndex !== expectedChronoIndex) {
        return { success: false, error: `Invalid trialIndex at index ${i} (received ${t.trialIndex}, expected ${expectedChronoIndex}).` };
      }
    }

    if (t.sequenceNumber !== undefined && t.sequenceNumber !== null) {
      const sequenceNumber = Number(t.sequenceNumber);
      if (!Number.isInteger(sequenceNumber) || sequenceNumber !== expectedChronoIndex) {
        return { success: false, error: `Invalid sequenceNumber at index ${i} (received ${t.sequenceNumber}, expected ${expectedChronoIndex}).` };
      }
    }

    let expectedAttemptNumber = 1;
    if (i > 0) {
      const prevTrialNumber = Number(trials[i - 1].trialNumber);
      const prevAttemptNumber = Number(trials[i - 1].attemptNumber) || 1;
      if (trialNumber === prevTrialNumber) {
        expectedAttemptNumber = prevAttemptNumber + 1;
      } else {
        expectedAttemptNumber = 1;
      }
    }

    if (t.attemptNumber !== undefined && t.attemptNumber !== null) {
      const attemptNumber = Number(t.attemptNumber);
      if (!Number.isInteger(attemptNumber) || attemptNumber !== expectedAttemptNumber) {
        return { success: false, error: `Invalid attemptNumber at index ${i} (received ${t.attemptNumber}, expected ${expectedAttemptNumber}).` };
      }
    }

    const rawStimulus = t.stimulusTimestamp !== null && t.stimulusTimestamp !== undefined ? Number(t.stimulusTimestamp) : null;
    const stimulusTimestamp = (rawStimulus !== null && Number.isFinite(rawStimulus) && rawStimulus > 0) ? rawStimulus : null;

    const rawResponse = t.responseTimestamp !== null && t.responseTimestamp !== undefined ? Number(t.responseTimestamp) : null;
    const responseTimestamp = (rawResponse !== null && Number.isFinite(rawResponse) && rawResponse > 0) ? rawResponse : null;

    const reactionTime = typeof t.reactionTime === 'number' && Number.isFinite(t.reactionTime)
      ? Number(t.reactionTime)
      : (typeof t.reactionTimeMs === 'number' && Number.isFinite(t.reactionTimeMs) ? Number(t.reactionTimeMs) : null);

    const rawRt = typeof t.rawReactionTime === 'number' && Number.isFinite(t.rawReactionTime)
      ? Number(t.rawReactionTime)
      : (typeof t.rawLatencyMs === 'number' && Number.isFinite(t.rawLatencyMs)
          ? Number(t.rawLatencyMs)
          : (typeof t.rawLatency === 'number' && Number.isFinite(t.rawLatency) ? Number(t.rawLatency) : reactionTime));

    if (stimulusTimestamp === null && responseTimestamp === null) {
      return { success: false, error: `Trial ${i + 1} is missing both stimulusTimestamp and responseTimestamp.` };
    }

    if (stimulusTimestamp === null || (responseTimestamp !== null && responseTimestamp < stimulusTimestamp)) {
      // Pre-stimulus false start: response was recorded prior to or without stimulus presentation
      if (responseTimestamp === null || !Number.isFinite(responseTimestamp) || responseTimestamp <= 0) {
        return { success: false, error: `Invalid responseTimestamp at false start trial ${i + 1}.` };
      }
      if (session) {
        if (responseTimestamp < (session.createdAt - sessionWindowMargin) || responseTimestamp > (session.expiresAt + sessionWindowMargin)) {
          return { success: false, error: `Trial ${i + 1} responseTimestamp is outside the authoritative session window.` };
        }
      }
      if (responseTimestamp < lastResponse) {
        return { success: false, error: `Non-chronological responseTimestamp sequence at trial ${i + 1}.` };
      }
      lastResponse = responseTimestamp;
    } else if (responseTimestamp === null) {
      // Timeout without response: stimulus presented, but response omitted
      if (stimulusTimestamp === null || !Number.isFinite(stimulusTimestamp) || stimulusTimestamp <= 0) {
        return { success: false, error: `Invalid stimulusTimestamp at timeout trial ${i + 1}.` };
      }
      if (session) {
        if (stimulusTimestamp < (session.createdAt - sessionWindowMargin) || stimulusTimestamp > (session.expiresAt + sessionWindowMargin)) {
          return { success: false, error: `Trial ${i + 1} stimulusTimestamp is outside the authoritative session window.` };
        }
      }
      if (stimulusTimestamp < lastStimulus) {
        return { success: false, error: `Non-chronological stimulusTimestamp sequence at trial ${i + 1}.` };
      }
      lastStimulus = stimulusTimestamp;
    } else {
      // Completed / responded observation: both stimulusTimestamp and responseTimestamp are present and responseTimestamp >= stimulusTimestamp
      if (stimulusTimestamp === null || !Number.isFinite(stimulusTimestamp) || stimulusTimestamp <= 0) {
        return { success: false, error: `Invalid stimulusTimestamp at trial ${i + 1}.` };
      }
      if (responseTimestamp === null || !Number.isFinite(responseTimestamp) || responseTimestamp < stimulusTimestamp) {
        return { success: false, error: `Invalid responseTimestamp < stimulusTimestamp at trial ${i + 1}.` };
      }
      if (reactionTime !== null && (!Number.isFinite(reactionTime) || reactionTime < 0)) {
        return { success: false, error: `Invalid reactionTime at trial ${i + 1}.` };
      }
      if (session) {
        if (stimulusTimestamp < (session.createdAt - sessionWindowMargin) || stimulusTimestamp > (session.expiresAt + sessionWindowMargin)) {
          return { success: false, error: `Trial ${i + 1} stimulusTimestamp is outside the authoritative session window.` };
        }
        if (responseTimestamp > (session.expiresAt + sessionWindowMargin)) {
          return { success: false, error: `Trial ${i + 1} responseTimestamp is outside the authoritative session window.` };
        }
      }
      if (stimulusTimestamp < lastStimulus) {
        return { success: false, error: `Non-chronological stimulusTimestamp sequence at trial ${i + 1}.` };
      }
      if (responseTimestamp < lastResponse) {
        return { success: false, error: `Non-chronological responseTimestamp sequence at trial ${i + 1}.` };
      }
      lastStimulus = stimulusTimestamp;
      lastResponse = responseTimestamp;

      const checkedRt = rawRt !== null ? rawRt : reactionTime;
      if (checkedRt !== null && checkedRt > 0) {
        const calculatedDelta = responseTimestamp - stimulusTimestamp;
        if (Math.abs(checkedRt - calculatedDelta) > 150) {
          return { success: false, error: `Trial ${i + 1} reactionTime (${checkedRt}ms) deviates excessively from response-stimulus timestamp delta (${calculatedDelta}ms).` };
        }
      }
    }

    // Strict schema validation on optional/flag fields (no truthy coercion)
    if (t.accuracy !== undefined && t.accuracy !== null) {
      if (typeof t.accuracy !== 'number' && typeof t.accuracy !== 'boolean') {
        return { success: false, error: `Trial ${i + 1} has invalid accuracy type. Must be number or boolean.` };
      }
      if (typeof t.accuracy === 'number' && t.accuracy !== 0 && t.accuracy !== 1 && t.accuracy !== 100) {
        return { success: false, error: `Trial ${i + 1} has invalid accuracy value (${t.accuracy}).` };
      }
    }
    if (t.falseStart !== undefined && t.falseStart !== null && typeof t.falseStart !== 'boolean') {
      return { success: false, error: `Trial ${i + 1} has invalid falseStart type. Must be boolean.` };
    }
    if (t.timedOut !== undefined && t.timedOut !== null && typeof t.timedOut !== 'boolean') {
      return { success: false, error: `Trial ${i + 1} has invalid timedOut type. Must be boolean.` };
    }
    if (t.valid !== undefined && t.valid !== null && typeof t.valid !== 'boolean') {
      return { success: false, error: `Trial ${i + 1} has invalid valid flag type. Must be boolean.` };
    }
  }

  // 2. Assessment Protocol Specific Validation & Server Metric Derivation
  const normType = normalizeAssessmentType(assessmentType);
  const ctx = { trials, ageGroup, session, sessionId };
  switch (normType) {
    case 'visual-reaction':
      return deriveVisualReactionMetrics(ctx);
    case 'direction':
      return deriveDirectionMetrics(ctx);
    case 'color-recognition':
      return deriveColorRecognitionMetrics(ctx);
    case 'block-memory':
      return deriveBlockMemoryMetrics(ctx);
    case 'number-memory':
      return deriveNumberMemoryMetrics(ctx);
    default:
      return { success: false, error: 'Unsupported assessmentType' };
  }
}
