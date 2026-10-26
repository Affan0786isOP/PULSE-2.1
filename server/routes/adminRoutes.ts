import type express from 'express';
import type { Express } from 'express';
import type { IAdminService } from '../services/interfaces/IAdminService';
import {
  validateAdminPasscode,
  createAdminToken,
  revokeAdminTokenNonce,
  verifyAdminSessionToken,
  parseAndValidateTokenClaims
} from '../middleware/adminAuth';
import { AppError } from '../models/replayContracts';

export interface AdminRoutesDependencies {
  adminService: IAdminService;
  invalidateLeaderboardCache?: (assessmentType?: string | null) => void;
  verifySession?: (req: express.Request) => Promise<{ authorized: boolean; errorStatus?: number; errorMsg?: string }>;
  revokeToken?: (token: string) => Promise<boolean>;
  validatePass?: (passcode: string) => boolean;
  createToken?: () => string;
}

export function registerAdminRoutes(app: Express, deps: AdminRoutesDependencies): void {
  const verifySession = deps.verifySession ?? (req => verifyAdminSessionToken(req));
  const revokeToken = deps.revokeToken ?? (token => revokeAdminTokenNonce(token));
  const validatePass = deps.validatePass ?? (passcode => validateAdminPasscode(passcode));
  const createToken = deps.createToken ?? (() => createAdminToken());
  const invalidateLeaderboardCache = deps.invalidateLeaderboardCache ?? (() => {});

  // Universal No-Store middleware for all /api/admin/* endpoints
  const applyNoStoreHeaders = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  };

  // Auth Guard middleware
  const requireAdminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authResult = await verifySession(req);
      if (!authResult.authorized) {
        return res.status(authResult.errorStatus || 401).json({
          success: false,
          error: authResult.errorMsg || 'Admin authentication required'
        });
      }
      next();
    } catch (err: unknown) {
      const status = err instanceof AppError ? err.status : 503;
      return res.status(status).json({
        success: false,
        error: 'Admin authentication service is temporarily unavailable'
      });
    }
  };

  // 1. POST /api/admin/login
  app.post('/api/admin/login', applyNoStoreHeaders, async (req, res) => {
    try {
      const { passcode } = req.body || {};
      if (!passcode || typeof passcode !== 'string') {
        return res.status(400).json({ success: false, error: 'Passcode is required and must be a string' });
      }

      let isValid = false;
      try {
        isValid = validatePass(passcode);
      } catch (passErr: unknown) {
        return res.status(503).json({
          success: false,
          error: passErr instanceof Error ? passErr.message : 'Passcode validation error'
        });
      }

      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid admin passcode' });
      }

      let token: string;
      try {
        token = createToken();
      } catch (tokErr: unknown) {
        return res.status(503).json({
          success: false,
          error: tokErr instanceof Error ? tokErr.message : 'Token creation error'
        });
      }

      return res.json({ success: true, token });
    } catch (err: unknown) {
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal login error'
      });
    }
  });

  // 2. POST /api/admin/logout
  // Must be idempotent: validating token signature/claims and revoking nonce in Firestore.
  // Repeated requests with the same token return 200 idempotently.
  app.post('/api/admin/logout', applyNoStoreHeaders, async (req, res) => {
    try {
      const token = (req.headers['x-admin-token'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '')) as string;
      if (!token) {
        return res.status(400).json({ success: false, error: 'Missing admin token' });
      }

      const parsed = parseAndValidateTokenClaims(token);
      if (!parsed.valid) {
        return res.status(401).json({ success: false, error: parsed.reason || 'Invalid admin token' });
      }

      await revokeToken(token);
      return res.json({ success: true });
    } catch (err: unknown) {
      const status = err instanceof AppError ? err.status : 503;
      return res.status(status).json({
        success: false,
        error: 'Failed to revoke admin session'
      });
    }
  });

  // 3. GET /api/admin/leaderboard/all
  app.get('/api/admin/leaderboard/all', applyNoStoreHeaders, requireAdminAuth, async (req, res) => {
    try {
      const rawLimit = req.query.limit;
      const limit = rawLimit !== undefined ? Number(rawLimit) : 100;
      if (rawLimit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 250)) {
        return res.status(400).json({ success: false, error: 'limit must be an integer between 1 and 250' });
      }

      const cursor = typeof req.query.cursor === 'string' && req.query.cursor.trim() ? req.query.cursor.trim() : null;
      const assessmentType = typeof req.query.assessmentType === 'string' && req.query.assessmentType.trim() ? req.query.assessmentType.trim() : null;
      const prefix = typeof req.query.prefix === 'string' && req.query.prefix.trim() ? req.query.prefix.trim() : null;

      const page = await deps.adminService.getLeaderboardPage({
        limit,
        cursor,
        assessmentType,
        prefix
      });

      return res.json(page);
    } catch (err: unknown) {
      const status = err instanceof AppError ? err.status : 500;
      return res.status(status).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve admin leaderboard entries'
      });
    }
  });

  // 4. POST /api/admin/leaderboard/edit-alias
  app.post('/api/admin/leaderboard/edit-alias', applyNoStoreHeaders, requireAdminAuth, async (req, res) => {
    try {
      const { id, displayName, reason } = req.body || {};
      if (!id || typeof id !== 'string' || !id.trim()) {
        return res.status(400).json({ success: false, error: 'Entry ID is required' });
      }
      if (displayName === undefined || typeof displayName !== 'string') {
        return res.status(400).json({ success: false, error: 'Display name is required' });
      }

      const result = await deps.adminService.editLeaderboardAlias({
        id: id.trim(),
        displayName,
        reason: typeof reason === 'string' ? reason.trim() : undefined
      });

      invalidateLeaderboardCache(null);

      return res.json(result);
    } catch (err: unknown) {
      const status = err instanceof AppError ? err.status : 500;
      return res.status(status).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to edit leaderboard alias'
      });
    }
  });

  // 5. POST /api/admin/leaderboard/hide
  app.post('/api/admin/leaderboard/hide', applyNoStoreHeaders, requireAdminAuth, async (req, res) => {
    try {
      const { id, reason } = req.body || {};
      if (!id || typeof id !== 'string' || !id.trim()) {
        return res.status(400).json({ success: false, error: 'Entry ID is required' });
      }

      const result = await deps.adminService.hideLeaderboardEntry(
        id.trim(),
        typeof reason === 'string' ? reason.trim() : undefined
      );

      invalidateLeaderboardCache(null);

      return res.json(result);
    } catch (err: unknown) {
      const status = err instanceof AppError ? err.status : 500;
      return res.status(status).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to hide leaderboard entry'
      });
    }
  });

  // 6. POST /api/admin/leaderboard/unhide
  app.post('/api/admin/leaderboard/unhide', applyNoStoreHeaders, requireAdminAuth, async (req, res) => {
    try {
      const { id, reason } = req.body || {};
      if (!id || typeof id !== 'string' || !id.trim()) {
        return res.status(400).json({ success: false, error: 'Entry ID is required' });
      }

      const result = await deps.adminService.unhideLeaderboardEntry(
        id.trim(),
        typeof reason === 'string' ? reason.trim() : undefined
      );

      invalidateLeaderboardCache(null);

      return res.json(result);
    } catch (err: unknown) {
      const status = err instanceof AppError ? err.status : 500;
      return res.status(status).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to unhide leaderboard entry'
      });
    }
  });

  // 7. POST /api/admin/leaderboard/delete
  app.post('/api/admin/leaderboard/delete', applyNoStoreHeaders, requireAdminAuth, async (req, res) => {
    try {
      const { id, reason } = req.body || {};
      if (!id || typeof id !== 'string' || !id.trim()) {
        return res.status(400).json({ success: false, error: 'Entry ID is required' });
      }

      const result = await deps.adminService.deleteLeaderboardEntry(
        id.trim(),
        typeof reason === 'string' ? reason.trim() : undefined
      );

      invalidateLeaderboardCache(null);

      return res.json(result);
    } catch (err: unknown) {
      const status = err instanceof AppError ? err.status : 500;
      return res.status(status).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete leaderboard entry'
      });
    }
  });
}
