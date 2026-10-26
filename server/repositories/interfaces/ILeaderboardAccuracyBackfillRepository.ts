import type {
  LeaderboardAccuracyBackfillDecision,
  LeaderboardAccuracyBackfillMode,
  LeaderboardAccuracyBackfillPage,
  LeaderboardAccuracyBackfillRowResult
} from '../../models/leaderboardAccuracyBackfill';

export interface ILeaderboardAccuracyBackfillRepository {
  listPublicEntryIds(cursor: string | null, limit: number): Promise<LeaderboardAccuracyBackfillPage>;
  processEntry(
    entryId: string,
    mode: LeaderboardAccuracyBackfillMode,
    evaluate: (
      publicData: Record<string, unknown> | null,
      privateData: Record<string, unknown> | null
    ) => LeaderboardAccuracyBackfillDecision
  ): Promise<LeaderboardAccuracyBackfillRowResult>;
}
