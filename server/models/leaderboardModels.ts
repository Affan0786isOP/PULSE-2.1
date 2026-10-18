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
  attestedDisplayName?: string;
  assessmentType?: string;
  scoreMetric?: number;
  ageGroup?: string;
  createdAt: number;
  provenanceToken?: string;
  hidden?: boolean;
  hiddenAt?: number;
  hiddenBy?: string;
  hideReason?: string;
  /** True when the matching leaderboardResults document exists. */
  publicEntry?: boolean;
  submissionReceiptOnly?: boolean;
  supersededBy?: string;
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
  /** Legacy alias for attemptId. The attempt receipt may be private-only. */
  attemptId?: string;
  /** Current public-best entry ID; null when no visible entry exists. */
  leaderboardDocId?: string | null;
  leaderboardEntryId?: string | null;
  entryAvailable?: boolean;
  receiptAvailable?: boolean;
  attemptProvenanceToken?: string;
  leaderboardProvenanceToken?: string | null;
  pendingReview?: boolean;
  scoreMetric: number;
  provenanceToken: string;
  trialsDigest: string;
  derivedMetrics: Record<string, unknown>;
  [key: string]: unknown;
}
