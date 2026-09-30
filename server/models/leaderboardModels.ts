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
  displayName: string;
  assessmentType: string;
  scoreMetric: number;
  authoritativeAgeGroup: string;
  provenanceToken: string;
  trialsDigest: string;
  metrics: Record<string, unknown>;
  now: number;
}

export interface LeaderboardSubmissionTxResult {
  success: true;
  docId: string;
  scoreMetric: number;
  provenanceToken: string;
  trialsDigest: string;
  derivedMetrics: Record<string, unknown>;
  [key: string]: unknown;
}
