import type { ResearchSubmissionTxInput, ResearchSubmissionTxResult } from '../../models/submissionModels';

export interface IResearchSubmissionRepository {
  executeSubmissionTransaction(input: ResearchSubmissionTxInput): Promise<ResearchSubmissionTxResult>;
}
