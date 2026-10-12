import type { Firestore } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import type { ILeaderboardRepository } from '../interfaces/ILeaderboardRepository';
import type { LeaderboardEntryRecord, AdminLeaderboardEntryRecord } from '../../models/leaderboardModels';
import { normalizeAssessmentType } from '../../engines/assessmentTypes';
import { safeLeaderboardDisplayNameForRead, isValidLeaderboardScoreMetric } from '../../../shared/domain/leaderboardEligibility';

export class FirestoreLeaderboardRepository implements ILeaderboardRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  async getEntriesByAlias(alias: string, direction: 'asc' | 'desc', limitCount: number): Promise<LeaderboardEntryRecord[]> {
    const db = this.getDb();
    if (!db) {
      throw new Error('DATABASE_UNAVAILABLE');
    }

    const safeLimit = Number.isInteger(limitCount) ? Math.max(1, Math.min(limitCount, 500)) : 100;
    const pageSize = Math.min(Math.max(safeLimit, 100), 250);
    const records: LeaderboardEntryRecord[] = [];
    let cursor: any = undefined;

    // Continue past invalid names/scores until the requested number of eligible
    // entries is collected or the alias query is exhausted.
    while (records.length < safeLimit) {
      let query = db.collection('leaderboardResults')
        .where('assessmentType', '==', alias)
        .where('hidden', '==', false)
        .orderBy('scoreMetric', direction)
        .limit(pageSize);

      if (cursor) query = query.startAfter(cursor);
      const snap = await query.get();
      if (snap.empty) break;
      cursor = snap.docs[snap.docs.length - 1];

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const displayName = String(data?.displayName || '').trim();
        const safeDisplayName = safeLeaderboardDisplayNameForRead(displayName);
        const docType = normalizeAssessmentType(String(data?.assessmentType || alias));
        const scoreMetric = data && typeof data.scoreMetric === 'number' ? data.scoreMetric : Number.NaN;

        if (
          data &&
          data.hidden !== true &&
          safeDisplayName !== null &&
          isValidLeaderboardScoreMetric(docType, scoreMetric)
        ) {
          records.push({
            id: docSnap.id,
            displayName: safeDisplayName,
            assessmentType: docType,
            scoreMetric,
            ageGroup: String(data.ageGroup || ''),
            // A deterministic fallback prevents ties from moving between reads.
            createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : (Number(data.createdAt) || 0),
            provenanceToken: String(data.provenanceToken || ''),
            hidden: false
          });
          if (records.length >= safeLimit) break;
        }
      }

      if (snap.size < pageSize) break;
    }

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
        createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : (Number(data.createdAt) || 0)
      };
    });
  }

  async getAllEntriesForAdminPage(limitCount: number, cursor?: string | null): Promise<{
    entries: AdminLeaderboardEntryRecord[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');

    const safeLimit = Number.isInteger(limitCount) ? Math.max(1, Math.min(limitCount, 250)) : 100;
    const collection = db.collection('leaderboardResults');
    let query = collection.orderBy('createdAt', 'desc');

    if (cursor) {
      if (cursor.includes('/') || cursor.length > 1500) throw new Error('INVALID_CURSOR');
      const cursorSnap = await collection.doc(cursor).get();
      if (!cursorSnap.exists || cursorSnap.get('createdAt') === undefined) throw new Error('INVALID_CURSOR');
      query = query.startAfter(cursorSnap);
    }

    const snap = await query.limit(safeLimit + 1).get();
    const hasMore = snap.docs.length > safeLimit;
    const pageDocs = snap.docs.slice(0, safeLimit);
    const entries = pageDocs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : (Number(data.createdAt) || 0)
      } as AdminLeaderboardEntryRecord;
    });

    return {
      entries,
      hasMore,
      nextCursor: hasMore && pageDocs.length ? pageDocs[pageDocs.length - 1].id : null
    };
  }

  async getEntryById(entryId: string): Promise<AdminLeaderboardEntryRecord | null> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');
    if (!entryId || entryId.includes('/') || entryId.length > 1500) throw new Error('INVALID_ENTRY_ID');

    const snap = await db.collection('leaderboardResults').doc(entryId).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    return {
      id: snap.id,
      ...data,
      createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : (Number(data.createdAt) || 0)
    } as AdminLeaderboardEntryRecord;
  }

  async getEntriesByOwner(ownerUid: string, assessmentType: string): Promise<AdminLeaderboardEntryRecord[]> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');
    const snap = await db.collection('leaderboardResults').where('ownerUid', '==', ownerUid).get();
    return snap.docs
      .filter(doc => normalizeAssessmentType(String(doc.data().assessmentType || '')) === assessmentType)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : (Number(data.createdAt) || 0)
        } as AdminLeaderboardEntryRecord;
      });
  }

  async deleteEntriesByOwner(ownerUid: string, assessmentType: string): Promise<number> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');
    const snap = await db.collection('leaderboardResults').where('ownerUid', '==', ownerUid).get();
    const matching = snap.docs.filter(doc =>
      normalizeAssessmentType(String(doc.data().assessmentType || '')) === assessmentType
    );

    // Firestore write batches are limited to 500 operations; stay below that.
    for (let offset = 0; offset < matching.length; offset += 400) {
      const batch = db.batch();
      for (const doc of matching.slice(offset, offset + 400)) batch.delete(doc.ref);
      await batch.commit();
    }
    return matching.length;
  }

  async softHideEntry(entryId: string, reason?: string): Promise<{ success: boolean; found: boolean; alreadyInState?: boolean }> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');

    const docRef = db.collection('leaderboardResults').doc(entryId);
    const auditRef = db.collection('adminAuditLogs').doc(`log-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`);
    const timestamp = Date.now();

    return db.runTransaction(async tx => {
      const snap = await tx.get(docRef);
      if (!snap.exists) return { success: true, found: false };
      if (snap.data()?.hidden === true) return { success: true, found: true, alreadyInState: true };

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

  async unhideEntry(entryId: string, reason?: string): Promise<{ success: boolean; found: boolean; alreadyInState?: boolean }> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');

    const docRef = db.collection('leaderboardResults').doc(entryId);
    const auditRef = db.collection('adminAuditLogs').doc(`log-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`);
    const timestamp = Date.now();

    return db.runTransaction(async tx => {
      const snap = await tx.get(docRef);
      if (!snap.exists) return { success: true, found: false };
      if (snap.data()?.hidden === false) return { success: true, found: true, alreadyInState: true };

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
