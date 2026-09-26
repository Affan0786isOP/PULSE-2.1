import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/react';
import { initSentry } from '@/lib/sentry';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
}));

describe('PULSE 2.1 — Complete Sentry Privacy Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('B1. Replay configuration regression: completely disabled without replay integration', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];

    expect(initCall.replaysSessionSampleRate).toBe(0);
    expect(initCall.replaysOnErrorSampleRate).toBe(0);
    expect(Sentry.replayIntegration).not.toHaveBeenCalled();
  });

  it('B2. Explicit dataCollection: all privacy-sensitive categories explicitly denied', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const dc = initCall.dataCollection;

    expect(dc).toBeDefined();
    expect(dc?.userInfo).toBe(false);
    expect(dc?.cookies).toBe(false);
    expect(dc?.httpHeaders).toBe(false);
    expect(dc?.httpBodies).toEqual([]);
    expect(dc?.urlQueryParams).toBe(false);
    expect(dc?.graphQL).toEqual({ document: false, variables: false });
    expect(dc?.genAI).toEqual({ inputs: false, outputs: false });
    expect(dc?.databaseQueryData).toBe(false);
    expect(dc?.queues).toBe(false);
    expect(dc?.stackFrameVariables).toBe(false);
  });

  it('B3. User identity: event.user is completely removed to prevent identity leakage', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = {
      user: {
        id: 'firebase-uid-998877',
        email: 'participant@pulse-lab.in',
        ip_address: '192.168.1.1',
        username: 'subject_01'
      }
    };

    const sanitizedEvent = beforeSend(mockEvent as any, {} as any) as any;
    expect(sanitizedEvent.user).toBeUndefined();
  });

  it('B4. Message sanitization: scrubs embedded emails, UIDs, tokens, and telemetry in event.message', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    // Sensitive message
    const sensitiveEvent = {
      message: 'Failed transaction for user test.user@pulse.io with sessionId=sess_abc123, uid: uid_999, token=Bearer secret_jwt_123, and reactionTimes=[198, 204, 215]'
    };
    const sanitizedSensitive = beforeSend(sensitiveEvent as any, {} as any) as any;
    expect(sanitizedSensitive.message).not.toContain('test.user@pulse.io');
    expect(sanitizedSensitive.message).not.toContain('sess_abc123');
    expect(sanitizedSensitive.message).not.toContain('uid_999');
    expect(sanitizedSensitive.message).not.toContain('secret_jwt_123');
    expect(sanitizedSensitive.message).not.toContain('198, 204, 215');
    expect(sanitizedSensitive.message).toContain('[Scrubbed]');

    // Harmless message
    const harmlessEvent = {
      message: 'ChunkLoadError: Loading chunk 404 failed'
    };
    const sanitizedHarmless = beforeSend(harmlessEvent as any, {} as any) as any;
    expect(sanitizedHarmless.message).toBe('ChunkLoadError: Loading chunk 404 failed');
  });

  it('B5. Exception sanitization: scrubs exception values, types, and mechanism data', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = {
      exception: {
        values: [
          {
            type: 'Error: Auth failure for participant participant_777',
            value: 'Failed submission for user@example.com (Firebase UID: secret_uid_456, Authorization: Bearer jwt.token.here)',
            mechanism: {
              data: {
                sessionId: 'session_internal_11',
                safeFlag: true
              }
            }
          }
        ]
      }
    };

    const sanitizedEvent = beforeSend(mockEvent as any, {} as any) as any;
    const exc = sanitizedEvent.exception.values[0];

    expect(exc.type).not.toContain('participant_777');
    expect(exc.value).not.toContain('user@example.com');
    expect(exc.value).not.toContain('secret_uid_456');
    expect(exc.value).not.toContain('jwt.token.here');
    expect(exc.mechanism.data.sessionId).toBe('[Scrubbed]');
    expect(exc.mechanism.data.safeFlag).toBe(true);
  });

  it('B6. JSON request-body: recursively scrubs sensitive observation & credential fields', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = {
      request: {
        data: JSON.stringify({
          observations: [{ trial: 1, rt: 215 }],
          reactionTimes: [215, 198],
          participantId: 'part_001',
          sessionId: 'sess_999',
          uid: 'uid_111',
          email: 'test@pulse.io',
          token: 'token_val',
          protocol: 'reaction-test'
        })
      }
    };

    const sanitizedEvent = beforeSend(mockEvent as any, {} as any) as any;
    const parsedData = JSON.parse(sanitizedEvent.request.data);

    expect(parsedData.observations).toBe('[Scrubbed]');
    expect(parsedData.reactionTimes).toBe('[Scrubbed]');
    expect(parsedData.participantId).toBe('[Scrubbed]');
    expect(parsedData.sessionId).toBe('[Scrubbed]');
    expect(parsedData.uid).toBe('[Scrubbed]');
    expect(parsedData.email).toBe('[Scrubbed]');
    expect(parsedData.token).toBe('[Scrubbed]');
    expect(parsedData.protocol).toBe('reaction-test');
  });

  it('B7. Non-JSON request-body: completely filters non-JSON string payloads', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = {
      request: {
        data: 'sessionId=abc123&participantId=user999&email=user@example.com&token=secret'
      }
    };

    const sanitizedEvent = beforeSend(mockEvent as any, {} as any) as any;
    expect(sanitizedEvent.request.data).toBe('[Filtered]');
  });

  it('B8. Request URL/query: sanitizes sensitive query params while retaining safe paths', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = {
      request: {
        url: 'https://pulse-lab.in/api/test?sessionId=abc&uid=user1&token=secret&protocol=reaction',
        query_string: 'sessionId=abc&uid=user1&token=secret'
      }
    };

    const sanitizedEvent = beforeSend(mockEvent as any, {} as any) as any;
    expect(sanitizedEvent.request.url).not.toContain('sessionId=abc');
    expect(sanitizedEvent.request.url).not.toContain('uid=user1');
    expect(sanitizedEvent.request.url).not.toContain('token=secret');
    expect(sanitizedEvent.request.url).toContain('protocol=reaction');
    expect(sanitizedEvent.request.url).toContain('sessionId=%5BScrubbed%5D');
    expect(sanitizedEvent.request.query_string).not.toContain('abc');
  });

  it('B9 & B10. Request headers & cookies: filters Authorization, Cookie, and sensitive headers', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = {
      request: {
        headers: {
          'Authorization': 'Bearer super-secret-jwt',
          'Cookie': 'sessionId=abc; auth=xyz',
          'X-Auth-Token': 'tok_123',
          'Set-Cookie': 'session=abc',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        cookies: {
          token: 'jwt-12345',
          session: 'session-id'
        }
      }
    };

    const sanitizedEvent = beforeSend(mockEvent as any, {} as any) as any;

    expect(sanitizedEvent.request.headers['Authorization']).toBe('[Filtered]');
    expect(sanitizedEvent.request.headers['Cookie']).toBe('[Filtered]');
    expect(sanitizedEvent.request.headers['X-Auth-Token']).toBe('[Filtered]');
    expect(sanitizedEvent.request.headers['Set-Cookie']).toBe('[Filtered]');
    expect(sanitizedEvent.request.headers['Content-Type']).toBe('application/json');
    expect(sanitizedEvent.request.headers['User-Agent']).toBe('Mozilla/5.0');
    expect(sanitizedEvent.request.cookies).toEqual({
      token: '[Filtered]',
      session: '[Filtered]'
    });
  });

  it('B11. Nested object scrubbing: extra, contexts, tags, breadcrumbs recursively scrubbed', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;
    const beforeBreadcrumb = initCall.beforeBreadcrumb!;

    const mockEvent = {
      extra: {
        protocol: 'visual-reaction',
        nestedState: {
          uid: 'uid-secure-123',
          participantId: 'part-999',
          rawObservations: [{ trial: 1, rt: 215 }],
          safeMetric: 42
        }
      },
      tags: {
        session: 'session-xyz',
        auth_token: 'token_abc',
        browser: 'Firefox'
      },
      contexts: {
        dataset: [{ recordId: 'secret-record' }],
        appState: {
          userEmail: 'user@pulse.io',
          screen: 'ReactionTest'
        }
      },
      breadcrumbs: [
        {
          category: 'ui.click',
          message: 'Clicked start with participant participant_123',
          data: { reactionTimes: [210, 195], buttonId: 'start-btn' }
        }
      ]
    };

    const sanitizedEvent = beforeSend(mockEvent as any, {} as any) as any;

    expect(sanitizedEvent.extra.nestedState.uid).toBe('[Scrubbed]');
    expect(sanitizedEvent.extra.nestedState.participantId).toBe('[Scrubbed]');
    expect(sanitizedEvent.extra.nestedState.rawObservations).toBe('[Scrubbed]');
    expect(sanitizedEvent.extra.nestedState.safeMetric).toBe(42);

    expect(sanitizedEvent.tags.session).toBe('[Scrubbed]');
    expect(sanitizedEvent.tags.auth_token).toBe('[Scrubbed]');
    expect(sanitizedEvent.tags.browser).toBe('Firefox');

    expect(sanitizedEvent.contexts.dataset).toBe('[Scrubbed]');
    expect(sanitizedEvent.contexts.appState.userEmail).toBe('[Scrubbed]');
    expect(sanitizedEvent.contexts.appState.screen).toBe('ReactionTest');

    expect(sanitizedEvent.breadcrumbs[0].data.reactionTimes).toBe('[Scrubbed]');
    expect(sanitizedEvent.breadcrumbs[0].data.buttonId).toBe('start-btn');
    expect(sanitizedEvent.breadcrumbs[0].message).not.toContain('participant_123');

    // Test beforeBreadcrumb hook
    const mockCrumb = {
      category: 'xhr',
      message: 'Request to /api/session for user user@pulse.io',
      data: {
        token: 'auth-token',
        status_code: 200
      }
    };
    const sanitizedCrumb = beforeBreadcrumb(mockCrumb as any, {} as any) as any;
    expect(sanitizedCrumb.data.token).toBe('[Scrubbed]');
    expect(sanitizedCrumb.data.status_code).toBe(200);
    expect(sanitizedCrumb.message).not.toContain('user@pulse.io');
  });

  it('B12. Streamed span privacy: beforeSendSpan protects span name and all sensitive attributes', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSendSpan = initCall.beforeSendSpan!;
    expect(beforeSendSpan).toBeDefined();

    const mockSpan = {
      name: 'HTTP POST /api/benchmark?sessionId=secret_session_123',
      trace_id: 'trace_123',
      span_id: 'span_456',
      start_timestamp: 1000,
      status: 'ok' as const,
      is_segment: false,
      attributes: {
        'url.query': 'sessionId=secret_session_123&uid=secret_uid',
        'sessionId': 'sess_12345',
        'participantId': 'part_999',
        'reactionTimes': [200, 195],
        'http.status_code': 200,
        'app.version': '2.1.0'
      }
    };

    const sanitizedSpan = beforeSendSpan(mockSpan as any) as any;

    expect(sanitizedSpan.name).not.toContain('secret_session_123');
    expect(sanitizedSpan.attributes['url.query']).not.toContain('secret_session_123');
    expect(sanitizedSpan.attributes['sessionId']).toBe('[Scrubbed]');
    expect(sanitizedSpan.attributes['participantId']).toBe('[Scrubbed]');
    expect(sanitizedSpan.attributes['reactionTimes']).toBe('[Scrubbed]');
    expect(sanitizedSpan.attributes['http.status_code']).toBe(200);
    expect(sanitizedSpan.attributes['app.version']).toBe('2.1.0');
  });
});
