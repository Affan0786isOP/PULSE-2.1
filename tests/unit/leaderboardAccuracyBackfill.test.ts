import { describe, expect, it } from 'vitest';
import { LeaderboardAccuracyBackfillService } from '../../server/services/leaderboardAccuracyBackfill';
import { FirestoreLeaderboardAccuracyBackfillRepository } from '../../server/repositories/firestore/firestoreLeaderboardAccuracyBackfillRepository';

function runBackfill(db: unknown, input: { mode: 'dry-run' | 'apply'; cursor: string | null; limit: number; expectedEntryIds?: string[] }) {
  return new LeaderboardAccuracyBackfillService(
    new FirestoreLeaderboardAccuracyBackfillRepository(() => db as never)
  ).runBatch(input);
}

type RecordMap = Map<string, Record<string, unknown>>;

function createMockDb(publicSeed: Record<string, Record<string, unknown>>, privateSeed: Record<string, Record<string, unknown>>) {
  const publicRows: RecordMap = new Map(Object.entries(publicSeed));
  const privateRows: RecordMap = new Map(Object.entries(privateSeed));
  const initialPublicCount = publicRows.size;
  let writeCount = 0;

  const getCollectionMap = (name: string): RecordMap => {
    if (name === 'leaderboardResults') return publicRows;
    if (name === 'leaderboardPrivateMeta') return privateRows;
    throw new Error('Unexpected collection: ' + name);
  };
  const makeRef = (collectionName: string, id: string) => ({ collectionName, id });

  const db: any = {
    collection(name: string) {
      return {
        doc(id: string) { return makeRef(name, id); },
        orderBy() {
          let pageLimit = 10;
          let cursor: string | null = null;
          const query: any = {
            limit(value: number) { pageLimit = value; return query; },
            startAfter(value: string) { cursor = value; return query; },
            async get() {
              const ids = Array.from(getCollectionMap(name).keys())
                .sort()
                .filter(id => !cursor || id > cursor)
                .slice(0, pageLimit);
              const docs = ids.map(id => ({
                id,
                ref: makeRef(name, id),
                data: () => ({ ...(getCollectionMap(name).get(id) || {}) })
              }));
              return { docs, size: docs.length, empty: docs.length === 0 };
            }
          };
          return query;
        }
      };
    },
    async runTransaction(callback: (transaction: any) => Promise<unknown>) {
      const transaction = {
        async get(ref: { collectionName: string; id: string }) {
          const value = getCollectionMap(ref.collectionName).get(ref.id);
          return { exists: value !== undefined, data: () => value ? { ...value } : undefined };
        },
        update(ref: { collectionName: string; id: string }, patch: Record<string, unknown>) {
          const collection = getCollectionMap(ref.collectionName);
          const existing = collection.get(ref.id);
          if (!existing) throw new Error('NOT_FOUND');
          collection.set(ref.id, { ...existing, ...patch });
          writeCount++;
        }
      };
      return callback(transaction);
    }
  };

  return { db, publicRows, initialPublicCount, getWriteCount: () => writeCount };
}

function validRows(accuracy?: number) {
  const publicRow: Record<string, unknown> = {
    displayName: 'PlayerOne',
    assessmentType: 'block-memory',
    scoreMetric: 8,
    ageGroup: 'Young adults (18–25)',
    hidden: false,
    provenanceToken: 'matching-provenance'
  };
  if (accuracy !== undefined) publicRow.accuracy = accuracy;
  return {
    publicSeed: { 'entry-1': publicRow },
    privateSeed: {
      'entry-1': {
        publicEntry: true,
        submissionReceiptOnly: false,
        displayName: 'PlayerOne',
        assessmentType: 'block-memory',
        scoreMetric: 8,
        ageGroup: 'Young adults (18–25)',
        hidden: false,
        provenanceToken: 'matching-provenance',
        derivedMetrics: { overallAccuracy: 87.5 }
      }
    }
  };
}

describe('Leaderboard accuracy backfill service', () => {
  it('dry-run reports eligible rows and makes zero writes', async () => {
    const rows = validRows();
    const fixture = createMockDb(rows.publicSeed, rows.privateSeed);
    const report = await runBackfill(fixture.db, { mode: 'dry-run', cursor: null, limit: 10 });

    expect(report.counts.scanned).toBe(1);
    expect(report.counts.wouldUpdate).toBe(1);
    expect(report.counts.updated).toBe(0);
    expect(fixture.getWriteCount()).toBe(0);
    expect(fixture.publicRows.get('entry-1')?.accuracy).toBeUndefined();
  });

  it('apply updates only accuracy on an existing record and does not increase count', async () => {
    const rows = validRows();
    const fixture = createMockDb(rows.publicSeed, rows.privateSeed);
    const originalCount = fixture.publicRows.size;
    const original = { ...(fixture.publicRows.get('entry-1') || {}) };
    const report = await runBackfill(fixture.db, { mode: 'apply', cursor: null, limit: 10, expectedEntryIds: ['entry-1'] });

    expect(report.counts.updated).toBe(1);
    expect(fixture.publicRows.get('entry-1')).toEqual({ ...original, accuracy: 87.5 });
    expect(fixture.publicRows.size).toBe(originalCount);
    expect(fixture.publicRows.size).toBe(fixture.initialPublicCount);
    expect(fixture.getWriteCount()).toBe(1);
  });

  it('skips missing or invalid accuracy source data without creating a record', async () => {
    const rows = validRows();
    rows.privateSeed['entry-1'].derivedMetrics = { overallAccuracy: 150 };
    const fixture = createMockDb(rows.publicSeed, rows.privateSeed);
    const report = await runBackfill(fixture.db, { mode: 'apply', cursor: null, limit: 10, expectedEntryIds: ['entry-1'] });

    expect(report.counts.skipped).toBe(1);
    expect(report.skipReasons['no-valid-source-accuracy']).toBe(1);
    expect(fixture.getWriteCount()).toBe(0);
    expect(fixture.publicRows.size).toBe(1);
  });

  it('skips mismatched provenance and conflicting existing accuracy', async () => {
    const rows = validRows();
    rows.privateSeed['entry-1'].provenanceToken = 'different-provenance';
    const fixture = createMockDb(rows.publicSeed, rows.privateSeed);
    const report = await runBackfill(fixture.db, { mode: 'apply', cursor: null, limit: 10, expectedEntryIds: ['entry-1'] });

    expect(report.counts.skipped).toBe(1);
    expect(report.skipReasons['provenance-mismatch']).toBe(1);
    expect(fixture.getWriteCount()).toBe(0);
  });

  it('does not overwrite conflicting accuracy', async () => {
    const rows = validRows(33);
    const fixture = createMockDb(rows.publicSeed, rows.privateSeed);
    const report = await runBackfill(fixture.db, { mode: 'apply', cursor: null, limit: 10, expectedEntryIds: ['entry-1'] });

    expect(report.counts.skipped).toBe(1);
    expect(report.skipReasons['conflicting-existing-accuracy']).toBe(1);
    expect(fixture.publicRows.get('entry-1')?.accuracy).toBe(33);
    expect(fixture.getWriteCount()).toBe(0);
  });

  it('refuses apply when the page no longer matches the reviewed dry-run preview', async () => {
    const rows = validRows();
    const fixture = createMockDb(rows.publicSeed, rows.privateSeed);
    const service = new LeaderboardAccuracyBackfillService(
      new FirestoreLeaderboardAccuracyBackfillRepository(() => fixture.db as never)
    );

    await expect(service.runBatch({
      mode: 'apply',
      cursor: null,
      limit: 10,
      expectedEntryIds: ['different-entry']
    })).rejects.toThrow('BACKFILL_BATCH_CHANGED');
    expect(fixture.getWriteCount()).toBe(0);
  });

  it('paginates with document-ID cursors', async () => {
    const rows = validRows();
    const fixture = createMockDb({
      'entry-1': rows.publicSeed['entry-1'],
      'entry-2': { ...rows.publicSeed['entry-1'] }
    }, {
      'entry-1': rows.privateSeed['entry-1'],
      'entry-2': rows.privateSeed['entry-1']
    });
    const first = await runBackfill(fixture.db, { mode: 'dry-run', cursor: null, limit: 1 });
    const second = await runBackfill(fixture.db, { mode: 'dry-run', cursor: first.nextCursor, limit: 1 });

    expect(first.counts.scanned).toBe(1);
    expect(first.nextCursor).toBe('entry-1');
    expect(first.done).toBe(false);
    expect(second.counts.scanned).toBe(1);
    expect(second.nextCursor).toBe('entry-2');
  });
});
