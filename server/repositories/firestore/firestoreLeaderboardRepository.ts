import type { Firestore } from 'firebase-admin/firestore';
import type { ILeaderboardRepository } from '../interfaces/ILeaderboardRepository';
import type { LeaderboardEntryRecord, AdminLeaderboardEntryRecord } from '../../models/leaderboardModels';
import { normalizeAssessmentType } from '../../engines/assessmentTypes';
import { isOptedInLeaderboardUser } from '../../services/leaderboardService';

export class FirestoreLeaderboardRepository implements ILeaderboardRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  async getEntriesByAlias(alias: string, direction: 'asc' | 'desc', limitCount: number): Promise<LeaderboardEntryRecord[]> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const snap = await db.collection('leaderboardResults')
      .where('assessmentType', '==', alias)
      .orderBy('scoreMetric', direction)
      .limit(limitCount)
      .get();

    const records: LeaderboardEntryRecord[] = [];
    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const displayName = String(data?.displayName || '').trim();
      const docType = normalizeAssessmentType(String(data?.assessmentType || alias));

      if (data && data.hidden !== true && isOptedInLeaderboardUser(displayName)) {
        records.push({
          id: docSnap.id,
          displayName,
          assessmentType: docType,
          scoreMetric: Number(data.scoreMetric) || 0,
          ageGroup: String(data.ageGroup || ''),
          createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : (Number(data.createdAt) || Date.now()),
          provenanceToken: String(data.provenanceToken || ''),
          hidden: false
        });
      }
    });

    return records;
  }

  async getAllEntriesForAdmin(limitCount: number): Promise<AdminLeaderboardEntryRecord[]> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const snap = await db.collection('leaderboardResults').orderBy('createdAt', 'desc').limit(limitCount).get();
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : (Number(data.createdAt) || Date.now())
      };
    });
  }

  async softHideEntry(entryId: string, reason?: string): Promise<{ success: boolean; found: boolean }> {
    const db = this.getDb();
    if (!db) {
      return { success: false, found: false };
    }

    const docRef = db.collection('leaderboardResults').doc(entryId);
    const snap = await docRef.get();
    if (snap.exists) {
      await docRef.update({ hidden: true, hiddenAt: Date.now(), hiddenBy: 'admin', hideReason: reason || '' });
      return { success: true, found: true };
    }
    return { success: true, found: false };
  }

  async deleteEntry(entryId: string, _reason?: string): Promise<{ success: boolean; found: boolean }> {
    const db = this.getDb();
    if (!db) {
      return { success: false, found: false };
    }

    const docRef = db.collection('leaderboardResults').doc(entryId);
    const snap = await docRef.get();
    if (snap.exists) {
      await docRef.delete();
      return { success: true, found: true };
    }
    return { success: true, found: false };
  }
}
