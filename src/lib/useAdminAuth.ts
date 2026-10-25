import { useState, useEffect, useCallback } from 'react';
import { adminLogin, adminLogout } from './adminActions';

export function useAdminAuth() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('pulse_admin_token') || localStorage.getItem('pulse_admin_token');
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (passcode: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogin(passcode);
      if (res.success && res.token) {
        setToken(res.token);
        return true;
      }
      setError('Login failed');
      return false;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid passcode or login failed';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await adminLogout();
    } catch {
      // Ignore errors on logout
    } finally {
      setToken(null);
      setLoading(false);
    }
  }, []);

  const refreshAuth = useCallback(() => {
    try {
      const stored = sessionStorage.getItem('pulse_admin_token') || localStorage.getItem('pulse_admin_token');
      setToken(stored);
    } catch {
      setToken(null);
    }
  }, []);

  return {
    isAuthenticated: !!token,
    refreshAuth,
    token,
    loading,
    error,
    login,
    logout
  };
}
