import type { LeaderboardEntryRecord, AdminLeaderboardEntryRecord } from '../../models/leaderboardModels';

export interface ILeaderboardRepository {
  getEntriesByAlias(alias: string, direction: 'asc' | 'desc', limitCount: number): Promise<LeaderboardEntryRecord[]>;
  getAllEntriesByAlias?(alias: string, direction: 'asc' | 'desc'): Promise<LeaderboardEntryRecord[]>;
  getAllEntriesForAdmin(limitCount: number): Promise<AdminLeaderboardEntryRecord[]>;
  getEntryById?(entryId: string): Promise<AdminLeaderboardEntryRecord | null>;
  getEntriesByOwner?(ownerUid: string, assessmentType?: string | null): Promise<AdminLeaderboardEntryRecord[]>;
  deleteEntriesByOwner?(ownerUid: string, assessmentType?: string | null): Promise<number>;
  linkOwnerToEntry?(entryId: string, ownerUid: string, sessionId: string): Promise<boolean>;
  getAllEntriesForAdminPage?(limitCount: number, cursor?: string | null): Promise<{
    entries: AdminLeaderboardEntryRecord[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
  softHideEntry(entryId: string, reason?: string): Promise<{ success: boolean; found: boolean; alreadyInState?: boolean }>;
  unhideEntry(entryId: string, reason?: string): Promise<{ success: boolean; found: boolean; alreadyInState?: boolean }>;
  deleteEntry(entryId: string, reason?: string): Promise<{ success: boolean; found: boolean; alreadyInState?: boolean }>;
}
