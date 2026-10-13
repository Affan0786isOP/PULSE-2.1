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
  /** ID for this submitted attempt, even when the prior best stays on the public board. */
  docId: string;
  /** Current public-best entry ID; differs from docId when this attempt does not replace it. */
  leaderboardDocId?: string;
  scoreMetric: number;
  provenanceToken: string;
  trialsDigest: string;
  derivedMetrics: Record<string, unknown>;
  alreadySubmitted?: boolean;
  pendingReview?: boolean;
}

export interface ILeaderboardService {
  submitLeaderboard(input: SubmitLeaderboardInput): Promise<SubmitLeaderboardResult>;
  getPublicLeaderboard(assessmentType?: string | null): Promise<LeaderboardEntryRecord[]>;
  verifyPublicEntryProvenance?(entryId: string): Promise<{ verified: boolean; reason?: string }>;
  getMyLeaderboardRank?(userId: string, assessmentType: string): Promise<{
    rank: number | null;
    scoreMetric: number | null;
    displayName: string | null;
    pendingReview: boolean;
  }>;
  deleteMyLeaderboardEntries?(userId: string, assessmentType?: string | null): Promise<{ deletedCount: number }>;
}
