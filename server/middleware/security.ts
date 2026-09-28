import type { Express } from 'express';

/** URL prefix normalisation (Vercel/proxies) + production security headers / CSP. */
export function applySecurityMiddleware(app: Express): void {
  // Normalize incoming URLs for Vercel/proxies that might strip or preserve /api prefix
  app.use((req, _res, next) => {
    if (req.url && !req.url.startsWith('/api') && (
      req.url.startsWith('/research') ||
      req.url.startsWith('/leaderboard') ||
      req.url.startsWith('/admin') ||
      req.url.startsWith('/health') ||
      req.url.startsWith('/personal-best') ||
      req.url.startsWith('/sessions')
    )) {
      req.url = '/api' + req.url;
    }
    next();
  });

  // Production security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Do not set X-Frame-Options: SAMEORIGIN as it prevents AI Studio preview iframe rendering
    const isProd = process.env.NODE_ENV === 'production';
    const scriptSrc = isProd
      ? "script-src 'self' 'unsafe-inline' https://*.firebaseio.com https://*.googleapis.com https://apis.google.com https://*.gstatic.com https://va.vercel-scripts.com https://*.vercel-scripts.com"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseio.com https://*.googleapis.com https://apis.google.com https://*.gstatic.com https://va.vercel-scripts.com https://*.vercel-scripts.com";

    const connectSrc = isProd
      ? "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.run.app https://va.vercel-scripts.com https://vitals.vercel-insights.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io"
      : "connect-src 'self' ws: wss: https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.run.app https://va.vercel-scripts.com https://vitals.vercel-insights.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io";

    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.googleusercontent.com https://*.gstatic.com https://*.google.com",
      connectSrc,
      "worker-src 'self' blob:",
      "frame-ancestors 'self' https://*.google.com https://*.googleusercontent.com https://*.run.app https://ai.studio https://*.ai.studio https://aistudio.google.com"
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', csp);
    next();
  });
}
