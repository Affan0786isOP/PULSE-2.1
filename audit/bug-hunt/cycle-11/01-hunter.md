# PULSE v2.1 — Cycle 11 Adversarial Bug Hunt Report (Service Worker & PWA Lifecycle, Device Routing, Telemetry Ingestion, and Dataset Maintenance)

**Auditor:** Bug Hunter Agent (Cycle 11)  
**Methodology:** Ponytail Senior Dev Audit (/ponytail-audit lens: correctness, scale/concurrency races under load, missing tests for risky logic, security boundaries, and lean bloat/dead code)  
**Threshold Applied:** Frequency (1–10) × Impact (1–10) ≥ 5.

---

## 1. Executive Summary

Cycle 11 conducted an adversarial audit of six critical runtime subsystems:
1. `mobile/public/sw.js` (Service Worker caching, offline lifecycle, session gate)
2. `server/middleware/deviceRouting.ts` & `src/lib/deviceRouting.ts` / `shared/domain/deviceRouting.ts` (Edge & client device routing)
3. `server/routes/telemetryRoutes.ts` & `server/services/telegramNotifierService.ts` (Telemetry ingestion and asynchronous notification outbox)
4. `src/lib/pwaStore.ts` & `mobile/src/lib/pwaStore.ts` (PWA installation and display mode state machine)
5. `server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts` (Public dataset summary reconciliation lock and pagination persistence)
6. `reconcile-dataset-ids.ts` (Dataset reconciliation diagnostic utility)

Thirteen (13) concrete defects were identified across these targets, all exceeding the minimum severity threshold. Key findings include:
- **PWA Installation Suppression on Android:** `pwaStore.ts` classifies any HTTP referrer containing `android-app://` (e.g., links clicked in Twitter, Telegram, Gmail, Reddit, Slack, Discord) as an installed app, permanently stripping the PWA installation CTA and banner for mobile Android visitors.
- **Service Worker Stale-While-Revalidate Rejection:** The Service Worker fetch listener resolves to `undefined` when an unprecached static asset fails over network (offline / drop), causing browsers to throw fatal `TypeError: Failed to convert value to 'Response'` in `event.respondWith()`.
- **Media Range Request Breakage in Safari:** The Service Worker stale-while-revalidate handler intercepts audio chunks (`.mp3`, `.wav`) and returns HTTP 200 instead of HTTP 206 Partial Content, breaking audio cues and media playback in WebKit / iOS Safari.
- **ADR-004 Violation & Ping-Pong Redirect Loop:** The client-side `resolveDeviceRedirect` helper retains deprecated pre-ADR-004 logic that forces `/` to redirect to `/mobile/`, while `mobile/index.html` immediately redirects non-standalone visitors back to `/`, generating an infinite redirect loop.
- **Telemetry Ingestion Memory Leak & Event Loop Freeze:** `/api/telemetry/page-view` inserts unpruned keys into an in-memory map with a 48-hour TTL. When map size exceeds 2,000, every single request executes a synchronous O(N) linear sweep across thousands of active keys without deleting any, freezing the event loop and inducing process OOM.
- **Dataset Summary Lock Permanent Deadlock:** `firestoreDatasetSummaryMaintenanceRepository.ts` lacks stale-lock expiration logic. If a migration is interrupted or crashes, `getStatus()` and `acquireReconciliationLock()` remain locked forever; because `server/routes/adminRoutes.ts` does not accept a `resume` parameter, the administrative maintenance panel becomes permanently wedged.
- **Unbounded Memory Exhaustion in Dataset ID Script:** `reconcile-dataset-ids.ts` parallel-fetches two unbounded Firestore collections in memory without pagination or streaming, leading to gRPC timeouts (`DEADLINE_EXCEEDED`) and Node.js heap exhaustion under production volumes.

---

## 2. Quantitative Defect Ranking Matrix

| ID | Category | Target File | Defect Summary | Freq (1–10) | Impact (1–10) | Risk Score (F×I) |
|---|---|---|---|:---:|:---:|:---:|
| **BUG-C11-01** | PWA / Android | [src/lib/pwaStore.ts#L76-L79](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L76-L79) | `detectIsAndroidAppMode` treats any `android-app://` referrer as an installed PWA, permanently suppressing install CTAs on Android | 9 | 8 | **72** |
| **BUG-C11-02** | Deadlock / Availability | [firestoreDatasetSummaryMaintenanceRepository.ts#L57](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L57) | Asymmetric missing lock-expiration logic permanently wedges Dataset Summary Admin UI and API upon interrupted migrations | 7 | 9 | **63** |
| **BUG-C11-03** | Denial of Service / Memory | [telegramNotifierService.ts#L278-L283](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L278-L283) | Telemetry ingestion causes unbounded memory leak and O(N) event loop sweep on every page-view request via `pageViewEventIds` | 7 | 8 | **56** |
| **BUG-C11-04** | Routing / Redirect Loop | [shared/domain/deviceRouting.ts#L250-L262](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/domain/deviceRouting.ts#L250-L262) | Deprecated `/mobile/` redirection in `resolveDeviceRedirect` conflicts with `mobile/index.html`, causing a ping-pong redirect loop | 7 | 8 | **56** |
| **BUG-C11-05** | Resilience / Service Worker | [mobile/public/sw.js#L317-L336](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L317-L336) | Stale-while-revalidate fetch listener returns `undefined` on network failure, triggering fatal browser `TypeError` in `respondWith` | 7 | 7 | **49** |
| **BUG-C11-06** | Audio / Media Streaming | [mobile/public/sw.js#L309-L336](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L309-L336) | Media Range requests intercepted by Service Worker return full HTTP 200 instead of 206, breaking audio cues in iOS Safari | 7 | 6 | **42** |
| **BUG-C11-07** | Scale / Memory Exhaustion | [reconcile-dataset-ids.ts#L16-L19](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/reconcile-dataset-ids.ts#L16-L19) | Unpaged parallel `.get()` on entire Firestore collections triggers gRPC `DEADLINE_EXCEEDED` and heap OOM at production scale | 6 | 7 | **42** |
| **BUG-C11-08** | Data Loss / Concurrency Race | [firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117) | Reconciliation completion blindly commits stale counts over newer submissions received after the 10-minute lock window expires | 5 | 8 | **40** |
| **BUG-C11-09** | Caching / Offline Navigation | [mobile/public/sw.js#L268-L298](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L268-L298) | Navigation handler caches parameterized URLs blindly, causing cache pollution with one-time tokens and dead offline fallback matching | 6 | 6 | **36** |
| **BUG-C11-10** | Server Middleware / Logic Bypass | [server/middleware/deviceRouting.ts#L98-L107](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/middleware/deviceRouting.ts#L98-L107) | Premature `/mobile` static path early-exit skips routing cookie generation and parameter cleanup on `/mobile/` requests | 6 | 6 | **36** |
| **BUG-C11-11** | State Sync / PWA Lifecycle | [src/lib/pwaStore.ts#L358-L368](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L358-L368) | Display-mode change handler fails to recompute `isInstallable`, leaving `isInstallable: true` when app becomes standalone | 5 | 5 | **25** |
| **BUG-C11-12** | Script Hygiene / Config Parity | [reconcile-dataset-ids.ts#L11-L14](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/reconcile-dataset-ids.ts#L11-L14) | Misleading script contract (read-only diagnostic titled `reconcile`) and config desync with `firebase-applet-config.json` | 6 | 4 | **24** |
| **BUG-C11-13** | Input Validation / Telemetry | [server/routes/telemetryRoutes.ts#L68](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/telemetryRoutes.ts#L68) | Loose `typeof` check allows `NaN`, `Infinity`, and extreme timestamps into persisted telemetry payloads | 4 | 4 | **16** |

---

## 3. Deep Dive Defect Analysis & Minimal Surgical Fixes

---

### BUG-C11-01: `detectIsAndroidAppMode` Treats All `android-app://` Referrers as Installed PWAs

- **File Link:** [src/lib/pwaStore.ts#L76-L79](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L76-L79)
- **Defect Description:**
  In `src/lib/pwaStore.ts`:
  ```typescript
  export function detectIsAndroidAppMode(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(document.referrer?.includes('android-app://'));
  }
  ```
  And in `computeCurrentState()` / `computeIsInstallActionable()`:
  ```typescript
  export function computeIsInstallActionable(params: {
    isInstalled: boolean;
    isStandalone: boolean;
    isIosStandalone: boolean;
    isAndroidAppMode: boolean;
    ...
  }): boolean {
    if (params.isInstalled || params.isStandalone || params.isIosStandalone || params.isAndroidAppMode) {
      return false;
    }
  ```
  On Android, whenever a user clicks any web link inside a native Android application (e.g. Gmail, Twitter/X, Telegram, Reddit, Slack, Discord, LinkedIn, WhatsApp), the Android OS injects the source app's package URI as the HTTP Referer header (e.g. `android-app://com.google.android.gm` or `android-app://com.twitter.android`).
  `document.referrer` contains this URI.
  `detectIsAndroidAppMode()` returns `true`.
  Consequently, `isInstalled` becomes `true`, and `computeIsInstallActionable()` returns `false`.
  The application mistakenly assumes the visitor is running PULSE inside an already-installed PWA or Trusted Web Activity (TWA). As a result, the "Install App" button in the navigation bar and all installation promotion banners are permanently suppressed for genuine Android browser users arriving from any Android app.
- **Frequency:** 9/10. Every single Android user clicking a link shared in any social, email, or chat app experiences this false-positive.
- **Impact:** 8/10. Critical PWA distribution failure. Android users are barred from seeing or clicking the install prompt.
- **Surgical Root-Cause Fix:**
  An external app referral is not proof of app installation. Remove the naive `android-app://` referrer check, or restrict it strictly to PULSE's own registered TWA package ID:
  ```typescript
  export function detectIsAndroidAppMode(): boolean {
    if (typeof document === 'undefined') return false;
    // Only match PULSE's specific TWA package, not generic external referrals
    const PULSE_TWA_PACKAGE = 'android-app://in.pulselab.app';
    return Boolean(document.referrer?.startsWith(PULSE_TWA_PACKAGE));
  }
  ```

---

### BUG-C11-02: Missing Lock-Expiration Logic in Dataset Summary Maintenance Causes Indefinite Administrative Deadlock

- **File Link:** [firestoreDatasetSummaryMaintenanceRepository.ts#L57](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L57), [firestoreDatasetSummaryMaintenanceRepository.ts#L70-L72](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L70-L72), and [server/routes/adminRoutes.ts#L382](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/adminRoutes.ts#L382)
- **Defect Description:**
  In `FirestoreResearchSubmissionRepository` (audited in BUG-16), a 10-minute expiration is enforced on summary reconciliation locks:
  ```typescript
  const isLockExpired = typeof summary.migrationStartedAt === 'number' &&
    (Date.now() - summary.migrationStartedAt) > 10 * 60 * 1000;
  if (summary.migrationInProgress === true && !isLockExpired) { ... }
  ```
  However, `FirestoreDatasetSummaryMaintenanceRepository` contains no lock expiration check:
  ```typescript
  async getStatus(): Promise<DatasetSummaryStatus> {
    ...
    return {
      exists: snapshot.exists,
      migrationInProgress: data?.migrationInProgress === true,
      summary: readStoredSummary(data),
      lastReconciledAt: safeNonNegativeInteger(data?.lastReconciledAt),
      migrationStartedAt: safeNonNegativeInteger(data?.migrationStartedAt)
    };
  }

  async acquireReconciliationLock(runId: string, startedAt: number, resume: boolean): Promise<void> {
    ...
    await db.runTransaction(async tx => {
      const current = await tx.get(summaryRef);
      const data = current.data() as Record<string, unknown> | undefined;
      if (data?.migrationInProgress === true && !resume) {
        throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
      }
  ```
  If a background reconciliation process is terminated, OOM-killed, or restarted midway:
  1. `migrationInProgress` remains `true` in `publicDatasetMeta/summary`.
  2. `getStatus()` permanently reports `migrationInProgress: true`.
  3. `DatasetSummaryMaintenancePanel.tsx` disables both "Verify summary (dry run)" and "Rebuild summary" buttons (`disabled={status?.migrationInProgress}`).
  4. In `server/routes/adminRoutes.ts`, line 382 calls `reconcile(mode, { source: 'admin-ui' })` without passing or supporting `resume: true`.
  5. The administrative reconciliation feature becomes permanently deadlocked.
- **Frequency:** 7/10. Occurs whenever an administrator triggers a rebuild and the server restarts, encounters a Cloud Run instance recycling event, or times out.
- **Impact:** 9/10. Complete denial of service on dataset summary maintenance; requires manual database document editing to clear.
- **Surgical Root-Cause Fix:**
  Add lock expiration checks in both `getStatus()` and `acquireReconciliationLock()`:
  ```typescript
  const LOCK_TIMEOUT_MS = 10 * 60 * 1000;

  function isLockExpired(startedAt: unknown): boolean {
    return typeof startedAt === 'number' && (Date.now() - startedAt) > LOCK_TIMEOUT_MS;
  }

  // In getStatus():
  const rawInProgress = data?.migrationInProgress === true;
  const expired = isLockExpired(data?.migrationStartedAt);
  const migrationInProgress = rawInProgress && !expired;

  // In acquireReconciliationLock():
  if (data?.migrationInProgress === true && !resume && !isLockExpired(data?.migrationStartedAt)) {
    throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
  }
  ```

---

### BUG-C11-03: Ingestion DoS & Event-Loop Freezing via Unbounded `pageViewEventIds` In-Memory Map

- **File Link:** [telegramNotifierService.ts#L278-L283](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L278-L283) & [telegramNotifierService.ts#L374-L382](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L374-L382)
- **Defect Description:**
  In `TelegramNotifierService`:
  ```typescript
  private readonly pageViewEventIds: Map<string, number> = new Map(); // eventId -> expiry epoch ms
  ...
  public async enqueuePageView(event: PageViewRequest): Promise<{ success: boolean; deduplicated?: boolean }> {
    ...
    const now = Date.now();
    // 48-hour eventId deduplication
    this.cleanExpiredDeduplicationKeys(now);
    if (this.pageViewEventIds.has(event.eventId)) {
      return { success: true, deduplicated: true };
    }
    this.pageViewEventIds.set(event.eventId, now + 48 * 60 * 60 * 1000);
  ```
  And `cleanExpiredDeduplicationKeys`:
  ```typescript
  private cleanExpiredDeduplicationKeys(now: number): void {
    if (this.pageViewEventIds.size > 2000) {
      for (const [key, expiry] of this.pageViewEventIds.entries()) {
        if (expiry <= now) {
          this.pageViewEventIds.delete(key);
        }
      }
    }
  }
  ```
  Every incoming page view sets an expiry 48 hours into the future.
  If the application receives 10,000 page views over a 12-hour period:
  - `pageViewEventIds.size > 2000` is true.
  - The loop checks `expiry <= now`. Since every key was added within 48 hours, **zero keys are expired**.
  - No keys are deleted; the map continues growing indefinitely (unbounded heap allocation).
  - Worse, on **every single subsequent incoming request**, `cleanExpiredDeduplicationKeys` executes a synchronous O(N) iteration over all 10,000+ entries on the main Node.js event loop before sending the HTTP response.
  - Under normal multi-user traffic or automated bot visits, this blocks the event loop, causing severe latency spikes on all API routes and eventual process OOM.
- **Frequency:** 7/10. Triggers continuously once telemetry volume exceeds 2,000 events within 48 hours.
- **Impact:** 8/10. Severe CPU starvation on the single-threaded Node.js event loop and unconstrained memory leak.
- **Surgical Root-Cause Fix:**
  Enforce a strict maximum capacity with FIFO/LRU eviction rather than purely time-based pruning:
  ```typescript
  private static readonly MAX_DEDUP_KEYS = 5000;

  private cleanExpiredDeduplicationKeys(now: number): void {
    if (this.pageViewEventIds.size > 2000) {
      for (const [key, expiry] of this.pageViewEventIds.entries()) {
        if (expiry <= now) {
          this.pageViewEventIds.delete(key);
        }
      }
    }
    // Evict oldest entries if capacity is still exceeded
    while (this.pageViewEventIds.size >= TelegramNotifierService.MAX_DEDUP_KEYS) {
      const oldestKey = this.pageViewEventIds.keys().next().value;
      if (oldestKey) this.pageViewEventIds.delete(oldestKey);
      else break;
    }
  }
  ```

---

### BUG-C11-04: Deprecated `/mobile/` Redirection in `resolveDeviceRedirect` Conflicts with ADR-004

- **File Link:** [shared/domain/deviceRouting.ts#L250-L262](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/domain/deviceRouting.ts#L250-L262) & [mobile/index.html#L69-L90](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/index.html#L69-L90)
- **Defect Description:**
  In ADR-004, PULSE adopted Unified Responsive Routing:
  > *"1. Unify Top-Level Canonical Routing: All routes are hosted on identical canonical paths for both desktop and mobile clients... 5. Eliminate `/mobile/` URLs: Remove all public routing and redirects to `/mobile/`."*
  
  However, `shared/domain/deviceRouting.ts` still contains pre-ADR-004 redirect logic:
  ```typescript
  if (decision.shouldUseMobile && !isMobilePath) {
    const cleanPath = (pathname === '/' || pathname === '' || pathname === '/index.html') ? '/' : pathname;
    const targetPath = cleanPath === '/' ? '/mobile/' : `/mobile${cleanPath}`;
    const targetUrl = `${targetPath}${cleanSearch}${hash}`;
    if (checkAndSetRedirectLoopGuard(targetUrl)) {
      return { shouldRedirect: false };
    }
    syncDeviceRoutingStorage(decision, hasRoutingParams);
    return {
      shouldRedirect: true,
      targetUrl,
    };
  }
  ```
  Meanwhile, `mobile/index.html` lines 69-90 detects that the browser is not in standalone PWA mode and immediately runs:
  ```javascript
  if (!inIframe && !isStandalone) {
    var pathname = window.location.pathname || '';
    var cleanPath = pathname.replace(/^\/mobile\/?/, '/');
    ...
    window.location.replace(targetUrl);
    return;
  }
  ```
  If `resolveDeviceRedirect` is invoked on a canonical route on mobile, it instructs the browser to redirect to `/mobile/`. As soon as `/mobile/` loads, `mobile/index.html` redirects back to `/`. This creates a ping-pong redirect loop that bounces until the browser halts with `ERR_TOO_MANY_REDIRECTS` or hits `sessionStorage` loop limits.
- **Frequency:** 7/10. Affects any navigation flow where `resolveDeviceRedirect` is evaluated on canonical routes.
- **Impact:** 8/10. Page load failure, jarring visual flicker, and broken navigation.
- **Surgical Root-Cause Fix:**
  Align `resolveDeviceRedirect` with ADR-004: never redirect canonical non-mobile paths to `/mobile/`:
  ```typescript
  // Under ADR-004 unified routing, canonical routes stay on their canonical path.
  // Never redirect desktop URLs into /mobile/*.
  if (decision.shouldUseMobile && !isMobilePath) {
    if (hasRoutingParams) syncDeviceRoutingStorage(decision, true);
    return { shouldRedirect: false };
  }
  ```

---

### BUG-C11-05: Stale-While-Revalidate Listener Resolves to `undefined` on Network Failure

- **File Link:** [mobile/public/sw.js#L317-L336](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L317-L336)
- **Defect Description:**
  In `mobile/public/sw.js`:
  ```javascript
  // Stale-while-revalidate for static scripts, styles, and media
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
  ```
  When a static asset is requested for the first time (not yet present in `CACHE_NAME`):
  1. `cachedResponse` is `undefined`.
  2. `return cachedResponse || fetchPromise` passes `fetchPromise` directly to `event.respondWith()`.
  3. If the network is offline or the connection drops, `fetch(request)` rejects.
  4. The `.catch(() => cachedResponse)` executes and returns `cachedResponse`, which is `undefined`.
  5. The promise passed to `respondWith()` resolves to `undefined`.
  
  According to the W3C Service Worker specification:
  > *"If the response is not a Response object, reject promise with a TypeError."*
  
  All modern browsers throw `TypeError: Failed to convert value to 'Response'`, terminating the fetch handler with an unhandled rejection error rather than a graceful offline response.
- **Frequency:** 7/10. Happens whenever an unprecached asset is requested while offline or during packet loss.
- **Impact:** 7/10. Service Worker crash, unhandled console error, and failure to provide an offline fallback.
- **Surgical Root-Cause Fix:**
  If `cachedResponse` is undefined and network fetch fails, return a synthetic offline/gateway response:
  ```javascript
  .catch(() => {
    return cachedResponse || new Response('Offline Asset Unavailable', {
      status: 504,
      statusText: 'Gateway Timeout',
      headers: { 'Content-Type': 'text/plain' }
    });
  });
  ```

---

### BUG-C11-06: Audio/Media Range Requests Intercepted by Service Worker Return HTTP 200

- **File Link:** [mobile/public/sw.js#L309](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L309) & [mobile/public/sw.js#L317-L336](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L317-L336)
- **Defect Description:**
  In `mobile/public/sw.js`:
  ```javascript
  const isStaticAsset = (
    ...
    /\.(?:js|css|svg|png|jpg|jpeg|webp|gif|ico|woff|woff2|json|riv|mp3|wav|ogg|webm|mp4)$/i.test(url.pathname)
  );
  ```
  HTML5 `<audio>` and `<video>` tags issue HTTP requests with `Range: bytes=...` headers to support seeking, preloading, and buffered decoding.
  When WebKit (iOS Safari) streams `.mp3` or `.wav` assessment audio cues:
  1. The browser issues a request with `Range: bytes=0-`.
  2. The service worker stale-while-revalidate handler intercepts the fetch event.
  3. `caches.match(request)` returns a cached full response with HTTP 200 (if precached or previously downloaded).
  4. WebKit / AVPlayer strictly requires an HTTP 206 Partial Content response with `Content-Range` and `Accept-Ranges` headers when a Range request is sent. Receiving HTTP 200 causes iOS Safari to fail audio decoding or indefinitely stall playback.
- **Frequency:** 7/10. Affects auditory cue playback on iOS devices.
- **Impact:** 6/10. Auditory cues in cognitive assessments fail to play or experience stutter.
- **Surgical Root-Cause Fix:**
  Bypass the Service Worker for any request containing a `Range` header:
  ```javascript
  // Range requests (e.g. for audio/video playback) must bypass the SW cache
  if (request.headers.has('range')) {
    return;
  }
  ```

---

### BUG-C11-07: Unpaged Parallel `.get()` on Firestore Collections in `reconcile-dataset-ids.ts`

- **File Link:** [reconcile-dataset-ids.ts#L16-L19](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/reconcile-dataset-ids.ts#L16-L19)
- **Defect Description:**
  In `reconcile-dataset-ids.ts`:
  ```typescript
  const [publicSnap, resultsSnap] = await Promise.all([
    db.collection("publicDataset").select(FieldPath.documentId()).get(),
    db.collection("assessmentResults").select(FieldPath.documentId()).get()
  ]);
  ```
  This script executes unbounded, parallel `.get()` queries across both `publicDataset` and `assessmentResults`.
  While `select(FieldPath.documentId())` reduces network bandwidth per document, Firestore Node.js SDK still constructs full `QueryDocumentSnapshot` objects for every record in both collections.
  In a production dataset with 50,000+ assessments:
  1. Simultaneous unpaged queries exceed gRPC's default deadline of 60 seconds, throwing `14 UNAVAILABLE: Deadline Exceeded`.
  2. Allocating 100,000+ document snapshots in parallel exhausts the V8 heap in resource-constrained environments (e.g. CI/CD or Cloud Run jobs), resulting in process termination (`JavaScript heap out of memory`).
- **Frequency:** 6/10. Guaranteed to fail once dataset volume grows to production scale (>30k-50k documents).
- **Impact:** 7/10. Script crashes, preventing data integrity auditing.
- **Surgical Root-Cause Fix:**
  Process collection IDs sequentially using streaming (`.stream()`) or chunked cursor-based pagination with bounded batch sizes.

---

### BUG-C11-08: Reconciliation Completion Overwrites Concurrent Submissions on Long Scans

- **File Link:** [firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117)
- **Defect Description:**
  In `FirestoreDatasetSummaryMaintenanceRepository.completeReconciliation`:
  ```typescript
  await db.runTransaction(async tx => {
    const current = await tx.get(summaryRef);
    const data = current.data() as Record<string, unknown> | undefined;
    if (data?.migrationRunId !== runId || data?.migrationInProgress !== true) {
      throw new Error('DATASET_SUMMARY_MIGRATION_LOCK_LOST');
    }
    tx.set(summaryRef, {
      ...summary,
      schemaVersion: 1,
      lastUpdatedAt: completedAt,
      lastReconciledAt: completedAt,
      reconciliationSource: source,
      migrationInProgress: false,
      migrationStartedAt: null,
      migrationRunId: null
    }, { merge: true });
  });
  ```
  `FirestoreResearchSubmissionRepository` allows submissions to proceed once a lock is older than 10 minutes (`isLockExpired = Date.now() - summary.migrationStartedAt > 10 * 60 * 1000`).
  If a collection scan on a large dataset takes 11 minutes:
  1. Submissions begin writing to `publicDataset` and incrementing `publicDatasetMeta/summary` counters.
  2. Research submissions use `{ merge: true }` without clearing `migrationRunId` or `migrationInProgress`.
  3. When `completeReconciliation` finishes at minute 11, `data?.migrationRunId === runId` and `data?.migrationInProgress === true` are still `true`!
  4. `completeReconciliation` proceeds and commits `tx.set(summaryRef, { ...summary }, { merge: true })`, completely overwriting the aggregate counters and permanently wiping out the increments for all participant submissions received between minute 10 and 11.
- **Frequency:** 5/10. Occurs whenever a dataset rebuild scan exceeds 10 minutes due to collection scale or Firestore latency.
- **Impact:** 8/10. Silent statistical data loss and divergence between `publicDataset` and aggregate summary counters.
- **Surgical Root-Cause Fix:**
  Enforce lock validity at completion time by verifying that `migrationStartedAt` has not expired:
  ```typescript
  const LOCK_TIMEOUT_MS = 10 * 60 * 1000;
  if (
    data?.migrationRunId !== runId ||
    data?.migrationInProgress !== true ||
    (typeof data?.migrationStartedAt === 'number' && (completedAt - data.migrationStartedAt) > LOCK_TIMEOUT_MS)
  ) {
    throw new Error('DATASET_SUMMARY_MIGRATION_LOCK_LOST');
  }
  ```

---

### BUG-C11-09: Navigation Handler Caches Parameterized URLs Blindly into Cache Storage

- **File Link:** [mobile/public/sw.js#L268-L298](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L268-L298)
- **Defect Description:**
  In `mobile/public/sw.js`:
  ```javascript
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        ...
        try {
          const networkResponse = await Promise.race([
            fetch(request).then((res) => {
              clearTimeout(timerId);
              if (res && res.status === 200) {
                const copy = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
              }
              return res;
            }),
            timeoutPromise
          ]);
  ```
  1. **Cache Pollution:** Storing `request` directly means every unique navigation URL containing tracking parameters, referral tokens, or force flags (e.g. `/mobile/?sessionId=123`, `/mobile/?ref=tg`, `/mobile/?force_desktop=1`) is stored as a distinct cache entry, inflating Cache Storage without benefit.
  2. **Dead Fallback Branch:** In the `catch` block (line 291-294):
     ```javascript
     const mobileMatch = await caches.match('/mobile/');
     if (mobileMatch) return mobileMatch;
     const fallback = await caches.match(request);
     if (fallback) return fallback;
     ```
     Because `/mobile/` is pre-cached during installation in `CORE_SHELL_ASSETS`, `caches.match('/mobile/')` is always found. The subsequent line `caches.match(request)` is completely unreachable dead code.
- **Frequency:** 6/10. Happens on all parameterized navigations.
- **Impact:** 6/10. Unnecessary storage usage and dead fallback logic.
- **Surgical Root-Cause Fix:**
  Normalize navigation cache writes to the canonical shell URL `/mobile/` rather than caching raw parameterized requests:
  ```javascript
  caches.open(CACHE_NAME).then((cache) => cache.put('/mobile/', copy));
  ```

---

### BUG-C11-10: Premature Static Asset Bypass in Server Device Routing Silently Suppresses Routing Cookie Synchronization on `/mobile/`

- **File Link:** [server/middleware/deviceRouting.ts#L98-L107](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/middleware/deviceRouting.ts#L98-L107) & [server/middleware/deviceRouting.ts#L109-L138](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/middleware/deviceRouting.ts#L109-L138)
- **Defect Description:**
  In `server/middleware/deviceRouting.ts`:
  ```typescript
  if (pathname === '/mobile') {
    const originalQuery = url.includes('?') ? url.slice(url.indexOf('?')) : '';
    return res.redirect(301, `/mobile/${originalQuery}`);
  }

  // Ignore API, mobile assets, or static asset requests
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/mobile') ||
    ...
  ) {
    return next();
  }

  const hasForceMobileParam = isTruthyRoutingFlag(queryParams.get('force_mobile')) || ...;
  const hasForceDesktopParam = isTruthyRoutingFlag(queryParams.get('force_desktop')) || ...;
  ...
  if (hasForceMobileParam) { ... res.setHeader('Set-Cookie', ...); }
  ```
  When a user at `/mobile` visits `/mobile?force_desktop=1`, line 91 normalizes the path with a 301 redirect to `/mobile/?force_desktop=1`.
  On the follow-up request, `pathname` is `/mobile/`.
  Line 99 `pathname.startsWith('/mobile')` evaluates to `true`, immediately calling `return next()`.
  Lines 109-138 NEVER EXECUTE for any request under `/mobile/`.
  The server never sets the `pulse_force_desktop` cookie, never cleans routing params, and leaves `cookieDesktop` on line 113 as completely dead code.
- **Frequency:** 6/10. Affects any user clicking "Switch to Desktop" or navigating with routing parameters to `/mobile/`.
- **Impact:** 6/10. Broken cookie synchronization; desktop preference is not set on the server response.
- **Surgical Root-Cause Fix:**
  Only bypass static assets under `/mobile/` (e.g. `/mobile/assets/`), not HTML document requests containing routing query flags:
  ```typescript
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/mobile/assets/') ||
    pathname.startsWith('/admin') ||
    ...
  ```

---

### BUG-C11-11: State Inconsistency in Display-Mode Event Listener Leaves `isInstallable` True When App Becomes Standalone

- **File Link:** [src/lib/pwaStore.ts#L358-L368](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L358-L368)
- **Defect Description:**
  In `src/lib/pwaStore.ts`:
  ```typescript
  const standaloneMedia = window.matchMedia('(display-mode: standalone)');
  const handleStandaloneChange = () => {
    const isStandalone = detectIsStandalone();
    const isIosStandalone = detectIsIosStandalone();
    currentState = {
      ...currentState,
      isStandalone,
      isIosStandalone,
      isInstalled: isStandalone || isIosStandalone || currentState.isInstalled
    };
    notify();
  };
  ```
  When a user installs the application or the display mode switches to `standalone`:
  1. `handleStandaloneChange` updates `isStandalone` and `isInstalled: true`.
  2. However, it fails to recompute `isInstallable` (which depends on `!isInstalled`).
  3. `currentState` is emitted to subscribers with `isInstalled: true` AND `isInstallable: true`.
  4. UI components subscribing to `subscribePwaState()` observe an inconsistent state where the app is simultaneously installed and prompting to be installed.
- **Frequency:** 5/10. Fires whenever display mode changes to standalone while the window is active.
- **Impact:** 5/10. Visual inconsistency; install CTA remains visible in standalone windows.
- **Surgical Root-Cause Fix:**
  Recompute `isInstallable` using `computeIsInstallActionable()` in `handleStandaloneChange`:
  ```typescript
  const isInstalled = isStandalone || isIosStandalone || currentState.isInstalled;
  currentState = {
    ...currentState,
    isStandalone,
    isIosStandalone,
    isInstalled,
    isInstallable: computeIsInstallActionable({
      ...currentState,
      isInstalled,
      isStandalone,
      isIosStandalone
    })
  };
  ```

---

### BUG-C11-12: Misleading Script Contract & Database Config Desynchronization in `reconcile-dataset-ids.ts`

- **File Link:** [reconcile-dataset-ids.ts#L11-L14](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/reconcile-dataset-ids.ts#L11-L14)
- **Defect Description:**
  In `reconcile-dataset-ids.ts`:
  ```typescript
  const projectId = getApps()[0]?.options.projectId ?? "unknown";
  const databaseId =
    process.env.FIREBASE_DATABASE_ID ||
    process.env.VITE_FIREBASE_DATABASE_ID ||
    "(default)";
  ```
  1. `server/config/firebaseAdmin.ts` determines the database ID by falling back to `firebase-applet-config.json` (`appletConfig?.firestoreDatabaseId`) when environment variables are absent. `reconcile-dataset-ids.ts` ignores `firebase-applet-config.json`, producing diagnostic logs with `databaseId: "(default)"` even when the application is connected to a named database instance.
  2. The file is named `reconcile-dataset-ids.ts`, which misleads operators into believing it executes reconciliation or repair logic. In reality, it is purely a read-only counting script that performs no reconciliation.
- **Frequency:** 6/10. Occurs whenever the script is executed in local/staging configurations.
- **Impact:** 4/10. Misleading operations telemetry and inaccurate reporting.
- **Surgical Root-Cause Fix:**
  Read database configuration consistently with `getAdminDb()` and rename/document script as a diagnostic audit tool.

---

### BUG-C11-13: Loose Timestamp Validation Accepts `NaN`, `Infinity`, and Negative Numbers in Ingested Telemetry

- **File Link:** [server/routes/telemetryRoutes.ts#L68](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/telemetryRoutes.ts#L68)
- **Defect Description:**
  In `server/routes/telemetryRoutes.ts`:
  ```typescript
  const payload: PageViewRequest = {
    eventId,
    route,
    surface,
    deviceId: validDeviceId,
    referralSource: validReferral,
    clientTimestampMs: typeof clientTimestampMs === 'number' ? clientTimestampMs : undefined
  };
  ```
  In JavaScript, `typeof NaN === 'number'` and `typeof Infinity === 'number'`.
  Submitting a payload containing `{"clientTimestampMs": NaN}` or `{"clientTimestampMs": Infinity}` or negative values passes validation and is accepted into the telemetry pipeline.
- **Frequency:** 4/10. Non-standard input edge case.
- **Impact:** 4/10. Persists non-standard numeric values in downstream analytics.
- **Surgical Root-Cause Fix:**
  Validate with `Number.isFinite()` and non-negative bounds:
  ```typescript
  clientTimestampMs: typeof clientTimestampMs === 'number' && Number.isFinite(clientTimestampMs) && clientTimestampMs > 0
    ? clientTimestampMs
    : undefined
  ```

---

## 4. Bloat & Dead Code Audit

1. **Unused Server Routing Variables:**
   - In `server/middleware/deviceRouting.ts` line 113:
     ```typescript
     const cookieDesktop = isTruthyRoutingFlag(cookies['pulse_force_desktop']);
     ```
     `cookieDesktop` is parsed and declared but never read anywhere in the module.
   - `isMobileUserAgent(req)` is exported from `server/middleware/deviceRouting.ts` but never called by the middleware itself.
2. **Dead Offline Fallback in Service Worker:**
   - In `mobile/public/sw.js` line 293:
     ```javascript
     const fallback = await caches.match(request);
     if (fallback) return fallback;
     ```
     Because `/mobile/` is pre-cached in `CORE_SHELL_ASSETS` on install, line 291 `caches.match('/mobile/')` always succeeds, rendering line 293 unreachable dead code.
3. **Redundant Standalone PWA Redirect Logic:**
   - In `mobile/index.html` lines 69-90:
     The inline script attempts to redirect any non-standalone browser to `/`. With ADR-004 unified routing, surface selection is managed responsive-first in `src/App.tsx`, making the hardcoded HTML script redirect redundant and prone to loops.
