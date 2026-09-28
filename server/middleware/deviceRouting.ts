import type express from 'express';
import type { Express } from 'express';

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.substring(0, idx).trim();
      const val = pair.substring(idx + 1).trim();
      if (key) {
        try {
          cookies[key] = decodeURIComponent(val);
        } catch {
          // Fallback to raw value if decodeURIComponent throws on malformed URI encoding
          cookies[key] = val;
        }
      }
    }
  }
  return cookies;
}

export function isTruthyRoutingFlag(val: unknown): boolean {
  if (!val) return false;
  const v = String(val).toLowerCase().trim();
  return v === '1' || v === 'true' || v === 'yes';
}

export function isMobileUserAgent(req: express.Request): boolean {
  const secChMobile = req.headers['sec-ch-ua-mobile'];
  if (secChMobile === '?1') return true;
  const ua = (req.headers['user-agent'] as string) || '';
  if (!ua) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk|Kindle|KFAPWI|Fennec|Windows Phone|SamsungBrowser|MiuiBrowser|UCBrowser/i.test(ua);
}

/** Staging robots/noindex handling + desktop/mobile auto-redirection (see ADR-002). */
export function applyDeviceRoutingMiddleware(app: Express): void {
  // Environment-aware indexing & Robots handler for staging/test environments
  app.use((req, res, next) => {
    const host = (req.headers.host || '').toLowerCase();
    const isStaging = host.includes('test.pulse-lab.in') || 
                      host.includes('staging') || 
                      host.includes('test.') || 
                      host.includes('ais-dev') || 
                      host.includes('run.app');

    if (isStaging) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      if (req.path === '/robots.txt') {
        res.setHeader('Content-Type', 'text/plain');
        return res.send('User-agent: *\nDisallow: /\n');
      }
    }

    next();
  });

  // Mobile Auto-Redirection Middleware
  app.use((req, res, next) => {
    const url = req.url || '';
    const pathname = req.path || '';

    const queryParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
    const cleanParams = new URLSearchParams(queryParams);
    let hasRoutingParams = false;
    ['force_mobile', 'mobile', 'force_desktop', 'desktop'].forEach(k => {
      if (cleanParams.has(k)) {
        cleanParams.delete(k);
        hasRoutingParams = true;
      }
    });
    const cleanQueryString = cleanParams.toString() ? '?' + cleanParams.toString() : '';

    // Direct /mobile without trailing slash to /mobile/
    if (pathname === '/mobile') {
      return res.redirect(301, `/mobile/${cleanQueryString}`);
    }

    // Ignore API, mobile assets, or static asset requests
    if (
      pathname.startsWith('/api') ||
      pathname.startsWith('/mobile') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/@') ||
      pathname.startsWith('/node_modules') ||
      pathname.startsWith('/src') ||
      pathname.match(/\.(js|jsx|ts|tsx|css|json|png|jpg|jpeg|gif|svg|ico|webmanifest|map|woff2?|ttf|eot)$/i)
    ) {
      return next();
    }

    const hasForceMobileParam = isTruthyRoutingFlag(queryParams.get('force_mobile')) || isTruthyRoutingFlag(queryParams.get('mobile'));
    const hasForceDesktopParam = isTruthyRoutingFlag(queryParams.get('force_desktop')) || isTruthyRoutingFlag(queryParams.get('desktop'));

    const cookies = parseCookies(req.headers.cookie);
    const cookieDesktop = isTruthyRoutingFlag(cookies['pulse_force_desktop']);
    const cookieMobile = isTruthyRoutingFlag(cookies['pulse_force_mobile']);

    if (hasForceMobileParam) {
      res.setHeader('Set-Cookie', [
        'pulse_force_desktop=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'pulse_force_mobile=true; Path=/; Max-Age=86400; SameSite=Lax'
      ]);
    } else if (hasForceDesktopParam) {
      res.setHeader('Set-Cookie', [
        'pulse_force_mobile=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'pulse_force_desktop=true; Path=/; Max-Age=86400; SameSite=Lax'
      ]);
    }

    const isExplicitForceMobile = hasForceMobileParam || (!hasForceDesktopParam && cookieMobile);
    const isExplicitForceDesktop = !isExplicitForceMobile && (hasForceDesktopParam || cookieDesktop);

    function sanitizeRedirectPath(p: string): string {
      if (!p || typeof p !== 'string') return '/';
      const cleaned = p.replace(/^[\/\\]+/, '/');
      return cleaned.startsWith('/') ? cleaned : '/' + cleaned;
    }

    if (isExplicitForceDesktop) {
      if (hasRoutingParams) {
        return res.redirect(302, sanitizeRedirectPath(pathname) + cleanQueryString);
      }
      return next();
    }

    if (isExplicitForceMobile || isMobileUserAgent(req)) {
      const cleanPath = (pathname === '/' || pathname === '' || pathname === '/index.html') 
        ? '/' 
        : pathname;
      const targetPath = cleanPath === '/' ? '/mobile/' : `/mobile${cleanPath}`;
      res.setHeader('Vary', 'User-Agent, Sec-CH-UA-Mobile');
      return res.redirect(302, sanitizeRedirectPath(targetPath) + cleanQueryString);
    }

    next();
  });
}
