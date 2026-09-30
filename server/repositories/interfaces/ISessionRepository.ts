import type { ExperimentSessionRecord, CreateSessionRecordInput } from '../../models/sessionModels';

export interface ISessionRepository {
  findById(sessionId: string): Promise<ExperimentSessionRecord | null>;
  create(record: CreateSessionRecordInput): Promise<ExperimentSessionRecord>;
  findUserConsumedSessions(userId: string, assessmentType: string): Promise<ExperimentSessionRecord[]>;
}
