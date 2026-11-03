import * as crypto from 'crypto';
import type { ISessionRepository } from '../repositories/interfaces/ISessionRepository';
import type { IResearchSubmissionRepository } from '../repositories/interfaces/IResearchSubmissionRepository';
import type { IResearchDatasetRepository } from '../repositories/interfaces/IResearchDatasetRepository';
import type {
  IResearchService,
  SubmitResearchInput,
  SubmitResearchResult,
  DatasetQueryInput,
  DatasetQueryResultDto,
  DatasetSummaryResultDto
} from './interfaces/IResearchService';
import type { PublicDatasetRecord } from '../models/researchModels';
import type { TrialObservationPayload } from '../models/submissionModels';
import { VALID_AGE_GROUPS, VALID_ASSESSMENT_TYPES } from '../config/constants';
import { normalizeLeaderboardAssessmentType } from '../../shared/domain/leaderboardEligibility';
import { validateAndDeriveAssessmentFromTrials } from '../engines/assessmentEngine';
import { deriveForeperiodCategory } from '../engines/reactionCalculator';
import { computeCanonicalTrialsDigest, signProvenancePayload } from './provenanceService';
import { getIdempotency, setIdempotency } from './idempotencyService';
import { ISessionService } from './interfaces/ISessionService';
import { AppError, SessionAlreadyConsumedError } from '../models/replayContracts';
import { getAssessmentVersionMetadata } from '../../shared/contracts/common';


const PUBLIC_TRIAL_NUMERIC_FIELDS = [
  'trialNumber', 'trialIndex', 'sequenceNumber', 'attemptNumber',
  'reactionTime', 'rawLatencyMs', 'inputLatencyMs', 'accuracy',
  'displayDelayOffsetMs', 'stimulusScheduledAtPerfMs', 'stimulusPresentedAtPerfMs',
  'responseDetectedAtPerfMs', 'foreperiodMs', 'level', 'sequenceLength',
  'responseDurationMs', 'correctSelections', 'interTapTimeMs'
] as const;

const PUBLIC_TRIAL_BOOLEAN_FIELDS = [
  'falseStart', 'timedOut', 'valid', 'correct', 'correctness',
  'displayDelayOffsetEstimated'
] as const;

const PUBLIC_TRIAL_STRING_FIELDS = [
  'validity', 'qualityFlag', 'foreperiodCategory',
  'targetDirection', 'chosenDirection', 'userResponse', 'targetColor', 'chosenColor',
  'wordName', 'wordColor', 'condition', 'instruction', 'metricType'
] as const;

// Public observations must contain only server-defined categorical values.
// Never copy arbitrary client strings into the Firestore-readable publicDataset collection.
const PUBLIC_TRIAL_STRING_VALUES: Record<
  (typeof PUBLIC_TRIAL_STRING_FIELDS)[number],
  ReadonlySet<string>
> = {
  validity: new Set([
    'VALID',
    'FALSE_START_PRE_STIMULUS',
    'ANTICIPATORY_TOO_FAST',
    'FALSE_START_PHYSIOLOGICAL',
    'TIMEOUT',
    'INCORRECT',
    'ABORTED'
  ]),
  qualityFlag: new Set([
    'ANTICIPATORY_RT',
    'TIMEOUT_EXCEEDED',
    'PREMATURE_TRIGGER',
    'ANTICIPATORY_RESPONSE',
    'ACCURACY_ERROR'
  ]),
  foreperiodCategory: new Set(['SHORT', 'LONG']),
  targetDirection: new Set(['UP', 'DOWN', 'LEFT', 'RIGHT']),
  chosenDirection: new Set(['UP', 'DOWN', 'LEFT', 'RIGHT']),
  userResponse: new Set(['UP', 'DOWN', 'LEFT', 'RIGHT', 'RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE']),
  targetColor: new Set(['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE']),
  chosenColor: new Set(['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE']),
  wordName: new Set(['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE']),
  wordColor: new Set(['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE']),
  condition: new Set(['standard', 'congruent', 'incongruent']),
  instruction: new Set(['WORD', 'COLOR']),
  metricType: new Set(['reaction_time', 'input_latency'])
};

function sanitizeNestedPublicValue(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') return value.length <= 160 ? value : value.slice(0, 160);
  if (Array.isArray(value)) {
    if (value.length > 200 || depth > 2) return undefined;
    return value.map(item => sanitizeNestedPublicValue(item, depth + 1))
      .filter(item => item !== undefined);
  }
  if (value && typeof value === 'object' && depth < 2) {
    const safe: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(key)) continue;
      if (/(^id$|participant|session|user|email|ip|uid|token|secret|deviceId|timestamp|createdAt)/i.test(key)) continue;
      const cleanValue = sanitizeNestedPublicValue(nestedValue, depth + 1);
      if (cleanValue !== undefined) safe[key] = cleanValue;
    }
    return safe;
  }
  return undefined;
}

function sanitizePublicSequence(value: unknown): number[] | string | undefined {
  if (typeof value === 'string') {
    return value.length <= 50 && /^\\d*$/.test(value) ? value : undefined;
  }
  if (Array.isArray(value) &&
      value.length <= 50 &&
      value.every(item => typeof item === 'number' && Number.isSafeInteger(item) && item >= 0 && item <= 8)) {
    return value as number[];
  }
  return undefined;
}

function sanitizePublicTrials(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 200).flatMap((trial) => {
    if (!trial || typeof trial !== 'object' || Array.isArray(trial)) return [];
    const source = trial as Record<string, unknown>;
    const safe: Record<string, unknown> = {};

    for (const key of PUBLIC_TRIAL_NUMERIC_FIELDS) {
      const candidate = source[key];
      if (typeof candidate === 'number' && Number.isFinite(candidate)) safe[key] = candidate;
    }
    for (const key of PUBLIC_TRIAL_BOOLEAN_FIELDS) {
      const candidate = source[key];
      if (typeof candidate === 'boolean') safe[key] = candidate;
    }
    for (const key of PUBLIC_TRIAL_STRING_FIELDS) {
      const candidate = source[key];
      if (typeof candidate === 'string' && PUBLIC_TRIAL_STRING_VALUES[key].has(candidate)) {
        safe[key] = candidate;
      }
    }
    for (const key of ['generatedSequence', 'playerSequence'] as const) {
      const candidate = sanitizePublicSequence(source[key]);
      if (candidate !== undefined) safe[key] = candidate;
    }

    return [safe];
  });
}

function firstFiniteNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length <= 160);
}

function sanitizePublicObject(value: unknown): Record<string, unknown> | undefined {
  const clean = sanitizeNestedPublicValue(value);
  return clean !== null && typeof clean === 'object' && !Array.isArray(clean)
    ? clean as Record<string, unknown>
    : undefined;
}

export class ResearchService implements IResearchService {
  constructor(
    private readonly sessionService: ISessionService,
    private readonly sessionRepo: ISessionRepository,
    private readonly submissionRepo: IResearchSubmissionRepository,
    private readonly datasetRepo: IResearchDatasetRepository
  ) {}

  async submitResearch(input: SubmitResearchInput): Promise<SubmitResearchResult> {
    const { sessionId, userId, assessmentType, ageGroup, trials, idempotencyKey, serverDeviceCategory } = input;

    if (idempotencyKey) {
      const cached = getIdempotency<SubmitResearchResult>(`res_sub:${idempotencyKey}`);
      if (cached) {
        return cached;
      }
    }

    if (!assessmentType || !VALID_ASSESSMENT_TYPES.includes(assessmentType)) {
      throw new AppError('Invalid or missing assessmentType', 400);
    }

    if (!ageGroup || !VALID_AGE_GROUPS.includes(ageGroup)) {
      throw new AppError('Invalid or missing ageGroup', 400);
    }

    const sessionCheck = await this.sessionService.getAndValidateSession(sessionId, userId, assessmentType);
    if (!sessionCheck.valid) {
      if (sessionCheck.error?.includes('already been completed/consumed')) {
        const consumed = sessionCheck.session || (await this.sessionRepo.findById(sessionId));
        if (consumed) {
          throw new SessionAlreadyConsumedError(consumed);
        }
      }
      throw new AppError(sessionCheck.error || 'Session validation failed', sessionCheck.status || 400);
    }
    if (!sessionCheck.session) {
      throw new AppError('Session validation failed', 400);
    }
    if (sessionCheck.session.consumed) {
      throw new SessionAlreadyConsumedError(sessionCheck.session);
    }

    const minimumDurationMs: Record<string, number> = {
      'visual-reaction': 5000,
      direction: 3000,
      'color-recognition': 5000,
      'block-memory': 3000,
      'number-memory': 3000
    };
    const minDuration = minimumDurationMs[assessmentType] ?? 3000;
    if (typeof sessionCheck.session.createdAt === 'number' && Date.now() - sessionCheck.session.createdAt < minDuration) {
      throw new AppError('Assessment duration is implausibly short for the selected test. Please retake it.', 400);
    }

    if (!VALID_AGE_GROUPS.includes(sessionCheck.session.ageGroup)) {
      throw new AppError('Authoritative experiment session has an invalid ageGroup', 400);
    }
    if (ageGroup && ageGroup !== sessionCheck.session.ageGroup) {
      throw new AppError('ageGroup mismatch with authoritative experiment session', 400);
    }
    const authoritativeAgeGroup = sessionCheck.session.ageGroup;

    const validation = validateAndDeriveAssessmentFromTrials(assessmentType, authoritativeAgeGroup, trials as Record<string, unknown>[], sessionCheck.session);
    if (!validation.success || !validation.derivedMetrics) {
      throw new AppError(validation.error || 'Trial validation failed', 400);
    }

    const derivedMetrics = validation.derivedMetrics;
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const trialPayloads: { id: string; data: TrialObservationPayload }[] = [];
    if (Array.isArray(trials) && trials.length > 0) {
      trials.forEach((tRaw: unknown, idx: number) => {
        const t = (tRaw && typeof tRaw === 'object' ? tRaw : {}) as Record<string, unknown>;
        const trialId = crypto.randomUUID();
        const chronoIndex = idx + 1;
        let derivedAttemptNumber = 1;
        if (idx > 0) {
          const prev = (trials[idx - 1] && typeof trials[idx - 1] === 'object' ? trials[idx - 1] : {}) as Record<string, unknown>;
          const prevTrialNumber = Number(prev['trialNumber']);
          const prevAttemptNumber = Number(prev['attemptNumber']) || 1;
          if (Number(t['trialNumber']) === prevTrialNumber) {
            derivedAttemptNumber = prevAttemptNumber + 1;
          }
        }

        const rawRt = typeof t.reactionTime === 'number' ? t.reactionTime : (typeof t.reactionTimeMs === 'number' ? t.reactionTimeMs : null);
        const rawLat = typeof t.rawReactionTime === 'number' ? t.rawReactionTime : (typeof t.rawLatencyMs === 'number' ? t.rawLatencyMs : null);

        const isFalseStart = t.falseStart === true;
        const isTimedOut = t.timedOut === true;
        const isAborted = t.validity === 'ABORTED' || (typeof rawRt === 'number' && rawRt <= 0);
        const isCompletedResponse = !isFalseStart && !isTimedOut && !isAborted;
        const isIncorrectResponse = isCompletedResponse && (t.correct === false || t.validity === 'INCORRECT');
        const isValid = isIncorrectResponse
          ? true
          : (typeof t.valid === 'boolean' ? t.valid : isCompletedResponse);
        const isCorrect = typeof t.correct === 'boolean'
          ? t.correct
          : (typeof t.correctness === 'boolean'
              ? t.correctness
              : (typeof t.accuracy === 'number' ? t.accuracy === 1 : (assessmentType === 'visual-reaction' ? isValid : null)));
        const accuracyVal = typeof t.accuracy === 'number' ? t.accuracy : (isCorrect === true ? 1 : 0);

        const payload: TrialObservationPayload = {
          participantId: userId,
          experimentId: sessionId,
          condition: typeof t.condition === 'string' ? t.condition : 'standard',
          test: assessmentType,
          trialNumber: Number(t.trialNumber) || chronoIndex,
          trialIndex: typeof t.trialIndex === 'number' ? t.trialIndex : chronoIndex,
          sequenceNumber: typeof t.sequenceNumber === 'number' ? t.sequenceNumber : chronoIndex,
          attemptNumber: typeof t.attemptNumber === 'number' ? t.attemptNumber : derivedAttemptNumber,
          stimulusTimestamp: typeof t.stimulusTimestamp === 'number' ? t.stimulusTimestamp : (t.stimulusTimestamp === null ? null : now),
          responseTimestamp: typeof t.responseTimestamp === 'number' ? t.responseTimestamp : null,
          reactionTime: rawRt,
          reactionTimeMs: rawRt,
          accuracy: accuracyVal,
          falseStart: isFalseStart,
          timedOut: isTimedOut,
          valid: isValid,
          correct: isCorrect,
          correctness: isCorrect,
          timestamp: typeof t.timestamp === 'string' ? t.timestamp : nowIso,
          deviceCategory: serverDeviceCategory,
          device: serverDeviceCategory,
          screenWidth: typeof t.screenWidth === 'number' && Number.isFinite(t.screenWidth) && t.screenWidth > 0 ? Number(t.screenWidth) : null,
          screenHeight: typeof t.screenHeight === 'number' && Number.isFinite(t.screenHeight) && t.screenHeight > 0 ? Number(t.screenHeight) : null,
          ageGroup: authoritativeAgeGroup
        };

        if (typeof t.device === 'string' && t.device !== 'desktop' && t.device !== 'mobile') {
          payload.clientDeviceDetails = t.device;
        }
        if (rawLat !== null) {
          payload.rawReactionTime = rawLat;
          payload.rawLatencyMs = rawLat;
        }
        if (typeof t.displayDelayOffsetMs === 'number') payload.displayDelayOffsetMs = t.displayDelayOffsetMs;
        if (typeof t.displayDelayOffsetEstimated === 'boolean') payload.displayDelayOffsetEstimated = t.displayDelayOffsetEstimated;
        if (typeof t.displayDelayOffsetSource === 'string') payload.displayDelayOffsetSource = t.displayDelayOffsetSource;
        if (typeof t.notes === 'string') payload.notes = t.notes;

        if (typeof t.foreperiodMs === 'number') payload.foreperiodMs = t.foreperiodMs;
        if (typeof t.foreperiodCategory === 'string' && (t.foreperiodCategory === 'SHORT' || t.foreperiodCategory === 'LONG')) {
          payload.foreperiodCategory = t.foreperiodCategory;
        } else if (typeof t.foreperiodMs === 'number') {
          const derived = deriveForeperiodCategory(t.foreperiodMs);
          if (derived) payload.foreperiodCategory = derived;
        }

        if (typeof t.stimulusScheduledAt === 'number') payload.stimulusScheduledAt = t.stimulusScheduledAt;
        if (typeof t.stimulusScheduledAtPerfMs === 'number') payload.stimulusScheduledAtPerfMs = t.stimulusScheduledAtPerfMs;
        else if (typeof t.stimulusScheduledAt === 'number') payload.stimulusScheduledAtPerfMs = t.stimulusScheduledAt;

        if (typeof t.stimulusPresentedAt === 'number' || t.stimulusPresentedAt === null) payload.stimulusPresentedAt = t.stimulusPresentedAt;
        if (typeof t.stimulusPresentedAtPerfMs === 'number' || t.stimulusPresentedAtPerfMs === null) payload.stimulusPresentedAtPerfMs = t.stimulusPresentedAtPerfMs;
        else if (typeof t.stimulusPresentedAt === 'number' || t.stimulusPresentedAt === null) payload.stimulusPresentedAtPerfMs = t.stimulusPresentedAt;

        if (t.responseDetectedAt !== undefined) payload.responseDetectedAt = t.responseDetectedAt;
        if (t.responseDetectedAtPerfMs !== undefined) payload.responseDetectedAtPerfMs = t.responseDetectedAtPerfMs;
        else if (t.responseDetectedAt !== undefined) payload.responseDetectedAtPerfMs = t.responseDetectedAt;

        if (typeof t.validity === 'string') payload.validity = t.validity;
        if (t.qualityFlag !== undefined) payload.qualityFlag = t.qualityFlag;

        if (t.previousTrialEndedAt !== undefined) payload.previousTrialEndedAt = t.previousTrialEndedAt;
        if (t.previousTrialEndedAtPerfMs !== undefined) payload.previousTrialEndedAtPerfMs = t.previousTrialEndedAtPerfMs;
        else if (t.previousTrialEndedAt !== undefined) payload.previousTrialEndedAtPerfMs = t.previousTrialEndedAt;
        if (t.interStimulusIntervalMs !== undefined) payload.interStimulusIntervalMs = t.interStimulusIntervalMs;
        if (t.interTrialIntervalMs !== undefined) payload.interTrialIntervalMs = t.interTrialIntervalMs;
        if (typeof t.stimulusWallTimestamp === 'number') payload.stimulusWallTimestamp = t.stimulusWallTimestamp;
        if (t.responseWallTimestamp !== undefined) payload.responseWallTimestamp = t.responseWallTimestamp;
        if (typeof t.assessmentStartedAt === 'number') payload.assessmentStartedAt = t.assessmentStartedAt;

        if (typeof t.targetDirection === 'string') payload.targetDirection = t.targetDirection;
        if (typeof t.wordName === 'string') payload.wordName = t.wordName;
        if (typeof t.wordColor === 'string') payload.wordColor = t.wordColor;
        if (typeof t.instruction === 'string') payload.instruction = t.instruction;
        if (typeof t.userResponse === 'string' || t.userResponse === null) payload.userResponse = t.userResponse;

        if (typeof t.level === 'number') payload.level = t.level;
        if (typeof t.sequenceLength === 'number') payload.sequenceLength = t.sequenceLength;
        if (t.generatedSequence !== undefined) payload.generatedSequence = t.generatedSequence;
        if (t.playerSequence !== undefined) payload.playerSequence = t.playerSequence;
        if (typeof t.responseDurationMs === 'number') payload.responseDurationMs = t.responseDurationMs;
        if (typeof t.correctSelections === 'number') payload.correctSelections = t.correctSelections;

        if (typeof t.correct === 'boolean') payload.correct = t.correct;
        if (typeof t.correctness === 'boolean') payload.correctness = t.correctness;

        trialPayloads.push({ id: trialId, data: payload });
      });
    }

    const trialsDigest = computeCanonicalTrialsDigest(trialPayloads.map(tp => tp.data));
    const completedAtTimestamp = now;
    const completedAtMonth = new Date(now).toISOString().substring(0, 7);

    const canonicalMetrics = Object.keys(derivedMetrics).sort().map(k => `${k}=${derivedMetrics[k]}`).join('&');
    const payloadDigest = `${assessmentType}:${authoritativeAgeGroup}:${canonicalMetrics}:${trialsDigest}:${completedAtTimestamp}:${completedAtMonth}`;
    const provenanceToken = signProvenancePayload(payloadDigest);

    // Rule 6: Exactly one shared server-generated docId for publicDataset and assessmentResults
    const docId = crypto.randomUUID();

    const isSpeedAssessment = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
    const progressionTrials = trialPayloads.map(({ data: tp }, idx) => {
      const trialNumber = typeof tp.trialNumber === 'number' ? tp.trialNumber : (idx + 1);
      const rawRt = typeof tp.reactionTime === 'number' ? tp.reactionTime : (typeof tp.reactionTimeMs === 'number' ? tp.reactionTimeMs : null);
      const falseStart = tp.falseStart === true;
      const timedOut = tp.timedOut === true;
      const valid = typeof tp.valid === 'boolean' ? tp.valid : (!falseStart && !timedOut);

      const baseProgressionItem: Record<string, unknown> = {
        trialNumber,
        trialIndex: typeof tp.trialIndex === 'number' && Number.isFinite(tp.trialIndex) ? tp.trialIndex : idx + 1,
        sequenceNumber: typeof tp.sequenceNumber === 'number' && Number.isFinite(tp.sequenceNumber) ? tp.sequenceNumber : idx + 1,
        attemptNumber: typeof tp.attemptNumber === 'number' && Number.isFinite(tp.attemptNumber) ? tp.attemptNumber : 1,
        falseStart,
        timedOut,
        valid,
      };

      if (typeof tp.correct === 'boolean') baseProgressionItem.correct = tp.correct;
      if (typeof tp.accuracy === 'number') baseProgressionItem.accuracy = tp.accuracy;
      if (typeof tp.validity === 'string') baseProgressionItem.validity = tp.validity;
      if (tp.qualityFlag !== undefined) baseProgressionItem.qualityFlag = tp.qualityFlag;

      if (typeof tp.rawLatencyMs === 'number') baseProgressionItem.rawLatencyMs = tp.rawLatencyMs;
      if (typeof tp.displayDelayOffsetMs === 'number') baseProgressionItem.displayDelayOffsetMs = tp.displayDelayOffsetMs;
      if (typeof tp.displayDelayOffsetEstimated === 'boolean') baseProgressionItem.displayDelayOffsetEstimated = tp.displayDelayOffsetEstimated;
      if (typeof tp.displayDelayOffsetSource === 'string') baseProgressionItem.displayDelayOffsetSource = tp.displayDelayOffsetSource;
      if (typeof tp.stimulusScheduledAtPerfMs === 'number') baseProgressionItem.stimulusScheduledAtPerfMs = tp.stimulusScheduledAtPerfMs;
      if (typeof tp.stimulusPresentedAtPerfMs === 'number') baseProgressionItem.stimulusPresentedAtPerfMs = tp.stimulusPresentedAtPerfMs;
      if (typeof tp.responseDetectedAtPerfMs === 'number') baseProgressionItem.responseDetectedAtPerfMs = tp.responseDetectedAtPerfMs;

      if (assessmentType === 'visual-reaction') {
        if (typeof tp.foreperiodMs === 'number') {
          baseProgressionItem.foreperiodMs = tp.foreperiodMs;
          baseProgressionItem.foreperiodCategory = typeof tp.foreperiodCategory === 'string'
            ? tp.foreperiodCategory
            : deriveForeperiodCategory(tp.foreperiodMs);
        } else if (typeof tp.foreperiodCategory === 'string') {
          baseProgressionItem.foreperiodCategory = tp.foreperiodCategory;
        }
      } else if (assessmentType === 'direction') {
        if (typeof tp.targetDirection === 'string') baseProgressionItem.targetDirection = tp.targetDirection;
        if (typeof tp.userResponse === 'string' || tp.userResponse === null) baseProgressionItem.userResponse = tp.userResponse;
      } else if (assessmentType === 'color-recognition') {
        if (typeof tp.wordName === 'string') baseProgressionItem.wordName = tp.wordName;
        if (typeof tp.wordColor === 'string') baseProgressionItem.wordColor = tp.wordColor;
        if (typeof tp.condition === 'string') baseProgressionItem.condition = tp.condition;
        if (typeof tp.instruction === 'string') baseProgressionItem.instruction = tp.instruction;
        if (typeof tp.userResponse === 'string' || tp.userResponse === null) baseProgressionItem.userResponse = tp.userResponse;
      } else if (assessmentType === 'block-memory' || assessmentType === 'number-memory') {
        if (typeof tp.level === 'number') baseProgressionItem.level = tp.level;
        if (typeof tp.sequenceLength === 'number') {
          baseProgressionItem.sequenceLength = tp.sequenceLength;
        } else if (typeof tp.level === 'number' && tp.level > 0) {
          baseProgressionItem.sequenceLength = assessmentType === 'block-memory' ? tp.level + 1 : tp.level + 2;
        }
        if (tp.generatedSequence !== undefined) baseProgressionItem.generatedSequence = tp.generatedSequence;
        if (tp.playerSequence !== undefined) baseProgressionItem.playerSequence = tp.playerSequence;
        if (typeof tp.responseDurationMs === 'number') baseProgressionItem.responseDurationMs = tp.responseDurationMs;
        if (typeof tp.correctSelections === 'number') baseProgressionItem.correctSelections = tp.correctSelections;
      }

      if (isSpeedAssessment) {
        return {
          ...baseProgressionItem,
          reactionTime: rawRt,
          metricType: 'reaction_time' as const
        };
      } else {
        return {
          ...baseProgressionItem,
          inputLatencyMs: rawRt,
          reactionTime: rawRt,
          metricType: 'input_latency' as const
        };
      }
    });

    const versionMetadata = getAssessmentVersionMetadata(assessmentType);

    const currentScoreCandidate = isSpeedAssessment
      ? derivedMetrics['averageReactionTime']
      : derivedMetrics['longestSeq'];
    const currentScore: number | null =
      typeof currentScoreCandidate === 'number' && Number.isFinite(currentScoreCandidate)
        ? currentScoreCandidate
        : null;

    const publicDatasetDoc = {
      ageGroup: authoritativeAgeGroup,
      assessmentType,
      schemaVersion: 1,
      ...versionMetadata,
      provenanceVersion: 'v2.0.0',
      completedAtMonth,
      provenanceToken,
      trialsDigest,
      deviceCategory: serverDeviceCategory,
      device: serverDeviceCategory,
      scoreMetric: currentScore,
      totalTrials: progressionTrials.length,
      // Sanitize before persistence: authenticated clients can read publicDataset
      // directly from Firestore and do not pass through the API DTO sanitizer.
      progressionTrials: sanitizePublicTrials(progressionTrials),
      ...derivedMetrics
    };

    let previousPersonalBest: number | null = null;
    try {
      const prevSessions = await this.sessionRepo.findUserConsumedSessions(userId, assessmentType);
      prevSessions.forEach(data => {
        if (data.sessionId === sessionId) return;
        let s: number | null = null;
        if (typeof data.scoreMetric === 'number') {
          s = data.scoreMetric;
        } else if (data.derivedMetrics) {
          const derived = data.derivedMetrics as Record<string, unknown>;
          if (isSpeedAssessment) {
            if (typeof derived['averageReactionTime'] === 'number') s = derived['averageReactionTime'] as number;
          } else {
            if (typeof derived['longestSeq'] === 'number') s = derived['longestSeq'] as number;
            else if (typeof derived['highestLevel'] === 'number') {
              const hl = Number(derived['highestLevel']);
              s = assessmentType === 'block-memory'
                ? (hl > 0 ? hl + 1 : 0)
                : (hl > 0 ? hl + 2 : 0);
            }
          }
        }
        if (s !== null && Number.isFinite(s)) {
          if (previousPersonalBest === null) {
            previousPersonalBest = s;
          } else if (isSpeedAssessment && s < previousPersonalBest) {
            previousPersonalBest = s;
          } else if (!isSpeedAssessment && s > previousPersonalBest) {
            previousPersonalBest = s;
          }
        }
      });
    } catch {
      // Graceful PB lookup notice
    }

    let isNewPersonalBest = false;
    if (currentScore !== null) {
      if (previousPersonalBest === null) {
        isNewPersonalBest = true;
      } else if (isSpeedAssessment) {
        isNewPersonalBest = currentScore < previousPersonalBest;
      } else {
        isNewPersonalBest = currentScore > previousPersonalBest;
      }
    }

    const personalBest = isNewPersonalBest ? currentScore : (previousPersonalBest ?? currentScore);

    const result = await this.submissionRepo.executeSubmissionTransaction({
      docId,
      sessionId,
      userId,
      assessmentType,
      ageGroup: authoritativeAgeGroup,
      derivedMetrics,
      currentScore,
      isNewPersonalBest,
      previousPersonalBest,
      personalBest,
      completedAtTimestamp,
      completedAtMonth,
      provenanceToken,
      trialsDigest,
      publicDatasetDoc,
      trialPayloads
    });

    if (idempotencyKey) {
      setIdempotency(`res_sub:${idempotencyKey}`, result);
    }

    return result;
  }

  async getDataset(query: DatasetQueryInput): Promise<DatasetQueryResultDto> {
    const rawData = await this.datasetRepo.queryRawDataset({
      assessmentType: query.assessmentType,
      ageGroup: query.ageGroup,
      completedAtMonth: query.completedAtMonth,
      limitCount: query.limitCount,
      cursor: query.cursor
    });

    const records: PublicDatasetRecord[] = rawData.results.map(data => {
      const derived = data.derivedMetrics && typeof data.derivedMetrics === 'object'
        ? data.derivedMetrics as Record<string, unknown>
        : {};
      const rawAssessmentType = typeof data.assessmentType === 'string' ? data.assessmentType : 'unknown';
      const canonicalType = normalizeLeaderboardAssessmentType(rawAssessmentType);
      const rawMonth = typeof data.completedAtMonth === 'string' ? data.completedAtMonth.trim() : '';
      const completedAtMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : undefined;
      const derivedScore = canonicalType === 'visual-reaction' ||
        canonicalType === 'direction' ||
        canonicalType === 'color-recognition'
        ? firstFiniteNumber(derived.averageReactionTime, data.averageReactionTime)
        : firstFiniteNumber(derived.longestSeq, data.longestSeq);
      const scoreMetric = data.scoreMetric === null
        ? null
        : firstFiniteNumber(data.scoreMetric, derivedScore);
      const rawTotalTrials = data.totalTrials;
      const totalTrials = typeof rawTotalTrials === 'number' &&
        Number.isSafeInteger(rawTotalTrials) && rawTotalTrials >= 0
        ? rawTotalTrials
        : (Array.isArray(data.progressionTrials) ? data.progressionTrials.length : undefined);

      return {
        id: data.id,
        assessmentType: canonicalType || rawAssessmentType,
        ageGroup: firstString(data.ageGroup),
        completedAtMonth,
        deviceCategory: firstString(data.deviceCategory),
        device: firstString(data.device),
        inputModality: firstString(data.inputModality, data.inputMethod),
        displayRefreshRateHz: firstFiniteNumber(data.displayRefreshRateHz, data.refreshRateHz),
        refreshRateHz: firstFiniteNumber(data.refreshRateHz, data.displayRefreshRateHz),
        schemaVersion: firstFiniteNumber(data.schemaVersion),
        assessmentVersion: firstString(data.assessmentVersion),
        protocolVersion: firstString(data.protocolVersion),
        datasetSchemaVersion: firstString(data.datasetSchemaVersion),
        metricsVersion: firstString(data.metricsVersion),
        provenanceVersion: firstString(data.provenanceVersion),
        provenanceToken: firstString(data.provenanceToken),
        trialsDigest: firstString(data.trialsDigest),
        scoreMetric,
        consistency: firstFiniteNumber(derived.consistency, data.consistency),
        totalFalseStarts: firstFiniteNumber(derived.totalFalseStarts, data.totalFalseStarts),
        totalCorrect: firstFiniteNumber(derived.totalCorrect, data.totalCorrect),
        totalIncorrect: firstFiniteNumber(derived.totalIncorrect, data.totalIncorrect),
        correctCount: firstFiniteNumber(derived.correctCount, data.correctCount),
        totalAttempts: firstFiniteNumber(derived.totalAttempts, data.totalAttempts),
        overallAccuracy: firstFiniteNumber(derived.overallAccuracy, data.overallAccuracy),
        totalTimeMs: firstFiniteNumber(derived.totalTimeMs, data.totalTimeMs),
        temporalDynamics: sanitizePublicObject(derived.temporalDynamics ?? data.temporalDynamics),
        averageReactionTime: firstFiniteNumber(derived.averageReactionTime, data.averageReactionTime),
        medianReactionTime: firstFiniteNumber(derived.medianReactionTime, data.medianReactionTime),
        fastestReactionTime: firstFiniteNumber(derived.fastestReactionTime, data.fastestReactionTime),
        slowestReactionTime: firstFiniteNumber(derived.slowestReactionTime, data.slowestReactionTime),
        longestSeq: firstFiniteNumber(derived.longestSeq, data.longestSeq),
        highestLevel: firstFiniteNumber(derived.highestLevel, data.highestLevel),
        accuracy: firstFiniteNumber(derived.accuracy, data.accuracy),
        congruentAvg: firstFiniteNumber(derived.congruentAvg, data.congruentAvg),
        incongruentAvg: firstFiniteNumber(derived.incongruentAvg, data.incongruentAvg),
        interferenceCost: firstFiniteNumber(derived.interferenceCost, data.interferenceCost),
        totalTrials,
        progressionTrials: sanitizePublicTrials(data.progressionTrials)
      };
    });

    return {
      records,
      count: records.length,
      hasMore: rawData.hasMore,
      nextCursor: rawData.nextCursor
    };
  }

  async getDatasetSummary(): Promise<DatasetSummaryResultDto> {
    return this.datasetRepo.getDatasetSummary();
  }
}
