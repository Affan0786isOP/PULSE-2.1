export const VALID_AGE_GROUPS = [
  'Children (8–12)',
  'Adolescents (13–17)',
  'Young adults (18–25)',
  'Adults (26–40)',
  'Middle-aged adults (41–60)',
  'Older adults (61–75)',
  'Seniors (76+)',
] as const;

// Centralized VRT Protocol Constants
export const VRT_MIN_FOREPERIOD_MS = 100;
export const VRT_MAX_FOREPERIOD_MS = 3000;
export const VRT_SHORT_FOREPERIOD_MIN_MS = 100;
export const VRT_SHORT_FOREPERIOD_MAX_MS = 500;
export const VRT_LONG_FOREPERIOD_MIN_MS = 501;
export const VRT_LONG_FOREPERIOD_MAX_MS = 3000;
export const VRT_TIMEOUT_MS = 3000;
export const VRT_MIN_VALID_RT_MS = 80;

export type ForeperiodCategory = 'SHORT' | 'LONG';

export function deriveForeperiodCategory(foreperiodMs: number | null | undefined): ForeperiodCategory | null {
  if (typeof foreperiodMs !== 'number' || !Number.isFinite(foreperiodMs) || !Number.isInteger(foreperiodMs)) return null;
  if (foreperiodMs >= 100 && foreperiodMs <= 500) return 'SHORT';
  if (foreperiodMs >= 501 && foreperiodMs <= 3000) return 'LONG';
  return null;
}

export function generateVrtForeperiod(prng: () => number): { foreperiodMs: number; foreperiodCategory: ForeperiodCategory } {
  const isShort = prng() < 0.5;
  const foreperiodMs = isShort
    ? Math.floor(prng() * (VRT_SHORT_FOREPERIOD_MAX_MS - VRT_SHORT_FOREPERIOD_MIN_MS + 1)) + VRT_SHORT_FOREPERIOD_MIN_MS
    : Math.floor(prng() * (VRT_LONG_FOREPERIOD_MAX_MS - VRT_LONG_FOREPERIOD_MIN_MS + 1)) + VRT_LONG_FOREPERIOD_MIN_MS;
  const foreperiodCategory: ForeperiodCategory = foreperiodMs <= 500 ? 'SHORT' : 'LONG';
  return { foreperiodMs, foreperiodCategory };
}

export const MONTH_FORMAT_REGEX = /^[0-9]{4}-(0[1-9]|1[0-2])$/;

export const COMMON_DATASET_KEYS = [
  'ageGroup',
  'assessmentType',
  'schemaVersion',
  'assessmentVersion',
  'protocolVersion',
  'datasetSchemaVersion',
  'metricsVersion',
  'completedAtMonth',
  'provenanceToken',
  'deviceCategory',
  'device',
  'progressionTrials',
] as const;

export const VISUAL_REACTION_KEYS = [
  ...COMMON_DATASET_KEYS,
  'averageReactionTime',
  'fastestReactionTime',
  'slowestReactionTime',
  'medianReactionTime',
  'consistency',
  'totalFalseStarts',
  'temporalDynamics',
] as const;

export const DIRECTION_KEYS = [
  ...COMMON_DATASET_KEYS,
  'accuracy',
  'totalCorrect',
  'totalTrials',
  'totalIncorrect',
  'totalFalseStarts',
  'averageReactionTime',
  'fastestReactionTime',
  'slowestReactionTime',
  'medianReactionTime',
] as const;

export const COLOR_KEYS = [
  ...COMMON_DATASET_KEYS,
  'accuracy',
  'correctCount',
  'averageReactionTime',
  'fastestReactionTime',
  'slowestReactionTime',
  'medianReactionTime',
  'congruentAvg',
  'incongruentAvg',
  'interferenceCost',
] as const;

export const MEMORY_KEYS = [
  ...COMMON_DATASET_KEYS,
  'highestLevel',
  'longestSeq',
  'totalCorrect',
  'totalAttempts',
  'overallAccuracy',
  'totalTimeMs',
] as const;

export function hasOnlyKeys(obs: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  if (!obs || typeof obs !== 'object') return false;
  const keys = Object.keys(obs).filter(k => k !== 'id');
  return keys.every(k => allowedKeys.includes(k));
}

/**
 * Validates common baseline research schema fields matching Firestore publicDataset schema v1
 */
export function isValidBaseObservation(obs: Record<string, unknown>): boolean {
  if (!obs || typeof obs !== 'object') return false;

  // Versions
  if (typeof obs.schemaVersion !== 'number' || obs.schemaVersion !== 1) return false;
  if (typeof obs.assessmentVersion !== 'string' || !obs.assessmentVersion) return false;
  if (typeof obs.protocolVersion !== 'string' || !obs.protocolVersion) return false;
  if (typeof obs.datasetSchemaVersion !== 'string' || !obs.datasetSchemaVersion) return false;
  if (typeof obs.metricsVersion !== 'string' || !obs.metricsVersion) return false;

  // Base fields
  if (typeof obs.ageGroup !== 'string' || !VALID_AGE_GROUPS.includes(obs.ageGroup as typeof VALID_AGE_GROUPS[number])) return false;
  if (typeof obs.completedAtMonth !== 'string' || !MONTH_FORMAT_REGEX.test(obs.completedAtMonth)) return false;

  // Security & Provenance
  if (typeof obs.provenanceToken !== 'string' || !/^[a-f0-9]{64}$/.test(obs.provenanceToken)) return false;

  // Device
  if (typeof obs.deviceCategory !== 'string' || (obs.deviceCategory !== 'desktop' && obs.deviceCategory !== 'mobile')) return false;
  if (typeof obs.device !== 'string' || (obs.device !== 'desktop' && obs.device !== 'mobile')) return false;

  // Progression Trials
  if (!Array.isArray(obs.progressionTrials) || obs.progressionTrials.length > 5) return false;
  for (const pt of obs.progressionTrials) {
    if (!pt || typeof pt !== 'object') return false;
    if (typeof pt.trialNumber !== 'number' || !Number.isInteger(pt.trialNumber) || pt.trialNumber < 1) return false;
    if (pt.reactionTime !== undefined && pt.reactionTime !== null && (typeof pt.reactionTime !== 'number' || !Number.isFinite(pt.reactionTime) || pt.reactionTime < 0)) return false;
    if (pt.inputLatencyMs !== undefined && pt.inputLatencyMs !== null && (typeof pt.inputLatencyMs !== 'number' || !Number.isFinite(pt.inputLatencyMs) || pt.inputLatencyMs < 0)) return false;
    if (pt.metricType !== undefined && pt.metricType !== 'reaction_time' && pt.metricType !== 'input_latency') return false;
    if (typeof pt.falseStart !== 'boolean') return false;
  }

  // Strict privacy boundary: forbid direct user identity / non-public properties
  const forbiddenFields = ['userId', 'uid', 'displayName', 'username', 'email', 'completedAt', 'sessionId', 'participantId', 'participantHash', 'completedAtTimestamp'];
  for (const field of forbiddenFields) {
    if (field in obs) return false;
  }

  return true;
}

/**
 * Validates reaction metrics (average, fastest, slowest, median)
 * Physiological floor is 80ms (human visual-motor transduction threshold)
 */
export function isValidReactionMetrics(obs: Record<string, unknown>): boolean {
  return (
    typeof obs.averageReactionTime === 'number' &&
    Number.isFinite(obs.averageReactionTime) &&
    obs.averageReactionTime >= 80 &&
    obs.averageReactionTime <= 3600000 &&
    typeof obs.fastestReactionTime === 'number' &&
    Number.isFinite(obs.fastestReactionTime) &&
    obs.fastestReactionTime >= 80 &&
    obs.fastestReactionTime <= obs.averageReactionTime &&
    typeof obs.slowestReactionTime === 'number' &&
    Number.isFinite(obs.slowestReactionTime) &&
    obs.slowestReactionTime >= obs.averageReactionTime &&
    obs.slowestReactionTime <= 3600000 &&
    typeof obs.medianReactionTime === 'number' &&
    Number.isFinite(obs.medianReactionTime) &&
    obs.medianReactionTime >= 80 &&
    obs.medianReactionTime <= 3600000
  );
}

/**
 * Validates optional reaction metrics (for Direction and Color tests where reaction time metrics are present only when valid trials exist)
 */
export function isValidOptionalReactionMetrics(obs: Record<string, unknown>): boolean {
  const hasAvg = 'averageReactionTime' in obs && obs.averageReactionTime !== undefined;
  const hasFast = 'fastestReactionTime' in obs && obs.fastestReactionTime !== undefined;
  const hasSlow = 'slowestReactionTime' in obs && obs.slowestReactionTime !== undefined;
  const hasMed = 'medianReactionTime' in obs && obs.medianReactionTime !== undefined;

  if (hasAvg || hasFast || hasSlow || hasMed) {
    return isValidReactionMetrics(obs);
  }
  return true;
}

/**
 * Validates VRT temporal dynamics object
 */
export function isValidTemporalDynamics(td: unknown): boolean {
  if (!td || typeof td !== 'object') return false;
  const obj = td as Record<string, unknown>;

  if (obj.analysisVersion !== 'temporal-v1') return false;

  if (obj.foreperiodSensitivity !== null && (typeof obj.foreperiodSensitivity !== 'number' || !Number.isFinite(obj.foreperiodSensitivity))) return false;
  if (obj.foreperiodTransitionCost !== null && (typeof obj.foreperiodTransitionCost !== 'number' || !Number.isFinite(obj.foreperiodTransitionCost))) return false;
  if (obj.temporalSurpriseCost !== null && (typeof obj.temporalSurpriseCost !== 'number' || !Number.isFinite(obj.temporalSurpriseCost))) return false;
  if (obj.adaptationSlope !== null && (typeof obj.adaptationSlope !== 'number' || !Number.isFinite(obj.adaptationSlope))) return false;
  if (obj.habituationIndex !== null && (typeof obj.habituationIndex !== 'number' || !Number.isFinite(obj.habituationIndex))) return false;
  if (typeof obj.temporalStability !== 'number' || !Number.isFinite(obj.temporalStability) || obj.temporalStability < 0 || obj.temporalStability > 1) return false;

  for (const winKey of ['shortWindow', 'longWindow'] as const) {
    const win = obj[winKey] as any;
    if (!win || typeof win !== 'object') return false;
    if (!Array.isArray(win.windowRangeMs) || win.windowRangeMs.length !== 2) return false;
    if (typeof win.sampleAvailable !== 'boolean') return false;
    if (typeof win.count !== 'number' || !Number.isInteger(win.count) || win.count < 0) return false;
    if (win.meanRt !== null && (typeof win.meanRt !== 'number' || !Number.isFinite(win.meanRt) || win.meanRt < 80)) return false;
  }

  return true;
}

/**
 * Protocol validator for Visual Reaction
 */
export function isValidVisualReactionObservation(obs: Record<string, unknown>): boolean {
  if (!hasOnlyKeys(obs, VISUAL_REACTION_KEYS)) return false;
  if (!isValidBaseObservation(obs)) return false;
  if (obs.assessmentType !== 'visual-reaction') return false;
  if (!isValidReactionMetrics(obs)) return false;

  if (
    typeof obs.consistency !== 'number' ||
    !Number.isFinite(obs.consistency) ||
    obs.consistency < 0 ||
    obs.consistency > 100 ||
    typeof obs.totalFalseStarts !== 'number' ||
    !Number.isInteger(obs.totalFalseStarts) ||
    obs.totalFalseStarts < 0 ||
    obs.totalFalseStarts > 100
  ) {
    return false;
  }

  if ('temporalDynamics' in obs && obs.temporalDynamics !== undefined) {
    if (!isValidTemporalDynamics(obs.temporalDynamics)) return false;
  }

  return true;
}

/**
 * Protocol validator for Direction Test
 */
export function isValidDirectionObservation(obs: Record<string, unknown>): boolean {
  if (!hasOnlyKeys(obs, DIRECTION_KEYS)) return false;
  if (!isValidBaseObservation(obs)) return false;
  if (obs.assessmentType !== 'direction') return false;
  if (!isValidOptionalReactionMetrics(obs)) return false;

  if (
    typeof obs.totalCorrect !== 'number' ||
    !Number.isInteger(obs.totalCorrect) ||
    obs.totalCorrect < 0 ||
    obs.totalCorrect > 10 ||
    typeof obs.totalTrials !== 'number' ||
    obs.totalTrials !== 10 ||
    typeof obs.totalIncorrect !== 'number' ||
    !Number.isInteger(obs.totalIncorrect) ||
    obs.totalIncorrect < 0 ||
    obs.totalIncorrect > 10 ||
    typeof obs.totalFalseStarts !== 'number' ||
    !Number.isInteger(obs.totalFalseStarts) ||
    obs.totalFalseStarts < 0 ||
    typeof obs.accuracy !== 'number' ||
    !Number.isFinite(obs.accuracy) ||
    obs.accuracy < 0 ||
    obs.accuracy > 100
  ) {
    return false;
  }

  return true;
}

/**
 * Protocol validator for Color Recognition Test
 */
export function isValidColorObservation(obs: Record<string, unknown>): boolean {
  if (!hasOnlyKeys(obs, COLOR_KEYS)) return false;
  if (!isValidBaseObservation(obs)) return false;
  if (obs.assessmentType !== 'color-recognition') return false;
  if (!isValidOptionalReactionMetrics(obs)) return false;

  if (
    typeof obs.correctCount !== 'number' ||
    !Number.isInteger(obs.correctCount) ||
    obs.correctCount < 0 ||
    obs.correctCount > 15 ||
    typeof obs.accuracy !== 'number' ||
    !Number.isFinite(obs.accuracy) ||
    obs.accuracy < 0 ||
    obs.accuracy > 100
  ) {
    return false;
  }

  if ('congruentAvg' in obs && obs.congruentAvg !== undefined && (typeof obs.congruentAvg !== 'number' || !Number.isFinite(obs.congruentAvg) || obs.congruentAvg < 80)) return false;
  if ('incongruentAvg' in obs && obs.incongruentAvg !== undefined && (typeof obs.incongruentAvg !== 'number' || !Number.isFinite(obs.incongruentAvg) || obs.incongruentAvg < 80)) return false;
  if ('interferenceCost' in obs && obs.interferenceCost !== undefined && (typeof obs.interferenceCost !== 'number' || !Number.isFinite(obs.interferenceCost))) return false;

  return true;
}

/**
 * Protocol validator for Memory Tests (Block Memory & Number Memory)
 */
export function isValidMemoryObservation(obs: Record<string, unknown>): boolean {
  if (!hasOnlyKeys(obs, MEMORY_KEYS)) return false;
  if (!isValidBaseObservation(obs)) return false;
  if (obs.assessmentType !== 'block-memory' && obs.assessmentType !== 'number-memory') return false;

  if (
    typeof obs.highestLevel !== 'number' ||
    !Number.isInteger(obs.highestLevel) ||
    obs.highestLevel < 0 ||
    obs.highestLevel > 100 ||
    typeof obs.longestSeq !== 'number' ||
    !Number.isInteger(obs.longestSeq) ||
    obs.longestSeq < 0 ||
    obs.longestSeq > 100 ||
    obs.highestLevel > obs.longestSeq
  ) {
    return false;
  }

  if (
    typeof obs.totalCorrect !== 'number' ||
    !Number.isInteger(obs.totalCorrect) ||
    obs.totalCorrect < 0 ||
    obs.totalCorrect > 1000 ||
    typeof obs.totalAttempts !== 'number' ||
    !Number.isInteger(obs.totalAttempts) ||
    obs.totalAttempts <= 0 ||
    obs.totalAttempts > 1000 ||
    obs.totalCorrect > obs.totalAttempts
  ) {
    return false;
  }

  if (
    typeof obs.overallAccuracy !== 'number' ||
    !Number.isFinite(obs.overallAccuracy) ||
    obs.overallAccuracy < 0 ||
    obs.overallAccuracy > 100
  ) {
    return false;
  }

  if (
    typeof obs.totalTimeMs !== 'number' ||
    !Number.isFinite(obs.totalTimeMs) ||
    obs.totalTimeMs <= 0 ||
    obs.totalTimeMs > 3600000
  ) {
    return false;
  }

  return true;
}

export type DatasetObservation = Record<string, any>;

/**
 * Master protocol-specific validator
 */
export function isValidProtocolObservation(obs: DatasetObservation, protocolFilter?: string): boolean {
  const targetProtocol = protocolFilter && protocolFilter !== 'All' ? protocolFilter : obs.assessmentType;

  switch (targetProtocol) {
    case 'visual-reaction':
      return isValidVisualReactionObservation(obs);
    case 'direction':
      return isValidDirectionObservation(obs);
    case 'color-recognition':
      return isValidColorObservation(obs);
    case 'block-memory':
    case 'number-memory':
      return isValidMemoryObservation(obs);
    default:
      return (
        isValidVisualReactionObservation(obs) ||
        isValidDirectionObservation(obs) ||
        isValidColorObservation(obs) ||
        isValidMemoryObservation(obs)
      );
  }
}
