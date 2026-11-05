/**
 * Dry-run-first reconciliation for publicDatasetMeta/summary.
 *
 * Usage:
 *   npm run dataset:reconcile-summary
 *   npm run dataset:reconcile-summary -- --apply
 *   npm run dataset:reconcile-summary -- --apply --resume
 *
 * The same locked reconciliation service powers the authenticated admin page.
 * During --apply, the summary document is marked migrationInProgress before
 * scanning. Research submissions observe that lock in their transaction.
 * If the process is killed unexpectedly, confirm no other run is active before
 * resuming with --apply --resume.
 */
import { initializeAdminApp, getAdminDb } from '../server/config/firebaseAdmin';
import { DatasetSummaryReconciliationService } from '../server/services/datasetSummaryReconciliation';

const APPLY = process.argv.includes('--apply');
const RESUME = process.argv.includes('--resume');

async function main(): Promise<void> {
  initializeAdminApp();
  const service = new DatasetSummaryReconciliationService(getAdminDb);
  const report = await service.reconcile(APPLY ? 'apply' : 'dry-run', {
    source: 'cli',
    resume: RESUME
  });

  console.info('[dataset-summary] Reconciliation report:', JSON.stringify(report, null, 2));
  if (APPLY) {
    console.info('[dataset-summary] Reconciled publicDatasetMeta/summary successfully.');
  } else {
    console.info('[dataset-summary] Dry run only. Re-run with --apply to write the aggregate.');
  }
}

main().catch(error => {
  console.error('[dataset-summary] Reconciliation failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
