import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { DatasetSummaryReconciliationService } from '../../server/services/datasetSummaryReconciliation';

function createReconciliationDb(seed: Record<string, Record<string, unknown>[]> = {}) {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();
  for (const [collectionName, records] of Object.entries(seed)) {
    collections.set(collectionName, new Map(records.map(record => {
      const { id, ...data } = record;
      return [String(id), structuredClone(data)] as const;
    })));
  }

  const getCollection = (name: string) => {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name)!;
  };

  const createRef = (collectionName: string, id: string) => ({
    id,
    async get() {
      const data = getCollection(collectionName).get(id);
      return { id, exists: data !== undefined, data: () => data ? structuredClone(data) : undefined };
    },
    async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
      const rows = getCollection(collectionName);
      const previous = rows.get(id) ?? {};
      rows.set(id, options?.merge ? { ...previous, ...structuredClone(data) } : structuredClone(data));
    }
  });

  const db = {
    collection(name: string) {
      return {
        doc(id: string) {
          return createRef(name, id);
        },
        orderBy(field: string) {
          let limitCount = Number.POSITIVE_INFINITY;
          let cursor: string | null = null;
          const query = {
            limit(value: number) {
              limitCount = value;
              return query;
            },
            startAfter(value: string) {
              cursor = value;
              return query;
            },
            async get() {
              const rows = Array.from(getCollection(name).entries()).sort(([left], [right]) =>
                field === '__name__' ? left.localeCompare(right) : 0
              ).filter(([id]) => !cursor || id > cursor);
              const docs = rows.slice(0, limitCount).map(([id, data]) => ({
                id,
                data: () => structuredClone(data)
              }));
              return { docs, size: docs.length, empty: docs.length === 0 };
            }
          };
          return query;
        }
      };
    },
    async runTransaction(callback: (tx: any) => Promise<unknown>) {
      const tx = {
        get: (ref: any) => ref.get(),
        set: (ref: any, data: Record<string, unknown>, options?: { merge?: boolean }) => ref.set(data, options)
      };
      return callback(tx);
    }
  };

  return {
    db: db as unknown as Firestore,
    read: (collection: string, id: string) => getCollection(collection).get(id)
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
  it('dry-runs the source collection without writing the summary document', async () => {
    const { db, read } = createReconciliationDb({
      publicDataset: [
        { id: 'session-a', assessmentType: 'visual-reaction', progressionTrials: [{}, {}] },
        { id: 'session-b', assessmentType: 'direction-test', totalTrials: 3 }
      ]
    });
    const service = new DatasetSummaryReconciliationService(() => db);

    const report = await service.reconcile('dry-run');

    expect(report.mode).toBe('dry-run');
    expect(report.scannedRecords).toBe(2);
    expect(report.summary).toEqual({
      totalRecords: 2,
      totalTrials: 5,
      counts: { ...existingCounts }
    });
    expect(report.matchesStoredSummary).toBeNull();
    expect(read('publicDatasetMeta', 'summary')).toBeUndefined();
  });

  it('rebuilds only the aggregate document and releases the migration lock', async () => {
    const { db, read } = createReconciliationDb({
      publicDataset: [
        { id: 'session-a', assessmentType: 'visual-reaction', progressionTrials: [{}, {}] },
        { id: 'session-b', assessmentType: 'direction', totalTrials: 3 }
      ]
    });
    const service = new DatasetSummaryReconciliationService(() => db);

    const report = await service.reconcile('apply', { source: 'admin-ui' });

    expect(report.mode).toBe('apply');
    expect(report.summary.totalRecords).toBe(2);
    expect(report.summary.totalTrials).toBe(5);
    expect(read('publicDataset', 'session-a')).toMatchObject({
      assessmentType: 'visual-reaction',
      progressionTrials: [{}, {}]
    });
    expect(read('publicDatasetMeta', 'summary')).toMatchObject({
      schemaVersion: 1,
      totalRecords: 2,
      totalTrials: 5,
      counts: { 'visual-reaction': 1, direction: 1 },
      migrationInProgress: false,
      migrationRunId: null,
      reconciliationSource: 'admin-ui'
    });
    const status = await service.getStatus();
    expect(status.exists).toBe(true);
    expect(status.migrationInProgress).toBe(false);
    expect(status.summary?.totalRecords).toBe(2);
    expect(status.lastReconciledAt).not.toBeNull();
  });

  it('paginates through collections larger than one Firestore page', async () => {
    const records = Array.from({ length: 501 }, (_, index) => ({
      id: `session-${String(index).padStart(4, '0')}`,
      assessmentType: 'visual-reaction',
      totalTrials: 2
    }));
    const { db } = createReconciliationDb({ publicDataset: records });
    const service = new DatasetSummaryReconciliationService(() => db);

    const report = await service.reconcile('dry-run');

    expect(report.scannedRecords).toBe(501);
    expect(report.summary.totalRecords).toBe(501);
    expect(report.summary.totalTrials).toBe(1002);
    expect(report.summary.counts['visual-reaction']).toBe(501);
  });

  it('refuses to overwrite an active reconciliation lock', async () => {
    const { db, read } = createReconciliationDb({
      publicDatasetMeta: [{
        id: 'summary',
        schemaVersion: 1,
        migrationInProgress: true,
        migrationRunId: 'another-run'
      }]
    });
    const service = new DatasetSummaryReconciliationService(() => db);

    await expect(service.reconcile('apply')).rejects.toThrow('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
    expect(read('publicDatasetMeta', 'summary')).toMatchObject({
      migrationInProgress: true,
      migrationRunId: 'another-run'
    });
  });

  it('releases its own lock after a corrupt source record without replacing the summary', async () => {
    const originalSummary = {
      schemaVersion: 1,
      totalRecords: 9,
      totalTrials: 18,
      counts: { ...existingCounts, 'visual-reaction': 9 }
    };
    const { db, read } = createReconciliationDb({
      publicDataset: [
        { id: 'bad-session', assessmentType: 'visual-reaction', totalTrials: 1.5 }
      ],
      publicDatasetMeta: [{ id: 'summary', ...originalSummary }]
    });
    const service = new DatasetSummaryReconciliationService(() => db);

    await expect(service.reconcile('apply')).rejects.toThrow('DATASET_SUMMARY_INVALID_TRIAL_COUNT:bad-session');
    expect(read('publicDatasetMeta', 'summary')).toMatchObject({
      ...originalSummary,
      migrationInProgress: false,
      migrationRunId: null,
      migrationStartedAt: null
    });
  });
});
