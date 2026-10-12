import { LeaderboardEntry } from './firestore';

export interface AdminAuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string | number;
  note?: string;
}

function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem('pulse_admin_token') || '';
}

export async function fetchAdminAuditLogs(): Promise<AdminAuditLog[]> {
  const token = getAdminToken();
  const res = await fetch('/api/admin/audit-logs', {
    headers: {
      'x-admin-token': token,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Failed to fetch admin audit logs (${res.status})`);
  }
  return (data.logs || []) as AdminAuditLog[];
}

export async function hideLeaderboardEntry(id: string, reason: string, _adminEmail?: string): Promise<void> {
  const token = getAdminToken();
  const res = await fetch('/api/admin/leaderboard/hide', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ id, reason }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Failed to hide leaderboard entry' }));
    throw new Error(errData.error || `Server returned ${res.status}`);
  }
}

export async function unhideLeaderboardEntry(id: string, reason: string, _adminEmail?: string): Promise<void> {
  const token = getAdminToken();
  const res = await fetch('/api/admin/leaderboard/unhide', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ id, reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Failed to restore leaderboard entry (${res.status})`);
  }
}

export async function deleteLeaderboardEntryPermanently(id: string, reason: string, _adminEmail?: string): Promise<void> {
  const token = getAdminToken();
  const res = await fetch('/api/admin/leaderboard/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ id, reason }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Failed to delete leaderboard entry' }));
    throw new Error(errData.error || `Server returned ${res.status}`);
  }
}

export async function fetchAllAdminLeaderboard(): Promise<LeaderboardEntry[]> {
  const token = getAdminToken();
  const res = await fetch('/api/admin/leaderboard/all', {
    headers: {
      'x-admin-token': token,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Failed to fetch admin leaderboard (${res.status})`);
  }
  return (data.entries || []) as LeaderboardEntry[];
}
