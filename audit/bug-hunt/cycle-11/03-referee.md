# PULSE v2.1 — Cycle 11 Adversarial Bug Hunt Referee Report

**Auditor:** Bug Referee Agent (Cycle 11)  
**Methodology:** Independent code inspection, runtime call-graph verification, concurrency & race-condition simulation, and Ponytail Senior Developer principles (/ponytail-audit lens: correctness, scale/concurrency races under load, resilience/fault-isolation, YAGNI/dead code elimination, and minimal surgical diffs).  
**Adjudication Threshold:** Real defect in production with Risk Score (Frequency × Impact) $\ge 5$. Speculative, unrequested, dead-code, or disproved claims are rejected.

---

## 1. Executive Summary & Verdict Scorecard

Cycle 11 audited thirteen (13) candidate defects debated between the Bug Hunter and Bug Skeptic across six critical runtime subsystems:
1. `mobile/public/sw.js` (Service Worker caching, offline lifecycle, navigation fallback)
2. `server/middleware/deviceRouting.ts` & `src/lib/deviceRouting.ts` / `shared/domain/deviceRouting.ts` (Edge & client device routing and cookie synchronization)
3. `server/routes/telemetryRoutes.ts` & `server/services/telegramNotifierService.ts` (Telemetry ingestion, deduplication map, and Telegram outbox)
4. `src/lib/pwaStore.ts` & `mobile/src/lib/pwaStore.ts` (PWA installation lifecycle and display mode state machine)
5. `server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts` (Public dataset summary reconciliation lock and pagination persistence)
6. `reconcile-dataset-ids.ts` (Dataset reconciliation diagnostic utility)

### Final Adjudication Breakdown:
- **CONFIRMED (Actionable, Risk Score $\ge 5$):** 8 defects
- **DISPROVED (False Positive in Production):** 1 defect (`BUG-C11-04`)
- **DISMISSED (Score $< 5$ / Speculative / YAGNI):** 4 defects (`BUG-C11-06`, `BUG-C11-07`, `BUG-C11-12`, `BUG-C11-13`)

### Quantitative Verdict Matrix

| Bug ID | Target File | Category | Hunter Score | Skeptic Score | Referee Freq | Referee Impact | Final Risk Score | Final Ruling |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **BUG-C11-01** | [src/lib/pwaStore.ts#L76-L79](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L76-L79) | PWA / Android | 72 | 72 | 9 | 8 | **72** | **CONFIRMED** |
| **BUG-C11-02** | [firestoreDatasetSummaryMaintenanceRepository.ts#L57](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L57) | Concurrency / Admin Deadlock | 63 | 56 | 7 | 8 | **56** | **CONFIRMED** |
| **BUG-C11-03** | [telegramNotifierService.ts#L278-L283](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L278-L283) | Memory Leak / Event Loop | 56 | 56 | 7 | 8 | **56** | **CONFIRMED** |
| **BUG-C11-04** | [shared/domain/deviceRouting.ts#L250-L262](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/domain/deviceRouting.ts#L250-L262) | Routing / Redirect Loop | 56 | 3 | 0 | 0 | **0** | **DISPROVED** |
| **BUG-C11-05** | [mobile/public/sw.js#L317-L336](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L317-L336) | Service Worker / Resilience | 49 | 49 | 7 | 7 | **49** | **CONFIRMED** |
| **BUG-C11-06** | [mobile/public/sw.js#L309-L336](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L309-L336) | Audio / Media Streaming | 42 | 0 | 0 | 1 | **0** | **DISMISSED** |
| **BUG-C11-07** | [reconcile-dataset-ids.ts#L16-L19](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/reconcile-dataset-ids.ts#L16-L19) | Scale / Memory Exhaustion | 42 | 2 | 1 | 2 | **2** | **DISMISSED** |
| **BUG-C11-08** | [firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117) | Data Loss / Concurrency Race | 40 | 16 | 2 | 8 | **16** | **CONFIRMED** |
| **BUG-C11-09** | [mobile/public/sw.js#L268-L298](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L268-L298) | Cache Storage / Dead Code | 36 | 24 | 6 | 4 | **24** | **CONFIRMED** |
| **BUG-C11-10** | [server/middleware/deviceRouting.ts#L98-L107](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/middleware/deviceRouting.ts#L98-L107) | Middleware / Cookie Sync | 36 | 25 | 5 | 5 | **25** | **CONFIRMED** |
| **BUG-C11-11** | [src/lib/pwaStore.ts#L358-L368](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L358-L368) | PWA State / Lifecycle | 25 | 25 | 5 | 5 | **25** | **CONFIRMED** |
| **BUG-C11-12** | [reconcile-dataset-ids.ts#L11-L14](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/reconcile-dataset-ids.ts#L11-L14) | Script Hygiene / Config Desync | 24 | 2 | 1 | 2 | **2** | **DISMISSED** |
| **BUG-C11-13** | [server/routes/telemetryRoutes.ts#L68](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/telemetryRoutes.ts#L68) | Input Validation / Dead Property | 16 | 1 | 1 | 1 | **1** | **DISMISSED** |

---

## 2. In-Depth Definitive Adjudications

---

### BUG-C11-01: `detectIsAndroidAppMode` Treats All `android-app://` Referrers as Installed PWAs

- **File Link:** [src/lib/pwaStore.ts#L76-L79](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L76-L79), [src/lib/pwaStore.ts#L180-L196](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L180-L196)
- **Hunter Claim (Score 72):** `detectIsAndroidAppMode()` checks `document.referrer?.includes('android-app://')`. When any Android user clicks a link from a native Android application (Gmail, Twitter/X, Telegram, Reddit, Slack, Discord, LinkedIn, etc.), the Android OS sets the referrer to `android-app://<package-name>`. This sets `isAndroidAppMode: true` and `isInstalled: true`, permanently suppressing the "Install App" button and promotional banners for genuine mobile Android visitors.
- **Skeptic Challenge (Score 72):** Fully verified the Android Intent HTTP Referer specification and call graph. Confirmed that all external inbound traffic from native apps is falsely categorized as an installed app, completely suppressing installation prompts on Android. Concurred with Hunter score.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:* In `src/lib/pwaStore.ts`:
    ```typescript
    export function detectIsAndroidAppMode(): boolean {
      if (typeof document === 'undefined') return false;
      return Boolean(document.referrer?.includes('android-app://'));
    }
    ```
    And in `computeCurrentState()` / `computeIsInstallActionable()`:
    ```typescript
    const isInstalled = isStandalone || isIosStandalone || isAndroidAppMode || appInstalledFlag;
    ...
    if (params.isInstalled || params.isStandalone || params.isIosStandalone || params.isAndroidAppMode) {
      return false;
    }
    ```
  - When an Android user opens a link shared in Telegram, WhatsApp, Gmail, Slack, or Twitter, Android automatically passes `android-app://org.telegram.messenger` or `android-app://com.google.android.gm` in `document.referrer`.
  - PULSE does not publish an Android TWA package on Google Play; even if it did, checking generic `android-app://` treats external inbound traffic as internal app mode.
  - This is a catastrophic distribution bug for PULSE on Android, silently disabling PWA installation CTAs for nearly all referral and social visitors.
- **Calibrated Risk Score:** Frequency: 9, Impact: 8 $\rightarrow$ **Final Risk Score: 72** (Actionable).
- **Minimal Surgical Fix:**
  Remove the naive `android-app://` referrer check. Since PULSE operates as a standard responsive web application and PWA, external app referrals must never be treated as an installed application:
  ```typescript
  export function detectIsAndroidAppMode(): boolean {
    // External referrals from native apps (e.g. Gmail, Telegram, Twitter) provide android-app:// referrers.
    // They indicate an external referral, not that PULSE is installed or running in a TWA.
    return false;
  }
  ```

---

### BUG-C11-02: Missing Lock-Expiration Logic in Dataset Summary Maintenance Causes Permanent Deadlock

- **File Link:** [firestoreDatasetSummaryMaintenanceRepository.ts#L51-L80](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L51-L80), [server/routes/adminRoutes.ts#L382](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/adminRoutes.ts#L382), and [src/components/admin/DatasetSummaryMaintenancePanel.tsx#L125](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/components/admin/DatasetSummaryMaintenancePanel.tsx#L125)
- **Hunter Claim (Score 63):** `FirestoreResearchSubmissionRepository` enforces a 10-minute expiration on summary reconciliation locks (`(Date.now() - summary.migrationStartedAt) > 10 * 60 * 1000`). However, `FirestoreDatasetSummaryMaintenanceRepository` contains no expiration logic in `getStatus()` or `acquireReconciliationLock()`. If a migration process crashes or is restarted midway, `migrationInProgress` remains `true` forever. Because `adminRoutes.ts` does not accept a `resume` parameter, the admin panel and API are permanently deadlocked.
- **Skeptic Challenge (Score 56):** Verified the asymmetry between the two repositories. Confirmed that an interrupted migration leaves `migrationInProgress: true` indefinitely. In `adminRoutes.ts`, `reconcile()` is called without `resume: true`. Both the Admin UI buttons (`disabled={status?.migrationInProgress}`) and the POST API route remain permanently wedged. Concurred with score 56.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:* In [server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L51-L80](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L51-L80):
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
  - In [server/routes/adminRoutes.ts#L382](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/adminRoutes.ts#L382):
    ```typescript
    const report = await deps.datasetSummaryReconciliationService.reconcile(mode, { source: 'admin-ui' });
    ```
    The endpoint does not read or pass `resume: true`.
  - When an administrator triggers a rebuild and the server restarts, encounters a Cloud Run container recycling event, or times out, `migrationInProgress` stays `true` in Cloud Firestore forever.
  - Submissions unlock after 10 minutes in `FirestoreResearchSubmissionRepository`, but the administrative maintenance UI and API remain locked forever at HTTP 409 `DATASET_SUMMARY_MIGRATION_IN_PROGRESS`.
- **Calibrated Risk Score:** Frequency: 7, Impact: 8 $\rightarrow$ **Final Risk Score: 56** (Actionable).
- **Minimal Surgical Fix:**
  Add standard 10-minute lock-expiration helper in `firestoreDatasetSummaryMaintenanceRepository.ts`:
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

### BUG-C11-03: Telemetry Ingestion Causes Unbounded Memory Leak and $O(N)$ Event Loop Sweep via `pageViewEventIds`

- **File Link:** [telegramNotifierService.ts#L278-L283](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L278-L283) & [telegramNotifierService.ts#L374-L382](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L374-L382)
- **Hunter Claim (Score 56):** `enqueuePageView` puts event IDs into `pageViewEventIds` with a 48-hour expiration (`now + 48 * 60 * 60 * 1000`). If size exceeds 2,000, `cleanExpiredDeduplicationKeys` executes a synchronous loop over all entries. Because all keys were inserted within 48 hours, 0 keys are deleted. The map continues growing unbounded, and every single subsequent HTTP request executes an $O(N)$ sweep over thousands of keys on the Node.js event loop before responding.
- **Skeptic Challenge (Score 56):** Confirmed the absence of an upper capacity bound on `pageViewEventIds` (unlike `outbox` which enforces `MAX_OUTBOX_CAPACITY = 200`). Confirmed that under steady traffic (>2,000 requests in 48 hours), the map never shrinks, and every incoming request triggers an $O(N)$ synchronous traversal on the single-threaded event loop. Concurred with score 56.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:* In [server/services/telegramNotifierService.ts#L374-L382](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L374-L382):
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
  - At 2,000+ page views in 48 hours (~42 visits/hour), `pageViewEventIds.size > 2000` is permanently true.
  - Because `expiry = now + 48h`, every key checked in the loop has `expiry > now`. Zero keys are deleted.
  - On **every single subsequent incoming page-view HTTP request**, the server synchronously loops through all 2,000+ (or 10,000+) map entries directly on the single-threaded Node.js event loop before responding.
  - This blocks incoming API requests, degrades server response times, and produces an unconstrained memory leak.
- **Calibrated Risk Score:** Frequency: 7, Impact: 8 $\rightarrow$ **Final Risk Score: 56** (Actionable).
- **Minimal Surgical Fix:**
  Enforce a hard capacity limit with FIFO eviction when capacity is exceeded:
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

### BUG-C11-04: Deprecated `/mobile/` Redirection in `resolveDeviceRedirect` Conflicts with `mobile/index.html`

- **File Link:** [shared/domain/deviceRouting.ts#L250-L262](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/domain/deviceRouting.ts#L250-L262) & [mobile/index.html#L69-L90](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/index.html#L69-L90)
- **Hunter Claim (Score 56):** `resolveDeviceRedirect` redirects canonical paths (`/`) to `/mobile/`, while `mobile/index.html` redirects non-standalone visitors back to `/`, generating an infinite ping-pong redirect loop.
- **Skeptic Challenge (Score 3 DISPROVED):** Traced the exact production call sites. Canonical routes in `src/App.tsx` use `useViewportSurface()` and do not call `resolveDeviceRedirect`. `resolveDeviceRedirect` is only invoked inside `RedirectToMobile` in `src/DesktopApp.tsx`, which is strictly mounted on `/mobile` and `/mobile/*`. On `/mobile/*`, `isMobilePath` is `true`, so line 250 `if (decision.shouldUseMobile && !isMobilePath)` is `false`. No redirect to `/mobile/` occurs.
- **Referee Ruling:** **DISPROVED**.
  - *Evidence:*
    1. In [src/App.tsx#L16-L24](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/App.tsx#L16-L24), top-level routing uses `useViewportSurface()` to dynamically render either `<MobileAppWrapper />` or `<DesktopApp />`. No URL redirects are generated on canonical paths (`/`, `/reaction-test`, etc.).
    2. In [src/DesktopApp.tsx#L211-L214](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/DesktopApp.tsx#L211-L214), `RedirectToMobile` is mounted strictly on:
       ```tsx
       <Route path="/mobile" element={<RedirectToMobile />} />
       <Route path="/mobile/*" element={<RedirectToMobile />} />
       ```
    3. In `resolveDeviceRedirect` ([shared/domain/deviceRouting.ts#L225](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/domain/deviceRouting.ts#L225)):
       ```typescript
       const isMobilePath = pathname === '/mobile' || pathname.startsWith('/mobile/');
       ```
       Since `pathname` is `/mobile` or `/mobile/*`, `isMobilePath` is always `true`.
    4. Line 250: `if (decision.shouldUseMobile && !isMobilePath)` evaluates to `false` because `!isMobilePath` is `false`.
    5. The branch that redirects non-mobile paths to `/mobile/` is completely unreachable from any active route in the application.
  - The code in lines 250-262 is dormant legacy logic from pre-ADR-004 routing, but no ping-pong redirect loop occurs in production.
- **Calibrated Risk Score:** Frequency: 0, Impact: 0 $\rightarrow$ **Final Risk Score: 0** (Disproved).

---

### BUG-C11-05: Stale-While-Revalidate Fetch Listener Resolves to `undefined` on Network Failure

- **File Link:** [mobile/public/sw.js#L317-L336](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L317-L336)
- **Hunter Claim (Score 49):** For an unprecached static asset requested while offline, `cachedResponse` is `undefined`. When `fetch(request)` fails, `.catch(() => cachedResponse)` returns `undefined`. Resolving `event.respondWith()` with `undefined` violates the W3C Service Worker specification, throwing fatal browser `TypeError: Failed to convert value to 'Response'`.
- **Skeptic Challenge (Score 49):** Confirmed the execution flow. When an asset is not yet in `CACHE_NAME` and the network drops, `fetchPromise` resolves to `undefined`. Passing a promise resolving to non-Response to `event.respondWith()` triggers an immediate `TypeError` in all major browsers. Concurred with score 49.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:* In [mobile/public/sw.js#L317-L336](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L317-L336):
    ```javascript
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => { ... })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    ```
  - Trace:
    1. Static asset requested for the first time while offline (or during packet drop).
    2. `cachedResponse` is `undefined`.
    3. `return cachedResponse || fetchPromise` evaluates to `fetchPromise`.
    4. `fetch(request)` rejects with network error.
    5. `.catch(() => cachedResponse)` returns `cachedResponse` (`undefined`).
    6. `fetchPromise` resolves successfully to `undefined`.
    7. `event.respondWith()` receives `undefined`.
  - W3C Service Worker Specification (§ 3.2.5.2): *"If response is not a Response object, reject promise with a TypeError."*
  - This immediately terminates the fetch handler with an unhandled rejection error rather than returning a clean offline response.
- **Calibrated Risk Score:** Frequency: 7, Impact: 7 $\rightarrow$ **Final Risk Score: 49** (Actionable).
- **Minimal Surgical Fix:**
  Return a synthetic offline response when both network and cache fail:
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
- **Hunter Claim (Score 42):** Intercepted audio requests (`.mp3`, `.wav`) return full HTTP 200 instead of HTTP 206 Partial Content, breaking audio playback in WebKit / iOS Safari.
- **Skeptic Challenge (Score 0 DISMISSED):** Audited the entire audio pipeline in `shared/lib/settingsStore.ts`. Audio cues in PULSE are 100% synthesized in-memory using Web Audio API oscillators (`ctx.createOscillator()`). Not a single `.mp3`, `.wav`, `.ogg`, or `.mp4` file exists in `public/` or `mobile/public/`. The regex extensions in `sw.js` are boilerplate dead code.
- **Referee Ruling:** **DISMISSED**.
  - *Evidence:*
    1. Directory scans of `public/` and `mobile/public/` confirm **zero audio or video files exist in the application**.
    2. In [shared/lib/settingsStore.ts#L403-L468](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L403-L468), `playAudioCue()` synthesizes tones directly in-memory using `ctx.createOscillator()` and `ctx.createGain()`. No network requests for media files are ever issued.
    3. The regex in `sw.js` line 309 matching `mp3|wav|ogg|webm|mp4` is boilerplate template code with zero operational impact.
    4. The reported Range request failure mode has a true runtime frequency of 0 in PULSE.
- **Calibrated Risk Score:** Frequency: 0, Impact: 1 $\rightarrow$ **Final Risk Score: 0** (Dismissed / Speculative YAGNI).

---

### BUG-C11-07: Unpaged Parallel `.get()` on Firestore Collections in `reconcile-dataset-ids.ts`

- **File Link:** [reconcile-dataset-ids.ts#L16-L19](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/reconcile-dataset-ids.ts#L16-L19)
- **Hunter Claim (Score 42):** `reconcile-dataset-ids.ts` executes parallel unpaged `.get()` on `publicDataset` and `assessmentResults`, causing gRPC deadlines and heap OOM at production scale.
- **Skeptic Challenge (Score 2 DISMISSED):** `reconcile-dataset-ids.ts` is an unreferenced 43-line development scratch script in the root directory. Production reconciliation is handled by `server/services/datasetSummaryReconciliation.ts` and `scripts/reconcileDatasetSummary.ts`, which already uses cursor pagination (`PAGE_SIZE = 500`).
- **Referee Ruling:** **DISMISSED**.
  - *Evidence:*
    1. `reconcile-dataset-ids.ts` is not referenced in `package.json`, not invoked by CI/CD, and not called by any server endpoint.
    2. Production reconciliation is governed by `dataset:reconcile-summary` (`scripts/reconcileDatasetSummary.ts`), which uses cursor pagination with bounded pages.
    3. An unreferenced diagnostic utility has no automated production execution and zero impact on application users or uptime.
- **Calibrated Risk Score:** Frequency: 1, Impact: 2 $\rightarrow$ **Final Risk Score: 2** (Dismissed, Score $< 5$).

---

### BUG-C11-08: Reconciliation Completion Overwrites Concurrent Submissions on Long Scans

- **File Link:** [firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117) & [firestoreResearchSubmissionRepository.ts#L62-L65](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L62-L65)
- **Hunter Claim (Score 40):** If a reconciliation scan takes longer than 10 minutes, participant submissions resume because the lock expires. Submissions increment counters. When `completeReconciliation` finishes at minute 11+, it blindly commits the stale counts calculated from the start of the scan, permanently wiping out the increments for all submissions received between minute 10 and 11.
- **Skeptic Challenge (Score 16 CONFIRMED):** Confirmed the concurrency flaw. However, pointed out that dataset scans in PULSE finish in seconds; exceeding 10 minutes requires massive scale or extreme Firestore stalls. Calibrated Frequency to 2, Impact to 8 $\rightarrow$ Score 16.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:*
    1. In `firestoreResearchSubmissionRepository.ts#L62-L65`, `isLockExpired` evaluates to `true` when `(Date.now() - summary.migrationStartedAt) > 10 * 60 * 1000`.
    2. Submissions begin writing to `publicDataset` and incrementing `publicDatasetMeta/summary` counters using `{ merge: true }`.
    3. In `firestoreDatasetSummaryMaintenanceRepository.ts#L104`, `completeReconciliation` only checks:
       ```typescript
       if (data?.migrationRunId !== runId || data?.migrationInProgress !== true) {
         throw new Error('DATASET_SUMMARY_MIGRATION_LOCK_LOST');
       }
       ```
    4. Because research submissions do not clear `migrationRunId` or `migrationInProgress`, both flags remain set!
    5. When the long scan completes, `completeReconciliation` commits `{ ...summary }`, overwriting the summary document and silently erasing the increments from all submissions completed during minutes 10+.
  - While scans exceeding 10 minutes are rare, the data loss is silent and permanent when it occurs.
- **Calibrated Risk Score:** Frequency: 2, Impact: 8 $\rightarrow$ **Final Risk Score: 16** (Actionable).
- **Minimal Surgical Fix:**
  Verify that the lock lease has not expired at completion time:
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
- **Hunter Claim (Score 36):** Storing `request` directly stores every unique query parameter URL (`/mobile/?sessionId=...`, `/mobile/?ref=...`) as a distinct cache entry. In addition, the offline fallback has an unreachable `caches.match(request)` line because `caches.match('/mobile/')` is always pre-cached.
- **Skeptic Challenge (Score 24 CONFIRMED):** Confirmed cache pollution and dead fallback branch. Calibrated impact to 4 $\rightarrow$ Score 24.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:*
    1. In `mobile/public/sw.js#L282`:
       ```javascript
       caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
       ```
       Every navigation with referral tags, tracking params, or force flags caches a full copy under that specific URL string.
    2. In `mobile/public/sw.js#L291-L294`:
       ```javascript
       const mobileMatch = await caches.match('/mobile/');
       if (mobileMatch) return mobileMatch;
       const fallback = await caches.match(request);
       if (fallback) return fallback;
       ```
    3. `/mobile/` is the first entry in `CORE_SHELL_ASSETS` (line 12), pre-cached on SW installation.
    4. `caches.match('/mobile/')` always resolves successfully. Line 293 (`caches.match(request)`) is completely unreachable dead code.
- **Calibrated Risk Score:** Frequency: 6, Impact: 4 $\rightarrow$ **Final Risk Score: 24** (Actionable).
- **Minimal Surgical Fix:**
  Normalize shell cache writes to `'/mobile/'` and remove the dead fallback branch:
  ```javascript
  // Line 282: Write to canonical shell URL
  caches.open(CACHE_NAME).then((cache) => cache.put('/mobile/', copy));

  // In catch block:
  const mobileMatch = await caches.match('/mobile/');
  if (mobileMatch) return mobileMatch;
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/plain' } });
  ```

---

### BUG-C11-10: Premature Static Asset Bypass in Server Device Routing Skips Cookie Sync on `/mobile/`

- **File Link:** [server/middleware/deviceRouting.ts#L98-L107](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/middleware/deviceRouting.ts#L98-L107) & [server/middleware/deviceRouting.ts#L109-L138](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/middleware/deviceRouting.ts#L109-L138)
- **Hunter Claim (Score 36):** `pathname.startsWith('/mobile')` early-exits via `return next()`, bypassing cookie synchronization and query stripping for any requests to `/mobile/`. `cookieDesktop` on line 113 is left dead.
- **Skeptic Challenge (Score 25 CONFIRMED):** Confirmed that line 91 normalizes `/mobile` to `/mobile/`, and line 99 immediately exits, completely bypassing lines 109-138. `cookieDesktop` is never used. Calibrated score to 25.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:*
    1. In [server/middleware/deviceRouting.ts#L91-L107](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/middleware/deviceRouting.ts#L91-L107):
       ```typescript
       if (pathname === '/mobile') {
         const originalQuery = url.includes('?') ? url.slice(url.indexOf('?')) : '';
         return res.redirect(301, `/mobile/${originalQuery}`);
       }

       if (
         pathname.startsWith('/api') ||
         pathname.startsWith('/mobile') ||
         ...
       ) {
         return next();
       }
       ```
    2. A navigation to `/mobile?force_desktop=1` redirects to `/mobile/?force_desktop=1`.
    3. On `/mobile/?force_desktop=1`, `pathname.startsWith('/mobile')` evaluates to `true`, immediately calling `return next()`.
    4. Lines 109-138 (setting `pulse_force_desktop` or `pulse_force_mobile` cookies and stripping routing params) are completely skipped.
    5. On line 113, `const cookieDesktop = isTruthyRoutingFlag(cookies['pulse_force_desktop']);` is declared but never read.
- **Calibrated Risk Score:** Frequency: 5, Impact: 5 $\rightarrow$ **Final Risk Score: 25** (Actionable).
- **Minimal Surgical Fix:**
  Refine the bypass so it only targets static assets under `/mobile/` (`/mobile/assets/`), allowing document requests with routing params to synchronize cookies:
  ```typescript
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/mobile/assets/') ||
    pathname.startsWith('/admin') ||
  ```
  And delete the unused `cookieDesktop` variable on line 113.

---

### BUG-C11-11: State Inconsistency in Display-Mode Event Listener Leaves `isInstallable: true` in Standalone Mode

- **File Link:** [src/lib/pwaStore.ts#L358-L368](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L358-L368)
- **Hunter Claim (Score 25):** `handleStandaloneChange` sets `isStandalone: true` and `isInstalled: true`, but forgets to recompute `isInstallable`, emitting contradictory state (`isInstalled: true` AND `isInstallable: true`).
- **Skeptic Challenge (Score 25 CONFIRMED):** Confirmed that while the `appinstalled` listener directly sets `isInstallable: false`, `handleStandaloneChange` omits updating `isInstallable`. Concurred with score 25.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:*
    1. In [src/lib/pwaStore.ts#L358-L368](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L358-L368):
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
    2. When a browser window transitions to standalone display mode, `handleStandaloneChange` updates `isStandalone` and `isInstalled`.
    3. However, `isInstallable` is left untouched at its prior value (`true`).
    4. The store notifies subscribers with `{ isInstalled: true, isStandalone: true, isInstallable: true }`.
    5. This directly violates the documented contract of `computeIsInstallActionable`: *"If already installed or running in standalone mode -> false (no CTA)."*
- **Calibrated Risk Score:** Frequency: 5, Impact: 5 $\rightarrow$ **Final Risk Score: 25** (Actionable).
- **Minimal Surgical Fix:**
  Recompute `isInstallable` in `handleStandaloneChange`:
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

### BUG-C11-12: Misleading Script Contract & Database Config Desynchronization in `reconcile-dataset-ids.ts`

- **File Link:** [reconcile-dataset-ids.ts#L11-L14](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/reconcile-dataset-ids.ts#L11-L14)
- **Hunter Claim (Score 24):** Script title contains `reconcile` but only performs read-only counts; ignores `firebase-applet-config.json` database fallback.
- **Skeptic Challenge (Score 2 DISMISSED):** Scratch script hygiene. No production runtime or deployment effect. Score $< 5$.
- **Referee Ruling:** **DISMISSED**.
  - *Evidence:* `reconcile-dataset-ids.ts` is an unreferenced development utility. Naming semantics on an ad-hoc local script do not constitute a production bug.
- **Calibrated Risk Score:** Frequency: 1, Impact: 2 $\rightarrow$ **Final Risk Score: 2** (Dismissed, Score $< 5$).

---

### BUG-C11-13: Loose Timestamp Validation Accepts `NaN`, `Infinity`, and Extreme Timestamps in Telemetry Route

- **File Link:** [server/routes/telemetryRoutes.ts#L68](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/telemetryRoutes.ts#L68)
- **Hunter Claim (Score 16):** `typeof clientTimestampMs === 'number'` allows `NaN` and `Infinity` into the telemetry pipeline.
- **Skeptic Challenge (Score 1 DISMISSED):** In JSON HTTP payloads, `NaN` and `Infinity` are invalid syntax per RFC 8259 and are rejected with HTTP 400 before the route runs. Furthermore, `clientTimestampMs` is never persisted, formatted, or used anywhere in the backend.
- **Referee Ruling:** **DISMISSED**.
  - *Evidence:*
    1. Express `express.json()` rejects `{"clientTimestampMs": NaN}` as invalid JSON syntax prior to route execution.
    2. In `shared/types/telemetry.ts`, `clientTimestampMs?: number; // Diagnostic only; never authoritative`.
    3. In `TelegramNotifierService`, `clientTimestampMs` is never displayed, formatted, or stored.
    4. The reported defect has zero runtime impact.
- **Calibrated Risk Score:** Frequency: 1, Impact: 1 $\rightarrow$ **Final Risk Score: 1** (Dismissed, Score $< 5$).

---

## 3. Bloat & Dead Code Audit Summary

Under Ponytail senior developer principles (deletion beats addition; no dead logic), the following items are confirmed for cleanup:

1. **Unused Server Routing Variable:**
   In [server/middleware/deviceRouting.ts#L113](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/middleware/deviceRouting.ts#L113):
   ```typescript
   const cookieDesktop = isTruthyRoutingFlag(cookies['pulse_force_desktop']);
   ```
   `cookieDesktop` is declared and parsed from request headers, but never referenced anywhere in the module. Delete it.

2. **Unreachable Fallback Branch in Service Worker:**
   In [mobile/public/sw.js#L293](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L293):
   ```javascript
   const fallback = await caches.match(request);
   if (fallback) return fallback;
   ```
   Because `/mobile/` is pre-cached on install in `CORE_SHELL_ASSETS`, `caches.match('/mobile/')` on line 291 always matches. Line 293 is unreachable dead code. Remove it.

3. **Unused Audio Extensions in Service Worker Match Regex:**
   In [mobile/public/sw.js#L309](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L309):
   Matching `mp3|wav|ogg|webm|mp4` in static asset regex is boilerplate dead code because PULSE synthesizes all audio in memory via Web Audio API oscillators and contains zero media files in `public/`. Clean the regex.

4. **Dormant Pre-ADR-004 Redirect Helper:**
   In [shared/domain/deviceRouting.ts#L250-L262](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/domain/deviceRouting.ts#L250-L262):
   The branch redirecting non-mobile URLs to `/mobile/` is dormant code left behind from pre-ADR-004 routing, as `src/App.tsx` handles responsive surface switching without URL redirects.

---

## 4. Actionable Implementation Priority Roadmap

Ordered by Final Risk Score:

1. **BUG-C11-01 (Score 72, PWA / Android):**
   Fix `detectIsAndroidAppMode()` in [src/lib/pwaStore.ts#L76-L79](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L76-L79) by removing the naive `android-app://` referrer check, restoring install CTAs for Android users.
2. **BUG-C11-02 (Score 56, Concurrency / Admin Deadlock):**
   Add 10-minute lock-expiration helper to `getStatus()` and `acquireReconciliationLock()` in [firestoreDatasetSummaryMaintenanceRepository.ts#L51-L80](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L51-L80) to prevent permanent administrative UI/API lockups after interrupted migrations.
3. **BUG-C11-03 (Score 56, Memory Leak / Event Loop):**
   Enforce `MAX_DEDUP_KEYS = 5000` with FIFO eviction on `pageViewEventIds` in [telegramNotifierService.ts#L374-L382](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/telegramNotifierService.ts#L374-L382) to prevent unbounded memory growth and synchronous $O(N)$ event loop freezes.
4. **BUG-C11-05 (Score 49, Service Worker / Resilience):**
   Return a synthetic 504 Gateway Timeout response when both cache and network fail in [mobile/public/sw.js#L317-L336](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L317-L336), preventing unhandled browser `TypeError` in `event.respondWith()`.
5. **BUG-C11-10 (Score 25, Middleware / Cookie Sync):**
   Change `pathname.startsWith('/mobile')` to `pathname.startsWith('/mobile/assets/')` in [server/middleware/deviceRouting.ts#L99](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/middleware/deviceRouting.ts#L99) and delete dead `cookieDesktop` variable on line 113.
6. **BUG-C11-11 (Score 25, PWA State / Lifecycle):**
   Recompute `isInstallable` via `computeIsInstallActionable()` in `handleStandaloneChange` in [src/lib/pwaStore.ts#L358-L368](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/pwaStore.ts#L358-L368), fixing contradictory `isInstalled: true` & `isInstallable: true` state.
7. **BUG-C11-09 (Score 24, Cache Storage / Dead Code):**
   Normalize navigation shell cache writes to `'/mobile/'` in [mobile/public/sw.js#L282](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/sw.js#L282) and remove dead fallback line 293.
8. **BUG-C11-08 (Score 16, Data Loss / Concurrency Race):**
   Verify lock lease validity in `completeReconciliation` in [firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts#L104-L117), preventing stale summary counts from clobbering new submissions on long runs.
