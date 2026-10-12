import type { Firestore } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import type { ILeaderboardRepository } from '../interfaces/ILeaderboardRepository';
import type { LeaderboardEntryRecord, AdminLeaderboardEntryRecord } from '../../models/leaderboardModels';
import { normalizeAssessmentType } from '../../engines/assessmentTypes';
import { validateLeaderboardDisplayName, isValidLeaderboardScoreMetric } from '../../../shared/domain/leaderboardEligibility';

export class FirestoreLeaderboardRepository implements ILeaderboardRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  async getEntriesByAlias(alias: string, direction: 'asc' | 'desc', limitCount: number): Promise<LeaderboardEntryRecord[]> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const snap = await db.collection('leaderboardResults')
      .where('assessmentType', '==', alias)
      .where('hidden', '==', false)
      .orderBy('scoreMetric', direction)
      .limit(limitCount)
      .get();

    const records: LeaderboardEntryRecord[] = [];
    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const displayName = String(data?.displayName || '').trim();
      const aliasValidation = validateLeaderboardDisplayName(displayName);
      const docType = normalizeAssessmentType(String(data?.assessmentType || alias));

      const scoreMetric = data && typeof data.scoreMetric === 'number' ? data.scoreMetric : Number.NaN;
      if (
        data &&
        data.hidden !== true &&
        aliasValidation.valid &&
        isValidLeaderboardScoreMetric(docType, scoreMetric)
      ) {
        records.push({
          id: docSnap.id,
          displayName: aliasValidation.normalized || displayName,
          assessmentType: docType,
          scoreMetric,
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
    if (!db) throw new Error('DATABASE_UNAVAILABLE');

    const docRef = db.collection('leaderboardResults').doc(entryId);
    const auditRef = db.collection('adminAuditLogs').doc(`log-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`);
    const timestamp = Date.now();

    return db.runTransaction(async tx => {
      const snap = await tx.get(docRef);
      if (!snap.exists) return { success: true, found: false };

      tx.update(docRef, { hidden: true, hiddenAt: timestamp, hiddenBy: 'admin', hideReason: reason || '' });
      tx.set(auditRef, {
        actor: 'admin',
        action: 'HIDE_LEADERBOARD_ENTRY',
        target: entryId,
        note: reason || 'Soft-hide by admin',
        timestamp
      });
      return { success: true, found: true };
    });
  }

  async unhideEntry(entryId: string, reason?: string): Promise<{ success: boolean; found: boolean }> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');

    const docRef = db.collection('leaderboardResults').doc(entryId);
    const auditRef = db.collection('adminAuditLogs').doc(`log-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`);
    const timestamp = Date.now();

    return db.runTransaction(async tx => {
      const snap = await tx.get(docRef);
      if (!snap.exists) return { success: true, found: false };

      tx.update(docRef, { hidden: false, unhiddenAt: timestamp, unhiddenBy: 'admin', unhideReason: reason || '' });
      tx.set(auditRef, {
        actor: 'admin',
        action: 'UNHIDE_LEADERBOARD_ENTRY',
        target: entryId,
        note: reason || 'Unhide by admin',
        timestamp
      });
      return { success: true, found: true };
    });
  }

  async deleteEntry(entryId: string, reason?: string): Promise<{ success: boolean; found: boolean }> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');

    const docRef = db.collection('leaderboardResults').doc(entryId);
    const auditRef = db.collection('adminAuditLogs').doc(`log-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`);
    const timestamp = Date.now();

    return db.runTransaction(async tx => {
      const snap = await tx.get(docRef);
      if (!snap.exists) return { success: true, found: false };

      tx.delete(docRef);
      tx.set(auditRef, {
        actor: 'admin',
        action: 'DELETE_LEADERBOARD_ENTRY',
        target: entryId,
        note: reason || 'Permanently deleted by admin',
        timestamp
      });
      return { success: true, found: true };
    });
  }
}
