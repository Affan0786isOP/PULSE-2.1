import type { ExperimentSessionRecord, CreateSessionRecordInput } from '../../models/sessionModels';

export interface ISessionService {
  startSession(params: {
    assessmentType?: string;
    ageGroup?: string;
    userId: string;
  }): Promise<{ sessionId: string; expiresAt: number; assessmentType: string }>;

  getAndValidateSession(
    sessionId: string,
    userUid: string,
    requestedAssessmentType: string
  ): Promise<{ valid: boolean; session?: ExperimentSessionRecord; error?: string; status?: number }>;
}
