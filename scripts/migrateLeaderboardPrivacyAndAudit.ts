import { FieldValue } from 'firebase-admin/firestore';
import { initializeAdminApp, getAdminDb } from '../server/config/firebaseAdmin';

const PRIVATE_PUBLIC_ROW_FIELDS = [
  'ownerUid',
  'sessionId',
  'trialsDigest',
  'derivedMetrics',
  'idempotencyKey',
  'qualityFlags',
  'moderationReason',
  'hiddenAt',
  'hiddenBy',
  'hideReason',
  'unhiddenAt',
  'unhiddenBy',
  'unhideReason',
  'ownerLinkedAt'
] as const;

async function migrateLeaderboardRows(db: NonNullable<ReturnType<typeof getAdminDb>>): Promise<number> {
  let cursor: any = undefined;
  let migrated = 0;
  const pageSize = 200;

  while (true) {
    let query = db.collection('leaderboardResults').orderBy('__name__').limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;

    for (const rowSnap of page.docs) {
      const publicRef = rowSnap.ref;
      const metaRef = db.collection('leaderboardPrivateMeta').doc(rowSnap.id);
      const didMigrate = await db.runTransaction(async tx => {
        const [publicSnap, metaSnap] = await Promise.all([tx.get(publicRef), tx.get(metaRef)]);
        if (!publicSnap.exists) return false;

        const row = publicSnap.data() || {};
        const existingMeta = metaSnap.exists ? metaSnap.data() || {} : {};
        const sessionId = String(existingMeta.sessionId || row.sessionId || '');
        let ownerUid = typeof existingMeta.ownerUid === 'string'
          ? existingMeta.ownerUid
          : typeof row.ownerUid === 'string' ? row.ownerUid : undefined;

        // A server-created session-to-entry link is the strongest legacy owner
        // evidence. Only use it when the session explicitly points to this row.
        if (sessionId) {
          const sessionSnap = await tx.get(db.collection('experimentSessions').doc(sessionId));
          const session = sessionSnap.exists ? sessionSnap.data() || {} : {};
          if (
            typeof session.uid === 'string' &&
            session.leaderboardDocId === rowSnap.id &&
            (!ownerUid || ownerUid === session.uid)
          ) {
            ownerUid = session.uid;
          } else if (ownerUid && typeof session.uid === 'string' && ownerUid !== session.uid) {
            ownerUid = undefined;
          }
        }

        const meta: Record<string, unknown> = {
          ...existingMeta,
          assessmentType: String(row.assessmentType || existingMeta.assessmentType || ''),
          scoreMetric: typeof row.scoreMetric === 'number' ? row.scoreMetric : Number(existingMeta.scoreMetric),
          ageGroup: String(row.ageGroup || existingMeta.ageGroup || ''),
          provenanceToken: String(row.provenanceToken || existingMeta.provenanceToken || ''),
          provenanceVersion: Number(row.provenanceVersion || existingMeta.provenanceVersion || 1),
          trialsDigest: String(existingMeta.trialsDigest || row.trialsDigest || ''),
          derivedMetrics: existingMeta.derivedMetrics || row.derivedMetrics || {},
          hidden: row.hidden === true,
          createdAt: row.createdAt || existingMeta.createdAt || FieldValue.serverTimestamp(),
          updatedAt: Date.now()
        };
        if (ownerUid) meta.ownerUid = ownerUid;
        else delete meta.ownerUid;
        if (sessionId) meta.sessionId = sessionId;
        else delete meta.sessionId;

        const idempotencyKey = existingMeta.idempotencyKey || row.idempotencyKey;
        if (typeof idempotencyKey === 'string') meta.idempotencyKey = idempotencyKey;
        else delete meta.idempotencyKey;

        const qualityFlags = existingMeta.qualityFlags || row.qualityFlags;
        if (Array.isArray(qualityFlags)) meta.qualityFlags = qualityFlags;
        else delete meta.qualityFlags;

        const moderationReason = existingMeta.moderationReason || row.moderationReason || row.hideReason || row.unhideReason;
        if (typeof moderationReason === 'string' && moderationReason) meta.moderationReason = moderationReason;

        // Metadata is written atomically with removal of all private fields from
        // the publicly-readable document, so the two copies never diverge on a
        // partially completed migration.
        tx.set(metaRef, meta, { merge: true });
        const scrub: Record<string, unknown> = {};
        for (const field of PRIVATE_PUBLIC_ROW_FIELDS) scrub[field] = FieldValue.delete();
        tx.update(publicRef, scrub);
        return true;
      });

      if (didMigrate) migrated++;
    }

    cursor = page.docs[page.docs.length - 1];
    if (page.size < pageSize) break;
  }

  return migrated;
}

async function migrateAuditTimestamps(db: NonNullable<ReturnType<typeof getAdminDb>>): Promise<number> {
  let cursor: any = undefined;
  let migrated = 0;
  const pageSize = 400;

  while (true) {
    let query = db.collection('adminAuditLogs').orderBy('__name__').limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;

    const batch = db.batch();
    let writes = 0;
    for (const doc of page.docs) {
      const timestamp = doc.data().timestamp;
      if (typeof timestamp !== 'string') continue;
      const parsed = Date.parse(timestamp);
      if (!Number.isFinite(parsed)) continue;
      batch.update(doc.ref, { timestamp: parsed });
      writes++;
    }
    if (writes > 0) {
      await batch.commit();
      migrated += writes;
    }

    cursor = page.docs[page.docs.length - 1];
    if (page.size < pageSize) break;
  }

  return migrated;
}

async function main(): Promise<void> {
  initializeAdminApp();
  const db = getAdminDb();
  if (!db) throw new Error('Firestore Admin is unavailable; check Firebase service-account configuration.');

  const rowCount = await migrateLeaderboardRows(db);
  const auditCount = await migrateAuditTimestamps(db);
  console.info(`Leaderboard privacy migration complete. Rows normalized: ${rowCount}; audit timestamps normalized: ${auditCount}.`);
}

main().catch(error => {
  console.error('Leaderboard privacy migration failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
