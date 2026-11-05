export type DatasetSummaryAssessmentType =
  | 'visual-reaction'
  | 'direction'
  | 'color-recognition'
  | 'block-memory'
  | 'number-memory';

export type DatasetSummarySource = 'admin-ui' | 'cli';

export type DatasetSummaryCounts = Record<DatasetSummaryAssessmentType, number>;

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

export interface DatasetSummarySourceRecord {
  id: string;
  assessmentType?: unknown;
  progressionTrials?: unknown;
  totalTrials?: unknown;
}

export interface DatasetSummaryReconciliationReport {
  mode: 'dry-run' | 'apply';
  scannedRecords: number;
  summary: DatasetSummaryValues;
  matchesStoredSummary: boolean | null;
  completedAt: number;
  durationMs: number;
  source: DatasetSummarySource;
}
