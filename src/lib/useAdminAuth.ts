import { useState, useEffect, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth, isConfigured } from './firebase';

export interface AdminCustomClaims {
  admin?: boolean;
  role?: string;
  [key: string]: unknown;
}

export interface AdminAuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  email: string | null;
  tokenClaims: AdminCustomClaims | null;
  signIn: (pass: string, email?: string) => Promise<boolean>;
  signOutAdmin: () => Promise<void>;
  enableDemoAdmin: () => void;
}

/**
 * Validates whether the given user and their token claims represent a verified administrator.
 */
async function verifyAdminClaims(currentUser: User | null, forceRefresh = false): Promise<{ isAdmin: boolean; claims: AdminCustomClaims | null }> {
  if (!currentUser) {
    return { isAdmin: false, claims: null };
  }

  try {
    const tokenResult = await currentUser.getIdTokenResult(forceRefresh);
    const rawClaims = tokenResult.claims || {};
    const claims: AdminCustomClaims = {
      admin: typeof rawClaims.admin === 'boolean' ? rawClaims.admin : undefined,
      role: typeof rawClaims.role === 'string' ? rawClaims.role : undefined,
      ...rawClaims
    };
    
    // Check for custom admin claim OR verified admin email address
    const hasCustomClaim = claims.admin === true || claims.role === 'admin';
    const hasAdminEmail = currentUser.email === 'admin@pulse-research.org' && !currentUser.isAnonymous;

    const isAdmin = Boolean(hasCustomClaim || hasAdminEmail);
    return { isAdmin, claims };
  } catch (err) {
    console.warn("[AdminAuth] Failed to verify token claims:", err);
    return { isAdmin: false, claims: null };
  }
}

export function useAdminAuth(): AdminAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [tokenClaims, setTokenClaims] = useState<AdminCustomClaims | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured || !auth) {
      // If Firebase is not configured, admin access cannot be verified
      setIsAdmin(false);
      setUser(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (!currentUser) {
        setIsAdmin(false);
        setAdminEmail(null);
        setTokenClaims(null);
        setLoading(false);
        return;
      }

      // Verify token claims and authorization strictly via Firebase
      const { isAdmin: verifiedAdmin, claims } = await verifyAdminClaims(currentUser);
      setIsAdmin(verifiedAdmin);
      setAdminEmail(verifiedAdmin ? currentUser.email : null);
      setTokenClaims(claims);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = useCallback(async (pass: string, email?: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    const trimmedPass = pass.trim();
    if (!trimmedPass) {
      setError("Please enter the administrator password.");
      setLoading(false);
      return false;
    }

    const activeEmail = email?.trim() || 'admin@pulse-research.org';

    if (!isConfigured || !auth) {
      setError("Firebase Authentication is not configured for this deployment.");
      setLoading(false);
      return false;
    }

    try {
      // 1. Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, activeEmail, trimmedPass);
      const authenticatedUser = userCredential.user;

      // 2. Strictly verify Firebase ID token and admin claims (force fresh token)
      const { isAdmin: verifiedAdmin, claims } = await verifyAdminClaims(authenticatedUser, true);

      if (!verifiedAdmin) {
        // Authenticated user does not possess administrative privileges
        await signOut(auth);
        setIsAdmin(false);
        setUser(null);
        setError("Access denied: User account does not possess verified administrator privileges.");
        setLoading(false);
        return false;
      }

      setUser(authenticatedUser);
      setIsAdmin(true);
      setAdminEmail(authenticatedUser.email);
      setTokenClaims(claims);
      setLoading(false);
      return true;
    } catch (fbErr: unknown) {
      const fbCode = typeof fbErr === 'object' && fbErr !== null && 'code' in fbErr
        ? String((fbErr as { code?: unknown }).code)
        : '';
      const fbMessage = fbErr instanceof Error ? fbErr.message : String(fbErr || '');

      const errorMsg = fbCode === 'auth/wrong-password' || fbCode === 'auth/invalid-credential'
        ? 'Incorrect administrator password or credentials.'
        : fbCode === 'auth/user-not-found'
        ? 'Administrator account not registered in Firebase Auth.'
        : `Authentication failed: ${fbMessage || 'Please check credentials.'}`;
      
      setError(errorMsg);
      setIsAdmin(false);
      setLoading(false);
      return false;
    }
  }, []);

  const signOutAdmin = useCallback(async () => {
    setIsAdmin(false);
    setAdminEmail(null);
    setTokenClaims(null);
    setUser(null);

    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn("[AdminAuth] Sign out warning:", err);
      }
    }
  }, []);

  const enableDemoAdmin = useCallback(() => {
    // Deprecated: Local storage override has been removed for security compliance.
    console.warn("[AdminAuth] Local demo admin overrides are disabled. Administrative authentication must be verified via Firebase Auth.");
  }, []);

  return {
    user,
    isAdmin,
    loading,
    error,
    email: adminEmail,
    tokenClaims,
    signIn,
    signOutAdmin,
    enableDemoAdmin
  };
}


