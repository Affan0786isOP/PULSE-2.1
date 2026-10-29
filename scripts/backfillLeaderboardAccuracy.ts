/**
 * Dry-run-first CLI wrapper for the shared leaderboard accuracy backfill service.
 * Default is dry-run. Pass --apply only after reviewing the dry-run report.
 */
import { initializeAdminApp, getAdminDb } from '../server/config/firebaseAdmin';
import { FirestoreLeaderboardAccuracyBackfillRepository } from '../server/repositories/firestore/firestoreLeaderboardAccuracyBackfillRepository';
import {
  DEFAULT_LEADERBOARD_ACCURACY_BACKFILL_BATCH_SIZE,
  LeaderboardAccuracyBackfillService
} from '../server/services/leaderboardAccuracyBackfill';

const APPLY = process.argv.includes('--apply');

async function main(): Promise<void> {
  initializeAdminApp();
  const db = getAdminDb();
  if (!db) throw new Error('Firestore Admin is unavailable; check Firebase service-account configuration.');

  const service = new LeaderboardAccuracyBackfillService(
    new FirestoreLeaderboardAccuracyBackfillRepository(() => db)
  );
  const totals = {
    scanned: 0,
    eligible: 0,
    wouldUpdate: 0,
    updated: 0,
    alreadyCorrect: 0,
    skipped: 0,
    failed: 0
  };
  const skipReasons: Record<string, number> = {};
  let cursor: string | null = null;
  let done = false;

  while (!done) {
    let expectedEntryIds: string[] | undefined = undefined;
    if (APPLY) {
      const preview = await service.runBatch({
        mode: 'dry-run',
        cursor,
        limit: DEFAULT_LEADERBOARD_ACCURACY_BACKFILL_BATCH_SIZE
      });
      expectedEntryIds = preview.entryIds;
    }

    const report = await service.runBatch({
      mode: APPLY ? 'apply' : 'dry-run',
      cursor,
      limit: DEFAULT_LEADERBOARD_ACCURACY_BACKFILL_BATCH_SIZE,
      expectedEntryIds
    });
    for (const key of Object.keys(totals) as Array<keyof typeof totals>) {
      totals[key] += report.counts[key];
    }
    for (const [reason, count] of Object.entries(report.skipReasons)) {
      skipReasons[reason] = (skipReasons[reason] || 0) + count;
    }
    cursor = report.nextCursor;
    done = report.done;
    if (!done && !cursor) throw new Error('Backfill pagination ended unexpectedly; stopping to avoid skipping records.');
  }

  console.info('[accuracy-backfill] Report:', JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    counts: totals,
    skipReasons
  }, null, 2));
  if (totals.failed > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error('[accuracy-backfill] Failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
