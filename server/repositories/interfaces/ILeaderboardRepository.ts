import type { LeaderboardEntryRecord, AdminLeaderboardEntryRecord } from '../../models/leaderboardModels';

export interface ILeaderboardRepository {
  getEntriesByAlias(alias: string, direction: 'asc' | 'desc', limitCount: number): Promise<LeaderboardEntryRecord[]>;
  getAllEntriesByAlias?(alias: string, direction: 'asc' | 'desc'): Promise<LeaderboardEntryRecord[]>;
  getEntryById?(entryId: string): Promise<AdminLeaderboardEntryRecord | null>;
  getEntriesByOwner?(ownerUid: string, assessmentType?: string | null): Promise<AdminLeaderboardEntryRecord[]>;
  deleteEntriesByOwner?(ownerUid: string, assessmentType?: string | null): Promise<number>;
  linkOwnerToEntry?(entryId: string, ownerUid: string, sessionId: string): Promise<boolean>;
  softHideEntry(entryId: string, reason?: string): Promise<{ success: boolean; found: boolean; alreadyInState?: boolean }>;
  unhideEntry(entryId: string, reason?: string): Promise<{ success: boolean; found: boolean; alreadyInState?: boolean; notBest?: boolean; erasureInProgress?: boolean; retainedEntryId?: string }>;
  deleteEntry(entryId: string, reason?: string): Promise<{ success: boolean; found: boolean; alreadyInState?: boolean }>;
  updateEntryAlias?(
    entryId: string,
    newDisplayName: string,
    reason?: string
  ): Promise<{
    success: boolean;
    found: boolean;
    entry?: AdminLeaderboardEntryRecord;
  }>;
}
