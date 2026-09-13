import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signInAnonymously, onAuthStateChanged, User, setPersistence, inMemoryPersistence } from 'firebase/auth';
import { auth, isConfigured, authInitPromise } from './lib/firebase';

export type AuthContextType = {
  isReady: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  user: User | null;
  retryAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const initializeAuth = useCallback(async (retryCount = 0) => {
    setIsReady(false);
    setAuthError(null);

    if (!isConfigured || !auth) {
      const msg = "Firebase service is unavailable or unconfigured. Server connection required.";
      console.warn(msg);
      setAuthError(msg);
      setIsAuthenticated(false);
      setUser(null);
      setIsReady(true);
      return;
    }

    try {
      await authInitPromise;

      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (signErr: any) {
          const errStr = String(signErr?.message || signErr || '');
          if (errStr.includes('Database is closing') || errStr.includes('closing/hidden') || errStr.includes('internal-error')) {
            console.warn('[Firebase Auth] Database is closing/hidden during anonymous sign-in, retrying with in-memory persistence...');
            await setPersistence(auth, inMemoryPersistence).catch(() => {});
            await signInAnonymously(auth);
          } else {
            throw signErr;
          }
        }
      }

      setUser(auth.currentUser);
      setIsAuthenticated(Boolean(auth.currentUser));
      setAuthError(null);
      setIsReady(true);
    } catch (err: any) {
      const isNetworkErr = err?.code === 'auth/network-request-failed' || String(err?.message || '').includes('network-request-failed');
      const isDbClosing = String(err?.message || '').includes('Database is closing') || String(err?.message || '').includes('closing/hidden');

      if ((isNetworkErr || isDbClosing) && retryCount < 3) {
        if (isDbClosing && auth) {
          try {
            await setPersistence(auth, inMemoryPersistence);
          } catch (_) {}
        }
        const delay = (retryCount + 1) * 800;
        console.warn(`[Firebase Auth] ${isDbClosing ? 'Database closing/hidden' : 'Network request failed'}. Retrying in ${delay}ms (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => {
          initializeAuth(retryCount + 1);
        }, delay);
        return;
      }

      const msg = err?.message || "Firebase authentication initialization failed.";
      console.warn("Firebase auth initialization notice:", err);
      setAuthError(msg);
      setIsAuthenticated(false);
      setUser(null);
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      initializeAuth();
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));
      if (currentUser) {
        setAuthError(null);
      }
    });

    initializeAuth();

    const handleOnline = () => {
      if (!auth?.currentUser) {
        initializeAuth();
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, [initializeAuth]);

  return (
    <AuthContext.Provider value={{ isReady, isAuthenticated, authError, user, retryAuth: () => initializeAuth(0) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


