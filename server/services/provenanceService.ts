import * as crypto from 'crypto';
import { deriveForeperiodCategory } from '../engines/reactionCalculator';

export function getProvenanceSecret() {
  const secret = process.env.PULSE_PROVENANCE_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('PULSE_PROVENANCE_SECRET environment variable is missing. Please configure it in the application settings.');
  }
  return secret;
}

/** HMAC-SHA256 (hex) over a payload using the server-side provenance secret. */
export function signProvenancePayload(payload: string): string {
  return crypto.createHmac('sha256', getProvenanceSecret()).update(payload).digest('hex');
}

export function normalizeSequenceForDigest(val: unknown): (number | string)[] | string | number | null {
  if (Array.isArray(val)) {
    return val.map(x => (typeof x === 'number' ? x : String(x)));
  }
  if (typeof val === 'string' || typeof val === 'number') {
    return val;
  }
  return null;
}

export function computeCanonicalTrialsDigest(trials: Record<string, any>[]): string {
  if (!Array.isArray(trials) || trials.length === 0) {
    return crypto.createHash('sha256').update('[]').digest('hex');
  }

  const normalizedTrials = trials.map((t: Record<string, any>, idx: number) => {
    const trialNumber = typeof t.trialNumber === 'number' ? t.trialNumber : (Number(t.trialNumber) || (idx + 1));
    const trialIndex = typeof t.trialIndex === 'number' ? t.trialIndex : (idx + 1);
    const sequenceNumber = typeof t.sequenceNumber === 'number' ? t.sequenceNumber : (idx + 1);
    const attemptNumber = typeof t.attemptNumber === 'number' ? t.attemptNumber : 1;
    const condition = typeof t.condition === 'string' ? t.condition : 'standard';

    const reactionTime = typeof t.reactionTime === 'number' ? t.reactionTime : (typeof t.reactionTimeMs === 'number' ? t.reactionTimeMs : null);
    const reactionTimeMs = reactionTime;
    const rawReactionTime = typeof t.rawReactionTime === 'number' ? t.rawReactionTime : (typeof t.rawLatencyMs === 'number' ? t.rawLatencyMs : null);
    const rawLatencyMs = rawReactionTime;
    const displayDelayOffsetMs = typeof t.displayDelayOffsetMs === 'number' ? t.displayDelayOffsetMs : null;

    const falseStart = t.falseStart === true;
    const timedOut = t.timedOut === true;
    const valid = typeof t.valid === 'boolean' ? t.valid : (!falseStart && !timedOut);
    const isVrtTrial = t.test === 'visual-reaction' || t.assessmentType === 'visual-reaction';
    const correct = typeof t.correct === 'boolean'
      ? t.correct
      : (typeof t.correctness === 'boolean'
          ? t.correctness
          : (typeof t.accuracy === 'number' ? t.accuracy === 1 : (isVrtTrial ? valid : null)));
    const correctness = correct;
    const accuracy = typeof t.accuracy === 'number' ? t.accuracy : (correct === true ? 1 : 0);

    const foreperiodMs = typeof t.foreperiodMs === 'number' ? t.foreperiodMs : null;
    const foreperiodCategory = typeof t.foreperiodCategory === 'string' && (t.foreperiodCategory === 'SHORT' || t.foreperiodCategory === 'LONG')
      ? t.foreperiodCategory
      : (typeof t.foreperiodMs === 'number' ? deriveForeperiodCategory(t.foreperiodMs) : null);

    const targetDirection = typeof t.targetDirection === 'string' ? t.targetDirection : null;
    const wordName = typeof t.wordName === 'string' ? t.wordName : null;
    const wordColor = typeof t.wordColor === 'string' ? t.wordColor : null;
    const instruction = typeof t.instruction === 'string' ? t.instruction : null;
    const userResponse = typeof t.userResponse === 'string' ? t.userResponse : null;

    const level = typeof t.level === 'number' ? t.level : null;
    const sequenceLength = typeof t.sequenceLength === 'number' ? t.sequenceLength : null;
    const generatedSequence = normalizeSequenceForDigest(t.generatedSequence);
    const playerSequence = normalizeSequenceForDigest(t.playerSequence);
    const correctSelections = typeof t.correctSelections === 'number' ? t.correctSelections : null;
    const responseDurationMs = typeof t.responseDurationMs === 'number' ? t.responseDurationMs : null;

    const stimulusTimestamp = typeof t.stimulusTimestamp === 'number' ? t.stimulusTimestamp : null;
    const responseTimestamp = typeof t.responseTimestamp === 'number' ? t.responseTimestamp : null;
    const stimulusScheduledAt = typeof t.stimulusScheduledAt === 'number' ? t.stimulusScheduledAt : null;
    const stimulusPresentedAt = typeof t.stimulusPresentedAt === 'number' ? t.stimulusPresentedAt : null;
    const responseDetectedAt = typeof t.responseDetectedAt === 'number' ? t.responseDetectedAt : null;
    const stimulusWallTimestamp = typeof t.stimulusWallTimestamp === 'number' ? t.stimulusWallTimestamp : null;
    const responseWallTimestamp = typeof t.responseWallTimestamp === 'number' ? t.responseWallTimestamp : null;
    const assessmentStartedAt = typeof t.assessmentStartedAt === 'number' ? t.assessmentStartedAt : null;
    const previousTrialEndedAt = typeof t.previousTrialEndedAt === 'number' ? t.previousTrialEndedAt : null;
    const interStimulusIntervalMs = typeof t.interStimulusIntervalMs === 'number' ? t.interStimulusIntervalMs : null;
    const interTrialIntervalMs = typeof t.interTrialIntervalMs === 'number' ? t.interTrialIntervalMs : null;
    const validity = typeof t.validity === 'string' ? t.validity : null;
    const qualityFlag = t.qualityFlag !== undefined && t.qualityFlag !== null ? String(t.qualityFlag) : null;
    const notes = typeof t.notes === 'string' ? t.notes : null;

    const deviceCategory = typeof t.deviceCategory === 'string' ? t.deviceCategory : null;
    const device = typeof t.device === 'string' ? t.device : null;
    const screenWidth = typeof t.screenWidth === 'number' && Number.isFinite(t.screenWidth) && t.screenWidth > 0 ? Number(t.screenWidth) : null;
    const screenHeight = typeof t.screenHeight === 'number' && Number.isFinite(t.screenHeight) && t.screenHeight > 0 ? Number(t.screenHeight) : null;

    const stimulusScheduledAtPerfMs = typeof t.stimulusScheduledAtPerfMs === 'number' && Number.isFinite(t.stimulusScheduledAtPerfMs)
      ? t.stimulusScheduledAtPerfMs
      : (typeof t.stimulusScheduledAt === 'number' && Number.isFinite(t.stimulusScheduledAt) ? t.stimulusScheduledAt : null);
    const stimulusPresentedAtPerfMs = typeof t.stimulusPresentedAtPerfMs === 'number' && Number.isFinite(t.stimulusPresentedAtPerfMs)
      ? t.stimulusPresentedAtPerfMs
      : (typeof t.stimulusPresentedAt === 'number' && Number.isFinite(t.stimulusPresentedAt) ? t.stimulusPresentedAt : null);
    const responseDetectedAtPerfMs = typeof t.responseDetectedAtPerfMs === 'number' && Number.isFinite(t.responseDetectedAtPerfMs)
      ? t.responseDetectedAtPerfMs
      : (typeof t.responseDetectedAt === 'number' && Number.isFinite(t.responseDetectedAt) ? t.responseDetectedAt : null);
    const previousTrialEndedAtPerfMs = typeof t.previousTrialEndedAtPerfMs === 'number' && Number.isFinite(t.previousTrialEndedAtPerfMs)
      ? t.previousTrialEndedAtPerfMs
      : (typeof t.previousTrialEndedAt === 'number' && Number.isFinite(t.previousTrialEndedAt) ? t.previousTrialEndedAt : null);

    return {
      accuracy,
      assessmentStartedAt,
      attemptNumber,
      condition,
      correct,
      correctSelections,
      correctness,
      device,
      deviceCategory,
      displayDelayOffsetMs,
      falseStart,
      foreperiodCategory,
      foreperiodMs,
      generatedSequence,
      instruction,
      interStimulusIntervalMs,
      interTrialIntervalMs,
      level,
      notes,
      playerSequence,
      previousTrialEndedAt,
      previousTrialEndedAtPerfMs,
      qualityFlag,
      rawLatencyMs,
      rawReactionTime,
      reactionTime,
      reactionTimeMs,
      responseDetectedAt,
      responseDetectedAtPerfMs,
      responseDurationMs,
      responseTimestamp,
      responseWallTimestamp,
      screenHeight,
      screenWidth,
      sequenceLength,
      sequenceNumber,
      stimulusPresentedAt,
      stimulusPresentedAtPerfMs,
      stimulusScheduledAt,
      stimulusScheduledAtPerfMs,
      stimulusTimestamp,
      stimulusWallTimestamp,
      targetDirection,
      timedOut,
      trialIndex,
      trialNumber,
      userResponse,
      valid,
      validity,
      wordColor,
      wordName
    };
  });

  return crypto.createHash('sha256')
    .update(JSON.stringify(normalizedTrials))
    .digest('hex');
}

export function safeCompareHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a.trim(), 'hex');
  const bufB = Buffer.from(b.trim(), 'hex');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
