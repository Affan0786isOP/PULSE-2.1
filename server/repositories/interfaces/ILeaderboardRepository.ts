import type { LeaderboardEntryRecord, AdminLeaderboardEntryRecord } from '../../models/leaderboardModels';

export interface ILeaderboardRepository {
  getEntriesByAlias(alias: string, direction: 'asc' | 'desc', limitCount: number): Promise<LeaderboardEntryRecord[]>;
  getAllEntriesForAdmin(limitCount: number): Promise<AdminLeaderboardEntryRecord[]>;
  softHideEntry(entryId: string, reason?: string): Promise<{ success: boolean; found: boolean }>;
  deleteEntry(entryId: string, reason?: string): Promise<{ success: boolean; found: boolean }>;
}
