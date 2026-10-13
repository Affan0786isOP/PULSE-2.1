import * as crypto from 'crypto';
import type { ILeaderboardRepository } from '../repositories/interfaces/ILeaderboardRepository';
import type { ILeaderboardSubmissionRepository } from '../repositories/interfaces/ILeaderboardSubmissionRepository';
import type { ISessionRepository } from '../repositories/interfaces/ISessionRepository';
import type {
  ILeaderboardService,
  SubmitLeaderboardInput,
  SubmitLeaderboardResult
} from './interfaces/ILeaderboardService';
import type { LeaderboardEntryRecord, AdminLeaderboardEntryRecord } from '../models/leaderboardModels';
import { getDisplayedLeaderboardRank } from '../../shared/domain/leaderboardRanking';
import type { ExperimentSessionRecord } from '../models/sessionModels';
import { VALID_AGE_GROUPS, VALID_ASSESSMENT_TYPES } from '../config/constants';
import { normalizeAssessmentType } from '../engines/assessmentTypes';
import { safeCompareHex, signProvenancePayload } from './provenanceService';
import { isValidLeaderboardScoreMetric, safeLeaderboardDisplayNameForRead, validateLeaderboardDisplayName } from '../../shared/domain/leaderboardEligibility';
import { LeaderboardAlreadySubmittedError, AppError } from '../models/replayContracts';
import { safeLogWarning } from '../config/firebaseAdmin';

export class LeaderboardAppService implements ILeaderboardService {
  private readonly publicLeaderboardInFlight = new Map<string, Promise<LeaderboardEntryRecord[]>>();
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly leaderboardRepo: ILeaderboardRepository,
    private readonly submissionRepo: ILeaderboardSubmissionRepository
  ) {}

  private aliasesForAssessment(assessmentType: string): string[] {
    const aliasesByType: Record<string, string[]> = {
      'visual-reaction': ['visual-reaction', 'reaction-test', 'reaction', 'visual', 'visual-reaction-test'],
      direction: ['direction', 'direction-test', 'direction-reflex'],
      'color-recognition': ['color-recognition', 'colour-recognition', 'color-test', 'colour-test', 'color', 'colour', 'color-rec', 'colour-rec'],
      'block-memory': ['block-memory', 'block-memory-test', 'block'],
      'number-memory': ['number-memory', 'number-memory-test', 'number']
    };
    return aliasesByType[assessmentType] || [];
  }

  private async backfillLegacyOwnership(userId: string, assessmentType: string): Promise<void> {
    if (!this.leaderboardRepo.linkOwnerToEntry) return;

    // Earlier row documents did not store an owner, but the authoritative
    // session still records both uid and leaderboardDocId. Backfill only from
    // that server-written pairing, and never overwrite a different owner.
    const sessions = await this.sessionRepo.findUserConsumedSessions(userId, assessmentType);
    for (const session of sessions) {
      if (!session.leaderboardDocId) continue;
      // A weaker/tied submission points at the retained best row, not a row
      // created by this session. Do not let legacy ownership backfill rewrite
      // the original best entry's source session using that pointer.
      if (session.leaderboardSubmissionId && session.leaderboardSubmissionId !== session.leaderboardDocId) continue;
      await this.leaderboardRepo.linkOwnerToEntry(session.leaderboardDocId, userId, session.sessionId);
    }
  }

  async getMyLeaderboardRank(userId: string, assessmentType: string): Promise<{
    rank: number | null;
    scoreMetric: number | null;
    displayName: string | null;
    pendingReview: boolean;
  }> {
    const rawType = normalizeAssessmentType(assessmentType);
    if (!VALID_ASSESSMENT_TYPES.includes(rawType)) {
      throw new AppError('Unknown assessmentType', 400);
    }
    if (!this.leaderboardRepo.getEntriesByOwner || !this.leaderboardRepo.getAllEntriesByAlias) {
      throw new AppError('Participant leaderboard rank lookup is unavailable', 503);
    }

    await this.backfillLegacyOwnership(userId, rawType);
    let ownedRows: AdminLeaderboardEntryRecord[];
    try {
      ownedRows = await this.leaderboardRepo.getEntriesByOwner(userId, rawType);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'DATABASE_UNAVAILABLE') throw new AppError('DATABASE_UNAVAILABLE', 503);
      throw new AppError('Failed to retrieve your leaderboard entry', 500);
    }

    const rows = ownedRows
      .filter(row => normalizeAssessmentType(String(row.assessmentType || '')) === rawType)
      .sort((a, b) => {
        const as = Number(a.scoreMetric);
        const bs = Number(b.scoreMetric);
        if (as !== bs) {
          const speed = rawType === 'visual-reaction' || rawType === 'direction' || rawType === 'color-recognition';
          return speed ? as - bs : bs - as;
        }
        return (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0);
      });
    const ownedBest = rows[0];
    if (!ownedBest) {
      return { rank: null, scoreMetric: null, displayName: null, pendingReview: false };
    }

    const ownedName = safeLeaderboardDisplayNameForRead(ownedBest.displayName);
    const ownedScore = Number(ownedBest.scoreMetric);
    const pendingReview = ownedBest.hidden === true;
    if (pendingReview || ownedName === null || !isValidLeaderboardScoreMetric(rawType, ownedScore)) {
      return { rank: null, scoreMetric: Number.isFinite(ownedScore) ? ownedScore : null, displayName: ownedName, pendingReview };
    }

    const aliases = this.aliasesForAssessment(rawType);
    const aliasQueries = await Promise.all(aliases.map(async alias => {
      try {
        return { records: await this.leaderboardRepo.getAllEntriesByAlias!(alias, rawType === 'visual-reaction' || rawType === 'direction' || rawType === 'color-recognition' ? 'asc' : 'desc'), error: null as unknown | null };
      } catch (error: unknown) {
        safeLogWarning('[Leaderboard Rank] Firestore query notice:', error);
        return { records: [] as LeaderboardEntryRecord[], error };
      }
    }));
    if (aliasQueries.some(query => query.error !== null)) {
      throw new AppError('LEADERBOARD_UNAVAILABLE', 503);
    }

    const visibleMap = new Map<string, LeaderboardEntryRecord>();
    for (const query of aliasQueries) {
      for (const record of query.records) {
        const safeName = safeLeaderboardDisplayNameForRead(record.displayName);
        if (
          record.assessmentType === rawType &&
          safeName !== null &&
          isValidLeaderboardScoreMetric(rawType, record.scoreMetric) &&
          !visibleMap.has(record.id)
        ) {
          visibleMap.set(record.id, { ...record, displayName: safeName });
        }
      }
    }
    const visible = Array.from(visibleMap.values());
    const speed = rawType === 'visual-reaction' || rawType === 'direction' || rawType === 'color-recognition';
    visible.sort((a, b) => {
      if (a.scoreMetric !== b.scoreMetric) return speed ? a.scoreMetric - b.scoreMetric : b.scoreMetric - a.scoreMetric;
      return (a.createdAt || 0) - (b.createdAt || 0) || a.id.localeCompare(b.id);
    });

    const publicSelf = visible.find(entry => entry.id === ownedBest.id);
    if (!publicSelf) {
      return { rank: null, scoreMetric: ownedScore, displayName: ownedName, pendingReview: false };
    }
    return {
      rank: getDisplayedLeaderboardRank(visible, publicSelf),
      scoreMetric: publicSelf.scoreMetric,
      displayName: publicSelf.displayName,
      pendingReview: false
    };
  }

  async deleteMyLeaderboardEntries(userId: string, assessmentType?: string | null): Promise<{ deletedCount: number }> {
    if (!this.leaderboardRepo.deleteEntriesByOwner) {
      throw new AppError('Participant leaderboard removal is unavailable', 503);
    }

    let normalizedType: string | null = null;
    if (assessmentType && assessmentType !== 'all') {
      normalizedType = normalizeAssessmentType(assessmentType);
      if (!VALID_ASSESSMENT_TYPES.includes(normalizedType)) {
        throw new AppError('Unknown assessmentType', 400);
      }
      await this.backfillLegacyOwnership(userId, normalizedType);
    } else {
      // Best-effort migration of all legacy rows linked from server-owned sessions
      // before applying the erasure across all five canonical assessments.
      for (const type of VALID_ASSESSMENT_TYPES) await this.backfillLegacyOwnership(userId, type);
    }

    try {
      const deletedCount = await this.leaderboardRepo.deleteEntriesByOwner(userId, normalizedType);
      return { deletedCount };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'DATABASE_UNAVAILABLE') throw new AppError('DATABASE_UNAVAILABLE', 503);
      if (message === 'OWNER_ERASURE_IN_PROGRESS') throw new AppError('An erasure request is already being processed.', 409);
      throw new AppError('Failed to delete your leaderboard entries', 500);
    }
  }

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

    // Reject impossible rapid-completion submissions using server-recorded session
    // and completion times, not client-provided trial timestamps.
    const startedAt = Number(sData.createdAt);
    const completedAt = Number(sData.consumedAt);
    const elapsedMs = completedAt - startedAt;
    const minimumDurationMs: Record<string, number> = {
      'visual-reaction': 5000,
      direction: 3000,
      'color-recognition': 5000,
      'block-memory': 3000,
      'number-memory': 3000
    };
    if (
      !Number.isFinite(startedAt) ||
      !Number.isFinite(completedAt) ||
      startedAt <= 0 ||
      completedAt < startedAt ||
      elapsedMs < (minimumDurationMs[normalizedAssessmentType] || 5000)
    ) {
      throw new AppError('Assessment completion time is implausibly short for the selected test. Please retake it.', 400);
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
    const metrics = sData.derivedMetrics;
    const trialsDigest = sData.trialsDigest;

    // A leaderboard opt-in must consume the result already validated and stored
    // by the research submission path. Never re-derive metrics from client trials.
    if (!metrics || typeof metrics !== 'object' || Object.keys(metrics).length === 0) {
      throw new AppError('Completed assessment session has no server-stored metrics. Please retake the test.', 400);
    }
    if (typeof trialsDigest !== 'string' || !trialsDigest.trim()) {
      throw new AppError('Completed assessment session is missing authoritative provenance. Please retake the test.', 400);
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
    const leaderboardDocId = crypto.randomUUID();
    const tokenData = `lb:v2:${leaderboardDocId}:${normalizedAssessmentType}:${authoritativeAgeGroup}:${scoreMetric.toFixed(2)}:${sanitizedDisplayName}:${trialsDigest}`;
    const provenanceToken = signProvenancePayload(tokenData);

    const qualityFlags: string[] = [];
    if (isSpeed && scoreMetric < 120) qualityFlags.push('EXTREME_SPEED_SCORE');
    if (normalizedAssessmentType === 'block-memory' && scoreMetric > 25) qualityFlags.push('EXTREME_BLOCK_MEMORY_SCORE');
    if (normalizedAssessmentType === 'number-memory' && scoreMetric > 30) qualityFlags.push('EXTREME_NUMBER_MEMORY_SCORE');
    if (elapsedMs < minimumDurationMs[normalizedAssessmentType] * 1.5) qualityFlags.push('RAPID_COMPLETION');

    const requiresModeration = qualityFlags.length > 0;
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
      metrics: metrics as Record<string, unknown>,
      now,
      idempotencyKey: input.idempotencyKey || null,
      requiresModeration,
      qualityFlags
    });

    return result;
  }

  async verifyPublicEntryProvenance(entryId: string): Promise<{ verified: boolean; reason?: string }> {
    const normalizedId = entryId.trim();
    if (!normalizedId || normalizedId.includes('/') || normalizedId.length > 1500) {
      throw new AppError('Invalid leaderboard entry id', 400);
    }

    if (!this.leaderboardRepo.getEntryById) {
      throw new AppError('Provenance verification is unavailable', 503);
    }

    let row: import('../models/leaderboardModels').AdminLeaderboardEntryRecord | null;
    try {
      row = await this.leaderboardRepo.getEntryById(normalizedId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'DATABASE_UNAVAILABLE') throw new AppError('DATABASE_UNAVAILABLE', 503);
      throw new AppError('Failed to retrieve leaderboard entry for provenance verification', 500);
    }

    if (!row || row.hidden !== false) {
      return { verified: false, reason: 'Entry does not exist or is not publicly visible.' };
    }

    const displayName = safeLeaderboardDisplayNameForRead(row.displayName);
    const assessmentType = normalizeAssessmentType(String(row.assessmentType || ''));
    const scoreMetric = Number(row.scoreMetric);
    const ageGroup = String(row.ageGroup || '');
    const trialsDigest = String(row.trialsDigest || '');
    const provenanceToken = String(row.provenanceToken || '');
    if (!displayName || !VALID_ASSESSMENT_TYPES.includes(assessmentType) ||
        !Number.isFinite(scoreMetric) || !ageGroup || !provenanceToken) {
      return { verified: false, reason: 'Stored leaderboard entry has invalid provenance fields.' };
    }

    const sanitizedDisplayName = displayName.replace(/:/g, '_');
    // V2 tokens include the stored entry ID. Legacy tokens are accepted only for
    // a matching existing visible row, not as standalone HMAC proofs.
    const tokenData = Number(row.provenanceVersion) >= 2
      ? `lb:v2:${normalizedId}:${assessmentType}:${ageGroup}:${scoreMetric.toFixed(2)}:${sanitizedDisplayName}:${trialsDigest}`
      : `lb:${assessmentType}:${ageGroup}:${scoreMetric.toFixed(2)}:${sanitizedDisplayName}:${trialsDigest}`;

    try {
      return { verified: safeCompareHex(signProvenancePayload(tokenData), provenanceToken) };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('PULSE_PROVENANCE_SECRET')) {
        throw new AppError('Provenance verification is not configured', 503);
      }
      throw err;
    }
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

    const pending = this.publicLeaderboardInFlight.get(rawType);
    if (pending) return pending;

    const request = this.loadPublicLeaderboard(rawType);
    this.publicLeaderboardInFlight.set(rawType, request);
    try {
      return await request;
    } finally {
      if (this.publicLeaderboardInFlight.get(rawType) === request) {
        this.publicLeaderboardInFlight.delete(rawType);
      }
    }
  }

  private async loadPublicLeaderboard(rawType: string): Promise<LeaderboardEntryRecord[]> {
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
