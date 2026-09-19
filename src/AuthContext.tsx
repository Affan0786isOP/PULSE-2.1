import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { signInAnonymously, onAuthStateChanged, User, setPersistence, inMemoryPersistence } from 'firebase/auth';
import { auth, isConfigured, authInitPromise } from './lib/firebase';

export type AuthContextType = {
  isReady: boolean;
  isConnecting: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  user: User | null;
  retryAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightPromiseRef = useRef<Promise<void> | null>(null);
  const authGenerationRef = useRef(0);
  const isMountedRef = useRef(true);

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const initializeAuth = useCallback((retryCount = 0, isManualRetry = false): Promise<void> => {
    clearRetryTimer();

    // Prevent overlapping initialization attempts: reuse in-flight promise unless explicit manual retry
    if (inFlightPromiseRef.current && !isManualRetry) {
      return inFlightPromiseRef.current;
    }

    const generation = ++authGenerationRef.current;

    if (isMountedRef.current) {
      setIsConnecting(true);
      setAuthError(null);
    }

    const promise = (async () => {
      if (!isConfigured || !auth) {
        const msg = "Firebase service is unavailable or unconfigured. Server connection required.";
        console.warn(msg);
        if (isMountedRef.current && authGenerationRef.current === generation) {
          setAuthError(msg);
          setIsAuthenticated(false);
          setUser(null);
          setIsConnecting(false);
          setIsReady(true);
        }
        return;
      }

      try {
        await authInitPromise;
        if (authGenerationRef.current !== generation) return;

        if (!auth.currentUser) {
          try {
            await signInAnonymously(auth);
          } catch (signErr: any) {
            const errStr = String(signErr?.message || signErr || '');
            if (errStr.includes('Database is closing') || errStr.includes('closing/hidden') || errStr.includes('internal-error')) {
              console.warn('[Firebase Auth] Database is closing/hidden during anonymous sign-in, retrying with in-memory persistence...');
              await setPersistence(auth, inMemoryPersistence).catch(() => {});
              if (authGenerationRef.current !== generation) return;
              await signInAnonymously(auth);
            } else {
              throw signErr;
            }
          }
        }

        if (isMountedRef.current && authGenerationRef.current === generation) {
          setUser(auth.currentUser);
          setIsAuthenticated(Boolean(auth.currentUser));
          setAuthError(null);
          setIsConnecting(false);
          setIsReady(true);
        }
      } catch (err: any) {
        if (authGenerationRef.current !== generation) return;

        const isNetworkErr = err?.code === 'auth/network-request-failed' || String(err?.message || '').includes('network-request-failed');
        const isDbClosing = String(err?.message || '').includes('Database is closing') || String(err?.message || '').includes('closing/hidden');

        if ((isNetworkErr || isDbClosing) && retryCount < 3 && isMountedRef.current) {
          if (isDbClosing && auth) {
            try {
              await setPersistence(auth, inMemoryPersistence);
            } catch (_) {}
          }
          const delay = (retryCount + 1) * 800;
          console.warn(`[Firebase Auth] ${isDbClosing ? 'Database closing/hidden' : 'Network request failed'}. Retrying in ${delay}ms (attempt ${retryCount + 1}/3)...`);
          clearRetryTimer();
          retryTimerRef.current = setTimeout(() => {
            if (isMountedRef.current && authGenerationRef.current === generation) {
              inFlightPromiseRef.current = null;
              initializeAuth(retryCount + 1, false);
            }
          }, delay);
          return;
        }

        const msg = err?.message || "Firebase authentication initialization failed.";
        console.warn("Firebase auth initialization notice:", err);
        if (isMountedRef.current && authGenerationRef.current === generation) {
          setAuthError(msg);
          setIsAuthenticated(false);
          setUser(null);
          setIsConnecting(false);
          setIsReady(true);
        }
      } finally {
        if (inFlightPromiseRef.current === promise) {
          inFlightPromiseRef.current = null;
        }
      }
    })();

    inFlightPromiseRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (!auth) {
      initializeAuth();
      return () => {
        isMountedRef.current = false;
        clearRetryTimer();
      };
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!isMountedRef.current) return;
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));
      if (currentUser) {
        setAuthError(null);
        setIsConnecting(false);
        setIsReady(true);
      }
    });

    initializeAuth();

    const handleOnline = () => {
      if (!auth?.currentUser && isMountedRef.current) {
        initializeAuth();
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      isMountedRef.current = false;
      clearRetryTimer();
      unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, [initializeAuth]);

  return (
    <AuthContext.Provider value={{ 
      isReady, 
      isConnecting, 
      isAuthenticated, 
      authError, 
      user, 
      retryAuth: () => initializeAuth(0, true) 
    }}>
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


