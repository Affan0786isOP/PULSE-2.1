import * as crypto from 'crypto';
import type { ISessionRepository } from '../repositories/interfaces/ISessionRepository';
import type { ISessionService } from './interfaces/ISessionService';
import type { ExperimentSessionRecord } from '../models/sessionModels';
import { VALID_AGE_GROUPS, VALID_ASSESSMENT_TYPES } from '../config/constants';
import { normalizeAssessmentType } from '../engines/assessmentTypes';

import { AppError } from '../models/replayContracts';
import { getAdminDiagnosticMessage } from '../config/firebaseAdmin';

export { type ExperimentSessionRecord as ExperimentSession };

export class SessionService implements ISessionService {
  constructor(private readonly sessionRepo: ISessionRepository) {}

  async startSession(params: {
    assessmentType?: string;
    ageGroup?: string;
    userId: string;
  }): Promise<{ sessionId: string; expiresAt: number; assessmentType: string }> {
    const { assessmentType, ageGroup, userId } = params;

    const normalizedType = normalizeAssessmentType(assessmentType || '');
    if (!normalizedType || !VALID_ASSESSMENT_TYPES.includes(normalizedType)) {
      throw new AppError('Invalid or missing assessmentType', 400);
    }

    if (!ageGroup || !VALID_AGE_GROUPS.includes(ageGroup)) {
      throw new AppError('Invalid or missing ageGroup. A valid demographic age group is required.', 400);
    }

    const sessionId = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000;

    await this.sessionRepo.create({
      sessionId,
      uid: userId,
      assessmentType: normalizedType,
      ageGroup,
      createdAt: now,
      expiresAt,
      consumed: false
    });

    return {
      sessionId,
      expiresAt,
      assessmentType: normalizedType
    };
  }

  async getAndValidateSession(
    sessionId: string,
    userUid: string,
    requestedAssessmentType: string
  ): Promise<{ valid: boolean; session?: ExperimentSessionRecord; error?: string; status?: number }> {
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim() || sessionId.trim().length > 128) {
      return { valid: false, error: 'Missing or invalid session ID', status: 400 };
    }

    const cleanSessionId = sessionId.trim();
    let session: ExperimentSessionRecord | null = null;
    try {
      session = await this.sessionRepo.findById(cleanSessionId);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === 'DATABASE_UNAVAILABLE') {
        return { valid: false, error: `Database unavailable: ${getAdminDiagnosticMessage()}`, status: 500 };
      }
      return { valid: false, error: 'Database error reading experiment session', status: 500 };
    }

    if (!session) {
      return { valid: false, error: 'Experiment session not found or invalid', status: 404 };
    }

    if (session.uid !== userUid) {
      return { valid: false, error: 'Session UID mismatch with authenticated identity', status: 403 };
    }

    if (normalizeAssessmentType(session.assessmentType) !== normalizeAssessmentType(requestedAssessmentType)) {
      return { valid: false, error: `Session assessment type mismatch (expected ${session.assessmentType}, received ${requestedAssessmentType})`, status: 400 };
    }

    if (Date.now() > session.expiresAt + 60000) {
      return { valid: false, error: 'Experiment session has expired', status: 400 };
    }

    if (session.consumed) {
      return { valid: false, error: 'Experiment session has already been completed/consumed', status: 400 };
    }

    return { valid: true, session };
  }
}
