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
  'refreshtoken',
  'accesstoken',
  'idtoken',
  'apikey',
  'api_key'
]);

export function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_]/g, '');
  if (EXACT_SENSITIVE_KEYS.has(normalized)) return true;
  return SENSITIVE_SUBSTRINGS.some(sub => normalized.includes(sub));
}

export function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  return str
    // Email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[Scrubbed]')
    // Bearer / Auth tokens
    .replace(/Bearer\s+[^\s,;)]+/gi, 'Bearer [Filtered]')
    // Key-value pairs in strings, logs, URLs (e.g. sessionId=abc, uid: 123, token=secret, participant participant_123)
    .replace(/\b(uid|userId|user_id|userid|participantId|participant_id|participant|sessionId|session_id|session|token|authToken|auth_token|accessToken|access_token|idToken|password|secret|rawObservations|reactionTimes|dataset)\b\s*[:=\s]\s*(\[[^\]]*\]|"[^"]*"|'[^']*'|[^\s,;&)]+)/gi, '$1=[Scrubbed]');
}

export function sanitizeUrl(urlStr: string): string {
  if (typeof urlStr !== 'string') return urlStr;
  try {
    const parsed = new URL(urlStr, 'http://localhost');
    if (parsed.search) {
      const params = new URLSearchParams(parsed.search);
      for (const key of Array.from(params.keys())) {
        if (isSensitiveKey(key)) {
          params.set(key, '[Scrubbed]');
        }
      }
      parsed.search = params.toString();
    }
    return urlStr.startsWith('http://') || urlStr.startsWith('https://')
      ? parsed.toString()
      : parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return sanitizeString(urlStr);
  }
}

export function sanitizeData(data: any, seen = new WeakSet()): any {
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
      // Explicit deny-by-default Sentry v11 data collection
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        graphQL: {
          document: false,
          variables: false
        },
        genAI: {
          inputs: false,
          outputs: false
        },
        databaseQueryData: false,
        queues: false,
        stackFrameVariables: false,
      },
      // Use conservative tracing with streamed spans protected
      tracesSampleRate: 0.1, 
      replaysSessionSampleRate: 0, // Disable replays completely for privacy
      replaysOnErrorSampleRate: 0, 
      
      // VERY IMPORTANT: Implement strict privacy filtering. 
      // Sentry MUST NOT receive reaction-time arrays, user info, Firebase UIDs, tokens, raw responses, or application state.
      beforeSend(event, hint) {
        // Strip user identity object completely
        if (event.user) {
          delete event.user;
        }

        // Sanitize top-level message
        if (event.message) {
          event.message = sanitizeString(event.message);
        }

        // Sanitize exception messages and mechanisms
        if (event.exception?.values) {
          for (const exc of event.exception.values) {
            if (exc.value) {
              exc.value = sanitizeString(exc.value);
            }
            if (exc.type) {
              exc.type = sanitizeString(exc.type);
            }
            if (exc.mechanism?.data) {
              exc.mechanism.data = sanitizeData(exc.mechanism.data);
            }
          }
        }

        if (event.extra) event.extra = sanitizeData(event.extra);
        if (event.contexts) event.contexts = sanitizeData(event.contexts);
        if (event.tags) event.tags = sanitizeData(event.tags);
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(crumb => {
            if (crumb.data) crumb.data = sanitizeData(crumb.data);
            if (crumb.message) crumb.message = sanitizeString(crumb.message);
            return crumb;
          });
        }
        
        // Scrub request URLs, query parameters, headers, cookies, and bodies
        if (event.request) {
          if (event.request.url) {
            event.request.url = sanitizeUrl(event.request.url);
          }
          if (event.request.query_string) {
            if (typeof event.request.query_string === 'string') {
              event.request.query_string = sanitizeString(event.request.query_string);
            } else if (Array.isArray(event.request.query_string)) {
              event.request.query_string = event.request.query_string.map(([k, v]) => [
                k,
                isSensitiveKey(k) ? '[Scrubbed]' : sanitizeString(v)
              ]);
            } else if (typeof event.request.query_string === 'object' && event.request.query_string !== null) {
              const scrubbed: Record<string, string> = {};
              for (const [k, v] of Object.entries(event.request.query_string)) {
                scrubbed[k] = isSensitiveKey(k) ? '[Scrubbed]' : sanitizeString(String(v));
              }
              event.request.query_string = scrubbed;
            }
          }
          if (event.request.headers) {
            const sensitiveHeaders = ['authorization', 'cookie', 'x-auth-token', 'set-cookie', 'proxy-authorization', 'x-api-key'];
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
                // Filter non-JSON request body entirely
                event.request.data = '[Filtered]';
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
        if (breadcrumb.message) {
          breadcrumb.message = sanitizeString(breadcrumb.message);
        }
        return breadcrumb;
      },

      beforeSendSpan(span) {
        if (span.name) {
          span.name = sanitizeString(span.name);
        }
        if (span.attributes) {
          const sanitizedAttrs: Record<string, any> = {};
          for (const [key, value] of Object.entries(span.attributes)) {
            if (isSensitiveKey(key)) {
              sanitizedAttrs[key] = '[Scrubbed]';
            } else if (typeof value === 'string') {
              sanitizedAttrs[key] = sanitizeString(value);
            } else if (typeof value === 'object' && value !== null) {
              sanitizedAttrs[key] = sanitizeData(value);
            } else {
              sanitizedAttrs[key] = value;
            }
          }
          span.attributes = sanitizedAttrs as any;
        }
        return span;
      }
    });
  }
}
