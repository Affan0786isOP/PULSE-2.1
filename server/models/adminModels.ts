export interface AdminAuditLogRecord {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string | number;
  note?: string;
  [key: string]: unknown;
}

export interface CreateAuditLogInput {
  logId?: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string | number;
  note?: string;
}
