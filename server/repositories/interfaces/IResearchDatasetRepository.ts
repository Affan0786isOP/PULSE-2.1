import type { DatasetQueryOptions, RawDatasetQueryResult, RawDatasetSummaryCounts } from '../../models/researchModels';

export interface IResearchDatasetRepository {
  queryRawDataset(options: DatasetQueryOptions): Promise<RawDatasetQueryResult>;
  getDatasetSummary(): Promise<RawDatasetSummaryCounts>;
}
