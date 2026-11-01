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

