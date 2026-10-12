import * as crypto from 'crypto';
import type { ILeaderboardRepository } from '../repositories/interfaces/ILeaderboardRepository';
import type { ILeaderboardSubmissionRepository } from '../repositories/interfaces/ILeaderboardSubmissionRepository';
import type { ISessionRepository } from '../repositories/interfaces/ISessionRepository';
import type {
  ILeaderboardService,
  SubmitLeaderboardInput,
  SubmitLeaderboardResult
} from './interfaces/ILeaderboardService';
import type { LeaderboardEntryRecord } from '../models/leaderboardModels';
import type { ExperimentSessionRecord } from '../models/sessionModels';
import { VALID_AGE_GROUPS, VALID_ASSESSMENT_TYPES } from '../config/constants';
import { normalizeAssessmentType } from '../engines/assessmentTypes';
import { validateAndDeriveAssessmentFromTrials } from '../engines/assessmentEngine';
import { computeCanonicalTrialsDigest, signProvenancePayload } from './provenanceService';
import { isValidLeaderboardScoreMetric, safeLeaderboardDisplayNameForRead, validateLeaderboardDisplayName } from '../../shared/domain/leaderboardEligibility';
import { LeaderboardAlreadySubmittedError, AppError } from '../models/replayContracts';
import { safeLogWarning } from '../config/firebaseAdmin';

export class LeaderboardAppService implements ILeaderboardService {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly leaderboardRepo: ILeaderboardRepository,
    private readonly submissionRepo: ILeaderboardSubmissionRepository
  ) {}

  async submitLeaderboard(input: SubmitLeaderboardInput): Promise<SubmitLeaderboardResult> {
    const { sessionId, userId, displayName, assessmentType, ageGroup, trials } = input;

    const aliasValidation = validateLeaderboardDisplayName(displayName);
    if (!aliasValidation.valid || !aliasValidation.normalized) {
      throw new AppError(aliasValidation.error || 'Invalid displayName', 400);
    }
    const normalizedDisplayName = aliasValidation.normalized;

    const normalizedAssessmentType = normalizeAssessmentType(assessmentType);
    if (!normalizedAssessmentType || !VALID_ASSESSMENT_TYPES.includes(normalizedAssessmentType)) {
      throw new AppError('Invalid assessmentType', 400);
    }

    // Initial session read outside transaction
    let sData: ExperimentSessionRecord | null = null;
    try {
      sData = await this.sessionRepo.findById(sessionId);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === 'DATABASE_UNAVAILABLE') {
        throw new AppError('DATABASE_UNAVAILABLE', 503);
      }
      throw new AppError('Failed to read experiment session from database', 500);
    }

    if (!sData) {
      throw new AppError('Experiment session not found', 404);
    }

    if (sData.uid !== userId) {
      throw new AppError('Session UID mismatch with authenticated user', 403);
    }

    if (normalizeAssessmentType(sData.assessmentType) !== normalizedAssessmentType) {
      throw new AppError('Session assessment type mismatch', 400);
    }

    if (!VALID_AGE_GROUPS.includes(sData.ageGroup)) {
      throw new AppError('Authoritative experiment session has an invalid ageGroup', 400);
    }

    if (ageGroup && ageGroup !== sData.ageGroup) {
      throw new AppError('ageGroup mismatch with authoritative experiment session', 400);
    }

    if (!sData.consumed) {
      throw new AppError('Leaderboard submission requires a completed, consumed research session', 400);
    }

    // The assessment session must have been valid at completion. Allow opt-in for
    // up to 24 hours after completion so reading results/typing an alias cannot
    // consume the only submission opportunity after the original session expires.
    if (!sData.consumedAt && typeof sData.expiresAt === 'number' && Date.now() > sData.expiresAt + 60000) {
      throw new AppError('Experiment session has expired. Please retake the test.', 400);
    }
    if (sData.consumedAt && Date.now() > sData.consumedAt + 24 * 60 * 60 * 1000) {
      throw new AppError('The leaderboard opt-in window has expired. Please retake the test.', 400);
    }

    if (sData.leaderboardSubmitted) {
      if (sData.leaderboardDocId) {
        throw new LeaderboardAlreadySubmittedError(sData);
      }
      throw new AppError('Leaderboard score has already been submitted for this session', 400);
    }

    const authoritativeAgeGroup = sData.ageGroup;
    let metrics = sData.derivedMetrics;
    let trialsDigest = sData.trialsDigest;

    if (!metrics) {
      const validation = validateAndDeriveAssessmentFromTrials(normalizedAssessmentType, authoritativeAgeGroup, trials as Record<string, unknown>[], sData);
      if (!validation.success || !validation.derivedMetrics) {
        throw new AppError(validation.error || 'Trial validation failed', 400);
      }
      metrics = validation.derivedMetrics;
      trialsDigest = computeCanonicalTrialsDigest(trials as Record<string, unknown>[]);
    } else if (!trialsDigest && Array.isArray(trials) && trials.length > 0) {
      trialsDigest = computeCanonicalTrialsDigest(trials as Record<string, unknown>[]);
    }

    let scoreMetric = 0;
    const isSpeed = normalizedAssessmentType === 'visual-reaction' || normalizedAssessmentType === 'direction' || normalizedAssessmentType === 'color-recognition';
    const m = (metrics || {}) as Record<string, unknown>;
    if (isSpeed) {
      scoreMetric = Number(m['averageReactionTime']);
    } else if (normalizedAssessmentType === 'block-memory' || normalizedAssessmentType === 'number-memory') {
      const longestSeq = m['longestSeq'];
      const highestLevel = Number(m['highestLevel'] || 0);
      scoreMetric = Number(longestSeq ?? (normalizedAssessmentType === 'block-memory' ? (highestLevel > 0 ? highestLevel + 1 : 0) : (highestLevel > 0 ? highestLevel + 2 : 0)));
    } else {
      scoreMetric = Number(m['overallAccuracy'] ?? 0);
    }

    if (!isValidLeaderboardScoreMetric(normalizedAssessmentType, scoreMetric)) {
      throw new AppError('This result is not eligible for the public leaderboard score range for this assessment.', 400);
    }

    const sanitizedDisplayName = normalizedDisplayName.replace(/:/g, '_');
    const tokenData = `lb:${normalizedAssessmentType}:${authoritativeAgeGroup}:${scoreMetric.toFixed(2)}:${sanitizedDisplayName}:${trialsDigest || ''}`;
    const provenanceToken = signProvenancePayload(tokenData);

    const leaderboardDocId = crypto.randomUUID();
    const now = Date.now();

    const result = await this.submissionRepo.executeLeaderboardSubmission({
      leaderboardDocId,
      activeSessionId: sessionId,
      userId,
      displayName: normalizedDisplayName,
      assessmentType: normalizedAssessmentType,
      scoreMetric,
      authoritativeAgeGroup,
      provenanceToken,
      trialsDigest: trialsDigest || '',
      metrics: (metrics || {}) as Record<string, unknown>,
      now
    });

    return result;
  }

  async getPublicLeaderboard(assessmentType?: string | null): Promise<LeaderboardEntryRecord[]> {
    const providedType = typeof assessmentType === 'string' ? assessmentType.trim() : '';
    if (!providedType) {
      throw new AppError('assessmentType query parameter is required', 400);
    }

    const rawType = normalizeAssessmentType(providedType);
    if (!VALID_ASSESSMENT_TYPES.includes(rawType)) {
      throw new AppError('Unknown assessmentType', 400);
    }

    const isSpeed = rawType === 'visual-reaction' || rawType === 'direction' || rawType === 'color-recognition';
    const aliasesByType: Record<string, string[]> = {
      'visual-reaction': ['visual-reaction', 'reaction-test', 'reaction', 'visual', 'visual-reaction-test'],
      direction: ['direction', 'direction-test', 'direction-reflex'],
      'color-recognition': ['color-recognition', 'colour-recognition', 'color-test', 'colour-test', 'color', 'colour', 'color-rec', 'colour-rec'],
      'block-memory': ['block-memory', 'block-memory-test', 'block'],
      'number-memory': ['number-memory', 'number-memory-test', 'number']
    };
    const aliases = aliasesByType[rawType];
    const entriesMap = new Map<string, LeaderboardEntryRecord>();

    // Query stored aliases in parallel. If any query fails, the caller gets a
    // 503 rather than a partial board that differs between clients/instances.
    const aliasQueries = await Promise.all(aliases.map(async alias => {
      try {
        const records = await this.leaderboardRepo.getEntriesByAlias(alias, isSpeed ? 'asc' : 'desc', 100);
        return { alias, records, error: null as unknown | null };
      } catch (error: unknown) {
        safeLogWarning('[Leaderboard API] Firestore query notice:', error);
        return { alias, records: [] as LeaderboardEntryRecord[], error };
      }
    }));

    if (aliasQueries.some(query => query.error !== null)) {
      throw new AppError('LEADERBOARD_UNAVAILABLE', 503);
    }

    for (const query of aliasQueries) {
      for (const record of query.records) {
        const safeDisplayName = safeLeaderboardDisplayNameForRead(record.displayName);
        if (
          record.assessmentType === rawType &&
          safeDisplayName !== null &&
          isValidLeaderboardScoreMetric(rawType, record.scoreMetric) &&
          !entriesMap.has(record.id)
        ) {
          entriesMap.set(record.id, {
            ...record,
            displayName: safeDisplayName
          });
        }
      }
    }

    const entries = Array.from(entriesMap.values());
    entries.sort((a, b) => {
      if (isSpeed) {
        if (a.scoreMetric !== b.scoreMetric) return a.scoreMetric - b.scoreMetric;
      } else {
        if (a.scoreMetric !== b.scoreMetric) return b.scoreMetric - a.scoreMetric;
      }
      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      if (aTime !== bTime) return aTime - bTime;
      return a.id.localeCompare(b.id);
    });

    // Keep the response authoritative and uncached at this layer; Vercel may route
    // consecutive requests to different serverless instances.
    return entries.slice(0, 100);
  }
}
