import type { Express, Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getAdminDb } from './firebaseAdmin';
import { FirestoreRateLimitStore } from './firestoreRateLimitStore';

/**
 * Decodes a Firebase UID only to partition rate-limit counters. This is NOT
 * authentication; every protected route still verifies the ID token itself.
 */
function getUnverifiedUid(req: Request): string | null {
  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !/^Bearer\s+/i.test(authorization)) return null;
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: unknown;
      user_id?: unknown;
    };
    const uid = typeof decoded.user_id === 'string' ? decoded.user_id : decoded.sub;
    return typeof uid === 'string' && uid.length > 0 && uid.length <= 256 ? uid : null;
  } catch {
    return null;
  }
}

function normalizedRequestIp(req: Request): string {
  const rawIp = req.ip || req.socket.remoteAddress || 'unknown';
  return rawIp === 'unknown' ? rawIp : ipKeyGenerator(rawIp);
}

function createLimiterKey(namespace: string, useUserIdentity: boolean) {
  return (req: Request): string => {
    const ip = normalizedRequestIp(req);
    const uid = useUserIdentity ? getUnverifiedUid(req) : null;
    const identity = uid ? `uid:${uid}:ip:${ip}` : `ip:${ip}`;
    return `${namespace}:${identity}`;
  };
}

function createSharedStore(): FirestoreRateLimitStore {
  return new FirestoreRateLimitStore(() => getAdminDb());
}

const windowMs = 15 * 60 * 1000;

// Firestore-backed counters are shared across serverless instances. Authenticated
// traffic is partitioned by UID + IP to prevent a school/carrier NAT from making
// one participant exhaust every other participant's per-test allowance.
export const sessionStartLimiter = rateLimit({
  windowMs,
  max: 30,
  keyGenerator: createLimiterKey('session-start', true),
  store: createSharedStore(),
  message: { success: false, error: 'Too many session starts. Please try again later.' }
});

export const sessionSubmitLimiter = rateLimit({
  windowMs,
  max: 30,
  keyGenerator: createLimiterKey('session-submit', true),
  store: createSharedStore(),
  message: { success: false, error: 'Too many research submissions. Please try again later.' }
});

export const leaderboardSubmitLimiter = rateLimit({
  windowMs,
  max: 30,
  keyGenerator: createLimiterKey('leaderboard-submit', true),
  store: createSharedStore(),
  message: { success: false, error: 'Too many leaderboard submissions. Please try again later.' }
});

export const generalSessionsLimiter = rateLimit({
  windowMs,
  max: 60,
  keyGenerator: createLimiterKey('sessions', true),
  store: createSharedStore(),
  message: { success: false, error: 'Too many session requests. Please try again later.' }
});

export const verificationLimiter = rateLimit({
  windowMs,
  max: 60,
  keyGenerator: createLimiterKey('verification', false),
  store: createSharedStore(),
  message: { success: false, error: 'Too many verification requests. Please try again later.' }
});

export const leaderboardFreshReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: createLimiterKey('leaderboard-fresh-read', false),
  store: createSharedStore(),
  skip: (req) => {
    if (req.method !== 'GET') return true;
    if (req.originalUrl.split('?')[0] !== '/api/leaderboard') return true;
    const isFresh = req.query.fresh === '1' || req.query.fresh === 'true';
    return !isFresh;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Surrogate-Control', 'no-store');
    res.status(429).json({
      success: false,
      error: 'Too many forced-refresh requests. Please retry shortly.',
      entries: []
    });
  }
});

export const leaderboardReadLimiter = rateLimit({
  windowMs,
  max: 600,
  keyGenerator: createLimiterKey('leaderboard-read', false),
  store: createSharedStore(),
  skip: (req) => req.method !== 'GET' || req.originalUrl.split('?')[0] !== '/api/leaderboard',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    // Rate-limit responses bypass edge caches just like route-level errors.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Surrogate-Control', 'no-store');
    // Keep the throttle response envelope identical to GET /api/leaderboard.
    res.status(429).json({
      success: false,
      error: 'Too many leaderboard requests. Please retry shortly.',
      entries: []
    });
  }
});

export const generalApiLimiter = rateLimit({
  windowMs,
  // A coarse per-IP ceiling remains for invalid/unauthenticated requests; actual
  // authenticated study traffic uses the per-user limiters above.
  max: 2000,
  keyGenerator: createLimiterKey('general-api', false),
  store: createSharedStore(),
  skip: (req) => {
    if (req.method === 'GET' && req.originalUrl.split('?')[0] === '/api/leaderboard') return true;

    // Skip static assets to avoid interfering with normal usage
    if (req.method === 'GET') {
      const path = req.path;
      if (path.startsWith('/assets/') || path.startsWith('/mobile/assets/')) return true;
      const lastSegment = path.split('/').pop() || '';
      if (lastSegment.includes('.') && !lastSegment.endsWith('.html')) return true;
    }
    return false;
  },
  message: { success: false, error: 'Too many requests' }
});

/** Registers the route-scoped rate limiters. Order is significant and preserved from the original server. */
export const adminLoginLimiter = rateLimit({
  windowMs,
  max: 10, // 10 attempts per 15 minutes per IP
  keyGenerator: createLimiterKey('admin-login', false),
  store: createSharedStore(),
  message: { success: false, error: 'Too many admin login attempts. Please try again later.' }
});

export const adminMutationLimiter = rateLimit({
  windowMs,
  max: 120, // 120 mutations per 15 minutes per IP
  keyGenerator: createLimiterKey('admin-mutation', false),
  store: createSharedStore(),
  message: { success: false, error: 'Too many admin operations. Please try again later.' }
});

export function applyRateLimits(app: Express): void {
  app.use('/api/admin/login', adminLoginLimiter);
  app.use('/api/admin/leaderboard/edit-alias', adminMutationLimiter);
  app.use('/api/admin/leaderboard/hide', adminMutationLimiter);
  app.use('/api/admin/leaderboard/unhide', adminMutationLimiter);
  app.use('/api/admin/leaderboard/delete', adminMutationLimiter);
  app.use('/api/leaderboard', leaderboardFreshReadLimiter);
  app.use('/api/leaderboard', leaderboardReadLimiter);
  app.use('/api/research/session', sessionStartLimiter);
  app.use('/api/sessions', generalSessionsLimiter);
  app.use('/api/research/submit', sessionSubmitLimiter);
  app.use('/api/leaderboard/submit', leaderboardSubmitLimiter);
  app.use('/api/research/verify-provenance', verificationLimiter);
  app.use('/api/leaderboard/verify-provenance', verificationLimiter);
  app.use(generalApiLimiter);
}
