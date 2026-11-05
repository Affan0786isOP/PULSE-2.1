import type express from 'express';
import type { Express } from 'express';
import { VALID_AGE_GROUPS, VALID_ASSESSMENT_TYPES } from '../config/constants';
import { normalizeLeaderboardAssessmentType } from '../../shared/domain/leaderboardEligibility';
import { verifyFirebaseUserToken } from '../middleware/auth';
import { isMobileUserAgent } from '../middleware/deviceRouting';
import { safeCompareHex, signProvenancePayload } from '../services/provenanceService';
import type { ISessionService } from '../services/interfaces/ISessionService';
import type { IPersonalBestService } from '../services/interfaces/IPersonalBestService';
import type { IResearchService } from '../services/interfaces/IResearchService';
import type { ITelegramNotifierService } from '../services/interfaces/ITelegramNotifierService';
import { isValidDeviceId } from '../../shared/telemetry/deviceId';
import type { AssessmentNotificationType } from '../../shared/types/telemetry';
import { SessionAlreadyConsumedError, AppError } from '../models/replayContracts';

export function registerResearchRoutes(
  app: Express,
  services: {
    sessionService: ISessionService;
    personalBestService: IPersonalBestService;
    researchService: IResearchService;
    telegramService?: ITelegramNotifierService;
  }
): void {
  // Authoritative Experiment Session Issuance
  const handleSessionStart = async (req: express.Request, res: express.Response) => {
    try {
      const verifiedUser = await verifyFirebaseUserToken(req);
      if (!verifiedUser) {
        return res.status(401).json({ success: false, error: 'Authentication required: missing or invalid Firebase ID token' });
      }

      const { assessmentType, ageGroup } = req.body || {};

      try {
        const sessionInfo = await services.sessionService.startSession({
          assessmentType,
          ageGroup,
          userId: verifiedUser.uid
        });

        return res.json({
          success: true,
          sessionId: sessionInfo.sessionId,
          expiresAt: sessionInfo.expiresAt,
          assessmentType: sessionInfo.assessmentType
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const errStatus = err instanceof AppError ? err.status : undefined;
        if (errStatus === 400) {
          return res.status(400).json({ success: false, error: errMsg });
        }
        if (errMsg === 'DATABASE_UNAVAILABLE') {
          return res.status(500).json({ success: false, error: 'Database unavailable' });
        }
        return res.status(500).json({ success: false, error: `Failed to persist experiment session: ${errMsg}` });
      }
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to initialize experiment session' });
    }
  };

  app.post('/api/research/session/start', handleSessionStart);

  // Canonical Personal Best Retrieval Endpoint
  app.get('/api/personal-best', async (req, res) => {
    try {
      const verifiedUser = await verifyFirebaseUserToken(req);
      if (!verifiedUser) {
        return res.status(401).json({ success: false, error: 'Authentication required: missing or invalid Firebase ID token' });
      }

      const { assessmentType } = req.query || {};
      if (!assessmentType || typeof assessmentType !== 'string' || !VALID_ASSESSMENT_TYPES.includes(assessmentType)) {
        return res.status(400).json({ success: false, error: 'Invalid or missing assessmentType query parameter' });
      }

      try {
        const best = await services.personalBestService.getPersonalBest(verifiedUser.uid, assessmentType);
        return res.json({ success: true, personalBest: best });
      } catch (svcErr: unknown) {
        const errMsg = svcErr instanceof Error ? svcErr.message : String(svcErr);
        if (errMsg === 'DATABASE_UNAVAILABLE') {
          return res.status(500).json({ success: false, error: 'Database unavailable: Server misconfiguration' });
        }
        return res.status(500).json({ success: false, error: 'Failed to retrieve personal best' });
      }
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to retrieve personal best' });
    }
  });

  // Authoritative Research Submission
  app.post('/api/research/submit', async (req, res) => {
    try {
      const verifiedUser = await verifyFirebaseUserToken(req);
      if (!verifiedUser) {
        return res.status(401).json({ success: false, error: 'Authentication required: missing or invalid Firebase ID token' });
      }

      const { assessmentType, ageGroup, trials, sessionId, idempotencyKey, deviceId } = req.body || {};

      if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
        return res.status(400).json({ success: false, error: 'sessionId is required and must be a valid non-empty string' });
      }

      if (idempotencyKey !== undefined && idempotencyKey !== null && typeof idempotencyKey !== 'string') {
        return res.status(400).json({ success: false, error: 'Invalid idempotencyKey (must be 1-128 characters string)' });
      }

      const validIdempKey = typeof idempotencyKey === 'string' && idempotencyKey.trim().length > 0 && idempotencyKey.trim().length <= 128
        ? idempotencyKey.trim()
        : null;

      if (idempotencyKey !== undefined && idempotencyKey !== null && !validIdempKey) {
        return res.status(400).json({ success: false, error: 'Invalid idempotencyKey (must be 1-128 characters string)' });
      }

      const activeSessionId = sessionId.trim();
      if (activeSessionId === validIdempKey) {
        return res.status(400).json({ success: false, error: 'sessionId and idempotencyKey must be distinct' });
      }


      const serverDeviceCategory: 'mobile' | 'desktop' = isMobileUserAgent(req) ? 'mobile' : 'desktop';

      try {
        const result = await services.researchService.submitResearch({
          sessionId: activeSessionId,
          userId: verifiedUser.uid,
          assessmentType,
          ageGroup,
          trials: Array.isArray(trials) ? trials : [],
          idempotencyKey: validIdempKey,
          serverDeviceCategory
        });

        if (services.telegramService && result) {
          const validatedDeviceId = isValidDeviceId(deviceId) ? deviceId : undefined;
          const dm = (result.derivedMetrics || {}) as Record<string, unknown>;
          const metricsPayload = {
            meanReactionTimeMs: typeof dm.meanReactionTime === 'number'
              ? dm.meanReactionTime
              : (typeof dm.meanReactionTimeMs === 'number'
                  ? dm.meanReactionTimeMs
                  : (typeof dm.averageReactionTime === 'number'
                      ? dm.averageReactionTime
                      : (typeof dm.averageReactionTimeMs === 'number' ? dm.averageReactionTimeMs : null))),
            medianReactionTimeMs: typeof dm.medianReactionTime === 'number' ? dm.medianReactionTime : (typeof dm.medianReactionTimeMs === 'number' ? dm.medianReactionTimeMs : null),
            fastestReactionTimeMs: typeof dm.fastestReactionTime === 'number' ? dm.fastestReactionTime : null,
            slowestReactionTimeMs: typeof dm.slowestReactionTime === 'number' ? dm.slowestReactionTime : null,
            falseStartsCount: typeof dm.falseStartsCount === 'number'
              ? dm.falseStartsCount
              : (typeof dm.totalFalseStarts === 'number'
                  ? dm.totalFalseStarts
                  : undefined),
            validTrialsCount: typeof dm.validTrialsCount === 'number' ? dm.validTrialsCount : undefined,
            accuracyPercentage: typeof dm.accuracyPercentage === 'number' ? dm.accuracyPercentage : (typeof dm.accuracy === 'number' ? dm.accuracy * 100 : null),
            conflictCostMs: typeof dm.conflictCost === 'number' ? dm.conflictCost : null,
            interferenceCostMs: typeof dm.interferenceCost === 'number' ? dm.interferenceCost : null,
            maxSpan: typeof dm.maxSpan === 'number' ? dm.maxSpan : null,
            highestLevelAchieved: typeof dm.highestLevelAchieved === 'number' ? dm.highestLevelAchieved : null
          };

          void services.telegramService.enqueueAssessmentResult({
            notificationId: result.sessionId || result.docId,
            assessmentType: assessmentType as AssessmentNotificationType,
            ageGroup: ageGroup || 'Unknown',
            deviceCategory: serverDeviceCategory === 'mobile' ? 'phone' : 'computer',
            surface: serverDeviceCategory === 'mobile' ? 'mobile' : 'desktop',
            deviceId: validatedDeviceId,
            completedAtIso: new Date(result.completedAtTimestamp || Date.now()).toISOString(),
            metrics: metricsPayload
          }).catch((err: unknown) => {
            console.error('[Telemetry Assessment Enqueue Error]:', err instanceof Error ? err.message : String(err));
          });
        }

        return res.json({
          success: true,
          ...result
        });
      } catch (submitErr: unknown) {
        if (submitErr instanceof SessionAlreadyConsumedError) {
          const sData = submitErr.sessionData;
          if (sData) {
            return res.status(200).json({
              success: true,
              docId: sData.researchDocId || sData.sessionId,
              sessionId: activeSessionId,
              completedAtTimestamp: sData.consumedAt || Date.now(),
              provenanceToken: sData.provenanceToken,
              trialsDigest: sData.trialsDigest,
              derivedMetrics: sData.derivedMetrics,
              scoreMetric: sData.scoreMetric ?? null,
              isNewPersonalBest: sData.isNewPersonalBest ?? false,
              previousPersonalBest: sData.previousPersonalBest ?? null,
              personalBest: sData.personalBest ?? null
            });
          }
          return res.status(200).json({ success: true, sessionId: activeSessionId, message: 'Experiment session has already been completed/consumed' });
        }

        const errMsg = submitErr instanceof Error ? submitErr.message : String(submitErr);
        const errStatus = submitErr instanceof AppError ? submitErr.status : undefined;

        if (errMsg === 'DATASET_SUMMARY_MIGRATION_IN_PROGRESS') {
          return res.status(503).json({
            success: false,
            error: 'Research submissions are temporarily paused while the Dataset summary is reconciled. Please retry shortly.'
          });
        }
        if (errMsg === 'DATASET_SUMMARY_RECONCILIATION_REQUIRED') {
          return res.status(503).json({
            success: false,
            error: 'Research submissions are temporarily unavailable until Dataset summary reconciliation is complete.'
          });
        }

        if (errMsg === 'SESSION_NOT_FOUND') {
          return res.status(404).json({ success: false, error: 'Experiment session not found or invalid' });
        }
        if (errMsg === 'SESSION_UID_MISMATCH') {
          return res.status(403).json({ success: false, error: 'Session UID mismatch with authenticated identity' });
        }
        if (errMsg === 'SESSION_TYPE_MISMATCH') {
          return res.status(400).json({ success: false, error: 'Session assessment type mismatch' });
        }
        if (errMsg === 'SESSION_EXPIRED') {
          return res.status(400).json({ success: false, error: 'Experiment session has expired' });
        }
        if (errStatus === 400) {
          return res.status(400).json({ success: false, error: errMsg });
        }
        if (errStatus === 404) {
          return res.status(404).json({ success: false, error: errMsg });
        }
        if (errStatus === 403) {
          return res.status(403).json({ success: false, error: errMsg });
        }
        if (errMsg.includes('Database unavailable')) {
          return res.status(500).json({ success: false, error: 'Database unavailable' });
        }

        // Inner transaction persistence error
        return res.status(500).json({ success: false, error: 'Failed to persist research submission to database' });
      }
    } catch (err: unknown) {
      // Outer catch for escaping unexpected errors
      return res.status(500).json({ success: false, error: 'Failed to atomically persist research data in database' });
    }
  });

  // Verification helper for audits / researchers
  app.post('/api/research/verify-provenance', (req, res) => {
    const { assessmentType, ageGroup, completedAtTimestamp, completedAtMonth, metrics, trialsDigest, provenanceToken } = req.body || {};
    if (!provenanceToken || typeof provenanceToken !== 'string') {
      return res.json({ verified: false, reason: 'Missing provenance token' });
    }
    const canonicalMetrics = metrics ? Object.keys(metrics).sort().map(k => `${k}=${metrics[k]}`).join('&') : '';
    const payloadDigest = `${assessmentType}:${ageGroup}:${canonicalMetrics}:${trialsDigest || ''}:${completedAtTimestamp}:${completedAtMonth}`;
    const expected = signProvenancePayload(payloadDigest);
    return res.json({ verified: safeCompareHex(expected, provenanceToken) });
  });

  // Public, anonymized Dataset reads may be cached briefly at the CDN.
  // Start no-store so validation/5xx responses never become publicly cacheable.
  app.get('/api/research/dataset', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Surrogate-Control', 'no-store');
    try {
      if (req.query.assessmentType !== undefined && typeof req.query.assessmentType !== 'string') {
        return res.status(400).json({ success: false, error: 'assessmentType must be a single string value', records: [] });
      }
      const rawType = typeof req.query.assessmentType === 'string' ? req.query.assessmentType.trim() : '';
      let assessmentType: string | null = null;
      if (rawType && rawType.toLowerCase() !== 'all') {
        const canonicalType = normalizeLeaderboardAssessmentType(rawType);
        if (!canonicalType) {
          return res.status(400).json({ success: false, error: 'Unsupported assessmentType', records: [] });
        }
        assessmentType = canonicalType;
      }

      if (req.query.ageGroup !== undefined && typeof req.query.ageGroup !== 'string') {
        return res.status(400).json({ success: false, error: 'ageGroup must be a single string value', records: [] });
      }
      const rawAgeGroup = typeof req.query.ageGroup === 'string' ? req.query.ageGroup.trim() : '';
      const ageGroup = rawAgeGroup && rawAgeGroup.toLowerCase() !== 'all' ? rawAgeGroup : null;
      if (ageGroup && !(VALID_AGE_GROUPS as readonly string[]).includes(ageGroup)) {
        return res.status(400).json({ success: false, error: 'Unsupported ageGroup', records: [] });
      }

      if (req.query.completedAtMonth !== undefined && typeof req.query.completedAtMonth !== 'string') {
        return res.status(400).json({ success: false, error: 'completedAtMonth must be a single string value', records: [] });
      }
      const rawMonth = typeof req.query.completedAtMonth === 'string' ? req.query.completedAtMonth.trim() : '';
      const completedAtMonth = rawMonth && rawMonth.toLowerCase() !== 'all' ? rawMonth : null;
      if (completedAtMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(completedAtMonth)) {
        return res.status(400).json({ success: false, error: 'completedAtMonth must use YYYY-MM format', records: [] });
      }

      let limitCount = 100;
      if (req.query.limit !== undefined) {
        const rawLimit = req.query.limit;
        if (typeof rawLimit !== 'string' || !/^\d+$/.test(rawLimit.trim())) {
          return res.status(400).json({ success: false, error: 'limit must be a positive integer', records: [] });
        }
        const parsedLimit = Number(rawLimit);
        if (!Number.isSafeInteger(parsedLimit) || parsedLimit < 1) {
          return res.status(400).json({ success: false, error: 'limit must be a positive integer', records: [] });
        }
        limitCount = Math.min(parsedLimit, 250);
      }

      if (req.query.cursor !== undefined && typeof req.query.cursor !== 'string') {
        return res.status(400).json({ success: false, error: 'cursor must be a single string value', records: [] });
      }
      const cursor = typeof req.query.cursor === 'string' && req.query.cursor.trim()
        ? req.query.cursor.trim()
        : null;

      try {
        const result = await services.researchService.getDataset({
          assessmentType,
          ageGroup,
          completedAtMonth,
          limitCount,
          cursor
        });

        if (req.query.fresh !== '1') {
          res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=60');
          res.setHeader('Surrogate-Control', 'max-age=60, stale-while-revalidate=60');
        }
        return res.json({
          success: true,
          count: result.count,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
          records: result.records
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg === 'INVALID_CURSOR') {
          return res.status(400).json({ success: false, error: 'Invalid cursor parameter', records: [] });
        }
        if (errMsg === 'DATABASE_UNAVAILABLE') {
          if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL && !process.env.VITEST) {
            try {
              const upstreamRes = await fetch(`https://test.pulse-lab.in${req.originalUrl}`);
              if (upstreamRes.ok) {
                const json = await upstreamRes.json();
                return res.json(json);
              }
            } catch {
              // fall through to 503
            }
          }
          return res.status(503).json({ success: false, error: 'Database service unavailable', records: [] });
        }
        return res.status(500).json({ success: false, error: errMsg, records: [] });
      }
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to retrieve research dataset', records: [] });
    }
  });

  // Public aggregate metadata is safe to cache briefly; errors remain no-store.
  app.get('/api/research/dataset/summary', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Surrogate-Control', 'no-store');
    try {
      try {
        const summary = await services.researchService.getDatasetSummary();
        if (req.query.fresh !== '1') {
          res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=60');
          res.setHeader('Surrogate-Control', 'max-age=60, stale-while-revalidate=60');
        }
        return res.json({
          success: true,
          totalRecords: summary.totalRecords,
          totalTrials: summary.totalTrials,
          counts: summary.counts
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg === 'DATASET_SUMMARY_MIGRATION_IN_PROGRESS') {
          return res.status(503).json({ success: false, error: 'Dataset summary is being reconciled. Please retry shortly.' });
        }
        if (errMsg === 'DATASET_SUMMARY_RECONCILIATION_REQUIRED') {
          return res.status(503).json({ success: false, error: 'Dataset summary requires reconciliation. Please retry shortly.' });
        }
        if (errMsg === 'INVALID_CURSOR') {
          return res.status(400).json({ success: false, error: 'Invalid cursor parameter', records: [] });
        }
        if (errMsg === 'DATABASE_UNAVAILABLE') {
          if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL && !process.env.VITEST) {
            try {
              const upstreamRes = await fetch(`https://test.pulse-lab.in${req.originalUrl}`);
              if (upstreamRes.ok) {
                const json = await upstreamRes.json();
                return res.json(json);
              }
            } catch {
              // fall through to 503
            }
          }
          return res.status(503).json({ success: false, error: 'Database service unavailable' });
        }
        return res.status(500).json({ success: false, error: 'Failed to aggregate dataset summary' });
      }
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to generate dataset summary' });
    }
  });
}
