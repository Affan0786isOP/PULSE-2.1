import type { PublicDatasetRecord } from '../../models/researchModels';

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

export interface DatasetQueryInput {
  assessmentType?: string | null;
  ageGroup?: string | null;
  completedAtMonth?: string | null;
  limitCount: number;
  cursor?: string | null;
}

export interface DatasetQueryResultDto {
  records: PublicDatasetRecord[];
  count: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface DatasetSummaryResultDto {
  totalRecords: number;
  totalTrials: number;
  counts: Record<string, number>;
}

export interface IResearchService {
  submitResearch(input: SubmitResearchInput): Promise<SubmitResearchResult>;
  getDataset(query: DatasetQueryInput): Promise<DatasetQueryResultDto>;
  getDatasetSummary(): Promise<DatasetSummaryResultDto>;
}
