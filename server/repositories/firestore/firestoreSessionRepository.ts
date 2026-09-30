import type { Firestore } from 'firebase-admin/firestore';
import type { ISessionRepository } from '../interfaces/ISessionRepository';
import type { ExperimentSessionRecord, CreateSessionRecordInput } from '../../models/sessionModels';

export class FirestoreSessionRepository implements ISessionRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  async findById(sessionId: string): Promise<ExperimentSessionRecord | null> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }
    const snap = await db.collection('experimentSessions').doc(sessionId).get();
    if (!snap.exists) {
      return null;
    }
    return snap.data() as ExperimentSessionRecord;
  }

  async create(record: CreateSessionRecordInput): Promise<ExperimentSessionRecord> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }
    await db.collection('experimentSessions').doc(record.sessionId).set(record);
    return record as ExperimentSessionRecord;
  }

  async findUserConsumedSessions(userId: string, assessmentType: string): Promise<ExperimentSessionRecord[]> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }
    const snap = await db.collection('experimentSessions')
      .where('uid', '==', userId)
      .where('assessmentType', '==', assessmentType)
      .where('consumed', '==', true)
      .get();

    return snap.docs.map(d => d.data() as ExperimentSessionRecord);
  }
}
