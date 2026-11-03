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
