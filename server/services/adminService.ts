import type { IAdminAuditRepository } from '../repositories/interfaces/IAdminAuditRepository';
import type { ILeaderboardRepository } from '../repositories/interfaces/ILeaderboardRepository';
import type { IAdminService } from './interfaces/IAdminService';
import type { AdminAuditLogRecord, CreateAuditLogInput } from '../models/adminModels';
import type { AdminLeaderboardEntryRecord } from '../models/leaderboardModels';
import { AppError } from '../models/replayContracts';

export class AdminService implements IAdminService {
  constructor(
    private readonly auditRepo: IAdminAuditRepository,
    private readonly leaderboardRepo: ILeaderboardRepository
  ) {}

  async recordAuditLog(input: CreateAuditLogInput): Promise<AdminAuditLogRecord> {
    return this.auditRepo.writeLog(input);
  }

  private ensureModerationSucceeded(result: { success: boolean; found: boolean }): void {
    if (!result.success) throw new AppError('Database service unavailable', 503);
    if (!result.found) throw new AppError('LEADERBOARD_ENTRY_NOT_FOUND', 404);
  }

  async hideLeaderboardEntry(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const result = await this.leaderboardRepo.softHideEntry(id, reason);
    this.ensureModerationSucceeded(result);
    return { success: true, message: 'Leaderboard entry hidden successfully' };
  }

  async unhideLeaderboardEntry(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const result = await this.leaderboardRepo.unhideEntry(id, reason);
    this.ensureModerationSucceeded(result);
    return { success: true, message: 'Leaderboard entry restored successfully' };
  }

  async deleteLeaderboardEntry(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const result = await this.leaderboardRepo.deleteEntry(id, reason);
    this.ensureModerationSucceeded(result);
    return { success: true, message: 'Leaderboard entry deleted permanently' };
  }

  async getAuditLogs(limitCount = 200): Promise<AdminAuditLogRecord[]> {
    return this.auditRepo.getRecentLogs(limitCount);
  }

  async getAllLeaderboardEntries(limitCount = 500): Promise<AdminLeaderboardEntryRecord[]> {
    return this.leaderboardRepo.getAllEntriesForAdmin(limitCount);
  }
}
