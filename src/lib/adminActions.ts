import type {
  AdminLeaderboardDTO,
  AdminLeaderboardPageResponse,
  UpdateAliasInput
} from '../../server/models/adminModels';

export class AdminApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'AdminApiError';
  }
}

function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem('pulse_admin_token') || localStorage.getItem('pulse_admin_token');
  } catch {
    return null;
  }
}

export function setStoredToken(token: string, persist: boolean = false): void {
  try {
    sessionStorage.setItem('pulse_admin_token', token);
    if (persist) {
      localStorage.setItem('pulse_admin_token', token);
    }
  } catch {
    // Ignore storage quota or access issues
  }
}

export function clearStoredToken(): void {
  try {
    sessionStorage.removeItem('pulse_admin_token');
    localStorage.removeItem('pulse_admin_token');
  } catch {
    // Ignore storage issues
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  tokenOverride?: string
): Promise<T> {
  const token = tokenOverride ?? getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('x-admin-token', token);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    cache: 'no-store'
  });

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    // non-json response
  }

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    throw new AdminApiError(errorMsg, response.status);
  }

  return data as T;
}

export async function adminLogin(passcode: string): Promise<{ success: boolean; token: string }> {
  const res = await request<{ success: boolean; token: string }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ passcode })
  });
  if (res.token) {
    setStoredToken(res.token);
  }
  return res;
}

export async function adminLogout(): Promise<{ success: boolean }> {
  try {
    await request<{ success: boolean }>('/api/admin/logout', {
      method: 'POST'
    });
  } finally {
    clearStoredToken();
  }
  return { success: true };
}

export interface FetchAdminLeaderboardParams {
  limit?: number;
  cursor?: string | null;
  assessmentType?: string | null;
  prefix?: string | null;
}

export async function fetchAdminLeaderboardPage(
  params: FetchAdminLeaderboardParams = {}
): Promise<AdminLeaderboardPageResponse> {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.assessmentType && params.assessmentType !== 'all') query.set('assessmentType', params.assessmentType);
  if (params.prefix) query.set('prefix', params.prefix);

  const url = `/api/admin/leaderboard/all${query.toString() ? `?${query.toString()}` : ''}`;
  return request<AdminLeaderboardPageResponse>(url, { method: 'GET' });
}

export async function updateLeaderboardAlias(
  input: UpdateAliasInput
): Promise<{ success: boolean; entry: AdminLeaderboardDTO }> {
  return request<{ success: boolean; entry: AdminLeaderboardDTO }>('/api/admin/leaderboard/edit-alias', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function hideLeaderboardEntry(
  id: string,
  reason?: string
): Promise<{ success: boolean; found: boolean; alreadyInState?: boolean }> {
  return request<{ success: boolean; found: boolean; alreadyInState?: boolean }>('/api/admin/leaderboard/hide', {
    method: 'POST',
    body: JSON.stringify({ id, reason })
  });
}

export async function unhideLeaderboardEntry(
  id: string,
  reason?: string
): Promise<{
  success: boolean;
  found: boolean;
  alreadyInState?: boolean;
  notBest?: boolean;
  erasureInProgress?: boolean;
  retainedEntryId?: string;
}> {
  return request<{
    success: boolean;
    found: boolean;
    alreadyInState?: boolean;
    notBest?: boolean;
    erasureInProgress?: boolean;
    retainedEntryId?: string;
  }>('/api/admin/leaderboard/unhide', {
    method: 'POST',
    body: JSON.stringify({ id, reason })
  });
}

export async function deleteLeaderboardEntry(
  id: string,
  reason?: string
): Promise<{ success: boolean; found: boolean; alreadyInState?: boolean }> {
  return request<{ success: boolean; found: boolean; alreadyInState?: boolean }>('/api/admin/leaderboard/delete', {
    method: 'POST',
    body: JSON.stringify({ id, reason })
  });
}
