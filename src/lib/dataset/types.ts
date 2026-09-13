/**
 * PULSE Dataset Types & Scientific Schemas
 * ==============================================================================
 * Authoritative TypeScript definitions for normalized research observations,
 * statistical metrics, histogram representations, raw trials, and filter states.
 * ==============================================================================
 */

export type ProtocolType = 
  | 'visual-reaction' 
  | 'direction' 
  | 'color-recognition' 
  | 'colour-recognition' 
  | 'block-memory' 
  | 'number-memory'
  | 'all'
  | 'unknown';

export type AssessmentId =
  | 'visual-reaction'
  | 'direction'
  | 'colour-recognition'
  | 'block-memory'
  | 'number-memory';

export type DatasetMode = 'assessment' | 'data-explorer';

export const AUTHORITATIVE_AGE_GROUPS = [
  'Children (8–12)',
  'Adolescents (13–17)',
  'Young adults (18–25)',
  'Adults (26–40)',
  'Middle-aged adults (41–60)',
  'Older adults (61–75)',
  'Seniors (76+)',
] as const;

export type AuthoritativeAgeGroup = typeof AUTHORITATIVE_AGE_GROUPS[number];

export type DemographicAgeGroup =
  | 'children' 
  | 'adolescents' 
  | 'young-adults' 
  | 'adults' 
  | 'middle-aged' 
  | 'older-adults' 
  | 'seniors'
  | 'legacy-18-24'
  | 'legacy-25-34'
  | 'legacy-35-54'
  | 'legacy-55-64'
  | 'legacy-65-plus'
  | 'unspecified'
  | 'all';

export type DemographicCohort = DemographicAgeGroup;

export type InputModality = 'touch' | 'mouse' | 'keyboard' | 'unknown' | 'all';

export type ValidityState = 'VALID' | 'FALSE_START' | 'TIMEOUT' | 'INCORRECT' | 'ABORTED';

/**
 * Raw Progression Trial stored in PULSE session record
 */
export interface RawProgressionTrial {
  trialNumber?: number;
  trialIndex?: number;
  sequenceNumber?: number;
  attemptNumber?: number;
  reactionTime?: number;
  inputLatencyMs?: number;
  rawRt?: number;
  rawReactionTime?: number;
  rawLatencyMs?: number;
  displayDelayOffsetMs?: number;
  correct?: boolean;
  correctness?: boolean;
  accuracy?: number;
  valid?: boolean;
  validity?: string;
  qualityFlag?: string;
  falseStart?: boolean;
  timedOut?: boolean;
  foreperiodMs?: number;
  foreperiodCategory?: 'SHORT' | 'LONG' | string;
  stimulusScheduledAt?: number;
  stimulusScheduledAtPerfMs?: number;
  stimulusPresentedAt?: number;
  stimulusPresentedAtPerfMs?: number;
  responseDetectedAt?: number;
  responseDetectedAtPerfMs?: number;
  targetDirection?: string;
  chosenDirection?: string;
  userResponse?: string;
  targetColor?: string;
  chosenColor?: string;
  wordName?: string;
  wordColor?: string;
  condition?: 'congruent' | 'incongruent' | string;
  instruction?: string;
  level?: number;
  sequenceLength?: number;
  responseDurationMs?: number;
  interTapTimeMs?: number;
  inputModality?: InputModality;
  inputMethod?: string;
  refreshRateHz?: number;
}

/**
 * Authoritative session record from Firestore/Server pipeline
 */
export interface ResearchSessionRecord {
  id: string;
  assessmentType: string;
  ageGroup?: string;
  completedAtMonth?: string;
  completedAtTimestamp?: number;
  deviceCategory?: string;
  device?: string;
  inputModality?: string;
  inputMethod?: string;
  displayRefreshRateHz?: number;
  refreshRateHz?: number;
  refreshRate?: number;
  provenanceToken?: string;
  trialsDigest?: string;
  scoreMetric?: number;
  averageReactionTime?: number;
  medianReactionTime?: number;
  fastestReactionTime?: number;
  slowestReactionTime?: number;
  longestSeq?: number;
  highestLevel?: number;
  accuracy?: number;
  congruentAvg?: number;
  incongruentAvg?: number;
  interferenceCost?: number;
  progressionTrials?: RawProgressionTrial[];
}

/**
 * Canonical observation record extracted from an individual trial
 */
export interface DatasetObservation {
  obsId: string;
  sessionId: string;
  assessmentType: string;
  rawAssessmentType?: string | null;
  trialIndex: number;
  completedAtMonth: string; // YYYY-MM or 'unspecified'
  completedAtTimestamp?: number;
  ageGroup: string;
  deviceCategory?: 'mobile' | 'desktop' | 'unknown' | string;
  inputModality: InputModality;
  refreshRateHz: number | null;
  latencyMs: number | null;
  rawLatencyMs?: number | null;
  displayDelayOffsetMs?: number | null;
  isCorrect: boolean | null;
  isValid: boolean;
  validityStatus: ValidityState;
  qualityFlag?: string | null;
  foreperiodMs?: number | null;
  foreperiodCategory?: 'SHORT' | 'LONG' | null;
  targetDirection?: string | null;
  chosenDirection?: string | null;
  userResponse?: string | null;
  targetColor?: string | null;
  chosenColor?: string | null;
  wordName?: string | null;
  wordColor?: string | null;
  condition?: 'congruent' | 'incongruent' | string | null;
  instruction?: string | null;
  level?: number | null;
  sequenceLength?: number | null;
  interTapTimeMs?: number | null;
  responseDurationMs?: number | null;
  stimulusScheduledAtPerfMs?: number | null;
  stimulusPresentedAtPerfMs?: number | null;
  responseDetectedAtPerfMs?: number | null;
  provenanceToken?: string | null;
  trialsDigest?: string | null;
}

/**
 * Filter parameters applied globally to the dataset explorer
 */
export interface DatasetFilters {
  assessmentType: ProtocolType;
  ageGroup: DemographicCohort;
  completedAtMonth: string; // 'all' | 'YYYY-MM'
  temporalBucket?: string;
  inputModality: InputModality;
  deviceCategory?: 'all' | 'desktop' | 'mobile' | 'unknown';
  refreshRate: string; // 'all' | '60' | '120' | '144plus'
}

/**
 * Percentiles & parametric distribution parameters
 */
export interface NumericDistributionStats {
  count: number;
  mean: number | null;
  median: number | null;
  p10: number | null;
  p25: number | null;
  p75: number | null;
  p90: number | null;
  min: number | null;
  max: number | null;
  stdDev: number | null;
  iqr: number | null;
}

/**
 * Histogram bin distribution for charts
 */
export interface HistogramBin {
  binStart: number;
  binEnd: number;
  binLabel: string;
  count: number;
  percentage: number;
}

/**
 * Subgroup breakdown entry
 */
export interface SubgroupMetric {
  groupKey: string;
  groupLabel: string;
  sampleCount: number;
  validCount: number;
  meanLatency: number | null;
  medianLatency: number | null;
  accuracyRate: number | null;
  p10Latency: number | null;
  p90Latency: number | null;
}

/**
 * General Summary Statistics
 */
export interface DatasetSummaryStats {
  totalObservations: number;
  validObservations: number;
  totalSessions: number;
  accuracyRate: number | null;
  falseStartRate: number | null;
  medianLatencyMs: number | null;
  meanLatencyMs: number | null;
  p10LatencyMs: number | null;
  p90LatencyMs: number | null;
  iqrLatencyMs: number | null;
  protocolBreakdown: Record<string, number>;
  ageGroupBreakdown: Record<string, number>;
  modalityBreakdown: Record<string, number>;
}

/**
 * Visual Reaction Specific Statistics
 */
export interface VrtStats {
  medianRt: number | null;
  meanRt: number | null;
  p10Rt: number | null;
  p90Rt: number | null;
  iqrRt: number | null;
  stdDevRt: number | null;
  falseStartRate: number | null;
  shortForeperiodMedianRt: number | null;
  longForeperiodMedianRt: number | null;
  histogram: HistogramBin[];
  foreperiodBreakdown: {
    category: string;
    count: number;
    medianRt: number | null;
    meanRt: number | null;
  }[];
}

/**
 * Direction Reaction Specific Statistics
 */
export interface DrtStats {
  medianRt: number | null;
  meanRt: number | null;
  p10Rt: number | null;
  p90Rt: number | null;
  iqrRt: number | null;
  accuracyRate: number | null;
  errorRate: number | null;
  choiceOverheadMs: number | null;
  histogram: HistogramBin[];
  directionBreakdown: {
    direction: string;
    count: number;
    accuracy: number | null;
    medianRt: number | null;
  }[];
}

/**
 * Colour Recognition Specific Statistics
 */
export interface CrtStats {
  congruentMeanRt: number | null;
  incongruentMeanRt: number | null;
  interferenceCost: number | null;
  overallMedianRt: number | null;
  accuracyRate: number | null;
  conditionBreakdown: {
    condition: string;
    count: number;
    meanRt: number | null;
    medianRt: number | null;
    accuracy: number | null;
  }[];
  histogram: HistogramBin[];
}

/**
 * Block Memory Specific Statistics
 */
export interface BmtStats {
  medianSpan: number | null;
  maxSpan: number | null;
  meanInterTapRt: number | null;
  successRate: number | null;
  spanDistribution: {
    span: number;
    count: number;
    percentage: number;
  }[];
  progressionCurve: {
    level: number;
    attemptCount: number;
    accuracyRate: number | null;
  }[];
}

/**
 * Number Memory Specific Statistics
 */
export interface NmtStats {
  medianDigitSpan: number | null;
  maxDigitSpan: number | null;
  meanEntryLatency: number | null;
  recallAccuracyRate: number | null;
  digitSpanDistribution: {
    digitLength: number;
    count: number;
    percentage: number;
  }[];
  progressionCurve: {
    digitLength: number;
    attemptCount: number;
    accuracyRate: number | null;
  }[];
}
