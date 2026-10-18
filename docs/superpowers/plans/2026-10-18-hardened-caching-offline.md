# Hardened Multi-Tier Caching & Offline Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a production-grade, hardened caching architecture across desktop (`/`) and mobile (`/mobile/`) surfaces, including HTTP/CDN cache headers, reliably precached offline Service Worker shells with safe asset allowlists, race-safe request-versioned server leaderboard TTL caching with forced fresh bypass (`?fresh=1`), ticket/generation-based client memory TTL caching with exact fetch timestamp retention, and a theme-matched accessible `WifiOff` offline indicator on both navbars.

**Architecture:**
- **Tier 1 (HTTP/CDN):** Strict 1-year immutable caching on hashed build assets in Express (`server/routes/staticRoutes.ts`), `stale-while-revalidate` on static icons/manifests/self-hosted fonts, and `no-cache` on dynamic HTML shells and service worker files (without unnecessary `no-store` on public HTML shells to protect browser history caching). Sensitive API responses and mutations retain strict `no-store, no-cache, must-revalidate, proxy-revalidate`. `vercel.json` headers preserved and aligned. Google Fonts HTTP headers are acknowledged as third-party and managed in Tier 2.
- **Tier 2 (Service Worker):** Bumps to `pulse-pwa-v4` and `pulse-mobile-pwa-v4`. Reliable precaching of HTML shell and build entry assets (dynamically generated during build or explicitly tracked), Cache-First for hashed assets, Stale-While-Revalidate for `fonts.googleapis.com` stylesheets, and Cache-First with CORS/opaque handling for `fonts.gstatic.com` font binaries. Scoped activation cleanup with zero cross-namespace deletion. Live session protection: existing clients remain functional while new service worker activates. Absolute exclusion of `/api/*`, `/personal-best`, `/research`, `/admin`, `/sessions`, `/health`, and mutations.
- **Tier 3 (Server Leaderboard):** In-memory 20s TTL cache with generation counters and forced-refresh isolation in `LeaderboardAppService`. A forced fresh read (`fresh=1`) atomically advances the generation or executes isolated from stale in-flight promises. Older in-flight responses are strictly prevented from overwriting fresh results. Concurrent fresh requests coalesce safely. Invalidations are wired across new score submissions, participant erasures, and admin actions (alias edit, hide, unhide, delete) via an extended `ILeaderboardService` and updated `registerAdminRoutes` dependencies.
- **Tier 4 (Client-Side TTL Memory Cache):** 30s in-memory TTL cache with per-assessment request tickets/generations in desktop and mobile `firestore.ts`. Outdated pending fetches cannot repopulate the cache after submission. Returns the exact timestamp of the underlying successful fetch (`fetchedAt`) so UI never displays a false "just updated" label for cached data. An immediate post-submission refresh and manual refresh button use `fetch(url, { cache: 'no-store' })` with `fresh=1`. 60s in-memory cache for `useAuthoritativeStats` in both surfaces with concurrent promise coalescing.
- **Offline Indicator:** Unobtrusive, theme-matching `WifiOff` status indicator (or lightweight info button with dialog explanation) in both desktop and mobile navigation bars driven by `usePwaInstall()`. Shows only when offline, disappears when online, with fixed geometry so navbar controls and assessment stages never shift layout. Zero disruption to active assessments or reaction-time timing.

**Tech Stack:** TypeScript, React 19, Vite 6, Express 4.21, Service Worker API, CacheStorage API, Lucide React (`WifiOff`), Vitest.

**Spec:** PULSE Scientific and Architectural Invariants (`.ai/RULES.md`, `.ai/CONTEXT.md`, `.ai/DECISIONS.md`).

## Global Constraints

- **Server-Authoritative Writes:** All mutations (`/api/research/submit`, `/api/leaderboard/submit`, `/api/research/session/start`) and admin endpoints MUST route through Express with Admin SDK attestation. Never cache, queue, or mock submissions offline.
- **Timing Integrity:** Stimulus presentation and response timing must remain hardware-accurate via `performance.now()`. No caching layer may introduce background delays, microtask starvation, or GC churn during active assessment runs ($RT \ge 80\text{ms}$).
- **Dual-Surface Consistency:** Desktop (`/`) and mobile (`/mobile/`) must exhibit identical caching policies, invalidation semantics, and theme-matched offline UX.
- **Zero Persistent Storage for Dynamic Data:** Never use `localStorage`, `sessionStorage`, or IndexedDB for leaderboard results, research data, or participant metrics. All dynamic caching is memory-only.
- **Vercel Serverless Isolation:** Document and treat in-memory caches as process-local. The fresh bypass (`?fresh=1` with `cache: 'no-store'`) guarantees authoritative live reads across separate serverless instances.

## Review Focus

1. **Server In-Flight Fresh Race Safety:** An ordinary in-flight request started before an invalidation or fresh request must never overwrite the new generation with stale data. Forced fresh reads must advance or supersede the generation and not join stale in-flight promises.
2. **Client-Side Generation/Ticket Safety:** A client fetch started before a score submission must not repopulate the client cache after submission completes.
3. **Cross-Instance Post-Submission Fresh Read:** Immediately following submission and manual refresh, client requests must use `cache: 'no-store'` with `fresh=1` to guarantee an authoritative live read even if routed to an alternate serverless instance.
4. **Administrative Invalidation Wiring:** `ILeaderboardService` must declare cache invalidation, `registerAdminRoutes` must receive a cache-invalidation callback, and mutations (hide, unhide, edit alias, delete) must trigger it only upon successful operation.
5. **Precache Shell & Entry Asset Availability:** Precache manifest or entry bundle list must ensure hashed entry JS/CSS and HTML shells are cached on first install, preserving live clients from broken chunks upon worker activation.
6. **Fetch Timestamp Truthfulness:** The UI must display the real timestamp of the underlying network fetch, never claiming cached data was "just updated".
7. **Offline Indicator Layout Stability:** The offline indicator must occupy a reserved or stable space to prevent layout shifts or viewport jumping during active assessments or navigation.

---

### Task 1: Tier 1 — Production Static Cache Headers in Express & Vercel

**Files:**
- Modify: `server/routes/staticRoutes.ts`
- Modify: `vercel.json`
- Create: `tests/unit/staticRoutesCache.test.ts`

**Interfaces:**
- Consumes: `express.static` setHeaders callback, Vercel headers config
- Produces: Correct `Cache-Control` response headers across Express and Vercel:
  - Hashed assets (`/assets/*`, `/mobile/assets/*`): `public, max-age=31536000, immutable`
  - Unversioned manifests/icons/self-hosted fonts (`.png`, `.svg`, `.ico`, `.webmanifest`, `.woff2`): `public, max-age=86400, stale-while-revalidate=604800`
  - Service workers (`/sw.js`, `/mobile/sw.js`): `no-cache`
  - HTML entries (`/`, `/mobile/`, `index.html`, `mobile/index.html`): `no-cache` (preserving browser history caching and service worker navigation fallback)
  - Sensitive API endpoints (`/api/*`): `no-store, no-cache, must-revalidate, proxy-revalidate`

- [ ] **Step 1: Write failing unit test for static route cache headers**

Create `tests/unit/staticRoutesCache.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import * as path from 'path';
import * as fs from 'fs';
import { registerStaticRoutes } from '../../server/routes/staticRoutes';

describe('Tier 1 Static Route Cache Headers', () => {
  it('assigns immutable caching to hashed build assets in /assets/ and /mobile/assets/', async () => { ... });
  it('assigns no-cache to service worker files', async () => { ... });
  it('assigns short-lived revalidation caching to webmanifest and icons', async () => { ... });
  it('assigns no-cache to HTML SPA fallbacks without unnecessary no-store', async () => { ... });
  it('preserves no-store and proxy-revalidate on API routes', async () => { ... });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/staticRoutesCache.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `server/routes/staticRoutes.ts` and `vercel.json`**

In `server/routes/staticRoutes.ts`:
- Enhance `setHeaders` for `express.static`:
  - If `normalized.includes('/assets/')`: `res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')`
  - If `normalized.endsWith('/sw.js')`: `res.setHeader('Cache-Control', 'no-cache')`
  - If matches `\.(png|jpg|jpeg|svg|ico|webmanifest|woff2)$`: `res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')`
- On HTML responses (`res.sendFile(index.html)` and `res.sendFile(mobile/index.html)`):
  - Set `res.setHeader('Cache-Control', 'no-cache')`
In `vercel.json`:
  - Preserve immutable rules for `/assets/:path*` and `/mobile/assets/:path*`.
  - Add explicit `no-cache` headers for `/sw.js` and `/mobile/sw.js`.
  - Add `stale-while-revalidate` for `manifest.webmanifest`, icons, and favicon.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/staticRoutesCache.test.ts`
Expected: PASS

---

### Task 2: Tier 2 — Scoped Service Worker Caching, Shell Precaching & Version Upgrade

**Files:**
- Modify: `public/sw.js`
- Modify: `mobile/public/sw.js`
- Modify: `scripts/generate-seo-pages.mjs` (or entry asset manifest injection)
- Create: `tests/unit/serviceWorkerCache.test.ts`

**Interfaces:**
- Consumes: Build entry assets, Browser `fetch` events, Service Worker `install` and `activate` lifecycle
- Produces: `pulse-pwa-v4` (desktop) and `pulse-mobile-pwa-v4` (mobile).
  - Reliable entry asset availability on first offline launch.
  - Scoped cache-first for hashed assets.
  - Stale-while-revalidate for `fonts.googleapis.com` stylesheets.
  - Cache-first with CORS/opaque error protection for `fonts.gstatic.com` font binaries.
  - Safe cache cleanup on activation: desktop cleans only `pulse-pwa-`, mobile cleans only `pulse-mobile-pwa-`. Live sessions are protected (in-flight client fetch fallbacks).
  - Explicit exclusion of `/api/*`, `/personal-best`, `/research`, `/admin`, `/sessions`, `/health`, and non-GET requests.

- [ ] **Step 1: Write failing unit test for Service Worker caching rules**

Create `tests/unit/serviceWorkerCache.test.ts`:
- Check desktop cache version `pulse-pwa-v4` and mobile `pulse-mobile-pwa-v4`.
- Verify activation cleanup cleans only its own prefix (`pulse-pwa-` vs `pulse-mobile-pwa-`).
- Verify asset allowlist covers `/assets/` and `/mobile/assets/`.
- Verify Google Fonts (`fonts.googleapis.com` and `fonts.gstatic.com`) handling with CORS protection.
- Verify explicit exclusion of `/api/*`, `/personal-best`, `/research`, `/admin`, `/sessions`, `/health`.
- Verify exclusion of non-GET requests.
- Verify entry asset precaching behavior for first offline launch.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/serviceWorkerCache.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `public/sw.js`, `mobile/public/sw.js`, and build entry precache injection**

Implement in both workers:
- Cache name: `pulse-pwa-v4` (desktop) / `pulse-mobile-pwa-v4` (mobile).
- Cache cleanup: on `activate`, delete obsolete keys matching prefix `pulse-pwa-` (for desktop) without touching `pulse-mobile-pwa-` (and vice-versa).
- Google Fonts caching:
  - `fonts.googleapis.com`: Stale-While-Revalidate with CORS/opaque handling.
  - `fonts.gstatic.com`: Cache-First with fallback to network.
- Hashed assets (`/assets/` or `/mobile/assets/`): Cache-First with network fallback.
- Navigation (`request.mode === 'navigate'`): Network-First with fallback to cached shell (`/` for desktop, `/mobile/` for mobile).
- Strict non-GET and `/api/*` exclusion.
- Update `scripts/generate-seo-pages.mjs` or build process to ensure the entry script and CSS bundles emitted in `dist/assets` are precached in the shell assets array.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/serviceWorkerCache.test.ts`
Expected: PASS

---

### Task 3: Tier 3 — Race-Safe Server Leaderboard TTL Cache with Fresh Bypass & Admin Invalidation

**Files:**
- Modify: `server/services/interfaces/ILeaderboardService.ts`
- Modify: `server/services/leaderboardAppService.ts`
- Modify: `server/routes/leaderboardRoutes.ts`
- Modify: `server/routes/adminRoutes.ts`
- Modify: `server/index.ts`
- Create: `tests/unit/leaderboardCache.test.ts`

**Interfaces:**
- Consumes: `getPublicLeaderboard(assessmentType?: string | null, options?: { fresh?: boolean })`, `invalidateCache(assessmentType?: string | null): void`
- Produces:
  - 20-second in-memory TTL cache keyed by canonical assessment ID.
  - Generation tracking: each assessment type maintains an integer generation counter.
  - Atomic advance on forced fresh read (`fresh=1`): forced fresh requests increment the generation (or run in an isolated fresh generation), ensuring they never join older in-flight promises and older in-flight reads cannot overwrite the fresh results.
  - Invalidation wired to:
    - New leaderboard submission (`submitLeaderboard`)
    - Participant erasure (`deleteMyLeaderboardEntries`)
    - Admin alias modification (`editLeaderboardAlias`)
    - Admin soft hide (`hideLeaderboardEntry`)
    - Admin unhide (`unhideLeaderboardEntry`)
    - Admin permanent delete (`deleteLeaderboardEntry`)
  - AdminRoutes receives `invalidateLeaderboardCache?: (assessmentType?: string | null) => void` in `AdminRoutesDependencies` and server container wiring in `server/index.ts`.

- [ ] **Step 1: Write failing unit test for server leaderboard cache races and invalidations**

Create `tests/unit/leaderboardCache.test.ts`:
- Fresh hit within 20 seconds returns cached records without calling repository.
- Expiry after 20 seconds reads fresh from repository.
- Concurrent reads coalesce into a single repository query.
- In-flight read race: If an ordinary read starts at Generation 1, an invalidation or forced fresh read bumps to Generation 2, the completing Generation 1 query MUST NOT overwrite Generation 2 cache.
- Calling `invalidateCache(type)` immediately forces next request to fetch live data.
- Passing `fresh=1` query parameter bypasses cache, runs an authoritative read, and advances/isolates the generation.
- Admin mutations (hide/unhide/alias/delete) invalidate cache only upon successful execution.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/leaderboardCache.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement generation-based TTL cache and admin invalidation wiring**

In `server/services/interfaces/ILeaderboardService.ts`:
- Add `invalidateCache?(assessmentType?: string | null): void;`
- Update `getPublicLeaderboard(assessmentType?: string | null, options?: { fresh?: boolean }): Promise<LeaderboardEntryRecord[]>;`

In `server/services/leaderboardAppService.ts`:
- Add generation counter and cache store:
  ```typescript
  interface CacheEntry {
    generation: number;
    timestamp: number;
    data: LeaderboardEntryRecord[];
  }
  private readonly generations = new Map<string, number>();
  private readonly leaderboardCache = new Map<string, CacheEntry>();
  private readonly publicLeaderboardInFlight = new Map<string, { generation: number; promise: Promise<LeaderboardEntryRecord[]> }>();
  private readonly TTL_MS = 20_000;
  ```
- Implement `invalidateCache(assessmentType?: string | null)`: increments generation for target assessment (or all if null) and purges cache entry.
- Implement `getPublicLeaderboard(assessmentType, options)`:
  - If `options?.fresh`, advance generation for that assessment type immediately to invalidate older in-flight reads, then fetch live from repository and coalesce concurrent fresh requests.
  - If cached entry exists and generation matches and not expired, return cached data.
  - If query finishes, verify generation still matches current generation before storing in `leaderboardCache`.
- Wire `invalidateCache` in `submitLeaderboard` and `deleteMyLeaderboardEntries`.

In `server/routes/leaderboardRoutes.ts`:
- Parse `const isFresh = req.query.fresh === '1' || req.query.fresh === 'true';`
- Pass `{ fresh: isFresh }` to `leaderboardService.getPublicLeaderboard`.

In `server/routes/adminRoutes.ts` & `server/index.ts`:
- Add `invalidateLeaderboardCache?: (assessmentType?: string | null) => void;` to `AdminRoutesDependencies`.
- In `server/index.ts`, pass `invalidateLeaderboardCache: (type) => container.leaderboardService.invalidateCache?.(type)` to `registerAdminRoutes`.
- In `adminRoutes.ts`, call `deps.invalidateLeaderboardCache?.(assessmentType)` upon success of `edit-alias`, `hide`, `unhide`, `delete`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/leaderboardCache.test.ts`
Expected: PASS

---

### Task 4: Tier 4 — Client-Side Generation-Safe Leaderboard TTL Cache & Timestamp Preservation

**Files:**
- Modify: `src/lib/firestore.ts`
- Modify: `mobile/src/lib/firestore.ts`
- Modify: `src/components/Leaderboard.tsx`
- Modify: `mobile/src/components/Leaderboard.tsx`
- Create: `tests/unit/clientCache.test.ts`

**Interfaces:**
- Consumes: `getLeaderboardResults(assessmentType: AssessmentType, options?: { bypassCache?: boolean }): Promise<{ entries: LeaderboardEntry[]; fetchedAt: Date }>` (or backward-compatible array with attached timestamp metadata).
- Produces:
  - 30-second in-memory TTL cache keyed by canonical assessment ID.
  - Client request tickets/generations: in-flight queries started before submission cannot overwrite the cache after submission.
  - Preserves real `fetchedAt` timestamp from network response, preventing false "just updated" labels when displaying cached data.
  - `submitLeaderboardResult()` invalidates client cache and triggers immediate post-submission fresh read path using `fetch(url, { cache: 'no-store' })` with `&fresh=1`.
  - Manual refresh button in both components passes `{ bypassCache: true }` calling `&fresh=1` with `cache: 'no-store'`.

- [ ] **Step 1: Write failing unit test for client leaderboard cache and ticket safety**

Create `tests/unit/clientCache.test.ts`:
- Repeated call within 30s returns cached results without issuing a fetch.
- Calling with `{ bypassCache: true }` fetches with `&fresh=1` and `cache: 'no-store'`.
- Submission race test: A fetch started at Ticket 1 finishes after `submitLeaderboardResult()` succeeds (advancing Ticket to 2); Ticket 1 response MUST NOT repopulate Ticket 2 cache.
- Successful submission invalidates cache; failed submission retains valid cache.
- Returned results preserve original `fetchedAt` timestamp across cache hits.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/clientCache.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement ticket-based client TTL cache in `src/lib/firestore.ts` and `mobile/src/lib/firestore.ts`**

In both `firestore.ts` files:
- Add ticket/generation state and cache map:
  ```typescript
  interface ClientLeaderboardCache {
    entries: LeaderboardEntry[];
    fetchedAt: Date;
    generation: number;
  }
  const clientLeaderboardCache = new Map<string, ClientLeaderboardCache>();
  const clientGenerations = new Map<string, number>();
  ```
- In `getLeaderboardResults(assessmentType, options?: { bypassCache?: boolean })`:
  - Check cache: if `!options?.bypassCache && cached && Date.now() - cached.fetchedAt.getTime() < 30_000`, return cached entries (and attach `cached.fetchedAt`).
  - Record request generation: `const reqGen = clientGenerations.get(canonicalType) || 0;`
  - Fetch `/api/leaderboard?assessmentType=${canonicalType}${options?.bypassCache ? '&fresh=1' : ''}`, using `cache: 'no-store'` when bypassing.
  - On response, only cache if `clientGenerations.get(canonicalType) === reqGen`.
- In `submitLeaderboardResult()`:
  - On success, advance generation: `clientGenerations.set(type, (clientGenerations.get(type) || 0) + 1); clientLeaderboardCache.delete(type);`
- In `src/components/Leaderboard.tsx` and `mobile/src/components/Leaderboard.tsx`:
  - Update `lastUpdated` state to use the real `fetchedAt` timestamp from the fetch result, never synthesizing `new Date()` on cache hits.
  - Manual refresh buttons pass `{ bypassCache: true }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/clientCache.test.ts`
Expected: PASS

---

### Task 5: Tier 4 — In-Memory Caching of `publicDataset` Count

**Files:**
- Modify: `src/lib/useAuthoritativeStats.ts`
- Modify: `mobile/src/lib/useAuthoritativeStats.ts`
- Create: `tests/unit/useAuthoritativeStatsCache.test.ts`

**Interfaces:**
- Consumes: `getCountFromServer(collection(db, 'publicDataset'))`
- Produces: Module-scoped 60-second in-memory cache with concurrent request coalescing. Reused across hook remounts and navigation. Never stored persistently.

- [ ] **Step 1: Write failing unit test for count caching**

Create `tests/unit/useAuthoritativeStatsCache.test.ts`:
- Verify first call executes `getCountFromServer`.
- Verify second call within 60s returns cached count without querying Firestore.
- Verify concurrent calls coalesce into single query.
- Verify failure does not poison cache.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/useAuthoritativeStatsCache.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement module-scoped in-memory count cache**

In both `src/lib/useAuthoritativeStats.ts` and `mobile/src/lib/useAuthoritativeStats.ts`:
- Module variables:
  ```typescript
  let cachedCount: { count: number; timestamp: number } | null = null;
  let inFlightCountPromise: Promise<number> | null = null;
  const COUNT_TTL_MS = 60_000;
  ```
- Check cache before issuing `getCountFromServer`.
- Coalesce concurrent promises.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/useAuthoritativeStatsCache.test.ts`
Expected: PASS

---

### Task 6: Offline Status Indicator in Both Navigation Bars

**Files:**
- Modify: `src/components/Navbar.tsx`
- Modify: `mobile/src/components/Navbar.tsx`
- Create: `tests/unit/offlineIndicator.test.tsx`

**Interfaces:**
- Consumes: `usePwaInstall().isOffline` from existing `pwaStore`
- Produces:
  - Accessible status indicator with Lucide `WifiOff` icon in both desktop and mobile navbars when `isOffline === true`.
  - Genuine accessible action: clicking/tapping opens a short, non-disruptive dialog/tooltip explaining that cached pages are available and live submission requires network.
  - Layout stability: indicator is positioned in a reserved or non-collapsing slot so entering/leaving offline mode does not shift navbar actions or alter assessment viewport scaling.
  - Light mode: Restrained amber pill (`border-amber-300/80 bg-amber-50/80 text-amber-700`).
  - Dark mode: Dark amber/surface pill (`border-amber-500/30 bg-amber-500/10 text-amber-300`).
  - Mobile: Compact 32×32px button in action cluster (`bg-[var(--surface-1)] border border-amber-500/30 text-amber-400`).
  - Zero side effects on active assessment timing or trial progression.

- [ ] **Step 1: Write failing unit test for offline indicator**

Create `tests/unit/offlineIndicator.test.tsx`:
- Desktop Navbar: hidden when online, visible when offline with `WifiOff` and accessible label.
- Mobile Navbar: hidden when online, visible when offline with `WifiOff`.
- Disappears automatically on `window.dispatchEvent(new Event('online'))`.
- Clicking indicator triggers accessible offline info dialog.
- Active assessment lockout preserves indicator visibility without breaking test controls.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/offlineIndicator.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Offline Status Indicator in Navbars**

- In `src/components/Navbar.tsx`:
  - Import `WifiOff` from `lucide-react`.
  - Consume `const { isOffline } = usePwaInstall()`.
  - Render offline button in the right action group when `isOffline` is true.
- In `mobile/src/components/Navbar.tsx`:
  - Import `WifiOff` from `lucide-react`.
  - Consume `const { isOffline } = usePwaInstall()`.
  - Render compact offline button in the action cluster when `isOffline` is true.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/offlineIndicator.test.tsx`
Expected: PASS

---

### Task 7: Full Verification Suite, Type Checks, and Production Build

**Files:**
- All modified and test files

- [ ] **Step 1: Run all unit tests**
Run: `npm test`
Expected: All 61+ test suites plus all 6 new test suites pass (100% green).

- [ ] **Step 2: Run TypeScript checks for desktop and mobile**
Run: `npm run check`
Expected: Clean exit code 0, zero type errors.

- [ ] **Step 3: Run full production build**
Run: `npm run build`
Expected: Clean Vite desktop build, Vite mobile build, SEO generator, and server esbuild bundling.
