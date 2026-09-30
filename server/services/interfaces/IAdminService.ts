import type { AdminAuditLogRecord, CreateAuditLogInput } from '../../models/adminModels';
import type { AdminLeaderboardEntryRecord } from '../../models/leaderboardModels';

export interface IAdminService {
  recordAuditLog(input: CreateAuditLogInput): Promise<AdminAuditLogRecord>;
  hideLeaderboardEntry(id: string, reason?: string): Promise<{ success: boolean; message: string }>;
  deleteLeaderboardEntry(id: string, reason?: string): Promise<{ success: boolean; message: string }>;
  getAuditLogs(limitCount?: number): Promise<AdminAuditLogRecord[]>;
  getAllLeaderboardEntries(limitCount?: number): Promise<AdminLeaderboardEntryRecord[]>;
}
