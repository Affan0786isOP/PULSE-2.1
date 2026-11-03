export interface RawAssessmentResultRecord {
  id: string;
  sessionId?: string;
  participantId?: string;
  assessmentType?: string;
  ageGroup?: string;
  assessmentVersion?: string;
  protocolVersion?: string;
  datasetSchemaVersion?: string;
  metricsVersion?: string;
  derivedMetrics?: Record<string, unknown>;
  temporalDynamics?: unknown;
  scoreMetric?: number | null;
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
  isNewPersonalBest?: boolean;
  completedAtTimestamp?: number;
  completedAtMonth?: string;
  provenanceToken?: string;
  trialsDigest?: string;
  createdAt?: number;
}

export interface DatasetQueryOptions {
  assessmentType?: string | null;
  ageGroup?: string | null;
  completedAtMonth?: string | null;
  limitCount: number;
  cursor?: string | null;
}

export interface RawDatasetQueryResult {
  results: RawAssessmentResultRecord[];
  sessionMap: Map<string, Record<string, unknown>>;
  trialsBySession: Map<string, Record<string, unknown>[]>;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface RawDatasetSummaryCounts {
  totalRecords: number;
  totalTrials: number;
  counts: Record<string, number>;
}

export interface PublicDatasetRecord {
  id: string;
  assessmentType: string;
  ageGroup?: string;
  completedAtMonth?: string;
  completedAtTimestamp?: number;
  deviceCategory?: string;
  device?: string;
  inputModality?: string;
  displayRefreshRateHz?: number;
  refreshRateHz?: number;
  provenanceToken?: string;
  trialsDigest?: string;
  scoreMetric?: number | null;
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
  progressionTrials: Record<string, unknown>[];
}
