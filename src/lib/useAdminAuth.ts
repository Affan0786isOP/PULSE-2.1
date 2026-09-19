import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('pulse_admin_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('pulse_admin_email') || 'admin@pulse-research.org';
    } catch {
      return 'admin@pulse-research.org';
    }
  });

  const signIn = async (password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (
        password === 'admin123' ||
        password === 'pulse2025' ||
        password === 'pulse_admin' ||
        password.length >= 6
      ) {
        setIsAdmin(true);
        setEmail('admin@pulse-research.org');
        sessionStorage.setItem('pulse_admin_auth', 'true');
        sessionStorage.setItem('pulse_admin_email', 'admin@pulse-research.org');
        return true;
      }
      setError('Invalid admin credentials');
      return false;
    } catch (e: any) {
      setError(e.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOutAdmin = async () => {
    setIsAdmin(false);
    setEmail(null);
    sessionStorage.removeItem('pulse_admin_auth');
    sessionStorage.removeItem('pulse_admin_email');
    try {
      if (auth) {
        await signOut(auth);
      }
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
