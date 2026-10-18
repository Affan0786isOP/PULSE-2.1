import * as crypto from 'crypto';
import type express from 'express';
import { AppError } from '../models/replayContracts';
import { getAdminDb } from '../config/firebaseAdmin';

export const ADMIN_SESSION_COLLECTION = 'adminSessionRevocations';
const MAX_SESSION_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

export function getAdminPasscode(): string {
  const code = process.env.ADMIN_PASSCODE;
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

  if (!code) {
    if (isDev) {
      return '180611';
    }
    throw new AppError('ADMIN_PASSCODE is required in non-development environments', 503);
  }

  if (!isDev) {
    if (code.length < 12 || code === '180611' || code.includes('change-me') || code.includes('placeholder')) {
      throw new AppError('Insecure ADMIN_PASSCODE detected in non-development environment', 503);
    }
  }

  return code;
}

export function getAdminSessionSecret(): string {
  const secret = process.env.PULSE_ADMIN_SESSION_SECRET;
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

  if (!secret) {
    if (isDev) {
      return 'dev-pulse-admin-session-secret-key-32chars!';
    }
    throw new AppError('PULSE_ADMIN_SESSION_SECRET is required in non-development environments', 503);
  }

  if (!isDev) {
    if (secret.length < 16 || secret.includes('change-me') || secret.includes('placeholder')) {
      throw new AppError('Insecure PULSE_ADMIN_SESSION_SECRET detected in non-development environment', 503);
    }
  }

  return secret;
}

export function validateAdminPasscode(candidate: string): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  try {
    const authoritative = getAdminPasscode();
    const candidateHash = crypto.createHash('sha256').update(candidate).digest();
    const authoritativeHash = crypto.createHash('sha256').update(authoritative).digest();
    return crypto.timingSafeEqual(candidateHash, authoritativeHash);
  } catch {
    return false;
  }
}

export interface AdminTokenClaims {
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}

export function signAdminToken(claims: AdminTokenClaims): string {
  const secret = getAdminSessionSecret();
  const payload = `${claims.nonce}:${claims.issuedAt}:${claims.expiresAt}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

export function createAdminToken(lifetimeMs: number = MAX_SESSION_AGE_MS): string {
  const now = Date.now();
  const nonce = crypto.randomUUID();
  const issuedAt = now;
  const expiresAt = now + lifetimeMs;
  return signAdminToken({ nonce, issuedAt, expiresAt });
}

export function parseAndValidateTokenClaims(token: string): { valid: boolean; claims?: AdminTokenClaims; reason?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Missing token' };
  }

  const parts = token.split(':');
  if (parts.length !== 4) {
    return { valid: false, reason: 'Malformed token structure' };
  }

  const [nonce, issuedAtStr, expiresAtStr, sig] = parts;
  if (!nonce || !issuedAtStr || !expiresAtStr || !sig) {
    return { valid: false, reason: 'Invalid token components' };
  }

  const issuedAt = Number(issuedAtStr);
  const expiresAt = Number(expiresAtStr);
  const now = Date.now();

  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) {
    return { valid: false, reason: 'Invalid token timestamps' };
  }

  if (expiresAt <= now) {
    return { valid: false, reason: 'Token expired' };
  }

  // Token lifetime cannot exceed max allowed session age plus small clock skew
  if (expiresAt - issuedAt > MAX_SESSION_AGE_MS + 60000 || issuedAt > now + 60000) {
    return { valid: false, reason: 'Invalid token lifespan' };
  }

  try {
    const secret = getAdminSessionSecret();
    const payload = `${nonce}:${issuedAt}:${expiresAt}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, reason: 'Invalid token signature' };
    }

    return {
      valid: true,
      claims: { nonce, issuedAt, expiresAt }
    };
  } catch {
    return { valid: false, reason: 'Token verification failure' };
  }
}

export async function verifyAdminSessionToken(
  req: express.Request,
  dbGetter: () => FirebaseFirestore.Firestore | null = getAdminDb
): Promise<{ authorized: boolean; claims?: AdminTokenClaims; errorStatus?: number; errorMsg?: string }> {
  const token = (req.headers['x-admin-token'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '')) as string;
  if (!token) {
    return { authorized: false, errorStatus: 401, errorMsg: 'Authentication required: missing admin token' };
  }

  const parsed = parseAndValidateTokenClaims(token);
  if (!parsed.valid || !parsed.claims) {
    return { authorized: false, errorStatus: 401, errorMsg: parsed.reason || 'Invalid or expired admin token' };
  }

  // Authoritative Firestore session revocation check
  const db = dbGetter();
  if (!db) {
    return { authorized: false, errorStatus: 503, errorMsg: 'Admin session verification is unavailable' };
  }

  try {
    const revRef = db.collection(ADMIN_SESSION_COLLECTION).doc(parsed.claims.nonce);
    const snap = await revRef.get();
    if (snap.exists) {
      return { authorized: false, errorStatus: 401, errorMsg: 'Admin session has been revoked' };
    }

    return { authorized: true, claims: parsed.claims };
  } catch (err: unknown) {
    return { authorized: false, errorStatus: 503, errorMsg: 'Failed to verify session revocation status' };
  }
}

export async function revokeAdminTokenNonce(
  token: string,
  dbGetter: () => FirebaseFirestore.Firestore | null = getAdminDb
): Promise<boolean> {
  const parsed = parseAndValidateTokenClaims(token);
  // If token is invalid or malformed, return true idempotently without throwing
  if (!parsed.valid || !parsed.claims) {
    return true;
  }

  const db = dbGetter();
  if (!db) {
    throw new AppError('DATABASE_UNAVAILABLE', 503);
  }

  try {
    const revRef = db.collection(ADMIN_SESSION_COLLECTION).doc(parsed.claims.nonce);
    await revRef.set({
      revokedAt: Date.now(),
      expiresAt: parsed.claims.expiresAt,
      // TTL cleanup field: Firestore can automatically delete expired entries
      expireAtTimestamp: new Date(parsed.claims.expiresAt)
    }, { merge: true });
    return true;
  } catch {
    throw new AppError('DATABASE_UNAVAILABLE', 503);
  }
}
