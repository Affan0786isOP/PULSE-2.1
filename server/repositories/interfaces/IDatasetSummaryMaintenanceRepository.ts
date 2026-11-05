import type {
  DatasetSummarySource,
  DatasetSummarySourceRecord,
  DatasetSummaryStatus,
  DatasetSummaryValues
} from '../../models/datasetSummaryMaintenance';

export interface IDatasetSummaryMaintenanceRepository {
  getStatus(): Promise<DatasetSummaryStatus>;
  acquireReconciliationLock(runId: string, startedAt: number, resume: boolean): Promise<void>;
  getPublicDatasetPage(cursor: string | null, pageSize: number): Promise<DatasetSummarySourceRecord[]>;
  completeReconciliation(
    runId: string,
    summary: DatasetSummaryValues,
    completedAt: number,
    source: DatasetSummarySource
  ): Promise<void>;
  releaseReconciliationLock(runId: string): Promise<void>;
}
