import type { AdminAuditLogRecord, CreateAuditLogInput } from '../../models/adminModels';

export interface IAdminAuditRepository {
  writeLog(input: CreateAuditLogInput): Promise<AdminAuditLogRecord>;
  appendLogBestEffort(input: CreateAuditLogInput): Promise<void>;
  getRecentLogs(limitCount: number): Promise<AdminAuditLogRecord[]>;
}
