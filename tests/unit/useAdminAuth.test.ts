import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdminAuth } from '../../src/lib/useAdminAuth';
import { adminLogin, adminLogout } from '../../src/lib/adminActions';

vi.mock('../../src/lib/adminActions', () => ({
  adminLogin: vi.fn(),
  adminLogout: vi.fn(),
}));

const mockAdminLogin = vi.mocked(adminLogin);
const mockAdminLogout = vi.mocked(adminLogout);

describe('useAdminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('starts unauthenticated when no token is stored', () => {
    const { result } = renderHook(() => useAdminAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('restores a token from sessionStorage', () => {
    sessionStorage.setItem('pulse_admin_token', 'session-token');

    const { result } = renderHook(() => useAdminAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('session-token');
  });

  it('falls back to localStorage when sessionStorage has no token', () => {
    localStorage.setItem('pulse_admin_token', 'persistent-token');

    const { result } = renderHook(() => useAdminAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('persistent-token');
  });

  it('stores the token in hook state after successful login', async () => {
    mockAdminLogin.mockResolvedValue({ success: true, token: 'new-token' });

    const { result } = renderHook(() => useAdminAuth());
    let succeeded = false;

    await act(async () => {
      succeeded = await result.current.login('correct-passcode');
    });

    expect(mockAdminLogin).toHaveBeenCalledWith('correct-passcode');
    expect(succeeded).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('new-token');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('reports a rejected login without authenticating', async () => {
    mockAdminLogin.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useAdminAuth());
    let succeeded = true;

    await act(async () => {
      succeeded = await result.current.login('passcode');
    });

    expect(succeeded).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.error).toBe('Network Error');
    expect(result.current.loading).toBe(false);
  });

  it('reports an unsuccessful login response', async () => {
    mockAdminLogin.mockResolvedValue({ success: false, token: '' });

    const { result } = renderHook(() => useAdminAuth());

    await act(async () => {
      await result.current.login('wrong-passcode');
    });

    expect(result.current.error).toBe('Login failed');
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('clears hook authentication state on logout', async () => {
    sessionStorage.setItem('pulse_admin_token', 'existing-token');
    mockAdminLogout.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAdminAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockAdminLogout).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('clears hook authentication state even if logout fails', async () => {
    sessionStorage.setItem('pulse_admin_token', 'existing-token');
    mockAdminLogout.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useAdminAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('exposes loading while the login request is pending', async () => {
    let resolveLogin!: (value: { success: boolean; token: string }) => void;
    mockAdminLogin.mockReturnValue(new Promise(resolve => {
      resolveLogin = resolve;
    }));

    const { result } = renderHook(() => useAdminAuth());
    let loginPromise!: Promise<boolean>;

    act(() => {
      loginPromise = result.current.login('passcode');
    });
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveLogin({ success: true, token: 'resolved-token' });
      await loginPromise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.token).toBe('resolved-token');
  });
});
