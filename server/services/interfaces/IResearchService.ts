
export interface SubmitResearchInput {
  sessionId: string;
  userId: string;
  assessmentType: string;
  ageGroup?: string;
  trials: unknown[];
  idempotencyKey?: string | null;
  serverDeviceCategory: 'mobile' | 'desktop';
}

export interface SubmitResearchResult {
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
}

export interface IResearchService {
  submitResearch(input: SubmitResearchInput): Promise<SubmitResearchResult>;
}
