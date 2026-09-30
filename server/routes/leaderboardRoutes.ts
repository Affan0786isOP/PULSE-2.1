import type express from 'express';
import type { Express } from 'express';
import { verifyFirebaseUserToken } from '../middleware/auth';
import { safeCompareHex, signProvenancePayload } from '../services/provenanceService';
import type { ILeaderboardService } from '../services/interfaces/ILeaderboardService';
import { LeaderboardAlreadySubmittedError, AppError } from '../models/replayContracts';

export function registerLeaderboardRoutes(
  app: Express,
  services?: {
    leaderboardService: ILeaderboardService;
  }
): void {
  // Authoritative Leaderboard Submission
  app.post('/api/leaderboard/submit', async (req, res) => {
    try {
      const verifiedUser = await verifyFirebaseUserToken(req);
      if (!verifiedUser) {
        return res.status(401).json({ success: false, error: 'Authentication required: missing or invalid Firebase ID token' });
      }

      const { displayName, assessmentType, ageGroup, userId, trials, sessionId, idempotencyKey } = req.body || {};

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

      if (userId && typeof userId === 'string' && userId.trim() !== verifiedUser.uid) {
        return res.status(403).json({ success: false, error: 'Participant identity mismatch with authenticated user' });
      }

      if (!services?.leaderboardService) {
        // Initial session read was skipped -> returns 404 matching baseline
        return res.status(404).json({ success: false, error: 'Experiment session not found' });
      }

      try {
        const result = await services.leaderboardService.submitLeaderboard({
          sessionId: activeSessionId,
          userId: verifiedUser.uid,
          displayName,
          assessmentType,
          ageGroup,
          trials: Array.isArray(trials) ? trials : [],
          idempotencyKey: validIdempKey
        });

        return res.json({
          success: true,
          ...result
        });
      } catch (submitErr: unknown) {
        if (submitErr instanceof LeaderboardAlreadySubmittedError) {
          const sData = submitErr.sessionData;
          if (sData && sData.leaderboardDocId) {
            return res.json({
              success: true,
              docId: sData.leaderboardDocId,
              scoreMetric: sData.scoreMetric,
              provenanceToken: sData.provenanceToken,
              trialsDigest: sData.trialsDigest,
              derivedMetrics: sData.derivedMetrics,
              alreadySubmitted: true
            });
          }
          return res.status(400).json({ success: false, error: 'Leaderboard score has already been submitted for this session' });
        }

        const errMsg = submitErr instanceof Error ? submitErr.message : String(submitErr);
        const errStatus = submitErr instanceof AppError ? submitErr.status : undefined;

        if (errMsg === 'DATABASE_UNAVAILABLE') {
          return res.status(404).json({ success: false, error: 'Experiment session not found' });
        }
        if (errMsg === 'Failed to read experiment session from database') {
          return res.status(500).json({ success: false, error: errMsg });
        }
        if (errStatus === 400 || errStatus === 403 || errStatus === 404) {
          return res.status(errStatus).json({ success: false, error: errMsg });
        }

        return res.status(500).json({ success: false, error: 'Failed to persist leaderboard result in database' });
      }
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to persist leaderboard result in database' });
    }
  });

  // Verification helper for audits
  app.post('/api/leaderboard/verify-provenance', (req, res) => {
    const { assessmentType, ageGroup, scoreMetric, displayName, trialsDigest, provenanceToken } = req.body || {};
    if (!provenanceToken || typeof provenanceToken !== 'string' || typeof scoreMetric !== 'number') {
      return res.json({ verified: false, reason: 'Missing parameters' });
    }
    const tokenData = `lb:${assessmentType}:${ageGroup}:${scoreMetric.toFixed(2)}:${(displayName || '').trim()}:${trialsDigest || ''}`;
    const expected = signProvenancePayload(tokenData);
    return res.json({ verified: safeCompareHex(expected, provenanceToken) });
  });

  // Public Leaderboard Retrieval Endpoint
  app.get('/api/leaderboard', async (req, res) => {
    try {
      const rawType = typeof req.query.assessmentType === 'string' ? req.query.assessmentType.trim() : null;

      if (!services?.leaderboardService) {
        return res.json({ success: true, entries: [] });
      }

      try {
        const entries = await services.leaderboardService.getPublicLeaderboard(rawType);
        return res.json({
          success: true,
          entries
        });
      } catch {
        return res.json({
          success: true,
          entries: []
        });
      }
    } catch {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve leaderboard',
        entries: []
      });
    }
  });
}
