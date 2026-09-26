import * as Sentry from "@sentry/react";

const SENSITIVE_SUBSTRINGS = [
  'email',
  'token',
  'participant',
  'observation',
  'reactiontime',
  'password',
  'secret',
  'cookie',
  'dataset',
  'session',
  'displayname',
];

const EXACT_SENSITIVE_KEYS = new Set([
  'uid',
  'user_id',
  'userid',
  'auth',
  'authorization',
]);

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_]/g, '');
  if (EXACT_SENSITIVE_KEYS.has(normalized)) return true;
  return SENSITIVE_SUBSTRINGS.some(sub => normalized.includes(sub));
}

function sanitizeData(data: any, seen = new WeakSet()): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  if (seen.has(data)) {
    return '[Circular]';
  }
  seen.add(data);

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, seen));
  }

  const sanitized: Record<string, any> = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = '[Scrubbed]';
      } else {
        sanitized[key] = sanitizeData(data[key], seen);
      }
    }
  }
  return sanitized;
}

export function initSentry() {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE || 'development',
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
      // Use conservative tracing
      tracesSampleRate: 0.1, 
      replaysSessionSampleRate: 0, // Disable replays completely for privacy
      replaysOnErrorSampleRate: 0, 
      
      // VERY IMPORTANT: Implement strict privacy filtering. 
      // Sentry MUST NOT receive reaction-time arrays, user info, Firebase UIDs, tokens, raw responses, or application state.
      beforeSend(event, hint) {
        if (event.user) {
          const sanitizedUser = sanitizeData(event.user);
          if (sanitizedUser.id) {
            sanitizedUser.id = '[Scrubbed]';
          }
          if (sanitizedUser.ip_address) {
            sanitizedUser.ip_address = '[Scrubbed]';
          }
          event.user = sanitizedUser;
        }
        if (event.extra) event.extra = sanitizeData(event.extra);
        if (event.contexts) event.contexts = sanitizeData(event.contexts);
        if (event.tags) event.tags = sanitizeData(event.tags);
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(crumb => {
            if (crumb.data) crumb.data = sanitizeData(crumb.data);
            return crumb;
          });
        }
        
        // Scrub request headers, cookies, and body data for credentials/observations
        if (event.request) {
          if (event.request.headers) {
            const sensitiveHeaders = ['authorization', 'cookie', 'x-auth-token', 'set-cookie'];
            for (const h in event.request.headers) {
              if (sensitiveHeaders.includes(h.toLowerCase())) {
                event.request.headers[h] = '[Filtered]';
              }
            }
          }
          if (event.request.cookies) {
            if (typeof event.request.cookies === 'object' && event.request.cookies !== null) {
              const scrubbedCookies: Record<string, string> = {};
              for (const cookieKey of Object.keys(event.request.cookies)) {
                scrubbedCookies[cookieKey] = '[Filtered]';
              }
              event.request.cookies = scrubbedCookies;
            } else {
              event.request.cookies = { cookie: '[Filtered]' };
            }
          }
          if (event.request.data) {
            if (typeof event.request.data === 'string') {
              try {
                const parsed = JSON.parse(event.request.data);
                event.request.data = JSON.stringify(sanitizeData(parsed));
              } catch {
                // Non-JSON payload, preserve non-sensitive string
              }
            } else {
              event.request.data = sanitizeData(event.request.data);
            }
          }
        }

        return event;
      },

      beforeBreadcrumb(breadcrumb, hint) {
        if (breadcrumb.data) {
          breadcrumb.data = sanitizeData(breadcrumb.data);
        }
        return breadcrumb;
      }
    });
  }
}
