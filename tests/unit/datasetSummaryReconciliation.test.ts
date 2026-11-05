import { describe, expect, it } from 'vitest';
import { DatasetSummaryReconciliationService } from '../../server/services/datasetSummaryReconciliation';
import type { IDatasetSummaryMaintenanceRepository } from '../../server/repositories/interfaces/IDatasetSummaryMaintenanceRepository';
import type {
  DatasetSummarySource,
  DatasetSummarySourceRecord,
  DatasetSummaryStatus,
  DatasetSummaryValues
} from '../../server/models/datasetSummaryMaintenance';

function createMaintenanceRepository(
  records: DatasetSummarySourceRecord[] = [],
  initialSummary: DatasetSummaryValues | null = null,
  initialMigration = false
) {
  let summary = initialSummary;
  let migrationInProgress = initialMigration;
  let migrationRunId: string | null = initialMigration ? 'existing-run' : null;
  let migrationStartedAt: number | null = null;
  let lastReconciledAt: number | null = null;
  let writeCount = 0;

  const repository: IDatasetSummaryMaintenanceRepository = {
    async getStatus(): Promise<DatasetSummaryStatus> {
      return {
        exists: summary !== null || migrationInProgress,
        migrationInProgress,
        summary,
        lastReconciledAt,
        migrationStartedAt
      };
    },
    async acquireReconciliationLock(runId, startedAt, resume) {
      if (migrationInProgress && !resume) {
        throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
      }
      migrationInProgress = true;
      migrationStartedAt = startedAt;
      migrationRunId = runId;
      writeCount += 1;
    },
    async getPublicDatasetPage(cursor, pageSize): Promise<DatasetSummarySourceRecord[]> {
      const startIndex = cursor ? records.findIndex(record => record.id === cursor) + 1 : 0;
      return records.slice(startIndex, startIndex + pageSize);
    },
    async completeReconciliation(runId, nextSummary, completedAt, _source: DatasetSummarySource) {
      if (!migrationInProgress || migrationRunId !== runId) {
        throw new Error('DATASET_SUMMARY_MIGRATION_LOCK_LOST');
      }
      summary = nextSummary;
      migrationInProgress = false;
      migrationRunId = null;
      migrationStartedAt = null;
      lastReconciledAt = completedAt;
      writeCount += 1;
    },
    async releaseReconciliationLock(runId) {
      if (migrationInProgress && migrationRunId === runId) {
        migrationInProgress = false;
        migrationRunId = null;
        migrationStartedAt = null;
        writeCount += 1;
      }
    }
  };

  return {
    repository,
    getWriteCount: () => writeCount,
    getSummary: () => summary,
    getMigrationInProgress: () => migrationInProgress
  };
}

const existingCounts = {
  'visual-reaction': 1,
  direction: 1,
  'color-recognition': 0,
  'block-memory': 0,
  'number-memory': 0
};

describe('DatasetSummaryReconciliationService', () => {
  it('dry-runs the source collection without writing the summary', async () => {
    const { repository, getWriteCount, getSummary } = createMaintenanceRepository([
      { id: 'session-a', assessmentType: 'visual-reaction', progressionTrials: [{}, {}] },
      { id: 'session-b', assessmentType: 'direction-test', totalTrials: 3 }
    ]);
    const service = new DatasetSummaryReconciliationService(repository);

    const report = await service.reconcile('dry-run');

    expect(report.mode).toBe('dry-run');
    expect(report.scannedRecords).toBe(2);
    expect(report.summary).toEqual({
      totalRecords: 2,
      totalTrials: 5,
      counts: { ...existingCounts }
    });
    expect(report.matchesStoredSummary).toBeNull();
    expect(getSummary()).toBeNull();
    expect(getWriteCount()).toBe(0);
  });

  it('rebuilds only the aggregate document and releases the migration lock', async () => {
    const records: DatasetSummarySourceRecord[] = [
      { id: 'session-a', assessmentType: 'visual-reaction', progressionTrials: [{}, {}] },
      { id: 'session-b', assessmentType: 'direction', totalTrials: 3 }
    ];
    const { repository, getSummary, getMigrationInProgress } = createMaintenanceRepository(records);
    const service = new DatasetSummaryReconciliationService(repository);

    const report = await service.reconcile('apply', { source: 'admin-ui' });

    expect(report.mode).toBe('apply');
    expect(report.summary.totalRecords).toBe(2);
    expect(report.summary.totalTrials).toBe(5);
    expect(getSummary()).toEqual({
      totalRecords: 2,
      totalTrials: 5,
      counts: { ...existingCounts }
    });
    expect(getMigrationInProgress()).toBe(false);
  });

  it('paginates through collections larger than one Firestore page', async () => {
    const records: DatasetSummarySourceRecord[] = Array.from({ length: 501 }, (_, index) => ({
      id: `session-${String(index).padStart(4, '0')}`,
      assessmentType: 'visual-reaction',
      totalTrials: 2
    }));
    const { repository } = createMaintenanceRepository(records);
    const service = new DatasetSummaryReconciliationService(repository);

    const report = await service.reconcile('dry-run');

    expect(report.scannedRecords).toBe(501);
    expect(report.summary.totalRecords).toBe(501);
    expect(report.summary.totalTrials).toBe(1002);
    expect(report.summary.counts['visual-reaction']).toBe(501);
  });

  it('refuses to overwrite an active reconciliation lock', async () => {
    const { repository, getMigrationInProgress } = createMaintenanceRepository([], null, true);
    const service = new DatasetSummaryReconciliationService(repository);

    await expect(service.reconcile('apply')).rejects.toThrow('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
    expect(getMigrationInProgress()).toBe(true);
  });

  it('releases its own lock after a corrupt source record without replacing the summary', async () => {
    const originalSummary = {
      totalRecords: 9,
      totalTrials: 18,
      counts: { ...existingCounts, 'visual-reaction': 9 }
    };
    const { repository, getSummary, getMigrationInProgress } = createMaintenanceRepository(
      [{ id: 'bad-session', assessmentType: 'visual-reaction', totalTrials: 1.5 }],
      originalSummary
    );
    const service = new DatasetSummaryReconciliationService(repository);

    await expect(service.reconcile('apply')).rejects.toThrow('DATASET_SUMMARY_INVALID_TRIAL_COUNT:bad-session');
    expect(getSummary()).toEqual(originalSummary);
    expect(getMigrationInProgress()).toBe(false);
  });
});
