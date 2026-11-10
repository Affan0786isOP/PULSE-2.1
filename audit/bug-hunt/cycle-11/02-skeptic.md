# PULSE v2.1 — Cycle 11 Adversarial Bug Hunt: Skeptic Verification & Challenge Report

**Auditor:** Bug Skeptic Agent (Cycle 11)  
**Role:** Ruthlessly stress-test, verify, challenge, and calibrate findings from Bug Hunter Agent (Cycle 11).  
**Methodology:** Ponytail Senior Dev Verification (/ponytail lens: truth in production, runtime call-graph verification, concurrency realism, YAGNI filtering, and surgical fix validation).  
**Verification Target Subsystems:**
1. `mobile/public/sw.js` (Service Worker caching, offline lifecycle, session gate)
2. `server/middleware/deviceRouting.ts` & `src/lib/deviceRouting.ts` / `shared/domain/deviceRouting.ts` (Device routing & cookie synchronization)
3. `server/routes/telemetryRoutes.ts` & `server/services/telegramNotifierService.ts` (Telemetry ingestion and Telegram outbox)
4. `src/lib/pwaStore.ts` & `mobile/src/lib/pwaStore.ts` (PWA installation and display mode state machine)
5. `server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts` (Dataset summary maintenance and reconciliation locks)
6. `reconcile-dataset-ids.ts` (Dataset reconciliation diagnostic utility)

---

## 1. Executive Summary & Classification Matrix

Of the thirteen (13) candidate defects submitted by the Cycle 11 Bug Hunter:
- **8 CONFIRMED** (Material runtime bugs meeting or exceeding the Risk Score $\ge 5$ threshold).
- **1 DISPROVED** (False Positive: Hunter claimed an active ping-pong redirect loop in production, but call-site inspection proves the legacy helper branch is unreachable from canonical routes).
- **4 DISMISSED** (Score $< 5$, zero production frequency, non-production ad-hoc utility scripts, or speculative YAGNI violations).

### Verdict Summary Table

| ID | Hunter Candidate Summary | Hunter Score | Skeptic Freq | Skeptic Impact | Skeptic Score | Classification | Core Skeptic Verdict |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| **BUG-C11-01** | `detectIsAndroidAppMode` treats any `android-app://` referrer as an installed PWA ([src/lib/pwaStore.ts#L76-L79](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L76-L79)) | 72 | 9 | 8 | **72** | **CONFIRMED** | All Android app link clicks send `android-app://` referrers; falsely marks visitor as installed and permanently suppresses install CTA. |
| **BUG-C11-02** | Missing lock-expiration logic in dataset summary maintenance causes permanent deadlock ([firestoreDatasetSummaryMaintenanceRepository.ts#L57](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L57)) | 63 | 7 | 8 | **56** | **CONFIRMED** | Interrupted migrations leave `migrationInProgress: true`. Admin UI disables buttons and API lacks `resume` parameter, permanently wedging maintenance. |
| **BUG-C11-03** | Telemetry ingestion causes unbounded memory leak and $O(N)$ event loop sweep via `pageViewEventIds` ([telegramNotifierService.ts#L278-L283](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L278-L283)) | 56 | 7 | 8 | **56** | **CONFIRMED** | 48h TTL keys never expire during traffic bursts. Map exceeds 2000 and loops synchronously over all keys on every request without deleting anything. |
| **BUG-C11-04** | Deprecated `/mobile/` redirection in `resolveDeviceRedirect` conflicts with `mobile/index.html` causing redirect loop ([shared/domain/deviceRouting.ts#L250-L262](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/domain/deviceRouting.ts#L250-L262)) | 56 | 1 | 3 | **3** | **DISPROVED** | False positive in production. `resolveDeviceRedirect` is only mounted at `/mobile/*` in `DesktopApp.tsx`; canonical routes use `useViewportSurface` directly. No loop occurs. |
| **BUG-C11-05** | Stale-while-revalidate fetch listener returns `undefined` on network failure, triggering browser `TypeError` ([mobile/public/sw.js#L317-L336](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L317-L336)) | 49 | 7 | 7 | **49** | **CONFIRMED** | Cache miss while offline causes `.catch(() => cachedResponse)` to resolve to `undefined`. `event.respondWith(undefined)` throws fatal `TypeError`. |
| **BUG-C11-06** | Media Range requests intercepted by SW return HTTP 200 instead of 206, breaking audio cues in iOS Safari ([mobile/public/sw.js#L309-L336](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L309-L336)) | 42 | 0 | 1 | **0** | **DISMISSED** | Speculative / YAGNI. PULSE audio cues use in-memory Web Audio API oscillators (`ctx.createOscillator()`). Zero audio media files exist in `public/`. |
| **BUG-C11-07** | Unpaged parallel `.get()` on Firestore collections in `reconcile-dataset-ids.ts` ([reconcile-dataset-ids.ts#L16-L19](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/reconcile-dataset-ids.ts#L16-L19)) | 42 | 1 | 2 | **2** | **DISMISSED** | Score $< 5$. `reconcile-dataset-ids.ts` is an unreferenced root diagnostic scratch script. Production reconciliation is in `scripts/reconcileDatasetSummary.ts`. |
| **BUG-C11-08** | Reconciliation completion blindly commits stale counts over newer submissions after 10m lock window expires ([firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117)) | 40 | 2 | 8 | **16** | **CONFIRMED** | Real race condition: long scans (>10m) lose exclusivity while research submissions resume. Completion commits stale counts over new writes. Calibrated frequency to 2. |
| **BUG-C11-09** | Navigation handler caches parameterized URLs blindly, causing cache pollution and dead fallback branch ([mobile/public/sw.js#L268-L298](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L268-L298)) | 36 | 6 | 4 | **24** | **CONFIRMED** | Unique query parameters pollute Cache Storage. Pre-cached `/mobile/` makes subsequent `caches.match(request)` fallback completely unreachable dead code. |
| **BUG-C11-10** | Premature static asset bypass skips routing cookie generation and query cleanup on `/mobile/` ([server/middleware/deviceRouting.ts#L98-L107](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/middleware/deviceRouting.ts#L98-L107)) | 36 | 5 | 5 | **25** | **CONFIRMED** | `pathname.startsWith('/mobile')` immediately exits to `next()`, bypassing cookie setting and query stripping. Unused `cookieDesktop` left dead. |
| **BUG-C11-11** | Display-mode change handler fails to recompute `isInstallable`, leaving `isInstallable: true` when app becomes standalone ([src/lib/pwaStore.ts#L358-L368](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L358-L368)) | 25 | 5 | 5 | **25** | **CONFIRMED** | `handleStandaloneChange` updates `isStandalone` and `isInstalled: true`, but forgets to recompute `isInstallable`, creating an impossible contradictory state. |
| **BUG-C11-12** | Misleading script contract and database config desynchronization in `reconcile-dataset-ids.ts` ([reconcile-dataset-ids.ts#L11-L14](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/reconcile-dataset-ids.ts#L11-L14)) | 24 | 1 | 2 | **2** | **DISMISSED** | Score $< 5$. Code hygiene on an ad-hoc local script. No production runtime or deployment impact. |
| **BUG-C11-13** | Loose timestamp validation accepts `NaN`, `Infinity`, and extreme timestamps in telemetry ([server/routes/telemetryRoutes.ts#L68](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/telemetryRoutes.ts#L68)) | 16 | 1 | 1 | **1** | **DISMISSED** | Score $< 5$. JSON cannot represent `NaN`/`Infinity`. Furthermore, `clientTimestampMs` is completely unread, unformatted, and never persisted anywhere in the backend. |

---

## 2. In-Depth Skeptic Audits & Proofs

---

### BUG-C11-01: `detectIsAndroidAppMode` Treats All `android-app://` Referrers as Installed PWAs

- **File Link:** [src/lib/pwaStore.ts#L76-L79](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L76-L79)
- **Skeptic Code Examination:**
  ```typescript
  export function detectIsAndroidAppMode(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(document.referrer?.includes('android-app://'));
  }
  ```
  In `computeCurrentState()`:
  ```typescript
  const isAndroidAppMode = detectIsAndroidAppMode();
  const isInstalled = isStandalone || isIosStandalone || isAndroidAppMode || appInstalledFlag;
  const isInstallable = computeIsInstallActionable({
    isInstalled,
    isStandalone,
    isIosStandalone,
    isAndroidAppMode,
    ...
  });
  ```
  And in `computeIsInstallActionable()`:
  ```typescript
  if (params.isInstalled || params.isStandalone || params.isIosStandalone || params.isAndroidAppMode) {
    return false;
  }
  ```
- **Skeptic Challenge & Verification:**
  - On the Android platform, whenever a user clicks any web link inside a native Android application (e.g., Gmail, WhatsApp, Telegram, Twitter/X, Reddit, Slack, Discord, LinkedIn), Android's Intent system automatically populates the HTTP `Referer` header with `android-app://<package-name>` (e.g. `android-app://org.telegram.messenger` or `android-app://com.google.android.gm`).
  - In the browser, `document.referrer` contains this exact string.
  - Because `document.referrer?.includes('android-app://')` returns `true`, PULSE permanently flags the user with `isAndroidAppMode: true` and `isInstalled: true`.
  - As a direct consequence, `isInstallable` evaluates to `false`. The "Install App" navigation button, banner, and promotional modals are completely hidden for genuine prospective users on Android.
  - PULSE does not currently publish a native Android wrapper or TWA package on Google Play; even if it did, checking generic `android-app://` treats external inbound traffic as internal app mode.
- **Risk Score:** Frequency: 9 | Impact: 8 | **Score: 72**
- **Classification:** **CONFIRMED**
- **Surgical Fix:**
  Remove the naive `android-app://` check or restrict it strictly to a verified PULSE package ID:
  ```typescript
  export function detectIsAndroidAppMode(): boolean {
    // External referrals from native apps (Gmail, Telegram, Twitter) provide android-app:// referrers.
    // They do not indicate the app is installed or running in a TWA.
    return false;
  }
  ```

---

### BUG-C11-02: Missing Lock-Expiration Logic in Dataset Summary Maintenance Causes Permanent Deadlock

- **File Link:** [firestoreDatasetSummaryMaintenanceRepository.ts#L51-L80](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L51-L80), [server/routes/adminRoutes.ts#L382](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/adminRoutes.ts#L382), and [src/components/admin/DatasetSummaryMaintenancePanel.tsx#L125](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/components/admin/DatasetSummaryMaintenancePanel.tsx#L125)
- **Skeptic Code Examination:**
  In `FirestoreDatasetSummaryMaintenanceRepository`:
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
    if (data?.migrationInProgress === true && !resume) {
      throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
    }
  ```
  Meanwhile, in `FirestoreResearchSubmissionRepository` (lines 62-65):
  ```typescript
  const isLockExpired = typeof summary.migrationStartedAt === 'number' &&
    (Date.now() - summary.migrationStartedAt) > 10 * 60 * 1000;
  if (summary.migrationInProgress === true && !isLockExpired) {
    throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
  }
  ```
- **Skeptic Challenge & Verification:**
  - The asymmetry between the submission repository and the maintenance repository is glaring.
  - If a background `apply` reconciliation run is interrupted (e.g. Node process crash, Cloud Run container recycling, SIGTERM during deployment, or uncaught exception during batching):
    1. `migrationInProgress` remains `true` indefinitely in `publicDatasetMeta/summary`.
    2. `getStatus()` continues to report `migrationInProgress: true` forever, because it lacks `isLockExpired`.
    3. `DatasetSummaryMaintenancePanel.tsx` disables the "Verify summary" and "Rebuild summary" buttons whenever `status?.migrationInProgress` is `true`.
    4. In `server/routes/adminRoutes.ts`, line 382 invokes `deps.datasetSummaryReconciliationService.reconcile(mode, { source: 'admin-ui' })` without reading or accepting any `resume` parameter from the client request body.
    5. The admin UI and API are permanently deadlocked at HTTP 409 `DATASET_SUMMARY_MIGRATION_IN_PROGRESS`. Only a database administrator manually deleting fields in Cloud Firestore console can unwedge the system.
- **Risk Score:** Frequency: 7 | Impact: 8 | **Score: 56**
- **Classification:** **CONFIRMED**
- **Surgical Fix:**
  Add a standard 10-minute lock expiration helper in `firestoreDatasetSummaryMaintenanceRepository.ts`:
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

### BUG-C11-03: Telemetry Ingestion Memory Leak and Synchronous Event Loop Sweep via `pageViewEventIds`

- **File Link:** [server/services/telegramNotifierService.ts#L276-L283](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L276-L283) & [server/services/telegramNotifierService.ts#L374-L382](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L374-L382)
- **Skeptic Code Examination:**
  ```typescript
  private readonly pageViewEventIds: Map<string, number> = new Map(); // eventId -> expiry epoch ms
  ...
  public async enqueuePageView(event: PageViewRequest): Promise<{ success: boolean; deduplicated?: boolean }> {
    ...
    const now = Date.now();
    this.cleanExpiredDeduplicationKeys(now);
    if (this.pageViewEventIds.has(event.eventId)) {
      return { success: true, deduplicated: true };
    }
    this.pageViewEventIds.set(event.eventId, now + 48 * 60 * 60 * 1000);
  ```
  And:
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
- **Skeptic Challenge & Verification:**
  - While `this.outbox` has an explicit capacity bound (`MAX_OUTBOX_CAPACITY = 200`) and actively drops low-priority items via `ensureCapacity()`, `pageViewEventIds` has no upper limit.
  - Every event is given a 48-hour TTL (`now + 48 * 60 * 60 * 1000`).
  - As soon as total traffic exceeds 2,000 requests over a rolling 48-hour window (fewer than 42 visits/hour):
    1. `this.pageViewEventIds.size > 2000` evaluates to `true`.
    2. The synchronous `for...of` loop runs on the main Node.js thread.
    3. Because none of the events are 48 hours old yet, `expiry <= now` is `false` for every single entry.
    4. Zero items are deleted. The map continues growing unbounded.
    5. On **every single subsequent incoming page-view HTTP request**, the server synchronously iterates through thousands of map entries before returning a response, stalling the event loop and inducing server latency spikes and potential OOM.
- **Risk Score:** Frequency: 7 | Impact: 8 | **Score: 56**
- **Classification:** **CONFIRMED**
- **Surgical Fix:**
  Add a capacity ceiling with FIFO eviction:
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
    while (this.pageViewEventIds.size >= TelegramNotifierService.MAX_DEDUP_KEYS) {
      const oldestKey = this.pageViewEventIds.keys().next().value;
      if (oldestKey) this.pageViewEventIds.delete(oldestKey);
      else break;
    }
  }
  ```

---

### BUG-C11-04: Deprecated `/mobile/` Redirection in `resolveDeviceRedirect`

- **File Link:** [shared/domain/deviceRouting.ts#L250-L262](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/domain/deviceRouting.ts#L250-L262) & [mobile/index.html#L69-L90](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/index.html#L69-L90)
- **Skeptic Code Examination:**
  In `shared/domain/deviceRouting.ts`:
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
- **Skeptic Challenge & Verification:**
  - Hunter claimed: *"If `resolveDeviceRedirect` is invoked on a canonical route on mobile, it instructs the browser to redirect to `/mobile/`. As soon as `/mobile/` loads, `mobile/index.html` redirects back to `/`. This creates a ping-pong redirect loop that bounces until the browser halts with `ERR_TOO_MANY_REDIRECTS`."*
  - **Skeptic Call-Graph Trace:**
    Where is `resolveDeviceRedirect` actually invoked in the production application?
    1. `src/App.tsx` does NOT call `resolveDeviceRedirect`. It uses `useViewportSurface()`, which internally calls `evaluateDeviceRouting(search)` to dynamically toggle between `<DesktopApp />` and `<MobileAppWrapper />` without any URL redirects.
    2. `mobile/src/App.tsx` imports `resolveDeviceRedirect` at line 19, but never calls it anywhere.
    3. `src/DesktopApp.tsx` mounts `RedirectToMobile` strictly on:
       ```typescript
       <Route path="/mobile" element={<RedirectToMobile />} />
       <Route path="/mobile/*" element={<RedirectToMobile />} />
       ```
       It is **never mounted on `/` or any canonical route**!
    4. When a mobile visitor loads `/mobile`, `isMobilePath` is `true`. Therefore, `if (decision.shouldUseMobile && !isMobilePath)` evaluates to `false`!
    5. The browser loads `mobile/index.html`, which redirects `/mobile/` back to `/`. At `/`, `App.tsx` mounts `MobileAppWrapper`. No further redirects occur; execution halts cleanly on `/`.
  - **Conclusion:** An active ping-pong redirect loop in production does not exist. Lines 250-262 in `shared/domain/deviceRouting.ts` are dormant legacy logic from pre-ADR-004 routing, but they are not executed on canonical paths.
- **Risk Score:** Frequency: 1 | Impact: 3 | **Score: 3 (< 5)**
- **Classification:** **DISPROVED** (False Positive in production; dormant legacy code).

---

### BUG-C11-05: Stale-While-Revalidate Fetch Listener Resolves to `undefined` on Network Failure

- **File Link:** [mobile/public/sw.js#L317-L336](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L317-L336)
- **Skeptic Code Examination:**
  ```javascript
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
- **Skeptic Challenge & Verification:**
  - Let us trace the execution when an asset is requested while offline or experiencing a connection drop, and the asset is not yet in `CACHE_NAME`:
    1. `cachedResponse` evaluates to `undefined`.
    2. `cachedResponse || fetchPromise` evaluates to `fetchPromise`.
    3. `fetch(request)` fails because the device is offline, rejecting the promise.
    4. `.catch(() => cachedResponse)` executes and returns `cachedResponse`.
    5. `cachedResponse` is `undefined`.
    6. `fetchPromise` resolves successfully to `undefined`.
    7. `event.respondWith()` receives a promise that resolves to `undefined`.
  - Under the W3C Service Worker FetchEvent specification: *"If the argument to `respondWith()` resolves to anything other than a `Response` object, reject the promise with a `TypeError`."*
  - In Chrome/Safari/Firefox, this immediately raises an unhandled `TypeError: Failed to convert value to 'Response'`, breaking the fetch handler rather than returning a clean offline response or allowing standard browser network failure handling.
- **Risk Score:** Frequency: 7 | Impact: 7 | **Score: 49**
- **Classification:** **CONFIRMED**
- **Surgical Fix:**
  Ensure `.catch()` returns a synthetic gateway timeout / offline response if `cachedResponse` is missing:
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
- **Skeptic Code Examination & Verification:**
  - Hunter claimed: *"When WebKit (iOS Safari) streams `.mp3` or `.wav` assessment audio cues: WebKit strictly requires an HTTP 206 Partial Content response with Content-Range... Receiving HTTP 200 causes iOS Safari to fail audio decoding or indefinitely stall playback."*
  - **Skeptic Verification of Audio Subsystem:**
    - We audited the entire audio pipeline in `shared/lib/settingsStore.ts` (lines 403-468) where `playAudioCue()` is defined.
    - Audio cues in PULSE are **100% synthesized in-memory using the Web Audio API**:
      ```typescript
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Generates mathematical sine/triangle/sawtooth waves on the fly
      ```
    - We checked `public/` and `mobile/public/`: **not a single `.mp3`, `.wav`, `.ogg`, or `.mp4` file exists in the repository!**
    - The regex in `sw.js` line 309 (`/\.(?:js|...|mp3|wav|...)$/i`) is boilerplate copied from generic Service Worker templates.
    - Because the app never makes HTTP Range requests for media files, this failure mode has a realistic frequency of 0 in PULSE.
- **Risk Score:** Frequency: 0 | Impact: 1 | **Score: 0 (< 5)**
- **Classification:** **DISMISSED** (False Positive / Zero Frequency / Speculative YAGNI).

---

### BUG-C11-07: Unpaged Parallel `.get()` on Firestore Collections in `reconcile-dataset-ids.ts`

- **File Link:** [reconcile-dataset-ids.ts#L16-L19](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/reconcile-dataset-ids.ts#L16-L19)
- **Skeptic Code Examination & Verification:**
  - `reconcile-dataset-ids.ts` is a 43-line script sitting in the workspace root.
  - It is not referenced in `package.json` scripts, not used by CI/CD, not called by server endpoints, and not deployed to production.
  - The actual production reconciliation service is implemented in [server/services/datasetSummaryReconciliation.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/datasetSummaryReconciliation.ts) and driven by [scripts/reconcileDatasetSummary.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/scripts/reconcileDatasetSummary.ts), which rigorously utilizes cursor-based pagination (`PAGE_SIZE = 500`).
  - While running `reconcile-dataset-ids.ts` against 100,000 documents could cause gRPC deadlines, an unreferenced local scratch diagnostic tool has near-zero runtime frequency and zero impact on production users or availability.
- **Risk Score:** Frequency: 1 | Impact: 2 | **Score: 2 (< 5)**
- **Classification:** **DISMISSED** (Score < 5 / Low Impact / Ad-Hoc Script).

---

### BUG-C11-08: Reconciliation Completion Overwrites Concurrent Submissions on Long Scans

- **File Link:** [firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117) & [firestoreResearchSubmissionRepository.ts#L62-L65](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L62-L65)
- **Skeptic Code Examination:**
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
- **Skeptic Challenge & Verification:**
  - `FirestoreResearchSubmissionRepository` allows participant submissions to proceed once a lock is older than 10 minutes (`isLockExpired = (Date.now() - summary.migrationStartedAt) > 10 * 60 * 1000`).
  - Submissions update counters using `{ merge: true }`, which does **not** clear `migrationRunId` or `migrationInProgress`.
  - If a large dataset pagination scan or network delay causes reconciliation to finish after minute 10:
    1. Submissions commit new records to `publicDataset` and increment summary counters during minute 10+.
    2. When `completeReconciliation` finishes at minute 11, `data?.migrationRunId === runId` and `data?.migrationInProgress === true` are still true!
    3. `completeReconciliation` proceeds and commits `{ ...summary }`, writing the stale totals calculated from the start of the scan and silently wiping out all participant submission increments that occurred between minute 10 and 11.
  - Hunter assigned Frequency 5/10, which is exaggerated: dataset scans in PULSE typically finish in 1-5 seconds. For a scan to exceed 10 minutes, the collection would require massive scale or network freezes.
  - However, the concurrency flaw is genuine and causes silent data divergence whenever a scan runs past its lease. We calibrate Frequency to 2/10 and Impact to 8/10.
- **Risk Score:** Frequency: 2 | Impact: 8 | **Score: 16**
- **Classification:** **CONFIRMED**
- **Surgical Fix:**
  In `completeReconciliation`, verify that the lock lease has not expired:
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
- **Skeptic Code Examination:**
  ```javascript
  if (request.mode === 'navigate') {
    ...
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
    return networkResponse;
  } catch {
    clearTimeout(timerId);
    const mobileMatch = await caches.match('/mobile/');
    if (mobileMatch) return mobileMatch;
    const fallback = await caches.match(request);
    if (fallback) return fallback;
    return new Response('Offline', ...);
  }
  ```
- **Skeptic Challenge & Verification:**
  - Line 282 caches `request` directly: `/mobile/?sessionId=123`, `/mobile/?ref=tg`, etc., are each saved as distinct cache entries, fragmenting and bloating Cache Storage with redundant shell copies.
  - In the offline fallback handler, line 291 checks `caches.match('/mobile/')`. Because `'/mobile/'` is precached in `CORE_SHELL_ASSETS` during SW installation, `caches.match('/mobile/')` is **always found**.
  - As a result, line 293 (`const fallback = await caches.match(request)`) is completely unreachable dead code.
- **Risk Score:** Frequency: 6 | Impact: 4 | **Score: 24**
- **Classification:** **CONFIRMED**
- **Surgical Fix:**
  Normalize shell caching to `'/mobile/'` and remove the dead fallback branch:
  ```javascript
  // Write to canonical shell URL
  caches.open(CACHE_NAME).then((cache) => cache.put('/mobile/', copy));
  ```
  And in catch:
  ```javascript
  const mobileMatch = await caches.match('/mobile/');
  if (mobileMatch) return mobileMatch;
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/plain' } });
  ```

---

### BUG-C11-10: Premature Static Asset Bypass in Server Device Routing Skips Cookie Sync on `/mobile/`

- **File Link:** [server/middleware/deviceRouting.ts#L98-L107](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/middleware/deviceRouting.ts#L98-L107) & [server/middleware/deviceRouting.ts#L109-L138](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/middleware/deviceRouting.ts#L109-L138)
- **Skeptic Code Examination:**
  ```typescript
  if (pathname === '/mobile') {
    const originalQuery = url.includes('?') ? url.slice(url.indexOf('?')) : '';
    return res.redirect(301, `/mobile/${originalQuery}`);
  }

  // Ignore API, mobile assets, or static asset requests
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/mobile') ||
    pathname.startsWith('/admin') ||
    ...
  ) {
    return next();
  }

  const hasForceMobileParam = ...;
  const hasForceDesktopParam = ...;
  if (hasForceMobileParam) { res.setHeader('Set-Cookie', ...); }
  ```
- **Skeptic Challenge & Verification:**
  - When a user navigates to `/mobile?force_desktop=1`, line 91 normalizes with a 301 redirect to `/mobile/?force_desktop=1`.
  - On the redirected request, `pathname` is `/mobile/`.
  - Line 99 evaluates `pathname.startsWith('/mobile')` to `true`, immediately executing `return next()`.
  - Lines 109-138 are completely bypassed for any document request under `/mobile/`. The server never sets the `pulse_force_desktop` cookie and never strips routing parameters from the URL.
  - Furthermore, `const cookieDesktop` on line 113 is declared but never read anywhere in the module.
- **Risk Score:** Frequency: 5 | Impact: 5 | **Score: 25**
- **Classification:** **CONFIRMED**
- **Surgical Fix:**
  Refine the bypass to target static assets under `/mobile/` (`/mobile/assets/`), allowing HTML navigation requests with routing query parameters to proceed to cookie synchronization:
  ```typescript
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/mobile/assets/') ||
    pathname.startsWith('/admin') ||
  ```

---

### BUG-C11-11: Display-Mode Change Handler Leaves `isInstallable: true` in Standalone Mode

- **File Link:** [src/lib/pwaStore.ts#L358-L368](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L358-L368)
- **Skeptic Code Examination:**
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
- **Skeptic Challenge & Verification:**
  - Notice the contrast with the `appinstalled` listener right above (lines 346-352), which explicitly sets `isInstallable: false`.
  - When the window's display mode switches to `standalone`:
    1. `handleStandaloneChange` updates `isStandalone: true` and `isInstalled: true`.
    2. However, it fails to recompute `isInstallable`.
    3. `currentState.isInstallable` remains whatever it was prior to the event (e.g. `true`).
    4. `notify()` publishes a state where `isStandalone: true`, `isInstalled: true`, and `isInstallable: true`.
  - This directly violates the invariant documented in `computeIsInstallActionable()`: *"If already installed or running in standalone mode -> false (no CTA)."*
- **Risk Score:** Frequency: 5 | Impact: 5 | **Score: 25**
- **Classification:** **CONFIRMED**
- **Surgical Fix:**
  Recompute `isInstallable` inside `handleStandaloneChange`:
  ```typescript
  const handleStandaloneChange = () => {
    const isStandalone = detectIsStandalone();
    const isIosStandalone = detectIsIosStandalone();
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
    notify();
  };
  ```

---

### BUG-C11-12: Misleading Script Contract & Database Config Desync in `reconcile-dataset-ids.ts`

- **File Link:** [reconcile-dataset-ids.ts#L11-L14](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/reconcile-dataset-ids.ts#L11-L14)
- **Skeptic Code Examination & Verification:**
  - `reconcile-dataset-ids.ts` is an ad-hoc local script.
  - Hunter claims that falling back to `"(default)"` database ID and naming a counting script `reconcile-...` is a defect.
  - This is code hygiene/naming semantics on an unused development utility. It has zero impact on application behavior, data consistency, or end users.
- **Risk Score:** Frequency: 1 | Impact: 2 | **Score: 2 (< 5)**
- **Classification:** **DISMISSED** (Score < 5 / Low Impact / YAGNI).

---

### BUG-C11-13: Loose Timestamp Validation in Telemetry Route

- **File Link:** [server/routes/telemetryRoutes.ts#L68](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/telemetryRoutes.ts#L68)
- **Skeptic Code Examination & Verification:**
  - Hunter claimed: *"Loose `typeof` check allows `NaN`, `Infinity`, and extreme timestamps into persisted telemetry payloads."*
  - **Skeptic Verification:**
    1. HTTP requests send JSON bodies parsed by Express `express.json()`. In the JSON specification (RFC 8259), `NaN` and `Infinity` are invalid syntax. Attempting to send `{"clientTimestampMs": NaN}` causes Express to reject the request immediately with HTTP 400 Bad Request before hitting the route.
    2. We searched the entire backend for `clientTimestampMs`. In `TelegramNotifierService.formatPageView()`, the message text formats `route`, `surface`, `deviceId`, `referralSource`, and `receivedAtIso` (server-generated timestamp). **`clientTimestampMs` is never formatted, never displayed, never processed, and never persisted to any database.**
    3. The field is dead data. Validating it with `Number.isFinite()` would change nothing observable.
- **Risk Score:** Frequency: 1 | Impact: 1 | **Score: 1 (< 5)**
- **Classification:** **DISMISSED** (Score < 5 / Dead Property / False Impact).

---

## 3. Calibrated Defect Ranking Table

The following confirmed defects are ranked by calibrated Skeptic Risk Score:

| Rank | Defect ID | Category | Target File | Calibrated Risk Score (F×I) | Summary of Confirmed Defect |
|:---:|---|---|---|:---:|---|
| **1** | **BUG-C11-01** | PWA Lifecycle | [src/lib/pwaStore.ts#L76-L79](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L76-L79) | **72** (9×8) | Naive `android-app://` referrer check marks all Android app referrals as installed PWAs, permanently suppressing install CTAs. |
| **2** | **BUG-C11-02** | Concurrency / Admin | [firestoreDatasetSummaryMaintenanceRepository.ts#L57](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L57) | **56** (7×8) | Missing lock-expiration logic in dataset summary repository permanently wedges maintenance UI and API upon aborted runs. |
| **3** | **BUG-C11-03** | Memory / DoS | [telegramNotifierService.ts#L278-L283](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L278-L283) | **56** (7×8) | Unbounded `pageViewEventIds` map executes synchronous $O(N)$ sweep over thousands of keys on every request without evicting. |
| **4** | **BUG-C11-05** | Service Worker | [mobile/public/sw.js#L317-L336](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L317-L336) | **49** (7×7) | Stale-while-revalidate listener resolves to `undefined` on network failure, triggering browser `TypeError` in `event.respondWith()`. |
| **5** | **BUG-C11-10** | Device Routing | [server/middleware/deviceRouting.ts#L98-L107](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/middleware/deviceRouting.ts#L98-L107) | **25** (5×5) | Premature `pathname.startsWith('/mobile')` early-exit skips routing cookie sync and query stripping on `/mobile/` requests. |
| **6** | **BUG-C11-11** | PWA State | [src/lib/pwaStore.ts#L358-L368](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L358-L368) | **25** (5×5) | Display-mode change handler updates standalone state but omits recomputing `isInstallable`, emitting contradictory PWA state. |
| **7** | **BUG-C11-09** | Cache Storage | [mobile/public/sw.js#L268-L298](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L268-L298) | **24** (6×4) | Navigation caching saves raw parameterized requests to cache, leaving fallback `caches.match(request)` unreachable. |
| **8** | **BUG-C11-08** | Concurrency Race | [firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117) | **16** (2×8) | `completeReconciliation` commits stale counts over newer participant submissions if reconciliation run exceeds 10 minutes. |

---

## 4. Bloat & Dead Code Audit Summary

1. **Unused Server Variable:**
   In [server/middleware/deviceRouting.ts#L113](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/middleware/deviceRouting.ts#L113):
   `const cookieDesktop = isTruthyRoutingFlag(cookies['pulse_force_desktop']);` is declared and parsed from headers, but never used anywhere in the file.
2. **Unreachable SW Fallback Branch:**
   In [mobile/public/sw.js#L293](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L293):
   `const fallback = await caches.match(request); if (fallback) return fallback;` is unreachable dead code because `caches.match('/mobile/')` is pre-cached and always resolves immediately prior.
3. **Dead Telemetry Property:**
   In [server/routes/telemetryRoutes.ts#L68](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/telemetryRoutes.ts#L68):
   `clientTimestampMs` is accepted into `PageViewRequest` but is never persisted or formatted into notifications.
4. **Unused Audio File Extensions in Service Worker:**
   In [mobile/public/sw.js#L309](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L309):
   Extensions `mp3|wav|ogg|webm|mp4` are matched, but no media files exist in the repository; all audio is synthesized via Web Audio API.
