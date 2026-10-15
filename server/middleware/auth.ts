import type express from 'express';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { initializeAdminApp } from '../config/firebaseAdmin';
import { AppError } from '../models/replayContracts';

export async function verifyFirebaseUserToken(req: express.Request): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) return null;

  try {
    initializeAdminApp();
  } catch (err: unknown) {
    // Missing service-account/project configuration is a server fault, not an
    // invalid participant credential. Surface it as retryable service failure.
    throw new AppError('AUTH_CONFIGURATION_UNAVAILABLE', 503);
  }

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded;
  } catch (err) {
    console.warn('[Firebase Auth] verifyIdToken failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}
