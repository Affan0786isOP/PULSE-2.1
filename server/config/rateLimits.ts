import type { Express } from 'express';
import rateLimit from 'express-rate-limit';

// NOTE: express-rate-limit uses an in-memory store per process. When scaled across multiple
// instances, back these with a shared store (Redis / Firestore counters) - see docs/SECURITY.md.

export const sessionStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many requests. Please try again later.' }
});

export const sessionSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many requests. Please try again later.' }
});

export const leaderboardSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many requests. Please try again later.' }
});

export const generalSessionsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many requests. Please try again later.' }
});

export const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, error: 'Too many verification requests. Please try again later.' }
});

export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many API requests' }
});

export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many admin login attempts. Please try again in 15 minutes.' }
});

/** Registers the route-scoped rate limiters. Order is significant and preserved from the original server. */
export function applyRateLimits(app: Express): void {
  app.use('/api/admin', generalApiLimiter);
  app.use('/api/research/session', sessionStartLimiter);
  app.use('/api/sessions', generalSessionsLimiter);
  app.use('/api/research/submit', sessionSubmitLimiter);
  app.use('/api/leaderboard/submit', leaderboardSubmitLimiter);
  app.use('/api/research/verify-provenance', verificationLimiter);
  app.use('/api/leaderboard/verify-provenance', verificationLimiter);
  app.use('/api/', generalApiLimiter);
}
