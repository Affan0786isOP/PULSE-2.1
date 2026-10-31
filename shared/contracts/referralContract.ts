/**
 * Authoritative referral contract for PULSE educational guides and benchmarks.
 * Enforces zero-PII, finite token allowlist, and 30-minute time-to-live.
 */

export const ALLOWED_REFERRAL_TOKENS = [
  'guide-vrt',
  'guide-stroop',
  'benchmarks-percentiles'
] as const;

export type ReferralToken = (typeof ALLOWED_REFERRAL_TOKENS)[number];

export const REFERRAL_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const REFERRAL_STORAGE_KEY = 'pulse_active_ref';

export interface StoredReferralContext {
  token: ReferralToken;
  timestamp: number;
}

export function isValidReferralToken(token: unknown): token is ReferralToken {
  return typeof token === 'string' && (ALLOWED_REFERRAL_TOKENS as readonly string[]).includes(token);
}
