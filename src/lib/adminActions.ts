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
  try {
    const token = getAdminToken();
    const res = await fetch('/api/admin/audit-logs', {
      headers: {
        'x-admin-token': token,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      console.warn(`Failed to fetch admin audit logs: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    return (data.logs || []) as AdminAuditLog[];
  } catch (err) {
    console.warn('Failed to fetch admin audit logs:', err);
    return [];
  }
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
  try {
    const token = getAdminToken();
    const res = await fetch('/api/admin/leaderboard/all', {
      headers: {
        'x-admin-token': token,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      console.warn(`Failed to fetch admin leaderboard: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    return (data.entries || []) as LeaderboardEntry[];
  } catch (err) {
    console.warn('Failed to fetch all leaderboard entries for admin:', err);
    return [];
  }
}
