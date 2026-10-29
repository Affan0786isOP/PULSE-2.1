/**
 * Maintenance-only migration: retain the best currently visible row per owner
 * and assessment, leaving superseded attempt metadata intact for replay/audit.
 * Run after migrate:leaderboard-privacy and during a short maintenance window.
 * Hidden moderation rows and rows with no trusted owner mapping are not changed.
 */
import * as crypto from 'crypto';
import { FieldPath, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { initializeAdminApp, getAdminDb } from '../server/config/firebaseAdmin';
import { normalizeAssessmentType } from '../server/engines/assessmentTypes';
import { isValidLeaderboardScoreMetric } from '../shared/domain/leaderboardEligibility';

const PAGE_SIZE = 200;
interface Row { id: string; ownerUid: string; assessmentType: string; scoreMetric: number; createdAt: number; }
function ownerIndexDocumentId(ownerUid: string, assessmentType: string): string {
  return crypto.createHash('sha256').update(ownerUid + ':' + assessmentType).digest('hex');
}
function timestamp(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return Number(value) || 0;
}
function better(a: Row, b: Row): boolean {
  const speed = a.assessmentType === 'visual-reaction' || a.assessmentType === 'direction' || a.assessmentType === 'color-recognition';
  if (a.scoreMetric !== b.scoreMetric) return speed ? a.scoreMetric < b.scoreMetric : a.scoreMetric > b.scoreMetric;
  return a.createdAt < b.createdAt || (a.createdAt === b.createdAt && a.id.localeCompare(b.id) < 0);
}
async function main(): Promise<void> {
  initializeAdminApp();
  const db = getAdminDb();
  if (!db) throw new Error('Firestore Admin is unavailable; check Firebase service-account configuration.');

  const grouped = new Map<string, Row[]>();
  let cursor: QueryDocumentSnapshot | undefined;
  while (true) {
    let query = db.collection('leaderboardResults').orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;
    const metas = await db.getAll(...page.docs.map(doc => db.collection('leaderboardPrivateMeta').doc(doc.id)));
    page.docs.forEach((doc, index) => {
      const data = doc.data();
      const meta = metas[index].exists ? metas[index].data() || {} : {};
      if (data.hidden !== false || typeof meta.ownerUid !== 'string') return;
      const assessmentType = normalizeAssessmentType(String(data.assessmentType || meta.assessmentType || ''));
      const scoreMetric = typeof data.scoreMetric === 'number' ? data.scoreMetric : Number(meta.scoreMetric);
      if (!isValidLeaderboardScoreMetric(assessmentType, scoreMetric)) return;
      const row: Row = { id: doc.id, ownerUid: meta.ownerUid, assessmentType, scoreMetric, createdAt: timestamp(data.createdAt) };
      const key = row.ownerUid + ':' + row.assessmentType;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    });
    cursor = page.docs[page.docs.length - 1];
    if (page.size < PAGE_SIZE) break;
  }

  let superseded = 0;
  for (const rows of grouped.values()) {
    if (rows.length < 2) continue;
    rows.sort((a, b) => better(a, b) ? -1 : better(b, a) ? 1 : 0);
    const winner = rows[0];
    for (const loser of rows.slice(1)) {
      const publicRef = db.collection('leaderboardResults').doc(loser.id);
      const metaRef = db.collection('leaderboardPrivateMeta').doc(loser.id);
      const ownerIndexRef = db.collection('leaderboardOwnerIndex').doc(ownerIndexDocumentId(loser.ownerUid, loser.assessmentType));
      await db.runTransaction(async tx => {
        const indexSnap = await tx.get(ownerIndexRef);
        if (indexSnap.data()?.deleting === true) return;
        const [publicSnap, metaSnap] = await Promise.all([tx.get(publicRef), tx.get(metaRef)]);
        if (!publicSnap.exists || publicSnap.get('hidden') !== false || !metaSnap.exists) return;
        const meta = metaSnap.data() || {};
        if (meta.ownerUid !== loser.ownerUid || normalizeAssessmentType(String(meta.assessmentType || '')) !== loser.assessmentType) return;
        tx.delete(publicRef);
        tx.set(metaRef, { ...meta, publicEntry: false, submissionReceiptOnly: true, supersededBy: winner.id, updatedAt: Date.now() }, { merge: true });
        if (!indexSnap.exists || indexSnap.data()?.leaderboardDocId === loser.id) {
          tx.set(ownerIndexRef, { ownerUid: loser.ownerUid, assessmentType: loser.assessmentType, leaderboardDocId: winner.id, updatedAt: Date.now() }, { merge: true });
        }
      });
      superseded++;
    }
  }
  console.info('Leaderboard best-per-owner migration complete. Legacy visible rows superseded: ' + superseded);
}
main().catch(error => {
  console.error('Leaderboard best-per-owner migration failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
