import type { LeaderboardEntryRecord } from '../../models/leaderboardModels';

export interface SubmitLeaderboardInput {
  sessionId: string;
  userId: string;
  displayName: string;
  assessmentType: string;
  ageGroup?: string;
  trials: unknown[];
  idempotencyKey?: string | null;
}

export interface SubmitLeaderboardResult {
  docId: string;
  scoreMetric: number;
  provenanceToken: string;
  trialsDigest: string;
  derivedMetrics: Record<string, unknown>;
  alreadySubmitted?: boolean;
}

export interface ILeaderboardService {
  submitLeaderboard(input: SubmitLeaderboardInput): Promise<SubmitLeaderboardResult>;
  getPublicLeaderboard(assessmentType?: string | null): Promise<LeaderboardEntryRecord[]>;
}
