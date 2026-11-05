import { randomUUID } from 'node:crypto';
import { normalizeLeaderboardAssessmentType } from '../../shared/domain/leaderboardEligibility';
import type { IDatasetSummaryMaintenanceRepository } from '../repositories/interfaces/IDatasetSummaryMaintenanceRepository';
import type {
  DatasetSummaryAssessmentType,
  DatasetSummaryCounts,
  DatasetSummaryReconciliationReport,
  DatasetSummarySource,
  DatasetSummaryStatus,
  DatasetSummaryValues
} from '../models/datasetSummaryMaintenance';

const PAGE_SIZE = 500;
const ASSESSMENT_TYPES = [
  'visual-reaction',
  'direction',
  'color-recognition',
  'block-memory',
  'number-memory'
] as const satisfies readonly DatasetSummaryAssessmentType[];

function safeNonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function summariesEqual(left: DatasetSummaryValues, right: DatasetSummaryValues): boolean {
  return left.totalRecords === right.totalRecords &&
    left.totalTrials === right.totalTrials &&
    ASSESSMENT_TYPES.every(type => left.counts[type] === right.counts[type]);
}

export class DatasetSummaryReconciliationService {
  constructor(private readonly repository: IDatasetSummaryMaintenanceRepository) {}

  getStatus(): Promise<DatasetSummaryStatus> {
    return this.repository.getStatus();
  }

  async reconcile(
    mode: 'dry-run' | 'apply',
    options: { source?: DatasetSummarySource; resume?: boolean } = {}
  ): Promise<DatasetSummaryReconciliationReport> {
    const source = options.source ?? 'admin-ui';
    const startedAt = Date.now();
    const runId = mode === 'apply' ? randomUUID() : null;
    let lockAcquired = false;

    if (mode === 'apply' && runId) {
      await this.repository.acquireReconciliationLock(runId, startedAt, options.resume === true);
      lockAcquired = true;
    }

    try {
      const counts = Object.fromEntries(ASSESSMENT_TYPES.map(type => [type, 0])) as DatasetSummaryCounts;
      let totalRecords = 0;
      let totalTrials = 0;
      let cursor: string | null = null;

      while (true) {
        const page = await this.repository.getPublicDatasetPage(cursor, PAGE_SIZE);
        if (page.length === 0) break;

        for (const record of page) {
          totalRecords += 1;
          if (!Number.isSafeInteger(totalRecords)) {
            throw new Error('DATASET_SUMMARY_COUNTER_OVERFLOW');
          }
          const canonicalType = normalizeLeaderboardAssessmentType(
            typeof record.assessmentType === 'string' ? record.assessmentType : ''
          );
          if (canonicalType && Object.prototype.hasOwnProperty.call(counts, canonicalType)) {
            counts[canonicalType] += 1;
          }

          if (Array.isArray(record.progressionTrials)) {
            totalTrials += record.progressionTrials.length;
          } else {
            const legacyCount = record.totalTrials === undefined || record.totalTrials === null
              ? 0
              : safeNonNegativeInteger(record.totalTrials);
            if (legacyCount === null) {
              throw new Error(`DATASET_SUMMARY_INVALID_TRIAL_COUNT:${record.id}`);
            }
            totalTrials += legacyCount;
          }
          if (!Number.isSafeInteger(totalTrials)) {
            throw new Error('DATASET_SUMMARY_COUNTER_OVERFLOW');
          }
        }

        if (page.length < PAGE_SIZE) break;
        cursor = page[page.length - 1].id;
      }

      const summary: DatasetSummaryValues = { totalRecords, totalTrials, counts };
      const completedAt = Date.now();

      if (mode === 'apply' && runId) {
        await this.repository.completeReconciliation(runId, summary, completedAt, source);
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

      const status = await this.repository.getStatus();
      if (status.migrationInProgress) {
        throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
      }
      return {
        mode,
        scannedRecords: totalRecords,
        summary,
        matchesStoredSummary: status.summary ? summariesEqual(status.summary, summary) : null,
        completedAt,
        durationMs: completedAt - startedAt,
        source
      };
    } catch (error) {
      if (lockAcquired && runId) {
        try {
          await this.repository.releaseReconciliationLock(runId);
        } catch (unlockError) {
          console.warn('[dataset-summary] Failed to release reconciliation lock:', unlockError instanceof Error ? unlockError.message : String(unlockError));
        }
      }
      throw error;
    }
  }
}

export type {
  DatasetSummaryCounts,
  DatasetSummaryReconciliationReport,
  DatasetSummaryStatus,
  DatasetSummaryValues
} from '../models/datasetSummaryMaintenance';
