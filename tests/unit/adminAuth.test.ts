import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getAdminPasscode,
  getAdminSessionSecret,
  validateAdminPasscode,
  createAdminToken,
  parseAndValidateTokenClaims,
  verifyAdminSessionToken,
  revokeAdminTokenNonce,
  signAdminToken,
  ADMIN_SESSION_COLLECTION
} from '../../server/middleware/adminAuth';
import { AppError } from '../../server/models/replayContracts';

describe('Admin Auth & Token Security Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Passcode & Secret Resolution Rules', () => {
    it('allows fallback 180611 across environments when not set', () => {
      delete process.env.ADMIN_PASSCODE;
      expect(getAdminPasscode()).toBe('180611');

      delete process.env.PULSE_ADMIN_SESSION_SECRET;
      expect(getAdminSessionSecret()).toContain('pulse-admin-session-secret');
    });

    it('accepts strong production passcode in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.ADMIN_PASSCODE = 'super-strong-production-passcode-2026';
      expect(getAdminPasscode()).toBe('super-strong-production-passcode-2026');
    });

    it('constant-time passcode validation correctly compares passcodes', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ADMIN_PASSCODE; // default 180611

      expect(validateAdminPasscode('180611')).toBe(true);
      expect(validateAdminPasscode('wrong-code')).toBe(false);
      expect(validateAdminPasscode('')).toBe(false);
      expect(validateAdminPasscode(null as unknown as string)).toBe(false);
    });
  });

  describe('Token Generation, Signing & Claims Verification', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.PULSE_ADMIN_SESSION_SECRET = 'a-very-long-test-secret-key-32chars!';
    });

    it('creates a valid token with 4 colon-delimited components', () => {
      const token = createAdminToken();
      expect(token.split(':')).toHaveLength(4);

      const parsed = parseAndValidateTokenClaims(token);
      expect(parsed.valid).toBe(true);
      expect(parsed.claims).toBeDefined();
      expect(parsed.claims?.nonce).toBeDefined();
      expect(parsed.claims?.expiresAt).toBeGreaterThan(Date.now());
    });

    it('rejects expired tokens', () => {
      const now = Date.now();
      const expiredToken = signAdminToken({
        nonce: 'expired-nonce',
        issuedAt: now - 10000,
        expiresAt: now - 1000
      });

      const parsed = parseAndValidateTokenClaims(expiredToken);
      expect(parsed.valid).toBe(false);
      expect(parsed.reason).toBe('Token expired');
    });

    it('rejects tampered signatures', () => {
      const token = createAdminToken();
      const parts = token.split(':');
      parts[3] = parts[3].slice(0, -4) + 'abcd'; // tamper signature
      const tampered = parts.join(':');

      const parsed = parseAndValidateTokenClaims(tampered);
      expect(parsed.valid).toBe(false);
      expect(parsed.reason).toBe('Invalid token signature');
    });

    it('rejects tokens exceeding maximum lifetime', () => {
      const now = Date.now();
      const overLongToken = signAdminToken({
        nonce: 'long-nonce',
        issuedAt: now,
        expiresAt: now + (10 * 60 * 60 * 1000) // 10 hours > 2 hours max
      });

      const parsed = parseAndValidateTokenClaims(overLongToken);
      expect(parsed.valid).toBe(false);
      expect(parsed.reason).toBe('Invalid token lifespan');
    });
  });

  describe('Firestore Session Revocation Check & Idempotent Nonce Revocation', () => {
    let mockStore: Map<string, Record<string, unknown>>;
    let mockDb: any;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.PULSE_ADMIN_SESSION_SECRET = 'a-very-long-test-secret-key-32chars!';
      mockStore = new Map();

      mockDb = {
        collection: (colName: string) => ({
          doc: (docId: string) => ({
            get: async () => ({
              id: docId,
              exists: mockStore.has(docId),
              data: () => mockStore.get(docId)
            }),
            set: async (data: Record<string, unknown>) => {
              mockStore.set(docId, data);
            }
          })
        })
      };
    });

    it('authorizes request when token claims are valid and nonce is NOT revoked', async () => {
      const token = createAdminToken();
      const mockReq: any = {
        headers: { 'x-admin-token': token }
      };

      const res = await verifyAdminSessionToken(mockReq, () => mockDb);
      expect(res.authorized).toBe(true);
      expect(res.claims).toBeDefined();
    });

    it('rejects request when token nonce is found in adminSessionRevocations', async () => {
      const token = createAdminToken();
      const parsed = parseAndValidateTokenClaims(token);
      expect(parsed.valid).toBe(true);

      // Simulate revocation
      mockStore.set(parsed.claims!.nonce, {
        revokedAt: Date.now(),
        expiresAt: parsed.claims!.expiresAt
      });

      const mockReq: any = {
        headers: { 'x-admin-token': token }
      };

      const res = await verifyAdminSessionToken(mockReq, () => mockDb);
      expect(res.authorized).toBe(false);
      expect(res.errorStatus).toBe(401);
      expect(res.errorMsg).toContain('revoked');
    });

    it('revokeAdminTokenNonce idempotently records nonce in Firestore', async () => {
      const token = createAdminToken();
      const parsed = parseAndValidateTokenClaims(token);

      const revokedFirst = await revokeAdminTokenNonce(token, () => mockDb);
      expect(revokedFirst).toBe(true);
      expect(mockStore.has(parsed.claims!.nonce)).toBe(true);

      // Repeated revocation succeeds idempotently
      const revokedSecond = await revokeAdminTokenNonce(token, () => mockDb);
      expect(revokedSecond).toBe(true);
    });

    it('returns 503 if Firestore database is unavailable', async () => {
      const token = createAdminToken();
      const mockReq: any = {
        headers: { 'x-admin-token': token }
      };

      const res = await verifyAdminSessionToken(mockReq, () => null);
      expect(res.authorized).toBe(false);
      expect(res.errorStatus).toBe(503);
    });
  });
});
