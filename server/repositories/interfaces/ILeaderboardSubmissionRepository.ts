import type { LeaderboardSubmissionTxInput, LeaderboardSubmissionTxResult } from '../../models/leaderboardModels';

export interface ILeaderboardSubmissionRepository {
  executeLeaderboardSubmission(input: LeaderboardSubmissionTxInput): Promise<LeaderboardSubmissionTxResult>;
}
