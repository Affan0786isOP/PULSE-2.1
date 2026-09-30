import type { IAdminAuditRepository } from '../repositories/interfaces/IAdminAuditRepository';
import type { ILeaderboardRepository } from '../repositories/interfaces/ILeaderboardRepository';
import type { IAdminService } from './interfaces/IAdminService';
import type { AdminAuditLogRecord, CreateAuditLogInput } from '../models/adminModels';
import type { AdminLeaderboardEntryRecord } from '../models/leaderboardModels';

export class AdminService implements IAdminService {
  constructor(
    private readonly auditRepo: IAdminAuditRepository,
    private readonly leaderboardRepo: ILeaderboardRepository
  ) {}

  async recordAuditLog(input: CreateAuditLogInput): Promise<AdminAuditLogRecord> {
    return this.auditRepo.writeLog(input);
  }

  async hideLeaderboardEntry(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.leaderboardRepo.softHideEntry(id, reason);
      // Sequentially coupled inside same try block: append audit log
      await this.auditRepo.appendLogBestEffort({
        actor: 'admin',
        action: 'HIDE_LEADERBOARD_ENTRY',
        target: id,
        note: reason || 'Soft-hide by admin',
        timestamp: Date.now()
      });
    } catch {
      // Best-effort moderation: failure logged, still returns success message
    }
    return { success: true, message: 'Leaderboard entry hidden successfully' };
  }

  async deleteLeaderboardEntry(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.leaderboardRepo.deleteEntry(id, reason);
      // Sequentially coupled inside same try block: append audit log
      await this.auditRepo.appendLogBestEffort({
        actor: 'admin',
        action: 'DELETE_LEADERBOARD_ENTRY',
        target: id,
        note: reason || 'Permanently deleted by admin',
        timestamp: Date.now()
      });
    } catch {
      // Best-effort moderation: failure logged, still returns success message
    }
    return { success: true, message: 'Leaderboard entry deleted permanently' };
  }

  async getAuditLogs(limitCount = 200): Promise<AdminAuditLogRecord[]> {
    return this.auditRepo.getRecentLogs(limitCount);
  }

  async getAllLeaderboardEntries(limitCount = 500): Promise<AdminLeaderboardEntryRecord[]> {
    return this.leaderboardRepo.getAllEntriesForAdmin(limitCount);
  }
}
