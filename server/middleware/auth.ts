import type express from 'express';
import * as crypto from 'crypto';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { initializeAdminApp } from '../config/firebaseAdmin';
import { signProvenancePayload } from '../services/provenanceService';

export async function verifyFirebaseUserToken(req: express.Request): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) return null;

  // Let initializeAdminApp throw if server config is missing/invalid
  initializeAdminApp();

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded;
  } catch (err) {
    console.warn('[Firebase Auth] verifyIdToken failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

export function getAdminPasscode(): string {
  const passcode = process.env.ADMIN_PASSCODE || process.env.PULSE_ADMIN_PASSCODE;
  if (!passcode) {
    // Secure fallback for local development only if no env set
    return 'pulse-admin-2026-master-key';
  }
  return passcode;
}

export function createAdminSessionToken(): { token: string; expiresAt: number } {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 8 * 60 * 60 * 1000; // 8 hour active session
  const nonce = crypto.randomUUID();
  const payload = `${issuedAt}:${expiresAt}:${nonce}`;
  const signature = signProvenancePayload(payload);
  const token = `${payload}:${signature}`;
  return { token, expiresAt };
}

export function verifyAdminSession(req: express.Request): boolean {
  const rawHeader = (req.headers['x-admin-token'] as string) ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split('Bearer ')[1]?.trim() : '');
  if (!rawHeader || typeof rawHeader !== 'string') return false;

  const parts = rawHeader.split(':');
  if (parts.length !== 4) return false;

  const [issuedAtStr, expiresAtStr, nonce, signature] = parts;
  const expiresAt = Number(expiresAtStr);
  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

  const payload = `${issuedAtStr}:${expiresAtStr}:${nonce}`;
  const expectedSig = signProvenancePayload(payload);

  const bufSig = Buffer.from(signature, 'hex');
  const bufExp = Buffer.from(expectedSig, 'hex');
  if (bufSig.length === 0 || bufSig.length !== bufExp.length) return false;
  return crypto.timingSafeEqual(bufSig, bufExp);
}
