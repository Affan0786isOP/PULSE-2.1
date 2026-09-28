import type express from 'express';
import type { Express } from 'express';
import * as crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getAdminDiagnosticMessage } from '../config/firebaseAdmin';
import { adminLoginLimiter } from '../config/rateLimits';
import { getAdminPasscode, createAdminSessionToken, verifyAdminSession } from '../middleware/auth';
import { normalizeAssessmentType } from '../engines/assessmentTypes';

export function registerAdminRoutes(app: Express): void {
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
    } catch (err) {
      console.error('[Admin Login API] Error:', err instanceof Error ? err.message : String(err));
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

      // Authoritative identity and timestamp determination
      const actor = 'admin';
      const timestamp = new Date().toISOString();
      const cleanAction = action.trim();
      const cleanTarget = target.trim();
      const cleanNote = (typeof note === 'string') ? note.trim() : '';

      const logId = `log-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;

      const auditDoc = {
        actor,
        action: cleanAction,
        target: cleanTarget,
        timestamp,
        note: cleanNote
      };

      const db = getAdminDb();
      if (!db) {
        return res.status(503).json({ success: false, error: 'Database service unavailable' });
      }

      try {
        await db.collection('adminAuditLogs').doc(logId).set(auditDoc);
      } catch (dbErr: any) {
        console.error('[Admin Audit Log API] Firestore write failed:', dbErr instanceof Error ? dbErr.message : String(dbErr));
        return res.status(500).json({ success: false, error: 'Failed to persist audit log' });
      }

      return res.json({
        success: true,
        log: {
          id: logId,
          ...auditDoc
        }
      });
    } catch (err: unknown) {
      console.error('[Admin Audit Log API] Error:', err instanceof Error ? err.message : String(err));
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

      const db = getAdminDb();
      if (db) {
        try {
          const docRef = db.collection('leaderboardResults').doc(id);
          const snap = await docRef.get();
          if (snap.exists) {
            await docRef.update({ hidden: true, hiddenAt: Date.now(), hiddenBy: 'admin', hideReason: reason || '' });
          }

          await db.collection('adminAuditLogs').add({
            actor: 'admin',
            action: 'HIDE_LEADERBOARD_ENTRY',
            target: id,
            note: reason || 'Soft-hide by admin',
            timestamp: Date.now()
          });
        } catch (dbErr: any) {
          console.error('[Admin Hide API] Firestore sync failed:', dbErr instanceof Error ? dbErr.message : String(dbErr));
        }
      }

      return res.json({ success: true, message: 'Leaderboard entry hidden successfully' });
    } catch (err) {
      console.error("[Admin Hide API] Error:", err instanceof Error ? err.message : String(err));
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

      const db = getAdminDb();
      if (db) {
        try {
          const docRef = db.collection('leaderboardResults').doc(id);
          const snap = await docRef.get();
          if (snap.exists) {
            await docRef.delete();
          }

          await db.collection('adminAuditLogs').add({
            actor: 'admin',
            action: 'DELETE_LEADERBOARD_ENTRY',
            target: id,
            note: reason || 'Permanently deleted by admin',
            timestamp: Date.now()
          });
        } catch (dbErr: any) {
          console.error('[Admin Delete API] Firestore sync failed:', dbErr instanceof Error ? dbErr.message : String(dbErr));
        }
      }

      return res.json({ success: true, message: 'Leaderboard entry deleted permanently' });
    } catch (err) {
      console.error("[Admin Delete API] Error:", err instanceof Error ? err.message : String(err));
      return res.status(500).json({ success: false, error: 'Failed to delete leaderboard entry' });
    }
  });

  // Authoritative Admin Audit Logs Retrieval
  app.get('/api/admin/audit-logs', async (req, res) => {
    try {
      if (!verifyAdminSession(req)) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin session required', logs: [] });
      }
      const db = getAdminDb();
      if (!db) {
        return res.status(503).json({ success: false, error: 'Database service unavailable', logs: [] });
      }
      const snap = await db.collection('adminAuditLogs').orderBy('timestamp', 'desc').limit(200).get();
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.json({ success: true, logs });
    } catch (err) {
      console.error('[Admin Audit Logs API] Error:', err instanceof Error ? err.message : String(err));
      return res.status(500).json({ success: false, error: 'Failed to retrieve admin audit logs', logs: [] });
    }
  });

  // Authoritative Admin Leaderboard Retrieval (Includes Hidden Entries)
  app.get('/api/admin/leaderboard/all', async (req, res) => {
    try {
      if (!verifyAdminSession(req)) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Valid admin session required', entries: [] });
      }
      const db = getAdminDb();
      if (!db) {
        return res.status(503).json({ success: false, error: 'Database service unavailable', entries: [] });
      }
      const snap = await db.collection('leaderboardResults').orderBy('createdAt', 'desc').limit(500).get();
      const entries = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : (Number(data.createdAt) || Date.now())
        };
      });
      return res.json({ success: true, entries });
    } catch (err) {
      console.error('[Admin Leaderboard API] Error:', err instanceof Error ? err.message : String(err));
      return res.status(500).json({ success: false, error: 'Failed to retrieve admin leaderboard entries', entries: [] });
    }
  });

}
