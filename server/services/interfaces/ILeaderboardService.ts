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
  /** Stable attempt receipt ID; not necessarily a ranked public entry. */
  attemptId?: string;
  /** Current public-best entry ID, null when no visible best exists. */
  leaderboardDocId?: string | null;
  leaderboardEntryId?: string | null;
  entryAvailable?: boolean;
  receiptAvailable?: boolean;
  attemptProvenanceToken?: string;
  leaderboardProvenanceToken?: string | null;
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
  verifySubmissionProvenance?(attemptId: string): Promise<{ verified: boolean; publiclyVisible: boolean; pendingReview: boolean; reason?: string }>;
  getSubmissionReplayState?(attemptId: string, retainedEntryId: string | null, userId: string, assessmentType: string): Promise<{
    receiptAvailable: boolean;
    entryAvailable: boolean;
    leaderboardDocId: string | null;
    leaderboardProvenanceToken: string | null;
    pendingReview: boolean;
  }>;
  getMyLeaderboardRank?(userId: string, assessmentType: string): Promise<{
    rank: number | null;
    scoreMetric: number | null;
    displayName: string | null;
    pendingReview: boolean;
  }>;
  deleteMyLeaderboardEntries?(userId: string, assessmentType?: string | null): Promise<{ deletedCount: number }>;
}
