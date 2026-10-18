# Multi-Tier Performance & Latency Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a comprehensive, battery-friendly, zero-overhead caching architecture across laptop and mobile surfaces (Service Worker assets & fonts caching, Express HTTP Cache-Control headers, server-side in-flight coalescing & TTL memory cache for public leaderboards, and client-side memory SWR cache for instant navigation) without violating server-authoritative provenance or real-time test timing.

**Architecture:** A 4-tier caching model engineered specifically for dual-surface (desktop `/` and mobile `/mobile/`) operation:
1. **Tier 1 (HTTP & CDN Headers):** Strict 1-year immutable caching on hashed build assets in Express `staticRoutes.ts`, `stale-while-revalidate` on static icons/manifests, and `no-cache` on dynamic HTML shells to ensure instantaneous asset delivery with seamless atomic updates.
2. **Tier 2 (PWA Service Worker Offline & Asset Shell):** Modernize desktop `public/sw.js` and mobile `mobile/public/sw.js` with Cache-First strategies for hashed assets, font stylesheets and webfont binaries, network-first with offline fallback for navigation, and cache invalidation on deployment.
3. **Tier 3 (Server In-Memory TTL & Thundering-Herd Cache):** Introduce an in-memory TTL cache (15–30s) with query coalescing inside `LeaderboardAppService` so repeated reads from desktop and mobile do not hammer Firestore transactions or read limits.
4. **Tier 4 (Client-Side SWR Memory Cache):** Add a lightweight, in-memory stale-while-revalidate cache in `src/lib/firestore.ts` for `getLeaderboardResults` and `src/lib/useAuthoritativeStats.ts` so switching tabs or protocols renders instantly (<5ms) from memory while fetching fresh data in the background, complete with a manual "Refresh" bypass.

**Tech Stack:** TypeScript, React 19, Express 4.21, Service Worker API, CacheStorage API, Vitest.

**Spec:** Dual-surface caching specification adhering to `.ai/RULES.md` (Server-authoritative provenance, zero PII, $RT \ge 80\text{ms}$ physiological timing integrity).

## Global Constraints

- **Server-Authoritative Writes:** Never cache or bypass server provenance for mutations (`/api/research/submit`, `/api/leaderboard/submit`, `/api/research/session/start`). Mutations must always execute against the live server.
- **Timing Integrity:** Stimulus presentation and response timing must remain hardware-accurate via `performance.now()`. No caching layer may introduce background delays, microtask starvation, or GC churn during active assessment runs.
- **Dual-Surface Compatibility:** Both desktop (`/`) and mobile (`/mobile/`) must receive synchronized, consistent updates without stale version mismatches.
- **No Heavy Storage Bloat:** Zero heavy IndexedDB dependencies for simple reads. Keep client caching in-memory with LRU/TTL or Service Worker CacheStorage for static files so devices stay light and fast.

## Review Focus

1. **Service Worker Version Migration:** When a new version is deployed, old service worker caches must be cleanly purged during `activate` without leaving stale JS/CSS bundles.
2. **Leaderboard Stale Reads after User Submission:** When a user submits a new personal score to the leaderboard, the client cache must immediately invalidate or bypass the TTL to show the freshly submitted rank.
3. **HTTP Header Leakage:** Dynamic HTML routes and API routes (`/api/*`, `/index.html`, `/mobile/index.html`) must NEVER receive `immutable` or long `max-age` headers, preventing stuck application shells.
4. **Offline Assessment Protection:** While static shell and assets are cached offline, attempting to start an experiment session offline must gracefully notify the user of network requirements rather than failing silently.
5. **Parity Tests & Golden Baseline:** Ensure server route parity tests pass and no regression occurs in API route contracts.

---

### Task 1: Express Production Static Cache Headers

**Files:**
- Modify: `server/routes/staticRoutes.ts`
- Test: `tests/unit/staticRoutesCache.test.ts`

**Interfaces:**
- Consumes: `express.static` setHeaders callback
- Produces: Correct `Cache-Control` response headers (`public, max-age=31536000, immutable` for `/assets/*`, `public, max-age=86400, stale-while-revalidate=604800` for icons/fonts/manifests, and `no-cache` for HTML shells)

- [ ] **Step 1: Write failing unit test for static route cache headers**

Create `tests/unit/staticRoutesCache.test.ts` checking header policies for assets, html, and manifests:

```typescript
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import * as path from 'path';
import * as fs from 'fs';
import { registerStaticRoutes } from '../../server/routes/staticRoutes';

describe('Static Route Caching Headers', () => {
  it('assigns long-term immutable caching to hashed build assets', async () => {
    // Tests that /assets/* returns max-age=31536000, immutable
  });

  it('assigns no-cache to HTML entry points', async () => {
    // Tests that / and /mobile return no-cache, no-store, must-revalidate
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/staticRoutesCache.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `server/routes/staticRoutes.ts` with granular Cache-Control rules**

In `server/routes/staticRoutes.ts`, enhance `setHeaders` in `express.static`:
- If file is inside `/assets/` (Vite hashed bundles): `res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');`
- If file is `sw.js`: `res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');`
- If file is `.png`, `.jpg`, `.svg`, `.webmanifest`, `.ico`, `.woff2`: `res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');`
- On HTML responses (`index.html`, `mobile/index.html`): `res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/staticRoutesCache.test.ts`
Expected: PASS

---

### Task 2: Service Worker Asset & Font Caching Optimization

**Files:**
- Modify: `public/sw.js`
- Modify: `mobile/public/sw.js`
- Test: `tests/unit/serviceWorkerCache.test.ts`

**Interfaces:**
- Consumes: Browser `fetch` events, Service Worker `install` and `activate` lifecycle
- Produces: Instant asset responses from CacheStorage; stale-while-revalidate for fonts and media; network-first for documents; clean cache eviction on bump.

- [ ] **Step 1: Write unit test validating Service Worker caching rules**

Create `tests/unit/serviceWorkerCache.test.ts` verifying that:
- Core shell assets are defined with correct relative and absolute paths for desktop & mobile.
- Fetch handler bypasses `/api/*` and WebSocket/HMR.
- Cache version matches `pulse-pwa-v4` and `pulse-mobile-pwa-v4`.
- External Google Fonts (`fonts.googleapis.com` and `fonts.gstatic.com`) are cached with Cache-First or Stale-While-Revalidate.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/serviceWorkerCache.test.ts`
Expected: FAIL

- [ ] **Step 3: Upgrade `public/sw.js` and `mobile/public/sw.js`**

Implement in both workers:
- Cache version bump to `pulse-pwa-v4` and `pulse-mobile-pwa-v4`.
- Google Fonts caching: runtime caching of `https://fonts.googleapis.com/*` (stale-while-revalidate) and `https://fonts.gstatic.com/*` (cache-first, immutable 1-year).
- Built assets (`/assets/*`): Cache-first fallback to network (since Vite hashes file contents).
- Skip caching for all `/api/*` requests so backend provenance and rate limits are never spoofed.
- Immediate client claim on activation (`self.clients.claim()`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/serviceWorkerCache.test.ts`
Expected: PASS

---

### Task 3: Server-Side In-Memory Leaderboard TTL Cache

**Files:**
- Modify: `server/services/leaderboardAppService.ts`
- Modify: `server/services/interfaces/ILeaderboardService.ts`
- Test: `tests/unit/leaderboardCache.test.ts`

**Interfaces:**
- Consumes: `getPublicLeaderboard(rawType: string, bypassCache?: boolean)`
- Produces: Sub-millisecond leaderboard responses for hot queries while invalidating on new submissions.

- [ ] **Step 1: Write unit test for LeaderboardAppService TTL caching**

Create `tests/unit/leaderboardCache.test.ts`:
- Verify subsequent calls to `getPublicLeaderboard` within 15 seconds return cached results without re-querying repositories.
- Verify `submitLeaderboard` invalidates the cached entry for that assessment type immediately.
- Verify that simultaneous in-flight requests coalesce into a single repository query.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/leaderboardCache.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement TTL memory cache in `LeaderboardAppService`**

In `server/services/leaderboardAppService.ts`:
- Add a private memory cache structure:
  ```typescript
  interface CacheEntry {
    data: LeaderboardEntryRecord[];
    timestamp: number;
  }
  private readonly leaderboardCache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 20_000; // 20 seconds
  ```
- In `loadPublicLeaderboard`, check `this.leaderboardCache.get(rawType)`. If valid (`Date.now() - timestamp < TTL_MS`), return immediately.
- In `submitLeaderboard`, add cache eviction: `this.leaderboardCache.delete(normalizedAssessmentType);` so the participant's new score is immediately reflected.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/leaderboardCache.test.ts`
Expected: PASS

---

### Task 4: Client-Side SWR Memory Cache for Instant Protocol Switching

**Files:**
- Modify: `src/lib/firestore.ts`
- Modify: `src/lib/useAuthoritativeStats.ts`
- Test: `tests/unit/clientCache.test.ts`

**Interfaces:**
- Consumes: `getLeaderboardResults(assessmentType, { bypassCache?: boolean })`
- Produces: 0ms first-render on tab/protocol switch in both desktop and mobile Leaderboard views, followed by silent background revalidation if stale (>30s).

- [ ] **Step 1: Write unit test for client memory cache**

Create `tests/unit/clientCache.test.ts`:
- Verify `getLeaderboardResults` returns cached entries instantly on repeated calls.
- Verify `bypassCache: true` forces a network fetch.
- Verify `submitLeaderboardResult` clears the local client cache for that protocol.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/clientCache.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement client memory SWR cache in `src/lib/firestore.ts`**

In `src/lib/firestore.ts`:
- Add client-side in-memory cache:
  ```typescript
  interface ClientLeaderboardCache {
    entries: LeaderboardEntry[];
    cachedAt: number;
  }
  const clientLeaderboardMemoryCache = new Map<string, ClientLeaderboardCache>();
  ```
- Support `getLeaderboardResults(assessmentType: AssessmentType, bypassCache = false)`:
  - If cached and fresh (< 30s) and not bypassed, return cached data immediately.
  - In `submitLeaderboardResult`, invalidate `clientLeaderboardMemoryCache.delete(payload.assessmentType)`.
- Connect desktop and mobile refresh buttons (`fetchLeaderboard()`) to pass `bypassCache = true` so user clicks always trigger a live fetch.
- Cache `useAuthoritativeStats` results in memory for 60 seconds to prevent redundant Firestore `getCountFromServer` calls on page navigation.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/clientCache.test.ts`
Expected: PASS

---

### Task 5: Offline Status Pill/Button Indicator on Desktop and Mobile

**Files:**
- Modify: `src/components/Navbar.tsx`
- Modify: `mobile/src/components/Navbar.tsx`
- Test: `tests/unit/offlineIndicator.test.tsx`

**Interfaces:**
- Consumes: `usePwaInstall()` / `isOffline` state from `pwaStore`
- Produces: An unobtrusive, theme-matching offline status indicator pill/button with `WifiOff` icon shown only when `isOffline === true`. Clicking or tapping it gives immediate feedback (`You are currently offline. Cached assessments and pages remain available.`) or opens a lightweight tooltip/dialog.

- [ ] **Step 1: Write failing unit test for Offline Status button in Navbars**

Create `tests/unit/offlineIndicator.test.tsx`:
- Render Desktop Navbar while `navigator.onLine = false`: verify an offline button with `WifiOff` is displayed with accessible label "Offline mode".
- Render Mobile Navbar while `navigator.onLine = false`: verify the offline indicator button is visible matching mobile theme tokens (`--surface-1`, `--border-subtle`).
- Verify the indicator automatically disappears when network comes back online (`window.dispatchEvent(new Event('online'))`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/offlineIndicator.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Offline Status Button in Desktop & Mobile Navbars**

- In `src/components/Navbar.tsx`:
  - Read `isOffline` from `usePwaInstall()`.
  - When `isOffline === true`, render a theme-matched button next to Info/Settings:
    ```tsx
    {isOffline && (
      <button
        type="button"
        id="navbar-offline-badge"
        aria-label="Offline Mode"
        title="Offline Mode: Cached assessments and pages remain available"
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs font-mono font-medium border transition-colors select-none ${
          isLight
            ? 'border-amber-300/80 bg-amber-50/80 text-amber-700 shadow-xs'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        }`}
      >
        <WifiOff size={14} className="shrink-0 text-amber-500" aria-hidden="true" />
        <span className="hidden sm:inline">Offline</span>
      </button>
    )}
    ```
- In `mobile/src/components/Navbar.tsx`:
  - Read `isOffline` via `usePwaInstall()`.
  - When `isOffline === true`, render the compact matching button in `rightContent` / action cluster:
    ```tsx
    {isOffline && (
      <button
        type="button"
        id="mobile-nav-offline-btn"
        aria-label="Offline Mode"
        title="You are currently offline"
        className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--surface-1)] border border-amber-500/30 text-amber-400 shrink-0"
      >
        <WifiOff size={15} />
      </button>
    )}
    ```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/offlineIndicator.test.tsx`
Expected: PASS

---

### Task 6: Full Suite Verification & Build Validation

**Files:**
- All modified and test files

- [ ] **Step 1: Run complete test suite**
Run: `npm test`
Expected: All 61+ test suites pass without regression.

- [ ] **Step 2: Run type check across desktop and mobile**
Run: `npm run check`
Expected: Zero TypeScript errors.

- [ ] **Step 3: Run full production build**
Run: `npm run build`
Expected: Desktop Vite build, Mobile Vite build, SEO page generation, and esbuild server bundling all succeed cleanly.

