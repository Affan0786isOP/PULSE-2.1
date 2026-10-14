import type { AdminAuditLogRecord, CreateAuditLogInput } from '../../models/adminModels';
import type { AdminLeaderboardEntryRecord } from '../../models/leaderboardModels';

export interface IAdminService {
  recordAuditLog(input: CreateAuditLogInput): Promise<AdminAuditLogRecord>;
  hideLeaderboardEntry(id: string, reason?: string): Promise<{ success: boolean; message: string; alreadyInState?: boolean }>;
  unhideLeaderboardEntry(id: string, reason?: string): Promise<{ success: boolean; message: string; alreadyInState?: boolean; notBest?: boolean; retainedEntryId?: string }>;
  deleteLeaderboardEntry(id: string, reason?: string): Promise<{ success: boolean; message: string; alreadyInState?: boolean }>;
  getAuditLogs(limitCount?: number): Promise<AdminAuditLogRecord[]>;
  getAllLeaderboardEntries(limitCount?: number): Promise<AdminLeaderboardEntryRecord[]>;
  getAllLeaderboardEntriesPage?(limitCount?: number, cursor?: string | null): Promise<{
    entries: AdminLeaderboardEntryRecord[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
}
