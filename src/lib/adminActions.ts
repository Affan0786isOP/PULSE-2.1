/**
 * PULSE Admin Actions & Security Specification
 * ==============================================================================
 * SPECIFICATION FOR ADMIN SECURITY & MODERATION:
 * 
 * 1. Admin Authentication & Authorization:
 *    - Validated in Firestore Security Rules via verified admin email 
 *      (`request.auth.token.email == 'admin@pulse-research.org'`) or custom user claim
 *      (`request.auth.token.role == 'admin'`).
 * 
 * 2. Moderation: `hideLeaderboardEntry(id, reason, actorEmail)`
 *    - Performs a soft-delete write by updating `leaderboardResults/{id}` with `hidden: true`
 *      (or removing the document) using authenticated admin permissions.
 * 
 * 3. Firestore Rules for `adminAuditLogs` Collection:
 *    - Keeps audit history immutable and restricted to authorized administrators.
 * ==============================================================================
 */

import { getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { db, auth, isConfigured } from './firebase';

export interface AdminAuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string | number;
  note?: string;
}

export async function fetchAllAdminLeaderboard() {
  if (!isConfigured || !db) return [];
  const colRef = collection(db, 'leaderboardResults');
  // Admins can list all items, bypassing the backend 100-item limit.
  // We'll limit to a high number to avoid crashing the browser, e.g., 5000.
  const q = query(colRef, orderBy('createdAt', 'desc'), limit(5000));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Moderation Action: Hide a Leaderboard entry (Soft-Delete).
 * Dispatches through server-side administrative endpoint with verified credentials.
 * Throws on failure.
 */
export async function hideLeaderboardEntry(id: string, reason: string, _actorEmail?: string): Promise<void> {
  const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  if (!idToken) {
    throw new Error('Authentication required for administrative moderation.');
  }

  const res = await fetch('/api/admin/leaderboard/hide', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ id, reason })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server failed to hide leaderboard entry (${res.status})`);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pulse_admin_audit_log_added'));
  }
}

/**
 * Explicit Administrative Action: Permanently Delete a Leaderboard entry.
 * Dispatches through server-side administrative endpoint with verified credentials.
 * Throws on failure.
 */
export async function deleteLeaderboardEntryPermanently(id: string, reason: string, _actorEmail?: string): Promise<void> {
  const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  if (!idToken) {
    throw new Error('Authentication required for administrative deletion.');
  }

  const res = await fetch('/api/admin/leaderboard/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ id, reason })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server failed to delete leaderboard entry (${res.status})`);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pulse_admin_audit_log_added'));
  }
}

/**
 * Log an administrative action to the audit trail.
 * Authoritative persistence via server endpoint directly to adminAuditLogs.
 * Fails strictly if database persistence fails.
 */
export async function logAdminAction(
  action: string,
  target: string,
  note?: string,
  _actor?: string
): Promise<AdminAuditLog> {
  const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  if (!idToken) {
    throw new Error('Authentication required to record administrative audit log.');
  }

  const res = await fetch('/api/admin/audit-log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({
      action,
      target,
      note
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to record audit log: HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!data.success || !data.log) {
    throw new Error(data.error || 'Failed to record audit log');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pulse_admin_audit_log_added', { detail: data.log }));
  }

  return data.log;
}

/**
 * Fetch all administrative audit logs directly from authoritative Firestore adminAuditLogs.
 */
export async function fetchAdminAuditLogs(): Promise<AdminAuditLog[]> {
  if (!isConfigured || !db) {
    return [];
  }

  const q = query(collection(db, 'adminAuditLogs'), orderBy('timestamp', 'desc'), limit(200));
  const snap = await getDocs(q);
  const cloudLogs: AdminAuditLog[] = [];
  snap.forEach(docSnap => {
    const data = docSnap.data();
    cloudLogs.push({
      id: docSnap.id,
      actor: data.actor || 'admin',
      action: data.action || 'UNKNOWN',
      target: data.target || '',
      timestamp: data.timestamp || '',
      note: data.note
    });
  });

  return cloudLogs;
}
