export interface LeaderboardEntryRecord {
  id: string;
  displayName: string;
  assessmentType: string;
  scoreMetric: number;
  ageGroup: string;
  createdAt: number;
  provenanceToken: string;
  hidden: boolean;
}

export interface AdminLeaderboardEntryRecord {
  id: string;
  displayName?: string;
  assessmentType?: string;
  scoreMetric?: number;
  ageGroup?: string;
  createdAt: number;
  provenanceToken?: string;
  hidden?: boolean;
  hiddenAt?: number;
  hiddenBy?: string;
  hideReason?: string;
  [key: string]: unknown;
}

export interface LeaderboardSubmissionTxInput {
  leaderboardDocId: string;
  activeSessionId: string;
  userId: string;
  displayName: string;
  assessmentType: string;
  scoreMetric: number;
  authoritativeAgeGroup: string;
  provenanceToken: string;
  trialsDigest: string;
  metrics: Record<string, unknown>;
  now: number;
  idempotencyKey?: string | null;
  requiresModeration?: boolean;
  qualityFlags?: string[];
}

export interface LeaderboardSubmissionTxResult {
  success: true;
  /** ID for this submitted attempt, whether or not it replaces the public best row. */
  docId: string;
  /** ID of the row retained on the public leaderboard (may belong to an earlier session). */
  leaderboardDocId?: string;
  scoreMetric: number;
  provenanceToken: string;
  trialsDigest: string;
  derivedMetrics: Record<string, unknown>;
  [key: string]: unknown;
}
