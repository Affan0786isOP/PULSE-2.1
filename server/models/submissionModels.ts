import type { ExperimentSessionRecord } from './sessionModels';

export interface TrialObservationPayload {
  participantId: string;
  experimentId: string;
  condition?: string;
  test: string;
  trialNumber: number;
  trialIndex?: number;
  sequenceNumber?: number;
  attemptNumber?: number;
  stimulusTimestamp?: number | null;
  responseTimestamp?: number | null;
  reactionTime?: number | null;
  reactionTimeMs?: number | null;
  accuracy?: number;
  falseStart?: boolean;
  timedOut?: boolean;
  valid?: boolean;
  correct?: boolean | null;
  correctness?: boolean | null;
  timestamp: string;
  deviceCategory: 'mobile' | 'desktop';
  device: 'mobile' | 'desktop';
  screenWidth?: number | null;
  screenHeight?: number | null;
  ageGroup: string;
  [key: string]: unknown;
}

export interface ResearchSubmissionTxInput {
  docId: string;
  sessionId: string;
  userId: string;
  assessmentType: string;
  ageGroup: string;
  derivedMetrics: Record<string, unknown>;
  currentScore: number | null;
  isNewPersonalBest: boolean;
  previousPersonalBest: number | null;
  personalBest: number | null;
  completedAtTimestamp: number;
  completedAtMonth: string;
  provenanceToken: string;
  trialsDigest: string;
  publicDatasetDoc: Record<string, unknown>;
  trialPayloads: {
    id: string;
    data: TrialObservationPayload;
  }[];
}

export interface ResearchSubmissionTxResult {
  success: true;
  docId: string;
  sessionId: string;
  completedAtTimestamp: number;
  completedAtMonth: string;
  provenanceToken: string;
  trialsDigest: string;
  derivedMetrics: Record<string, unknown>;
  scoreMetric: number | null;
  isNewPersonalBest: boolean;
  previousPersonalBest: number | null;
  personalBest: number | null;
  [key: string]: unknown;
}
