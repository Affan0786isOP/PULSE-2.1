import type express from 'express';
import type { Express } from 'express';
import * as crypto from 'crypto';
import { adminLoginLimiter } from '../config/rateLimits';
import { getAdminPasscode, createAdminSessionToken, verifyAdminSession } from '../middleware/auth';
import type { IAdminService } from '../services/interfaces/IAdminService';

export function registerAdminRoutes(
  app: Express,
  services: {
    adminService: IAdminService;
  }
): void {
  // Admin Login Endpoint (Email-Free Master Passcode)
  app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
    try {
      const { passcode } = req.body || {};
      if (!passcode || typeof passcode !== 'string') {
        return res.status(400).json({ success: false, error: 'Admin passcode is required' });
      }

      const configuredPasscode = getAdminPasscode();
      const inputBuf = Buffer.from(passcode.trim(), 'utf8');
      const targetBuf = Buffer.from(configuredPasscode.trim(), 'utf8');

      // Constant-time comparison to prevent timing attacks
      const isValid = inputBuf.length === targetBuf.length && crypto.timingSafeEqual(inputBuf, targetBuf);

      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid admin passcode' });
      }

      const session = createAdminSessionToken();
      return res.json({
        success: true,
        token: session.token,
        expiresAt: session.expiresAt
      });
    } catch {
      return res.status(500).json({ success: false, error: 'Admin authentication failed' });
    }
  });

  // Authoritative Admin Audit Log Creation
  const handleAdminAuditLog = async (req: express.Request, res: express.Response) => {
    try {
      if (!verifyAdminSession(req)) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin session required' });
      }

      const { action, target, note } = req.body || {};

      if (!action || typeof action !== 'string' || !action.trim()) {
        return res.status(400).json({ success: false, error: 'Invalid or missing action field' });
      }

      if (!target || typeof target !== 'string' || !target.trim()) {
        return res.status(400).json({ success: false, error: 'Invalid or missing target field' });
      }

      const actor = 'admin';
      const timestamp = new Date().toISOString();
      const cleanAction = action.trim();
      const cleanTarget = target.trim();
      const cleanNote = (typeof note === 'string') ? note.trim() : '';

      if (!services.adminService) {
        return res.status(503).json({ success: false, error: 'Database service unavailable' });
      }

      try {
        const log = await services.adminService.recordAuditLog({
          actor,
          action: cleanAction,
          target: cleanTarget,
          timestamp,
          note: cleanNote
        });

        return res.json({
          success: true,
          log
        });
      } catch (dbErr: unknown) {
        const errMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
        if (errMsg === 'DATABASE_UNAVAILABLE') {
          return res.status(503).json({ success: false, error: 'Database service unavailable' });
        }
        return res.status(500).json({ success: false, error: 'Failed to persist audit log' });
      }
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to record admin audit log' });
    }
  };

  app.post('/api/admin/audit-log', handleAdminAuditLog);
  app.post('/api/admin/log-action', handleAdminAuditLog);

  // Admin Moderation: Soft-Hide Leaderboard Entry
  app.post('/api/admin/leaderboard/hide', async (req, res) => {
    try {
      if (!verifyAdminSession(req)) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin session required' });
      }
      const { id, reason } = req.body || {};
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing or invalid entry id' });
      }

      if (services.adminService) {
        await services.adminService.hideLeaderboardEntry(id, reason);
      }

      return res.json({ success: true, message: 'Leaderboard entry hidden successfully' });
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to hide leaderboard entry' });
    }
  });

  // Admin Moderation: Hard-Delete Leaderboard Entry
  app.post('/api/admin/leaderboard/delete', async (req, res) => {
    try {
      if (!verifyAdminSession(req)) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin session required' });
      }
      const { id, reason } = req.body || {};
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing or invalid entry id' });
      }

      if (services.adminService) {
        await services.adminService.deleteLeaderboardEntry(id, reason);
      }

      return res.json({ success: true, message: 'Leaderboard entry deleted permanently' });
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to delete leaderboard entry' });
    }
  });

  // Authoritative Admin Audit Logs Retrieval
  app.get('/api/admin/audit-logs', async (req, res) => {
    try {
      if (!verifyAdminSession(req)) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin session required', logs: [] });
      }
      if (!services.adminService) {
        return res.status(503).json({ success: false, error: 'Database service unavailable', logs: [] });
      }
      try {
        const logs = await services.adminService.getAuditLogs(200);
        return res.json({ success: true, logs });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg === 'DATABASE_UNAVAILABLE') {
          return res.status(503).json({ success: false, error: 'Database service unavailable', logs: [] });
        }
        return res.status(500).json({ success: false, error: 'Failed to retrieve admin audit logs', logs: [] });
      }
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to retrieve admin audit logs', logs: [] });
    }
  });

  // Authoritative Admin Leaderboard Retrieval
  app.get('/api/admin/leaderboard/all', async (req, res) => {
    try {
      if (!verifyAdminSession(req)) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin session required', entries: [] });
      }
      if (!services.adminService) {
        return res.status(503).json({ success: false, error: 'Database service unavailable', entries: [] });
      }
      try {
        const entries = await services.adminService.getAllLeaderboardEntries(500);
        return res.json({ success: true, entries });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg === 'DATABASE_UNAVAILABLE') {
          return res.status(503).json({ success: false, error: 'Database service unavailable', entries: [] });
        }
        return res.status(500).json({ success: false, error: 'Failed to retrieve admin leaderboard entries', entries: [] });
      }
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to retrieve admin leaderboard entries', entries: [] });
    }
  });
}
