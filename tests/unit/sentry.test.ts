import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/react';
import { initSentry } from '@/lib/sentry';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
}));

describe('Sentry Privacy Scrubber & Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('configures Sentry with replay completely disabled (sample rates = 0)', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];

    expect(initCall.replaysSessionSampleRate).toBe(0);
    expect(initCall.replaysOnErrorSampleRate).toBe(0);
    expect(initCall.tracesSampleRate).toBe(0.1);
  });

  it('scrubs event.user.id and email without leaking Firebase UID or user identifiers', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = {
      user: {
        id: 'firebase-uid-998877',
        email: 'user@example.com',
        ip_address: '192.168.1.1',
        segment: 'pilot-group'
      }
    };

    const sanitizedEvent = beforeSend(mockEvent as any, {} as any) as any;

    expect(sanitizedEvent.user.id).toBe('[Scrubbed]');
    expect(sanitizedEvent.user.email).toBe('[Scrubbed]');
    expect(sanitizedEvent.user.ip_address).toBe('[Scrubbed]');
    expect(sanitizedEvent.user.segment).toBe('pilot-group');
  });

  it('scrubs sensitive tags while preserving harmless diagnostic tags', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = {
      tags: {
        session: 'session-xyz-123',
        auth_token: 'token_abc',
        browser: 'Firefox',
        app_version: '2.1.0'
      }
    };

    const sanitizedEvent = beforeSend(mockEvent as any, {} as any) as any;

    expect(sanitizedEvent.tags.session).toBe('[Scrubbed]');
    expect(sanitizedEvent.tags.auth_token).toBe('[Scrubbed]');
    expect(sanitizedEvent.tags.browser).toBe('Firefox');
    expect(sanitizedEvent.tags.app_version).toBe('2.1.0');
  });

  it('recursively scrubs nested uid, participant, observations, dataset, session, and email in extra & contexts', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = {
      extra: {
        protocol: 'visual-reaction',
        nestedState: {
          uid: 'uid-secure-123',
          participant: {
            id: 'participant-999',
            ageGroup: 'Adults (26–40)'
          },
          rawObservations: [
            { trial: 1, rt: 215 },
            { trial: 2, rt: 198 }
          ],
          safeMetric: 42
        }
      },
      contexts: {
        dataset: [{ recordId: 'secret-record', info: 'ok' }],
        experiment: {
          screen: 'ReactionTest',
          userEmail: 'user@pulse-lab.in',
          diagnosticCode: 'ERR_RENDER'
        }
      }
    };

    const sanitizedEvent = beforeSend(mockEvent as any, {} as any) as any;

    // Extra checks
    expect(sanitizedEvent.extra.protocol).toBe('visual-reaction');
    expect(sanitizedEvent.extra.nestedState.uid).toBe('[Scrubbed]');
    expect(sanitizedEvent.extra.nestedState.participant).toBe('[Scrubbed]');
    expect(sanitizedEvent.extra.nestedState.rawObservations).toBe('[Scrubbed]');
    expect(sanitizedEvent.extra.nestedState.safeMetric).toBe(42);

    // Contexts checks
    expect(sanitizedEvent.contexts.dataset).toBe('[Scrubbed]');
    expect(sanitizedEvent.contexts.experiment.screen).toBe('ReactionTest');
    expect(sanitizedEvent.contexts.experiment.userEmail).toBe('[Scrubbed]');
    expect(sanitizedEvent.contexts.experiment.diagnosticCode).toBe('ERR_RENDER');
  });

  it('scrubs sensitive request headers, cookies, and request data', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;

    const mockEvent = {
      request: {
        url: 'https://pulse.app/api/benchmark',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer super-secret-jwt-token',
          'Cookie': 'sessionId=abc12345; auth=xyz',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        cookies: {
          token: 'jwt-12345',
          session: 'session-id'
        },
        data: {
          observations: [{ trial: 1, latency: 190 }],
          action: 'submit_assessment'
        }
      }
    };

    const sanitizedEvent = beforeSend(mockEvent as any, {} as any) as any;

    expect(sanitizedEvent.request.headers['Authorization']).toBe('[Filtered]');
    expect(sanitizedEvent.request.headers['Cookie']).toBe('[Filtered]');
    expect(sanitizedEvent.request.headers['Content-Type']).toBe('application/json');
    expect(sanitizedEvent.request.headers['User-Agent']).toBe('Mozilla/5.0');
    expect(sanitizedEvent.request.cookies).toEqual({
      token: '[Filtered]',
      session: '[Filtered]'
    });
    expect(sanitizedEvent.request.data.observations).toBe('[Scrubbed]');
    expect(sanitizedEvent.request.data.action).toBe('submit_assessment');
  });

  it('scrubs breadcrumb data in beforeBreadcrumb and beforeSend', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-key@sentry.io/12345');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;
    const beforeBreadcrumb = initCall.beforeBreadcrumb!;

    // Test beforeSend breadcrumbs
    const mockEvent = {
      breadcrumbs: [
        {
          category: 'ui.click',
          message: 'Clicked start',
          data: { reactionTimes: [210, 195], buttonId: 'start-btn' }
        }
      ]
    };
    const sanitizedEvent = beforeSend(mockEvent as any, {} as any) as any;
    expect(sanitizedEvent.breadcrumbs[0].data.reactionTimes).toBe('[Scrubbed]');
    expect(sanitizedEvent.breadcrumbs[0].data.buttonId).toBe('start-btn');

    // Test beforeBreadcrumb hook
    const mockCrumb = {
      category: 'xhr',
      data: {
        token: 'auth-bearer-token',
        status_code: 200
      }
    };
    const sanitizedCrumb = beforeBreadcrumb(mockCrumb as any, {} as any) as any;
    expect(sanitizedCrumb.data.token).toBe('[Scrubbed]');
    expect(sanitizedCrumb.data.status_code).toBe(200);
  });
});
