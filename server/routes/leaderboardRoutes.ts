import type express from 'express';
import type { Express } from 'express';
import { verifyFirebaseUserToken } from '../middleware/auth';

import type { ILeaderboardService } from '../services/interfaces/ILeaderboardService';
import { LeaderboardAlreadySubmittedError, AppError } from '../models/replayContracts';

export function registerLeaderboardRoutes(
  app: Express,
  services: {
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
              // Return the attempt-specific leaderboard submission metadata.
              // Legacy fallbacks keep pre-migration sessions replayable.
              docId: sData.leaderboardSubmissionId || sData.leaderboardDocId,
              leaderboardDocId: sData.leaderboardDocId,
              scoreMetric: sData.leaderboardSubmissionScoreMetric ?? sData.scoreMetric,
              provenanceToken: sData.leaderboardSubmissionProvenanceToken || sData.provenanceToken,
              trialsDigest: sData.leaderboardSubmissionTrialsDigest || sData.trialsDigest,
              derivedMetrics: sData.leaderboardSubmissionDerivedMetrics || sData.derivedMetrics,
              alreadySubmitted: true
            });
          }
          return res.status(400).json({ success: false, error: 'Leaderboard score has already been submitted for this session' });
        }

        const errMsg = submitErr instanceof Error ? submitErr.message : String(submitErr);
        const errStatus = submitErr instanceof AppError ? submitErr.status : undefined;

        if (errMsg === 'DATABASE_UNAVAILABLE') {
          return res.status(503).json({ success: false, error: 'Database service unavailable' });
        }
        if (errStatus === 400 || errStatus === 403 || errStatus === 404) {
          return res.status(errStatus).json({ success: false, error: errMsg });
        }

        const errorCode = (submitErr as { code?: unknown } | null)?.code;
        if (
          errStatus === 503 ||
          errorCode === 10 ||
          errorCode === '10' ||
          errorCode === 'ABORTED' ||
          errMsg.includes('ABORTED') ||
          errMsg.includes('DATABASE_UNAVAILABLE')
        ) {
          return res.status(503).json({ success: false, error: 'Leaderboard submission service temporarily unavailable. Please retry.' });
        }

        return res.status(500).json({ success: false, error: 'Failed to persist leaderboard result in database' });
      }
    } catch (err: unknown) {
      const status = err instanceof AppError ? err.status : 500;
      if (status === 503) {
        return res.status(503).json({ success: false, error: 'Authentication or leaderboard service temporarily unavailable' });
      }
      return res.status(500).json({ success: false, error: 'Failed to persist leaderboard result in database' });
    }
  });

  // Verification is bound to a real stored row and its current visibility.
  app.post('/api/leaderboard/verify-provenance', async (req, res) => {
    const entryId = typeof req.body?.entryId === 'string' ? req.body.entryId.trim() : '';
    if (!entryId) {
      return res.status(400).json({ verified: false, reason: 'entryId is required' });
    }
    try {
      if (!services.leaderboardService.verifyPublicEntryProvenance) {
        return res.status(503).json({ verified: false, reason: 'Provenance verification is unavailable' });
      }
      const result = await services.leaderboardService.verifyPublicEntryProvenance(entryId);
      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = err instanceof AppError ? err.status : (message === 'DATABASE_UNAVAILABLE' ? 503 : 500);
      return res.status(status).json({
        verified: false,
        reason: status === 400 ? message : status === 503 ? 'Provenance verification is unavailable' : 'Failed to verify leaderboard provenance'
      });
    }
  });

  // Authenticated participant-only rank lookup. This searches the full eligible board,
  // not just the public top 100, and never returns the private owner UID.
  app.get('/api/leaderboard/my-rank', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
      const user = await verifyFirebaseUserToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required', rank: null });
      }
      const assessmentType = typeof req.query.assessmentType === 'string' ? req.query.assessmentType.trim() : '';
      if (!assessmentType) {
        return res.status(400).json({ success: false, error: 'assessmentType query parameter is required', rank: null });
      }
      if (!services.leaderboardService.getMyLeaderboardRank) {
        return res.status(503).json({ success: false, error: 'Rank lookup is unavailable', rank: null });
      }
      const result = await services.leaderboardService.getMyLeaderboardRank(user.uid, assessmentType);
      return res.json({ success: true, ...result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = err instanceof AppError ? err.status : (message === 'DATABASE_UNAVAILABLE' ? 503 : 500);
      return res.status(status).json({
        success: false,
        error: status === 400 ? message : status === 503 ? 'Rank lookup is temporarily unavailable' : 'Failed to retrieve participant rank',
        rank: null
      });
    }
  });

  // Participant erasure: assessmentType must be a canonical ID or the explicit value "all".
  // Only rows linked to this authenticated UID (including safely migrated legacy rows) are deleted.
  app.delete('/api/leaderboard/mine', async (req, res) => {
    try {
      const user = await verifyFirebaseUserToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required', deletedCount: 0 });
      }
      const assessmentType = typeof req.query.assessmentType === 'string' ? req.query.assessmentType.trim() : '';
      if (!assessmentType) {
        return res.status(400).json({ success: false, error: 'assessmentType is required; use a canonical ID or all', deletedCount: 0 });
      }
      if (!services.leaderboardService.deleteMyLeaderboardEntries) {
        return res.status(503).json({ success: false, error: 'Participant removal is unavailable', deletedCount: 0 });
      }
      const result = await services.leaderboardService.deleteMyLeaderboardEntries(
        user.uid,
        assessmentType === 'all' ? null : assessmentType
      );
      return res.json({ success: true, deletedCount: result.deletedCount });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = err instanceof AppError ? err.status : (message === 'DATABASE_UNAVAILABLE' ? 503 : 500);
      return res.status(status).json({
        success: false,
        error: status === 400 ? message : status === 503 ? 'Participant removal is temporarily unavailable' : status === 409 ? message : 'Failed to remove participant leaderboard entries',
        deletedCount: 0
      });
    }
  });

  // Public Leaderboard Retrieval Endpoint
  app.get('/api/leaderboard', async (req, res) => {
    // Do not let browser, proxy or CDN caches make laptop and phone surfaces disagree.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    const rawType = typeof req.query.assessmentType === 'string' ? req.query.assessmentType.trim() : '';
    if (!rawType) {
      return res.status(400).json({ success: false, error: 'assessmentType query parameter is required', entries: [] });
    }

    const rawLimit = req.query.limit;
    const limitCount = rawLimit === undefined ? 100 : Number(rawLimit);
    if (!Number.isInteger(limitCount) || limitCount < 1 || limitCount > 100) {
      return res.status(400).json({ success: false, error: 'limit must be an integer between 1 and 100', entries: [] });
    }

    try {
      const entries = await services.leaderboardService.getPublicLeaderboard(rawType);
      return res.json({ success: true, entries: entries.slice(0, limitCount) });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const status = err instanceof AppError ? err.status : (errMsg === 'DATABASE_UNAVAILABLE' ? 503 : 500);
      const error = status === 400 ? errMsg :
        status === 503 ? 'Leaderboard service unavailable. Please retry.' :
        'Failed to retrieve leaderboard';
      return res.status(status).json({ success: false, error, entries: [] });
    }
  });
}
