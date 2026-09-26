import * as Sentry from "@sentry/react";

const SENSITIVE_KEYS = [
  'uid',
  'token',
  'email',
  'displayName',
  'participant',
  'reactionTimes',
  'observations',
  'dataset',
  'session'
];

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
      if (SENSITIVE_KEYS.includes(key)) {
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
        Sentry.replayIntegration(),
      ],
      // Use conservative tracing
      tracesSampleRate: 0.1, 
      replaysSessionSampleRate: 0, // Disable replays by default for privacy
      replaysOnErrorSampleRate: 0.1, 
      
      // VERY IMPORTANT: Implement strict privacy filtering. 
      // Sentry MUST NOT receive reaction-time arrays, user info, Firebase UIDs, tokens, raw responses, or application state.
      beforeSend(event, hint) {
        if (event.user) event.user = sanitizeData(event.user);
        if (event.extra) event.extra = sanitizeData(event.extra);
        if (event.contexts) event.contexts = sanitizeData(event.contexts);
        if (event.tags) event.tags = sanitizeData(event.tags);
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(crumb => {
            if (crumb.data) crumb.data = sanitizeData(crumb.data);
            return crumb;
          });
        }
        
        // Scrub request headers for tokens
        if (event.request && event.request.headers) {
          if (event.request.headers['Authorization']) {
            event.request.headers['Authorization'] = '[Filtered]';
          }
          if (event.request.headers['authorization']) {
            event.request.headers['authorization'] = '[Filtered]';
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
