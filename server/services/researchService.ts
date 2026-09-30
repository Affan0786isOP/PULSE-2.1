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
import { normalizeAssessmentType } from '../engines/assessmentTypes';
import { validateAndDeriveAssessmentFromTrials } from '../engines/assessmentEngine';
import { deriveForeperiodCategory } from '../engines/reactionCalculator';
import { computeCanonicalTrialsDigest, signProvenancePayload } from './provenanceService';
import { getIdempotency, setIdempotency } from './idempotencyService';
import { ISessionService } from './interfaces/ISessionService';
import { AppError } from '../models/replayContracts';

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
    if (!sessionCheck.valid || !sessionCheck.session) {
      throw new AppError(sessionCheck.error || 'Session validation failed', sessionCheck.status || 400);
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

    const publicDatasetDoc = {
      ageGroup: authoritativeAgeGroup,
      assessmentType,
      schemaVersion: 1,
      assessmentVersion: 'v1.0.0',
      protocolVersion: 'v1.0.0',
      datasetSchemaVersion: 'v1.0.0',
      metricsVersion: 'v1.0.0',
      provenanceVersion: 'v2.0.0',
      completedAtMonth,
      provenanceToken,
      trialsDigest,
      deviceCategory: serverDeviceCategory,
      device: serverDeviceCategory,
      progressionTrials,
      ...derivedMetrics
    };

    let currentScore: number | null = null;
    if (isSpeedAssessment) {
      currentScore = typeof derivedMetrics['averageReactionTime'] === 'number' ? (derivedMetrics['averageReactionTime'] as number) : null;
    } else {
      currentScore = typeof derivedMetrics['longestSeq'] === 'number' ? (derivedMetrics['longestSeq'] as number) : null;
    }

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
        if (s !== null && !isNaN(s)) {
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
      const sId = data.sessionId;
      const sessionData = sId ? rawData.sessionMap.get(sId) : undefined;
      const rawTrials = sId ? (rawData.trialsBySession.get(sId) || []) : [];

      rawTrials.sort((a, b) => {
        const numA = typeof a['trialNumber'] === 'number' ? (a['trialNumber'] as number) : (typeof a['trialIndex'] === 'number' ? (a['trialIndex'] as number) : (typeof a['sequenceNumber'] === 'number' ? (a['sequenceNumber'] as number) : 0));
        const numB = typeof b['trialNumber'] === 'number' ? (b['trialNumber'] as number) : (typeof b['trialIndex'] === 'number' ? (b['trialIndex'] as number) : (typeof b['sequenceNumber'] === 'number' ? (b['sequenceNumber'] as number) : 0));
        return numA - numB;
      });

      const sanitizedTrials = rawTrials.map((tp: Record<string, unknown>, idx: number) => {
        const trialNumber = typeof tp['trialNumber'] === 'number' ? (tp['trialNumber'] as number) : (idx + 1);
        const rawRt = typeof tp['reactionTime'] === 'number' ? (tp['reactionTime'] as number) : (typeof tp['reactionTimeMs'] === 'number' ? (tp['reactionTimeMs'] as number) : null);
        const falseStart = tp['falseStart'] === true;
        const timedOut = tp['timedOut'] === true;
        const valid = typeof tp['valid'] === 'boolean' ? (tp['valid'] as boolean) : (!falseStart && !timedOut);

        const trialItem: Record<string, unknown> = {
          trialNumber,
          trialIndex: typeof tp['trialIndex'] === 'number' ? tp['trialIndex'] : trialNumber,
          sequenceNumber: typeof tp['sequenceNumber'] === 'number' ? tp['sequenceNumber'] : trialNumber,
          attemptNumber: typeof tp['attemptNumber'] === 'number' ? tp['attemptNumber'] : 1,
          reactionTime: rawRt,
          falseStart,
          timedOut,
          valid,
        };

        if (typeof tp['correct'] === 'boolean') trialItem.correct = tp['correct'];
        if (typeof tp['correctness'] === 'boolean') trialItem.correctness = tp['correctness'];
        if (typeof tp['accuracy'] === 'number') trialItem.accuracy = tp['accuracy'];
        if (typeof tp['validity'] === 'string') trialItem.validity = tp['validity'];
        if (tp['qualityFlag'] !== undefined) trialItem.qualityFlag = tp['qualityFlag'];

        if (typeof tp['rawLatencyMs'] === 'number') trialItem.rawLatencyMs = tp['rawLatencyMs'];
        else if (typeof tp['rawReactionTime'] === 'number') trialItem.rawLatencyMs = tp['rawReactionTime'];
        if (typeof tp['displayDelayOffsetMs'] === 'number') trialItem.displayDelayOffsetMs = tp['displayDelayOffsetMs'];

        if (typeof tp['stimulusScheduledAtPerfMs'] === 'number') trialItem.stimulusScheduledAtPerfMs = tp['stimulusScheduledAtPerfMs'];
        if (typeof tp['stimulusPresentedAtPerfMs'] === 'number') trialItem.stimulusPresentedAtPerfMs = tp['stimulusPresentedAtPerfMs'];
        if (typeof tp['responseDetectedAtPerfMs'] === 'number') trialItem.responseDetectedAtPerfMs = tp['responseDetectedAtPerfMs'];

        if (typeof tp['foreperiodMs'] === 'number') trialItem.foreperiodMs = tp['foreperiodMs'];
        if (typeof tp['foreperiodCategory'] === 'string') trialItem.foreperiodCategory = tp['foreperiodCategory'];

        if (typeof tp['targetDirection'] === 'string') trialItem.targetDirection = tp['targetDirection'];
        if (typeof tp['chosenDirection'] === 'string') trialItem.chosenDirection = tp['chosenDirection'];
        if (typeof tp['userResponse'] === 'string' || tp['userResponse'] === null) trialItem.userResponse = tp['userResponse'];

        if (typeof tp['targetColor'] === 'string') trialItem.targetColor = tp['targetColor'];
        if (typeof tp['chosenColor'] === 'string') trialItem.chosenColor = tp['chosenColor'];
        if (typeof tp['wordName'] === 'string') trialItem.wordName = tp['wordName'];
        if (typeof tp['wordColor'] === 'string') trialItem.wordColor = tp['wordColor'];
        if (typeof tp['condition'] === 'string') trialItem.condition = tp['condition'];
        if (typeof tp['instruction'] === 'string') trialItem.instruction = tp['instruction'];

        if (typeof tp['level'] === 'number') trialItem.level = tp['level'];
        if (typeof tp['sequenceLength'] === 'number') trialItem.sequenceLength = tp['sequenceLength'];
        if (typeof tp['interTapTimeMs'] === 'number') trialItem.interTapTimeMs = tp['interTapTimeMs'];
        if (typeof tp['responseDurationMs'] === 'number') trialItem.responseDurationMs = tp['responseDurationMs'];

        return trialItem;
      });

      let derivedMonth = data.completedAtMonth;
      if (!derivedMonth && (data.completedAtTimestamp || data.createdAt)) {
        const d = new Date(data.completedAtTimestamp || data.createdAt!);
        if (!isNaN(d.getTime())) {
          derivedMonth = d.toISOString().substring(0, 7);
        }
      }

      const dm = data.derivedMetrics;
      return {
        id: data.id,
        assessmentType: normalizeAssessmentType(data.assessmentType || 'unknown'),
        ageGroup: data.ageGroup || (sessionData?.['ageGroup'] as string | undefined) || undefined,
        completedAtMonth: derivedMonth || undefined,
        completedAtTimestamp: data.completedAtTimestamp || data.createdAt,
        deviceCategory: (sessionData?.['deviceCategory'] as string | undefined) || (sessionData?.['device'] as string | undefined) || undefined,
        device: (sessionData?.['device'] as string | undefined) || (sessionData?.['deviceCategory'] as string | undefined) || undefined,
        inputModality: (sessionData?.['inputModality'] as string | undefined) || (sessionData?.['inputMethod'] as string | undefined) || undefined,
        displayRefreshRateHz: (sessionData?.['displayRefreshRateHz'] as number | undefined) || (sessionData?.['refreshRateHz'] as number | undefined) || undefined,
        refreshRateHz: (sessionData?.['refreshRateHz'] as number | undefined) || (sessionData?.['displayRefreshRateHz'] as number | undefined) || undefined,
        provenanceToken: data.provenanceToken,
        trialsDigest: data.trialsDigest,
        scoreMetric: data.scoreMetric,
        averageReactionTime: (dm?.['averageReactionTime'] as number | undefined) ?? data.averageReactionTime,
        medianReactionTime: (dm?.['medianReactionTime'] as number | undefined) ?? data.medianReactionTime,
        fastestReactionTime: (dm?.['fastestReactionTime'] as number | undefined) ?? data.fastestReactionTime,
        slowestReactionTime: (dm?.['slowestReactionTime'] as number | undefined) ?? data.slowestReactionTime,
        longestSeq: (dm?.['longestSeq'] as number | undefined) ?? data.longestSeq,
        highestLevel: (dm?.['highestLevel'] as number | undefined) ?? data.highestLevel,
        accuracy: (dm?.['accuracy'] as number | undefined) ?? data.accuracy,
        congruentAvg: (dm?.['congruentAvg'] as number | undefined) ?? data.congruentAvg,
        incongruentAvg: (dm?.['incongruentAvg'] as number | undefined) ?? data.incongruentAvg,
        interferenceCost: (dm?.['interferenceCost'] as number | undefined) ?? data.interferenceCost,
        progressionTrials: sanitizedTrials
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
