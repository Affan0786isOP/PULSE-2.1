import { describe, expect, it, vi } from 'vitest';
import { applyRateLimits } from '../../server/config/rateLimits';

describe('Rate Limits Boundary Security Tests (BUG-6)', () => {
  it('protects /api/leaderboard/verify-submission with rate limiting middleware', () => {
    const registeredRoutes: string[] = [];
    const app = {
      use: vi.fn((pathOrHandler: unknown) => {
        if (typeof pathOrHandler === 'string') {
          registeredRoutes.push(pathOrHandler);
        }
      })
    } as any;
    applyRateLimits(app);
    expect(registeredRoutes).toContain('/api/leaderboard/verify-submission');
    expect(registeredRoutes).toContain('/api/leaderboard/verify-provenance');
    expect(registeredRoutes).toContain('/api/research/verify-provenance');
  });
});
