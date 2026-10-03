import type express from 'express';
import type { Express } from 'express';
import { VALID_ASSESSMENT_TYPES } from '../config/constants';
import { verifyFirebaseUserToken } from '../middleware/auth';
import { isMobileUserAgent } from '../middleware/deviceRouting';
import { safeCompareHex, signProvenancePayload } from '../services/provenanceService';
import type { ISessionService } from '../services/interfaces/ISessionService';
import type { IPersonalBestService } from '../services/interfaces/IPersonalBestService';
import type { IResearchService } from '../services/interfaces/IResearchService';
import { SessionAlreadyConsumedError, AppError } from '../models/replayContracts';
import { getAdminDiagnosticMessage } from '../config/firebaseAdmin';

export function registerResearchRoutes(
  app: Express,
  services: {
    sessionService: ISessionService;
    personalBestService: IPersonalBestService;
    researchService: IResearchService;
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
      if (!services.sessionService) {
        return res.status(500).json({ success: false, error: `Database unavailable: ${getAdminDiagnosticMessage()}` });
      }

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
          return res.status(500).json({ success: false, error: `Database unavailable: ${getAdminDiagnosticMessage()}` });
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

      const { assessmentType, ageGroup, trials, sessionId, idempotencyKey } = req.body || {};

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

      if (!services.researchService) {
        return res.status(500).json({ success: false, error: `Database unavailable: ${getAdminDiagnosticMessage()}` });
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

        return res.json({
          success: true,
          ...result
        });
      } catch (submitErr: unknown) {
        if (submitErr instanceof SessionAlreadyConsumedError) {
          const sData = submitErr.sessionData;
          if (sData && sData.researchDocId) {
            return res.json({
              success: true,
              docId: sData.researchDocId,
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
          return res.status(400).json({ success: false, error: 'Experiment session has already been completed/consumed' });
        }

        const errMsg = submitErr instanceof Error ? submitErr.message : String(submitErr);
        const errStatus = submitErr instanceof AppError ? submitErr.status : undefined;

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
          return res.status(500).json({ success: false, error: errMsg });
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

  // Public Research Dataset Retrieval Endpoint with complete cursor-based pagination
  app.get('/api/research/dataset', async (req, res) => {
    try {
      const rawType = typeof req.query.assessmentType === 'string' ? req.query.assessmentType.trim() : null;
      const assessmentType = rawType && rawType !== 'all' ? rawType : null;
      const ageGroup = typeof req.query.ageGroup === 'string' && req.query.ageGroup !== 'all' ? req.query.ageGroup.trim() : null;
      const completedAtMonth = typeof req.query.completedAtMonth === 'string' && req.query.completedAtMonth !== 'all' ? req.query.completedAtMonth.trim() : null;
      const limitCount = req.query.limit ? Math.min(Math.max(1, parseInt(String(req.query.limit), 10) || 1000), 5000) : 1000;
      const cursor = typeof req.query.cursor === 'string' && req.query.cursor.trim() ? req.query.cursor.trim() : null;

      try {
        const result = await services.researchService.getDataset({
          assessmentType,
          ageGroup,
          completedAtMonth,
          limitCount,
          cursor
        });

        return res.json({
          success: true,
          count: result.count,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
          records: result.records
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg === 'DATABASE_UNAVAILABLE') {
          return res.status(503).json({ success: false, error: 'Database service unavailable', records: [] });
        }
        return res.status(500).json({ success: false, error: errMsg, records: [] });
      }
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to retrieve research dataset', records: [] });
    }
  });

  // Public Research Dataset Summary Endpoint
  app.get('/api/research/dataset/summary', async (_req, res) => {
    try {
      try {
        const summary = await services.researchService.getDatasetSummary();
        return res.json({
          success: true,
          totalRecords: summary.totalRecords,
          totalTrials: summary.totalTrials,
          counts: summary.counts
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg === 'DATABASE_UNAVAILABLE') {
          return res.status(503).json({ success: false, error: 'Database service unavailable' });
        }
        return res.status(500).json({ success: false, error: 'Failed to aggregate dataset summary' });
      }
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to generate dataset summary' });
    }
  });
}
