export interface RawPublicDatasetRecord {
  id: string;
  [key: string]: unknown;
}

export interface DatasetQueryOptions {
  assessmentType?: string | null;
  ageGroup?: string | null;
  completedAtMonth?: string | null;
  limitCount: number;
  cursor?: string | null;
}

export interface RawDatasetQueryResult {
  results: RawPublicDatasetRecord[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface RawDatasetSummaryCounts {
  totalRecords: number;
  totalTrials: number;
  counts: Record<string, number>;
}

export interface PublicDatasetSummaryDocument extends RawDatasetSummaryCounts {
  schemaVersion: 1;
  lastUpdatedAt: number;
  migrationInProgress?: boolean;
  migrationStartedAt?: number | null;
}

export interface PublicDatasetRecord {
  id: string;
  assessmentType: string;
  ageGroup?: string;
  completedAtMonth?: string;
  deviceCategory?: string;
  device?: string;
  inputModality?: string;
  displayRefreshRateHz?: number;
  refreshRateHz?: number;
  schemaVersion?: number;
  assessmentVersion?: string;
  protocolVersion?: string;
  datasetSchemaVersion?: string;
  metricsVersion?: string;
  provenanceVersion?: string;
  provenanceToken?: string;
  trialsDigest?: string;
  scoreMetric?: number | null;
  consistency?: number;
  totalFalseStarts?: number;
  totalCorrect?: number;
  totalIncorrect?: number;
  correctCount?: number;
  totalAttempts?: number;
  overallAccuracy?: number;
  totalTimeMs?: number;
  temporalDynamics?: Record<string, unknown>;
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
  totalTrials?: number;
  progressionTrials: Record<string, unknown>[];
}
