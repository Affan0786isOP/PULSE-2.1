export interface ExperimentSessionRecord {
  sessionId: string;
  uid: string;
  assessmentType: string;
  ageGroup: string;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
  consumedAt?: number;
  researchDocId?: string;
  leaderboardSubmitted?: boolean;
  leaderboardDocId?: string;
  leaderboardSubmittedAt?: number;
  /** Per-attempt leaderboard submission details; never overwrite the authoritative research result fields below. */
  leaderboardSubmissionId?: string;
  leaderboardSubmissionScoreMetric?: number | null;
  leaderboardSubmissionProvenanceToken?: string;
  leaderboardSubmissionTrialsDigest?: string;
  leaderboardSubmissionDerivedMetrics?: Record<string, unknown>;
  trialsDigest?: string;
  provenanceToken?: string;
  derivedMetrics?: Record<string, unknown>;
  scoreMetric?: number | null;
  isNewPersonalBest?: boolean;
  previousPersonalBest?: number | null;
  personalBest?: number | null;
}

export interface CreateSessionRecordInput {
  sessionId: string;
  uid: string;
  assessmentType: string;
  ageGroup: string;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
}
