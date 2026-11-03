export interface DatasetObservation {
  id: string;
  assessmentType: string;
  ageGroup?: string;
  completedAtMonth?: string;
  device?: string;
  deviceCategory?: string;
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
  standardDeviation?: number;
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
  errorRate?: number;
  congruentAvg?: number;
  incongruentAvg?: number;
  interferenceCost?: number;
  totalTrials?: number;
  progressionTrials?: Record<string, unknown>[];
  [key: string]: any;
}

export interface DatasetStats {
  totalObservations: number;
}

export interface UnrolledDatasetTrial {
  id: string;
  participantId: string;
  experimentId: string;
  condition: string;
  test: string;
  trialNumber: number;
  trialIndex?: number;
  sequenceNumber?: number;
  attemptNumber?: number;
  stimulusTimestamp: number;
  responseTimestamp: number;
  reactionTime: number;
  accuracy: number;
  correct?: boolean;
  valid?: boolean;
  timedOut: boolean;
  falseStart: boolean;
  timestamp: string;
  completedAtMonth?: string;
  device: string;
  screenWidth: number;
  screenHeight: number;
  ageGroup?: string;
  foreperiodMs?: number;
  [key: string]: any;
}
