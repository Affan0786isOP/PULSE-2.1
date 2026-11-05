import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { normalizeLeaderboardAssessmentType } from '../../shared/domain/leaderboardEligibility';

const SUMMARY_DOCUMENT_ID = 'summary';
const PAGE_SIZE = 500;
const ASSESSMENT_TYPES = [
  'visual-reaction',
  'direction',
  'color-recognition',
  'block-memory',
  'number-memory'
] as const;

export type DatasetSummaryCounts = Record<(typeof ASSESSMENT_TYPES)[number], number>;
export interface DatasetSummaryValues {
  totalRecords: number;
  totalTrials: number;
  counts: DatasetSummaryCounts;
}
export interface DatasetSummaryStatus {
  exists: boolean;
  migrationInProgress: boolean;
  summary: DatasetSummaryValues | null;
  lastReconciledAt: number | null;
  migrationStartedAt: number | null;
}
export interface DatasetSummaryReconciliationReport {
  mode: 'dry-run' | 'apply';
  scannedRecords: number;
  summary: DatasetSummaryValues;
  matchesStoredSummary: boolean | null;
  completedAt: number;
  durationMs: number;
  source: 'admin-ui' | 'cli';
}

function safeNonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function readStoredSummary(data: Record<string, unknown> | undefined): DatasetSummaryValues | null {
  if (!data) return null;
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

function summariesEqual(left: DatasetSummaryValues, right: DatasetSummaryValues): boolean {
  return left.totalRecords === right.totalRecords &&
    left.totalTrials === right.totalTrials &&
    ASSESSMENT_TYPES.every(type => left.counts[type] === right.counts[type]);
}

export class DatasetSummaryReconciliationService {
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

  async reconcile(
    mode: 'dry-run' | 'apply',
    options: { source?: 'admin-ui' | 'cli'; resume?: boolean } = {}
  ): Promise<DatasetSummaryReconciliationReport> {
    const db = this.getDatabase();
    const source = options.source ?? 'admin-ui';
    const startedAt = Date.now();
    const summaryRef = db.collection('publicDatasetMeta').doc(SUMMARY_DOCUMENT_ID);
    const runId = mode === 'apply' ? randomUUID() : null;
    let lockAcquired = false;

    if (mode === 'apply') {
      await db.runTransaction(async tx => {
        const current = await tx.get(summaryRef);
        const data = current.data() as Record<string, unknown> | undefined;
        if (data?.migrationInProgress === true && options.resume !== true) {
          throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
        }
        tx.set(summaryRef, {
          schemaVersion: 1,
          migrationInProgress: true,
          migrationStartedAt: startedAt,
          migrationRunId: runId
        }, { merge: true });
      });
      lockAcquired = true;
    }

    try {
      const counts = Object.fromEntries(ASSESSMENT_TYPES.map(type => [type, 0])) as DatasetSummaryCounts;
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

          if (Array.isArray(data.progressionTrials)) {
            totalTrials += data.progressionTrials.length;
          } else {
            const legacyCount = data.totalTrials === undefined || data.totalTrials === null
              ? 0
              : safeNonNegativeInteger(data.totalTrials);
            if (legacyCount === null) {
              throw new Error(`DATASET_SUMMARY_INVALID_TRIAL_COUNT:${snapshot.id}`);
            }
            totalTrials += legacyCount;
          }
          if (!Number.isSafeInteger(totalTrials)) {
            throw new Error('DATASET_SUMMARY_COUNTER_OVERFLOW');
          }
        }

        if (page.size < PAGE_SIZE) break;
        cursor = page.docs[page.docs.length - 1].id;
      }

      const summary: DatasetSummaryValues = { totalRecords, totalTrials, counts };
      const completedAt = Date.now();

      if (mode === 'apply') {
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
        lockAcquired = false;
        return {
          mode,
          scannedRecords: totalRecords,
          summary,
          matchesStoredSummary: true,
          completedAt,
          durationMs: completedAt - startedAt,
          source
        };
      }

      const storedSnapshot = await summaryRef.get();
      const storedData = storedSnapshot.data() as Record<string, unknown> | undefined;
      if (storedData?.migrationInProgress === true) {
        throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
      }
      const storedSummary = readStoredSummary(storedData);
      return {
        mode,
        scannedRecords: totalRecords,
        summary,
        matchesStoredSummary: storedSummary ? summariesEqual(storedSummary, summary) : null,
        completedAt,
        durationMs: completedAt - startedAt,
        source
      };
    } catch (error) {
      if (lockAcquired && runId) {
        try {
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
        } catch (unlockError) {
          console.warn('[dataset-summary] Failed to release reconciliation lock:', unlockError instanceof Error ? unlockError.message : String(unlockError));
        }
      }
      throw error;
    }
  }
}
