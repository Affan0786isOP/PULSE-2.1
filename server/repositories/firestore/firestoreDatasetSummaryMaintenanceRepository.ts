import type { Firestore } from 'firebase-admin/firestore';
import type {
  DatasetSummarySource,
  DatasetSummarySourceRecord,
  DatasetSummaryStatus,
  DatasetSummaryValues,
  DatasetSummaryCounts
} from '../../models/datasetSummaryMaintenance';
import type { IDatasetSummaryMaintenanceRepository } from '../interfaces/IDatasetSummaryMaintenanceRepository';

const SUMMARY_DOCUMENT_ID = 'summary';
const ASSESSMENT_TYPES = [
  'visual-reaction',
  'direction',
  'color-recognition',
  'block-memory',
  'number-memory'
] as const satisfies readonly (keyof DatasetSummaryCounts)[];

function safeNonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function readStoredSummary(data: Record<string, unknown> | undefined): DatasetSummaryValues | null {
  if (!data || data.schemaVersion !== 1) return null;
  const totalRecords = safeNonNegativeInteger(data.totalRecords);
  const totalTrials = safeNonNegativeInteger(data.totalTrials);
  const rawCounts = data.counts && typeof data.counts === 'object'
    ? data.counts as Record<string, unknown>
    : null;
  if (totalRecords === null || totalTrials === null || !rawCounts) return null;

  const counts = {} as DatasetSummaryCounts;
  for (const type of ASSESSMENT_TYPES) {
    const value = safeNonNegativeInteger(rawCounts[type]);
    if (value === null) return null;
    counts[type] = value;
  }
  return { totalRecords, totalTrials, counts };
}

export class FirestoreDatasetSummaryMaintenanceRepository implements IDatasetSummaryMaintenanceRepository {
  constructor(private readonly getDb: () => Firestore | null) {}

  private getDatabase(): Firestore {
    const db = this.getDb();
    if (!db) throw new Error('DATABASE_UNAVAILABLE');
    return db;
  }

  async getStatus(): Promise<DatasetSummaryStatus> {
    const db = this.getDatabase();
    const snapshot = await db.collection('publicDatasetMeta').doc(SUMMARY_DOCUMENT_ID).get();
    const data = snapshot.data() as Record<string, unknown> | undefined;
    return {
      exists: snapshot.exists,
      migrationInProgress: data?.migrationInProgress === true,
      summary: readStoredSummary(data),
      lastReconciledAt: safeNonNegativeInteger(data?.lastReconciledAt),
      migrationStartedAt: safeNonNegativeInteger(data?.migrationStartedAt)
    };
  }

  async acquireReconciliationLock(runId: string, startedAt: number, resume: boolean): Promise<void> {
    const db = this.getDatabase();
    const summaryRef = db.collection('publicDatasetMeta').doc(SUMMARY_DOCUMENT_ID);
    await db.runTransaction(async tx => {
      const current = await tx.get(summaryRef);
      const data = current.data() as Record<string, unknown> | undefined;
      if (data?.migrationInProgress === true && !resume) {
        throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
      }
      tx.set(summaryRef, {
        schemaVersion: 1,
        migrationInProgress: true,
        migrationStartedAt: startedAt,
        migrationRunId: runId
      }, { merge: true });
    });
  }

  async getPublicDatasetPage(cursor: string | null, pageSize: number): Promise<DatasetSummarySourceRecord[]> {
    const db = this.getDatabase();
    let query = db.collection('publicDataset').orderBy('__name__').limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    return page.docs.map(snapshot => ({
      ...(snapshot.data() as Record<string, unknown>),
      id: snapshot.id
    }));
  }

  async completeReconciliation(
    runId: string,
    summary: DatasetSummaryValues,
    completedAt: number,
    source: DatasetSummarySource
  ): Promise<void> {
    const db = this.getDatabase();
    const summaryRef = db.collection('publicDatasetMeta').doc(SUMMARY_DOCUMENT_ID);
    await db.runTransaction(async tx => {
      const current = await tx.get(summaryRef);
      const data = current.data() as Record<string, unknown> | undefined;
      if (data?.migrationRunId !== runId || data?.migrationInProgress !== true) {
        throw new Error('DATASET_SUMMARY_MIGRATION_LOCK_LOST');
      }
      tx.set(summaryRef, {
        ...summary,
        schemaVersion: 1,
        lastUpdatedAt: completedAt,
        lastReconciledAt: completedAt,
        reconciliationSource: source,
        migrationInProgress: false,
        migrationStartedAt: null,
        migrationRunId: null
      }, { merge: true });
    });
  }

  async releaseReconciliationLock(runId: string): Promise<void> {
    const db = this.getDatabase();
    const summaryRef = db.collection('publicDatasetMeta').doc(SUMMARY_DOCUMENT_ID);
    await db.runTransaction(async tx => {
      const current = await tx.get(summaryRef);
      const data = current.data() as Record<string, unknown> | undefined;
      if (data?.migrationRunId === runId && data?.migrationInProgress === true) {
        tx.set(summaryRef, {
          migrationInProgress: false,
          migrationStartedAt: null,
          migrationRunId: null
        }, { merge: true });
      }
    });
  }
}
