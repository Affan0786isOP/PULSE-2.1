import { FieldValue, type Firestore } from 'firebase-admin/firestore';
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

  async getAllEntriesByAlias(alias: string, direction: 'asc' | 'desc'): Promise<LeaderboardEntryRecord[]> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');

    const pageSize = 250;
    const records: LeaderboardEntryRecord[] = [];
    let cursor: any = undefined;

    // Used only for explicit rank lookups, not the public top-100 endpoint.
    // Continue until Firestore is exhausted so a participant outside the top 100
    // can still receive their real rank.
    while (true) {
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
        const safeName = safeLeaderboardDisplayNameForRead(data?.displayName);
        const docType = normalizeAssessmentType(String(data?.assessmentType || alias));
        const scoreMetric = typeof data?.scoreMetric === 'number' ? data.scoreMetric : Number.NaN;
        if (safeName === null || data?.hidden === true || !isValidLeaderboardScoreMetric(docType, scoreMetric)) continue;
        records.push({
          id: docSnap.id,
          displayName: safeName,
          assessmentType: docType,
          scoreMetric,
          ageGroup: String(data.ageGroup || ''),
          createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : (Number(data.createdAt) || 0),
          provenanceToken: String(data.provenanceToken || ''),
          hidden: false
        });
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
    const metaSnapshots = await db.getAll(...snap.docs.map(doc => db.collection('leaderboardPrivateMeta').doc(doc.id)));
    return snap.docs.map((doc, index) => {
      const data = doc.data();
      const meta = metaSnapshots[index].exists ? metaSnapshots[index].data() || {} : {};
      return {
        ...meta,
        ...data,
        id: doc.id,
        createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : (Number(data.createdAt) || 0)
      } as AdminLeaderboardEntryRecord;
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
    const metaSnapshots = await db.getAll(...pageDocs.map(doc => db.collection('leaderboardPrivateMeta').doc(doc.id)));
    const entries = pageDocs.map((doc, index) => {
      const data = doc.data();
      const meta = metaSnapshots[index].exists ? metaSnapshots[index].data() || {} : {};
      return {
        ...meta,
        ...data,
        id: doc.id,
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

    const publicRef = db.collection('leaderboardResults').doc(entryId);
    const metaRef = db.collection('leaderboardPrivateMeta').doc(entryId);
    const [snap, metaSnap] = await Promise.all([publicRef.get(), metaRef.get()]);
    if (!snap.exists) return null;
    const data = snap.data() || {};
    const meta = metaSnap.exists ? metaSnap.data() || {} : {};
    return {
      ...meta,
      ...data,
      id: snap.id,
      createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : (Number(data.createdAt) || 0)
    } as AdminLeaderboardEntryRecord;
  }

  async getEntriesByOwner(ownerUid: string, assessmentType?: string | null): Promise<AdminLeaderboardEntryRecord[]> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');

    const metaSnap = await db.collection('leaderboardPrivateMeta').where('ownerUid', '==', ownerUid).get();
    const matchingMeta = metaSnap.docs.filter(doc =>
      !assessmentType || normalizeAssessmentType(String(doc.data().assessmentType || '')) === assessmentType
    );
    if (matchingMeta.length === 0) return [];

    const publicSnaps = await db.getAll(...matchingMeta.map(doc => db.collection('leaderboardResults').doc(doc.id)));
    const results: AdminLeaderboardEntryRecord[] = [];
    matchingMeta.forEach((metaDoc, index) => {
      const publicSnap = publicSnaps[index];
      if (!publicSnap.exists) return;
      const meta = metaDoc.data();
      const data = publicSnap.data() || {};
      results.push({
        ...meta,
        ...data,
        id: publicSnap.id,
        createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : (Number(data.createdAt) || 0)
      } as AdminLeaderboardEntryRecord);
    });
    return results;
  }

  async linkOwnerToEntry(entryId: string, ownerUid: string, sessionId: string): Promise<boolean> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');
    if (!entryId || entryId.includes('/') || entryId.length > 1500) return false;

    const publicRef = db.collection('leaderboardResults').doc(entryId);
    const metaRef = db.collection('leaderboardPrivateMeta').doc(entryId);
    return db.runTransaction(async tx => {
      const [publicSnap, metaSnap] = await Promise.all([tx.get(publicRef), tx.get(metaRef)]);
      if (!publicSnap.exists) return false;

      const data = publicSnap.data() || {};
      const priorMeta = metaSnap.exists ? metaSnap.data() || {} : {};
      if (typeof data.ownerUid === 'string' && data.ownerUid !== ownerUid) return false;
      if (typeof priorMeta.ownerUid === 'string' && priorMeta.ownerUid !== ownerUid) return false;

      const assessmentType = normalizeAssessmentType(String(data.assessmentType || priorMeta.assessmentType || ''));
      const scoreMetric = typeof data.scoreMetric === 'number' ? data.scoreMetric : Number(priorMeta.scoreMetric);
      const privateMeta = {
        ownerUid,
        sessionId,
        assessmentType,
        scoreMetric,
        ageGroup: String(data.ageGroup || priorMeta.ageGroup || ''),
        provenanceToken: String(data.provenanceToken || priorMeta.provenanceToken || ''),
        provenanceVersion: Number(data.provenanceVersion || priorMeta.provenanceVersion || 1),
        trialsDigest: String(priorMeta.trialsDigest || data.trialsDigest || ''),
        derivedMetrics: (priorMeta.derivedMetrics || data.derivedMetrics || {}) as Record<string, unknown>,
        ...(typeof priorMeta.idempotencyKey === 'string'
          ? { idempotencyKey: priorMeta.idempotencyKey }
          : typeof data.idempotencyKey === 'string' ? { idempotencyKey: data.idempotencyKey } : {}),
        qualityFlags: Array.isArray(priorMeta.qualityFlags) ? priorMeta.qualityFlags : (Array.isArray(data.qualityFlags) ? data.qualityFlags : []),
        moderationReason: String(priorMeta.moderationReason || data.moderationReason || ''),
        hidden: data.hidden === true || priorMeta.hidden === true,
        createdAt: data.createdAt || priorMeta.createdAt || FieldValue.serverTimestamp(),
        updatedAt: Date.now()
      };

      // Write owner/session identity and research details only to the server-only collection.
      tx.set(metaRef, privateMeta, { merge: true });

      // Scrub private fields that older code may have attached to the public row.
      tx.update(publicRef, {
        ownerUid: FieldValue.delete(),
        sessionId: FieldValue.delete(),
        trialsDigest: FieldValue.delete(),
        derivedMetrics: FieldValue.delete(),
        idempotencyKey: FieldValue.delete(),
        qualityFlags: FieldValue.delete(),
        moderationReason: FieldValue.delete(),
        ownerLinkedAt: FieldValue.delete(),
        hiddenAt: FieldValue.delete(),
        hiddenBy: FieldValue.delete(),
        hideReason: FieldValue.delete(),
        unhiddenAt: FieldValue.delete(),
        unhiddenBy: FieldValue.delete(),
        unhideReason: FieldValue.delete()
      });
      return true;
    });
  }

  async deleteEntriesByOwner(ownerUid: string, assessmentType?: string | null): Promise<number> {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');
    const types = assessmentType
      ? [assessmentType]
      : ['visual-reaction', 'direction', 'color-recognition', 'block-memory', 'number-memory'];
    const ownerIndexRefs = types.map(type => {
      const ownerIndexId = crypto.createHash('sha256').update(`${ownerUid}:${type}`).digest('hex');
      return { type, ref: db.collection('leaderboardOwnerIndex').doc(ownerIndexId) };
    });

    // Lock all selected assessment buckets before deleting any rows. This closes
    // the gap where an all-assessment erasure could miss a new row created while
    // the method was processing a different assessment.
    await db.runTransaction(async tx => {
      const snapshots = [];
      for (const { ref } of ownerIndexRefs) snapshots.push(await tx.get(ref));
      if (snapshots.some(snap => snap.data()?.deleting === true)) {
        throw new Error('OWNER_ERASURE_IN_PROGRESS');
      }
      const now = Date.now();
      ownerIndexRefs.forEach(({ type, ref }) => {
        tx.set(ref, {
          ownerUid,
          assessmentType: type,
          deleting: true,
          deletingStartedAt: now
        }, { merge: true });
      });
    });

    try {
      const [metaSnap, legacyPublicSnap] = await Promise.all([
        db.collection('leaderboardPrivateMeta').where('ownerUid', '==', ownerUid).get(),
        db.collection('leaderboardResults').where('ownerUid', '==', ownerUid).get()
      ]);
      const ids = new Set<string>();

      for (const doc of metaSnap.docs) {
        if (types.includes(normalizeAssessmentType(String(doc.data().assessmentType || '')))) ids.add(doc.id);
      }
      // Include pre-migration rows that still carry ownerUid on the public document.
      for (const doc of legacyPublicSnap.docs) {
        if (types.includes(normalizeAssessmentType(String(doc.data().assessmentType || '')))) ids.add(doc.id);
      }

      const idsToDelete = Array.from(ids);
      // Every leaderboard row has one public document and one private metadata
      // document. Keep batches below Firestore's 500-operation write limit.
      for (let offset = 0; offset < idsToDelete.length; offset += 200) {
        const batch = db.batch();
        for (const id of idsToDelete.slice(offset, offset + 200)) {
          batch.delete(db.collection('leaderboardResults').doc(id));
          batch.delete(db.collection('leaderboardPrivateMeta').doc(id));
        }
        await batch.commit();
      }
      return idsToDelete.length;
    } finally {
      await db.runTransaction(async tx => {
        const snapshots = [];
        for (const { ref } of ownerIndexRefs) snapshots.push(await tx.get(ref));
        ownerIndexRefs.forEach(({ type, ref }, idx) => {
          const data = snapshots[idx].data();
          if (data?.ownerUid === ownerUid && data?.assessmentType === type) {
            // Remove the UID from the private guard record after erasure. The
            // document ID is already a one-way hash; future submissions can reuse it.
            tx.set(ref, {
              assessmentType: type,
              leaderboardDocId: null,
              deleting: false,
              erasedAt: Date.now(),
              updatedAt: Date.now()
            });
          }
        });
      });
    }
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
