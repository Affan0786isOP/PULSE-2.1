/**
 * Dry-run-first reconciliation for publicDatasetMeta/summary.
 *
 * Usage:
 *   npm run dataset:reconcile-summary
 *   npm run dataset:reconcile-summary -- --apply
 *   npm run dataset:reconcile-summary -- --apply --resume
 *
 * During --apply, the summary document is marked migrationInProgress before
 * scanning. Research submissions observe that lock in their transaction and
 * fail closed until the exact aggregate has been written. If the process exits
 * unexpectedly, rerun with --apply --resume after confirming no other backfill
 * is running.
 */
import { initializeAdminApp, getAdminDb } from '../server/config/firebaseAdmin';
import { normalizeLeaderboardAssessmentType } from '../shared/domain/leaderboardEligibility';

const APPLY = process.argv.includes('--apply');
const RESUME = process.argv.includes('--resume');
const PAGE_SIZE = 500;

function finiteNonNegative(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

async function main(): Promise<void> {
  initializeAdminApp();
  const db = getAdminDb();
  if (!db) throw new Error('Firestore Admin is unavailable; check Firebase service-account configuration.');

  const summaryRef = db.collection('publicDatasetMeta').doc('summary');

  if (APPLY) {
    await db.runTransaction(async tx => {
      const current = await tx.get(summaryRef);
      const data = current.data() as Record<string, unknown> | undefined;
      if (data?.migrationInProgress === true && !RESUME) {
        throw new Error('A dataset summary migration is already marked in progress. Confirm no process is running, then pass --resume.');
      }
      tx.set(summaryRef, {
        schemaVersion: 1,
        migrationInProgress: true,
        migrationStartedAt: Date.now()
      }, { merge: true });
    });
  }

  const counts: Record<string, number> = {
    'visual-reaction': 0,
    direction: 0,
    'color-recognition': 0,
    'block-memory': 0,
    'number-memory': 0
  };
  let totalRecords = 0;
  let totalTrials = 0;
  let cursor: string | null = null;

  while (true) {
    let query = db.collection('publicDataset').orderBy('__name__').limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;

    for (const snapshot of page.docs) {
      const data = snapshot.data() as Record<string, unknown>;
      totalRecords += 1;
      const canonicalType = normalizeLeaderboardAssessmentType(data.assessmentType);
      if (canonicalType && Object.prototype.hasOwnProperty.call(counts, canonicalType)) {
        counts[canonicalType] += 1;
      }
      totalTrials += Array.isArray(data.progressionTrials)
        ? data.progressionTrials.length
        : finiteNonNegative(data.totalTrials);
    }

    if (page.size < PAGE_SIZE) break;
    cursor = page.docs[page.docs.length - 1].id;
  }

  const result = {
    totalRecords,
    totalTrials,
    counts,
    schemaVersion: 1,
    lastUpdatedAt: Date.now()
  };

  console.info('[dataset-summary] Reconciliation report:', JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    ...result
  }, null, 2));

  if (APPLY) {
    await summaryRef.set({
      ...result,
      migrationInProgress: false,
      migrationStartedAt: null
    }, { merge: true });
    console.info('[dataset-summary] Reconciled publicDatasetMeta/summary successfully.');
  } else {
    console.info('[dataset-summary] Dry run only. Re-run with --apply to write the aggregate.');
  }
}

main().catch(error => {
  console.error('[dataset-summary] Reconciliation failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
