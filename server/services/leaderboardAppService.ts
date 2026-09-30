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
import { isOptedInLeaderboardUser, isValidLeaderboardScoreMetric } from './leaderboardService';
import { getIdempotency, setIdempotency } from './idempotencyService';
import { LeaderboardAlreadySubmittedError, AppError } from '../models/replayContracts';
import { safeLogWarning } from '../config/firebaseAdmin';

export class LeaderboardAppService implements ILeaderboardService {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly leaderboardRepo: ILeaderboardRepository,
    private readonly submissionRepo: ILeaderboardSubmissionRepository
  ) {}

  async submitLeaderboard(input: SubmitLeaderboardInput): Promise<SubmitLeaderboardResult> {
    const { sessionId, userId, displayName, assessmentType, ageGroup, trials, idempotencyKey } = input;

    if (idempotencyKey) {
      const cached = getIdempotency<SubmitLeaderboardResult>(`lb_sub:${idempotencyKey}`);
      if (cached) {
        return cached;
      }
    }

    if (!displayName || typeof displayName !== 'string' || !displayName.trim() || [...displayName.trim()].length > 30) {
      throw new AppError('Invalid displayName (1-30 characters required)', 400);
    }

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
        throw new AppError('DATABASE_UNAVAILABLE', 404);
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

    if (typeof sData.expiresAt === 'number' && Date.now() > sData.expiresAt + 60000) {
      throw new AppError('Experiment session has expired', 400);
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
      throw new AppError('Invalid or non-finite score metric for assessment type', 400);
    }

    const tokenData = `lb:${normalizedAssessmentType}:${authoritativeAgeGroup}:${scoreMetric.toFixed(2)}:${displayName.trim()}:${trialsDigest || ''}`;
    const provenanceToken = signProvenancePayload(tokenData);

    const leaderboardDocId = crypto.randomUUID();
    const now = Date.now();

    const result = await this.submissionRepo.executeLeaderboardSubmission({
      leaderboardDocId,
      activeSessionId: sessionId,
      displayName: displayName.trim(),
      assessmentType: normalizedAssessmentType,
      scoreMetric,
      authoritativeAgeGroup,
      provenanceToken,
      trialsDigest: trialsDigest || '',
      metrics: (metrics || {}) as Record<string, unknown>,
      now
    });

    if (idempotencyKey) {
      setIdempotency(`lb_sub:${idempotencyKey}`, result);
    }

    return result;
  }

  async getPublicLeaderboard(assessmentType?: string | null): Promise<LeaderboardEntryRecord[]> {
    const rawType = assessmentType ? normalizeAssessmentType(assessmentType) : null;
    const isSpeed = !rawType || rawType === 'visual-reaction' || rawType === 'direction' || rawType === 'color-recognition';

    const aliases = rawType
      ? (rawType === 'color-recognition' ? ['color-recognition', 'colour-recognition', 'color-test'] : [rawType])
      : ['visual-reaction', 'direction', 'color-recognition', 'block-memory', 'number-memory'];

    const entriesMap = new Map<string, LeaderboardEntryRecord>();

    for (const alias of aliases) {
      const aliasIsSpeed = alias === 'visual-reaction' || alias === 'direction' || alias === 'color-recognition' || alias === 'colour-recognition' || alias === 'color-test';
      const aliasDirection: 'asc' | 'desc' = aliasIsSpeed ? 'asc' : 'desc';

      try {
        const records = await this.leaderboardRepo.getEntriesByAlias(alias, aliasDirection, 100);
        for (const record of records) {
          if (!entriesMap.has(record.id)) {
            entriesMap.set(record.id, record);
          }
        }
      } catch (err: unknown) {
        safeLogWarning('[Leaderboard API] Firestore query notice:', err);
        // Resilient per-alias isolation: query error in one alias continues others
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

    return entries.slice(0, 100);
  }
}
