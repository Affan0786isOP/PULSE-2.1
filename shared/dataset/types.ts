export interface DatasetObservation {
  id: string;
  ageGroup?: string;
  assessmentType: string;
  completedAtMonth?: string;
  completedAtTimestamp?: number;
  device?: string;
  deviceCategory?: string;
  progressionTrials?: any[];
  averageReactionTime?: number;
  medianReactionTime?: number;
  fastestReactionTime?: number;
  standardDeviation?: number;
  totalFalseStarts?: number;
  totalTrials?: number;
  errorRate?: number;
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
  stimulusTimestamp: number;
  responseTimestamp: number;
  reactionTime: number;
  accuracy: number;
  correct?: boolean;
  valid?: boolean;
  timedOut: boolean;
  falseStart: boolean;
  timestamp: string;
  device: string;
  screenWidth: number;
  screenHeight: number;
  ageGroup?: string;
  foreperiodMs?: number;
  [key: string]: any;
}
