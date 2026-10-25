# Leaderboard Edge SWR Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend public leaderboard caching to edge CDN using Stale-While-Revalidate (`s-maxage=15, stale-while-revalidate=60`) on Vercel Edge while keeping client-side caching authoritative and bypassable via `&fresh=1`.

**Architecture:** Update `server/routes/leaderboardRoutes.ts` to emit `public, s-maxage=15, stale-while-revalidate=60` on normal `/api/leaderboard` GET requests, and strict `no-store, no-cache, must-revalidate` when `fresh=true` or error status. Adjust `vercel.json` and `server/index.ts` so route-specific cache headers for `/api/leaderboard` override global `/api` defaults without leaking private or mutation endpoints.

**Tech Stack:** Node.js, Express, Vercel Serverless / Edge CDN, Vitest, TypeScript.

**Spec:** [docs/superpowers/plans/2026-10-25-leaderboard-edge-caching.md](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/superpowers/plans/2026-10-25-leaderboard-edge-caching.md)

---

## Global Constraints

- Never cache authenticated or private routes (`/api/leaderboard/mine`, `/api/leaderboard/my-rank`, `/api/leaderboard/submit`, `/api/leaderboard/verify-*`). They must remain strict `no-store`.
- Normal `/api/leaderboard` responses must return `Cache-Control: public, s-maxage=15, stale-while-revalidate=60` (or `no-cache` for browsers so client in-memory cache remains authoritative).
- When `fresh=true` or `fresh=1` is passed, `Cache-Control` MUST return `no-store, no-cache, must-revalidate` and `Surrogate-Control: no-store` to bypass any CDN intermediate cache.
- Non-200 responses (e.g. 400, 500, 503) must never be cached at the edge CDN.

## Review Focus

1. **Forced-fresh bypass:** Requesting `GET /api/leaderboard?assessmentType=visual-reaction&fresh=1` must emit `no-store` at the edge to ensure immediate fresh data fetch.
2. **Error response insulation:** Any 4xx or 5xx returned by `/api/leaderboard` must return `no-store` headers so CDNs do not cache degraded states.
3. **Private endpoint safety:** Authenticated endpoints like `/api/leaderboard/my-rank` and `/api/leaderboard/mine` must never inherit public edge cache headers.
4. **Vercel route configuration:** Ensure `vercel.json` routing/headers prioritize specific `/api/leaderboard` rules ahead of catch-all `/api/(.*)` no-store rules.
5. **Client memory cache alignment:** Verify client-side `firestore.ts` continues to function seamlessly with edge CDN responses and proper rate-limiting.

---

## Task Structure

### Task 1: Update Leaderboard HTTP Route Cache-Control Headers

**Files:**
- Modify: `server/routes/leaderboardRoutes.ts:285-316`
- Test: `tests/unit/leaderboardHttpCache.test.ts`

**Interfaces:**
- Consumes: Express request & response (`req.query.fresh`, `res.setHeader`)
- Produces: Correct `Cache-Control` response headers on `/api/leaderboard`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/leaderboardHttpCache.test.ts
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { registerLeaderboardRoutes } from '../../server/routes/leaderboardRoutes';

describe('/api/leaderboard Edge SWR Caching Headers', () => {
  const app = express();
  app.use(express.json());

  const mockLeaderboardService = {
    getPublicLeaderboard: vi.fn().mockResolvedValue([
      { id: '1', displayName: 'Player 1', scoreMetric: 180, assessmentType: 'visual-reaction' }
    ])
  };

  registerLeaderboardRoutes(app, {
    leaderboardService: mockLeaderboardService as any
  });

  it('sets public s-maxage and stale-while-revalidate for standard GET requests', async () => {
    const res = await request(app).get('/api/leaderboard?assessmentType=visual-reaction');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, s-maxage=15, stale-while-revalidate=60');
    expect(res.headers['surrogate-control']).toBeUndefined();
  });

  it('sets strict no-store when fresh=1 is requested', async () => {
    const res = await request(app).get('/api/leaderboard?assessmentType=visual-reaction&fresh=1');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
    expect(res.headers['surrogate-control']).toBe('no-store');
  });

  it('sets strict no-store on error responses', async () => {
    const res = await request(app).get('/api/leaderboard'); // Missing assessmentType -> 400
    expect(res.status).toBe(400);
    expect(res.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, private');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/leaderboardHttpCache.test.ts`
Expected: FAIL due to existing hardcoded `no-store` headers on `/api/leaderboard`.

- [ ] **Step 3: Implement route header logic in leaderboardRoutes.ts**

Update `server/routes/leaderboardRoutes.ts` to conditionally set:
```typescript
if (isFresh) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
} else {
  res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
  res.removeHeader('Surrogate-Control');
}
```
And on catch/error blocks, set strict `no-store, no-cache, must-revalidate, private`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/leaderboardHttpCache.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/routes/leaderboardRoutes.ts tests/unit/leaderboardHttpCache.test.ts
git commit -m "feat(cache): set edge SWR headers on /api/leaderboard with fresh bypass"
```

---

### Task 2: Configure Vercel Edge & Express Middleware Overrides

**Files:**
- Modify: `server/index.ts`
- Modify: `vercel.json`
- Test: `tests/unit/staticRoutesCache.test.ts`

**Interfaces:**
- Consumes: Server middleware chain and Vercel edge configuration
- Produces: Unblocked edge caching for `/api/leaderboard` while keeping all other `/api/*` endpoints private `no-store`

- [ ] **Step 1: Write test for server middleware exception**

Update `tests/unit/staticRoutesCache.test.ts` to verify that general `/api` routes receive `no-store`, but `/api/leaderboard` allows edge SWR headers.

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run tests/unit/staticRoutesCache.test.ts`
Expected: Verify behavior against test expectations.

- [ ] **Step 3: Update server/index.ts and vercel.json**

In `server/index.ts`:
Exclude `/api/leaderboard` from the early unconditional `no-store` override if present, allowing the route handler's `res.setHeader` to take effect.
In `vercel.json`:
Add explicit rule for `/api/leaderboard` before the catch-all `/api/(.*)` rule if required, or ensure headers passed by serverless function are honored.

- [ ] **Step 4: Run tests and verify regression safety**

Run: `npx vitest run tests/unit/staticRoutesCache.test.ts tests/unit/leaderboardHttpCache.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/index.ts vercel.json tests/unit/staticRoutesCache.test.ts
git commit -m "fix(cache): enable edge SWR caching on vercel and express middleware for leaderboard"
```

---

### Task 3: Full End-to-End Verification

**Files:**
- Test: `tests/unit/leaderboardCache.test.ts`
- Test: `tests/unit/clientCache.test.ts`
- Test: `tests/unit/leaderboardHttpCache.test.ts`

- [ ] **Step 1: Run comprehensive cache test suite**

Run: `npx vitest run tests/unit/leaderboardCache.test.ts tests/unit/clientCache.test.ts tests/unit/leaderboardHttpCache.test.ts tests/unit/staticRoutesCache.test.ts`
Expected: All tests PASS with 0 failures.

- [ ] **Step 2: Commit & document**

```bash
git commit --allow-empty -m "chore: verify leaderboard edge swr caching suite"
```
