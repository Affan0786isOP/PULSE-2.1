import { describe, it, expect, vi } from 'vitest';
import * as Sentry from '@sentry/react';
import { initSentry } from '@/lib/sentry';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
}));

describe('Sentry Privacy Scrubber', () => {
  it('recursively scrubs sensitive fields from beforeSend and beforeBreadcrumb', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'dummy-dsn');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
    const beforeSend = initCall.beforeSend!;
    const beforeBreadcrumb = initCall.beforeBreadcrumb!;

    const mockEvent = {
      user: { email: 'test@example.com', id: '123' },
      extra: {
        nested: {
          uid: 'secret1',
          participant: 'secret2',
          safe: 'data'
        }
      },
      tags: { session: 'session_123', version: '1.0' },
      contexts: {
        dataset: [{ recordId: 'secret3', info: 'ok' }],
        appState: {
          screen: 'ReactionTest',
          email: 'user@pulse-lab.in'
        }
      },
      breadcrumbs: [{ data: { reactionTimes: [1, 2, 3], safeArray: [1] } }]
    };

    const sanitizedEvent = beforeSend(mockEvent as any, {} as any) as any;
    
    // Check user
    expect(sanitizedEvent.user.email).toBe('[Scrubbed]');
    expect(sanitizedEvent.user.id).toBe('123');
    
    // Check nested extra
    expect(sanitizedEvent.extra.nested.uid).toBe('[Scrubbed]');
    expect(sanitizedEvent.extra.nested.participant).toBe('[Scrubbed]');
    expect(sanitizedEvent.extra.nested.safe).toBe('data');
    
    // Check tags
    expect(sanitizedEvent.tags.session).toBe('[Scrubbed]');
    expect(sanitizedEvent.tags.version).toBe('1.0');
    
    // Check contexts: sensitive dataset key is scrubbed
    expect(sanitizedEvent.contexts.dataset).toBe('[Scrubbed]');
    
    // Check nested context with non-sensitive parent
    expect(sanitizedEvent.contexts.appState.screen).toBe('ReactionTest');
    expect(sanitizedEvent.contexts.appState.email).toBe('[Scrubbed]');

    // Check breadcrumbs inside beforeSend
    expect(sanitizedEvent.breadcrumbs[0].data.reactionTimes).toBe('[Scrubbed]');
    expect(sanitizedEvent.breadcrumbs[0].data.safeArray).toEqual([1]);
    
    // Check beforeBreadcrumb hook
    const mockCrumb = { data: { token: 'secretToken', normal: 123 } };
    const sanitizedCrumb = beforeBreadcrumb(mockCrumb as any, {} as any) as any;
    expect(sanitizedCrumb.data.token).toBe('[Scrubbed]');
    expect(sanitizedCrumb.data.normal).toBe(123);
  });
});
