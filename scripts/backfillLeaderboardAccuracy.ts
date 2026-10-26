/**
 * Dry-run-first migration for the public leaderboard accuracy field.
 * Default mode reports candidate changes; pass --apply to backfill verified fields.
 * Review the dry-run report before any production invocation.
 */
import { FieldPath, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { initializeAdminApp, getAdminDb } from '../server/config/firebaseAdmin';
import { normalizeAssessmentType } from '../server/engines/assessmentTypes';
import { isValidLeaderboardScoreMetric, normalizeLeaderboardAccuracy } from '../shared/domain/leaderboardEligibility';

const PAGE_SIZE = 200;
const APPLY = process.argv.includes('--apply');
const counts = { scanned: 0, eligible: 0, wouldUpdate: 0, updated: 0, alreadyCorrect: 0, skipped: 0, failed: 0 };
const skipReasons: Record<string, number> = {};
function skip(reason: string) { return { kind: 'skip' as const, reason }; }
function sameIfPresent(a: unknown, b: unknown): boolean { return a == null || b == null || a === b; }
function validAccuracy(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100; }

async function processRow(db: NonNullable<ReturnType<typeof getAdminDb>>, rowSnap: QueryDocumentSnapshot): Promise<void> {
  try {
    const outcome = await db.runTransaction(async tx => {
      const publicRef = rowSnap.ref;
      const metaRef = db.collection('leaderboardPrivateMeta').doc(rowSnap.id);
      const [publicSnap, metaSnap] = await Promise.all([tx.get(publicRef), tx.get(metaRef)]);
      if (!publicSnap.exists || !metaSnap.exists) return skip('missing-counterpart');
      const row = publicSnap.data() || {};
      const meta = metaSnap.data() || {};
      if (meta.publicEntry !== true || meta.submissionReceiptOnly === true) return skip('not-an-active-public-entry');
      const publicType = normalizeAssessmentType(String(row.assessmentType || ''));
      const privateType = normalizeAssessmentType(String(meta.assessmentType || ''));
      if (!publicType || publicType !== privateType) return skip('assessment-type-mismatch');
      const publicScore = typeof row.scoreMetric === 'number' ? row.scoreMetric : Number.NaN;
      const privateScore = typeof meta.scoreMetric === 'number' ? meta.scoreMetric : Number.NaN;
      if (!Number.isFinite(publicScore) || publicScore !== privateScore || !isValidLeaderboardScoreMetric(publicType, publicScore)) return skip('score-mismatch-or-invalid');
      if (typeof row.provenanceToken !== 'string' || !row.provenanceToken || row.provenanceToken !== meta.provenanceToken) return skip('provenance-mismatch');
      if (!sameIfPresent(row.displayName, meta.displayName) || !sameIfPresent(row.ageGroup, meta.ageGroup) || ((row.hidden === true) !== (meta.hidden === true))) return skip('public-private-field-mismatch');
      const accuracy = normalizeLeaderboardAccuracy(meta.derivedMetrics);
      if (accuracy === null) return skip('no-valid-source-accuracy');
      if (validAccuracy(row.accuracy)) return row.accuracy === accuracy ? { kind: 'alreadyCorrect' as const } : skip('conflicting-existing-accuracy');
      if (!APPLY) return { kind: 'dryRun' as const };
      tx.update(publicRef, { accuracy });
      return { kind: 'updated' as const };
    });
    if (outcome.kind === 'skip') {
      counts.skipped++;
      skipReasons[outcome.reason] = (skipReasons[outcome.reason] || 0) + 1;
    } else {
      counts.eligible++;
      if (outcome.kind === 'dryRun') counts.wouldUpdate++;
      if (outcome.kind === 'alreadyCorrect') counts.alreadyCorrect++;
      if (outcome.kind === 'updated') counts.updated++;
    }
  } catch (error) {
    counts.failed++;
    console.error('[accuracy-backfill] Row failed:', rowSnap.id, error instanceof Error ? error.message : String(error));
  }
}

async function main(): Promise<void> {
  initializeAdminApp();
  const db = getAdminDb();
  if (!db) throw new Error('Firestore Admin is unavailable; check Firebase service-account configuration.');
  let cursor: QueryDocumentSnapshot | undefined;
  while (true) {
    let query = db.collection('leaderboardResults').orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;
    for (const row of page.docs) { counts.scanned++; await processRow(db, row); }
    cursor = page.docs[page.docs.length - 1];
    if (page.size < PAGE_SIZE) break;
  }
  console.info('[accuracy-backfill] Report:', JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', counts, skipReasons }, null, 2));
  if (counts.failed > 0) process.exitCode = 1;
}
main().catch(error => { console.error('[accuracy-backfill] Failed:', error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
