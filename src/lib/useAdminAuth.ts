import { useState } from 'react';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      const authFlag = sessionStorage.getItem('pulse_admin_auth') === 'true';
      const token = sessionStorage.getItem('pulse_admin_token');
      return authFlag && !!token;
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('pulse_admin_email') || 'admin';
    } catch {
      return 'admin';
    }
  });

  const signIn = async (passcode: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (!passcode || !passcode.trim()) {
        setError('Please enter the admin master passcode');
        return false;
      }

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.token) {
        setIsAdmin(true);
        setEmail('admin');
        sessionStorage.setItem('pulse_admin_auth', 'true');
        sessionStorage.setItem('pulse_admin_token', data.token);
        sessionStorage.setItem('pulse_admin_email', 'admin');
        return true;
      }

      setError(data.error || 'Invalid admin master passcode');
      return false;
    } catch (e: any) {
      setError(e.message || 'Authentication request failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOutAdmin = async () => {
    setIsAdmin(false);
    setEmail(null);
    try {
      sessionStorage.removeItem('pulse_admin_auth');
      sessionStorage.removeItem('pulse_admin_token');
      sessionStorage.removeItem('pulse_admin_email');
    } catch {}
  };

  return {
    isAdmin,
    loading,
    error,
    user,
    email,
    tokenClaims: isAdmin ? { role: 'admin' } : null,
    signIn,
    signOutAdmin,
  };
}
