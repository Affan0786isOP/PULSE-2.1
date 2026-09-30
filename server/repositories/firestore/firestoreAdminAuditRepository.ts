import type { Firestore } from 'firebase-admin/firestore';
import type { IAdminAuditRepository } from '../interfaces/IAdminAuditRepository';
import type { AdminAuditLogRecord, CreateAuditLogInput } from '../../models/adminModels';
import * as crypto from 'crypto';

export class FirestoreAdminAuditRepository implements IAdminAuditRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  async writeLog(input: CreateAuditLogInput): Promise<AdminAuditLogRecord> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const logId = input.logId || `log-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;
    const auditDoc = {
      actor: input.actor,
      action: input.action,
      target: input.target,
      timestamp: input.timestamp,
      note: input.note || ''
    };

    await db.collection('adminAuditLogs').doc(logId).set(auditDoc);

    return {
      id: logId,
      ...auditDoc
    };
  }

  async appendLogBestEffort(input: CreateAuditLogInput): Promise<void> {
    const db = this.getDb();
    if (!db) {
      return;
    }

    await db.collection('adminAuditLogs').add({
      actor: input.actor,
      action: input.action,
      target: input.target,
      note: input.note || '',
      timestamp: input.timestamp
    });
  }

  async getRecentLogs(limitCount: number): Promise<AdminAuditLogRecord[]> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const snap = await db.collection('adminAuditLogs').orderBy('timestamp', 'desc').limit(limitCount).get();
    return snap.docs.map(d => {
      const data = d.data() as Omit<AdminAuditLogRecord, 'id'>;
      const record: AdminAuditLogRecord = {
        id: d.id,
        actor: String(data.actor || ''),
        action: String(data.action || ''),
        target: String(data.target || ''),
        timestamp: typeof data.timestamp === 'string' || typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
        note: typeof data.note === 'string' ? data.note : undefined,
        ...data
      };
      return record;
    });
  }
}
