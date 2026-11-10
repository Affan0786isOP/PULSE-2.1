# PULSE v2.1 — Cycle 10 Adversarial Bug Hunt Referee Report

**Auditor:** Bug Referee Agent (Cycle 10)  
**Methodology:** Independent code inspection, adversarial debate adjudication, runtime concurrency & state analysis, and Ponytail Senior Developer principles (/ponytail-audit lens: correctness, concurrency/scale races, resilience/fault-isolation, and elimination of bloat/dead code).  
**Adjudication Threshold:** Real defect in production with Risk Score (Frequency × Impact) ≥ 5. Speculative, unrequested, or disproved claims are rejected.

---

## 1. Executive Summary & Verdict Scorecard

Cycle 10 audited eleven (11) candidate defects debated between the Bug Hunter and Bug Skeptic across five critical subsystems:
1. `src/lib/useAuthoritativeStats.ts` & `mobile/src/lib/useAuthoritativeStats.ts`
2. `server/repositories/firestore/firestoreResearchSubmissionRepository.ts`
3. `server/repositories/firestore/firestoreResearchDatasetRepository.ts`
4. `src/lib/settingsStore.ts`, `shared/lib/settingsStore.ts` & `mobile/src/lib/settingsStore.ts`
5. `src/lib/errorReporter.ts` & `mobile/src/lib/errorReporter.ts`

### Final Adjudication Breakdown:
- **CONFIRMED (Actionable):** 9 defects
- **DISPROVED (False Positive):** 1 defect (`BUG-C10-06`)
- **DISMISSED (Score < 5 / Speculative / YAGNI):** 1 defect (`BUG-C10-11`)

| Bug ID | Target File | Category | Hunter Score | Skeptic Score | Referee Freq | Referee Impact | Final Risk Score | Final Ruling |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **BUG-C10-01** | [firestoreResearchSubmissionRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L26-L101) | Concurrency / Scale | 56 | 40 | 6 | 8 | **48** | **CONFIRMED** |
| **BUG-C10-02** | [shared/lib/settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L287-L340) | Accessibility / Logic | 56 | 56 | 8 | 7 | **56** | **CONFIRMED** |
| **BUG-C10-03** | [firestoreResearchSubmissionRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L80-L89) | Resilience / Availability | 54 | 36 | 5 | 9 | **45** | **CONFIRMED** |
| **BUG-C10-04** | [shared/lib/settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L408-L467) | Performance / Memory | 54 | 45 | 9 | 5 | **45** | **CONFIRMED** |
| **BUG-C10-05** | [shared/lib/settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L136-L146) | Distributed State / Storage | 49 | 36 | 6 | 6 | **36** | **CONFIRMED** |
| **BUG-C10-06** | [firestoreResearchDatasetRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchDatasetRepository.ts#L54-L69) | Database / Query Precondition | 49 | 0 | 0 | 0 | **0** | **DISPROVED** |
| **BUG-C10-07** | [firestoreResearchDatasetRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchDatasetRepository.ts#L93-L96) | Deadlock / Availability | 42 | 35 | 5 | 7 | **35** | **CONFIRMED** |
| **BUG-C10-08** | [mobile/src/lib/useAuthoritativeStats.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/lib/useAuthoritativeStats.ts#L1-L215) | Code Bloat / Duplication | 50 | 50 | 10 | 5 | **50** | **CONFIRMED** |
| **BUG-C10-09** | [src/lib/useAuthoritativeStats.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L86-L94) | Network / Overhead | 50 | 50 | 10 | 5 | **50** | **CONFIRMED** |
| **BUG-C10-10** | [src/lib/useAuthoritativeStats.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L194-L200) | Concurrency / Stale Closure | 36 | 36 | 6 | 6 | **36** | **CONFIRMED** |
| **BUG-C10-11** | [src/lib/errorReporter.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/errorReporter.ts#L31-L45) | Observability / Telemetry | 40 | 4 | 2 | 2 | **4** | **DISMISSED** |

---

## 2. Definitive Adjudication & Evidence Analysis

---

### BUG-C10-01: Hot Document Write Contention on Summary Counter in Submission Transaction
- **File Link:** [firestoreResearchSubmissionRepository.ts#L26-L101](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L26-L101)
- **Hunter Claim:** Reading and writing the singleton aggregate document `publicDatasetMeta/summary` within every participant's ACID submission transaction violates Firestore's ~1 write/sec per document limit. Under concurrent submissions, transactions collide, retry, and abort with contention errors, dropping test data.
- **Skeptic Challenge:** Acknowledged the architectural constraint of Firestore (~1 write/sec per doc). Argued that during low traffic on an indie platform collisions are fewer, but concurred that in concurrent batch situations transactions will fail. Calibrated score to 40.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:* In lines 26, 39, and 91–101 of `FirestoreResearchSubmissionRepository`, `tx.get(summaryDocRef)` and `tx.set(summaryDocRef, ...)` are executed inside the primary user submission transaction alongside `experimentSessions`, `publicDataset`, and `assessmentResults`.
  - Google Cloud Firestore's optimistic concurrency model strictly enforces document-level serialization (~1 write/sec). When multiple participants complete cognitive assessments concurrently (e.g. classroom testing, cohort trials, or concurrent users finishing tests within seconds), transactions conflict on `publicDatasetMeta/summary`.
  - Coupling an aggregate analytics counter to the participant's primary record persistence causes legitimate cognitive test data to be rolled back and discarded.
- **Calibrated Risk Score:** Frequency: 6, Impact: 8 → **Score: 48** (Actionable).
- **Minimal Surgical Fix:**
  Decouple the summary counter update from the ACID user submission transaction. Commit the session, public dataset, and assessment results within the transaction, and increment the summary counter asynchronously or tolerate summary write contention without failing the participant's submission.

---

### BUG-C10-02: Universal Settings Updates Permanently Sever OS Reduced-Motion Synchronization
- **File Link:** [shared/lib/settingsStore.ts#L287-L340](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L287-L340)
- **Hunter Claim:** `hasExplicitStoredReducedMotionPreference()` checks `typeof settings.reducedMotionEnabled === 'boolean'`. Saving *any* user preference (sound, font scale, theme) stores the default `reducedMotionEnabled: false` boolean in localStorage. From that moment on, `hasExplicitStoredReducedMotionPreference()` permanently returns `true`, causing `useReducedMotionPreference` to early-return and permanently ignore the OS accessibility setting (`prefers-reduced-motion: reduce`).
- **Skeptic Challenge:** Traced the exact call graph and confirmed that `updateSettings()` writes the full object with `reducedMotionEnabled`, which permanently silences the OS media query listener for users who never touched the motion setting. Concurred with score 56.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:* In `shared/lib/settingsStore.ts:287–307`, `hasExplicitStoredReducedMotionPreference()` returns `true` whenever `typeof settings.reducedMotionEnabled === 'boolean'`.
  - In `updateSettings()` (lines 172–195), any partial update merges with current settings and saves the complete object to `localStorage`. Because `DEFAULT_SETTINGS` initializes `reducedMotionEnabled`, saving any setting (e.g. toggling sound) persists `reducedMotionEnabled: false` into storage.
  - In lines 334–340, `handleMediaChange` exits early if `hasExplicitStoredReducedMotionPreference()` is true. Consequently, the user's OS-level accessibility changes are permanently ignored.
  - This is an unambiguous violation of WCAG 2.1 Success Criterion 2.3.3 (Animation from Interactions).
- **Calibrated Risk Score:** Frequency: 8, Impact: 7 → **Score: 56** (Actionable).
- **Minimal Surgical Fix:**
  Track explicit user intent for reduced motion via a distinct boolean property (`explicitReducedMotion: boolean`), or only persist an explicit override when `reducedMotionEnabled` is directly modified in Settings:
  ```ts
  export function hasExplicitStoredReducedMotionPreference(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const settings = JSON.parse(raw);
        return settings?.explicitReducedMotion === true;
      }
    } catch {}
    return false;
  }
  ```

---

### BUG-C10-03: Corrupt or Unreconciled Dataset Summary Aborts Submissions with HTTP 503
- **File Link:** [firestoreResearchSubmissionRepository.ts#L80-L89](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L80-L89)
- **Hunter Claim:** If the aggregate summary document in Firestore is missing a counter, has a schema drift, or has not been initialized, `executeSubmissionTransaction` throws `DATASET_SUMMARY_RECONCILIATION_REQUIRED`. In `researchRoutes.ts:214`, this returns HTTP 503, aborting the transaction and discarding valid participant scores.
- **Skeptic Challenge:** Confirmed the code path. Emphasized that rejecting completed participant tests due to an analytics summary issue violates fault isolation. Calibrated score to 36.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:* In `server/repositories/firestore/firestoreResearchSubmissionRepository.ts:80–89`:
    ```ts
    if (
      summary.schemaVersion !== 1 ||
      !isSafeNonNegativeInteger(totalRecords) ||
      !isSafeNonNegativeInteger(totalTrials) ||
      !counts ||
      canonicalTypes.some(type => !isSafeNonNegativeInteger(counts[type])) ||
      !isSafeNonNegativeInteger(currentCount)
    ) {
      throw new Error('DATASET_SUMMARY_RECONCILIATION_REQUIRED');
    }
    ```
  - And in `server/routes/researchRoutes.ts:214–219`:
    ```ts
    if (errMsg === 'DATASET_SUMMARY_RECONCILIATION_REQUIRED') {
      return res.status(503).json({
        success: false,
        error: 'Research submissions are temporarily unavailable until Dataset summary reconciliation is complete.'
      });
    }
    ```
  - A participant who just invested time taking a cognitive test must never have their submission aborted and discarded with HTTP 503 because an aggregate summary counter requires reconciliation.
- **Calibrated Risk Score:** Frequency: 5, Impact: 9 → **Score: 45** (Actionable).
- **Minimal Surgical Fix:**
  If the summary document is missing or invalid, log a warning and proceed with persisting the primary records (`experimentSessions`, `publicDataset`, `assessmentResults`), skipping the summary update rather than aborting the transaction.

---

### BUG-C10-04: Audio Engine Destination Graph Node Leak on Every Audio Cue
- **File Link:** [shared/lib/settingsStore.ts#L408-L467](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L408-L467)
- **Hunter Claim:** `playAudioCue` creates `GainNode` instances connected to `ctx.destination` and calls `osc.stop()`. Because nodes connected to `destination` are not garbage collected without an explicit disconnect, orphaned `GainNode` instances accumulate in the Web Audio graph on every audio cue.
- **Skeptic Challenge:** Verified against the W3C Web Audio API specification and browser implementations (Chromium, WebKit). Stopping an oscillator terminates audio generation but does not disconnect downstream `GainNode` instances from `AudioContext.destination`. Concurred with score 45.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:* In `shared/lib/settingsStore.ts`:
    - Lines 416–427 (milestone arpeggio): `noteGain.connect(ctx.destination); noteOsc.start(); noteOsc.stop();`
    - Lines 431–467 (click, stimulus, success, error): `gain.connect(ctx.destination); osc.start(); osc.stop();`
    - In neither case is `gain.disconnect()` or `noteGain.disconnect()` called.
  - The W3C Web Audio API specification states that calling `stop()` on an `AudioScheduledSourceNode` terminates scheduling, but nodes remain active in the destination graph until disconnected.
  - In a standard testing session of 50–100 trials with feedback cues, hundreds of orphaned `GainNode` instances accumulate in the destination mixer, degrading audio thread performance.
- **Calibrated Risk Score:** Frequency: 9, Impact: 5 → **Score: 45** (Actionable).
- **Minimal Surgical Fix:**
  Add an `onended` handler to disconnect the oscillator and gain node once playback completes:
  ```ts
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
  ```

---

### BUG-C10-05: Cross-Tab Settings Reset Resurrecting Loop / Sync Deadlock
- **File Link:** [shared/lib/settingsStore.ts#L136-L146](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L136-L146) & [shared/lib/settingsStore.ts#L248-L256](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L248-L256)
- **Hunter Claim:** When Tab 1 calls `resetSettingsToDefaults()`, Tab 2 receives a `storage` event (`e.newValue === null`) and calls `loadSettings()`. If Tab 2 still has the cookie in memory, `loadSettings()` enters `!hasLocalStorage && hasCookie` and re-writes the deleted settings back to `localStorage`, resurrecting the deleted settings across tabs.
- **Skeptic Challenge:** Traced the cross-tab event flow. Confirmed that calling `loadSettings()` on `storage` deletion events triggers the self-healing write branch. Calibrated score to 36.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:* Lines 249–256:
    ```ts
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === SETTINGS_STORAGE_KEY) {
        const reloaded = loadSettings();
        ...
      }
    });
    ```
  - When `e.newValue === null` (the key was removed by `resetSettingsToDefaults()`), calling `loadSettings()` inspects `hasLocalStorage` (which is false) and `hasCookie` (which remains true if the cookie has not yet been cleared in Tab 2's process).
  - Lines 139–145 execute:
    ```ts
    else if (!hasLocalStorage && hasCookie) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
    }
    ```
  - Tab 2 immediately re-writes the deleted settings back into `localStorage`, sending a storage event back to Tab 1 and defeating the reset action.
- **Calibrated Risk Score:** Frequency: 6, Impact: 6 → **Score: 36** (Actionable).
- **Minimal Surgical Fix:**
  In the `storage` event listener, if `e.newValue === null`, reset in-memory state to defaults and clear the cookie without calling `loadSettings()`:
  ```ts
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === SETTINGS_STORAGE_KEY) {
      if (e.newValue === null) {
        cachedSettings = { ...DEFAULT_SETTINGS, reducedMotionEnabled: getDefaultReducedMotion() };
        clearSettingsCookie();
        applyDOMSettings(cachedSettings);
        window.dispatchEvent(new CustomEvent('pulse_settings_changed', { detail: cachedSettings }));
        return;
      }
      const reloaded = loadSettings();
      cachedSettings = reloaded;
      applyDOMSettings(reloaded);
      window.dispatchEvent(new CustomEvent('pulse_settings_changed', { detail: reloaded }));
    }
  });
  ```

---

### BUG-C10-06: Multi-Filter Public Dataset Queries Fail Due to Indexes Referencing Absent Field
- **File Link:** [firestoreResearchDatasetRepository.ts#L54-L69](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchDatasetRepository.ts#L54-L69) & [firestore.indexes.json#L37-L61](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/firestore.indexes.json#L37-L61)
- **Hunter Claim:** `publicDataset` composite indexes in `firestore.indexes.json` reference `completedAtTimestamp`, which is never written to `publicDataset`. Hunter argued that multi-filter queries (`assessmentType in [...]`, `ageGroup == ...`) throw `FAILED_PRECONDITION: The query requires an index.` and crash the endpoint in production.
- **Skeptic Challenge:** Traced Firestore's query engine mechanics. `queryRawDataset` contains ONLY equality/`in` filters with `orderBy('__name__')`. Firestore natively satisfies this query using **single-field index merging (zigzag merge join)**. Composite indexes are neither required nor consulted by Firestore for this query. The entries in `firestore.indexes.json` are vestigial, but vestigial indexes do not break single-field queries. Score: 0.
- **Referee Ruling:** **DISPROVED (False Positive)**.
  - *Evidence:* In Google Cloud Firestore:
    1. A query with multiple equality/`in` clauses (`where('assessmentType', 'in', ...)`, `where('ageGroup', '==', ...)`) ordered by `__name__` is automatically fulfilled by merging single-field indexes.
    2. Cloud Firestore only requires composite indexes when combining an inequality filter (`<`, `>`, `<=`, `>=`) with equality filters, or when ordering by a field other than `__name__`.
    3. Because `queryRawDataset` uses solely equality/`in` clauses and orders strictly by `__name__`, Firestore executes the query cleanly without throwing `FAILED_PRECONDITION`.
- **Calibrated Risk Score:** Frequency: 0, Impact: 0 → **Score: 0** (Disproved).

---

### BUG-C10-07: Missing Lock Expiration Check in getDatasetSummary() Causes Permanent API Deadlock
- **File Link:** [firestoreResearchDatasetRepository.ts#L93-L96](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchDatasetRepository.ts#L93-L96) & [firestoreResearchSubmissionRepository.ts#L61-L65](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L61-L65)
- **Hunter Claim:** `FirestoreResearchSubmissionRepository` safely checks whether a migration lock has expired after 10 minutes (`isLockExpired = (Date.now() - summary.migrationStartedAt) > 10 * 60 * 1000`). However, `FirestoreResearchDatasetRepository.getDatasetSummary()` checks only `if (summary.migrationInProgress === true)`. If a migration process crashes or is killed, `getDatasetSummary()` stays permanently locked at HTTP 503 while submissions recover.
- **Skeptic Challenge:** Confirmed the asymmetry in the code. A crashed migration leaves `migrationInProgress: true` in Firestore, causing `/api/research/dataset/summary` to fail indefinitely. Calibrated score to 35.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:* In `tests/unit/serverRepositories.test.ts:988–1044`, `BUG-16` introduced a 10-minute lock expiration check for `FirestoreResearchSubmissionRepository`:
    ```ts
    const isLockExpired = typeof summary.migrationStartedAt === 'number' && (Date.now() - summary.migrationStartedAt) > 10 * 60 * 1000;
    if (summary.migrationInProgress === true && !isLockExpired) {
      throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
    }
    ```
  - However, in `FirestoreResearchDatasetRepository.getDatasetSummary()` (lines 93–96):
    ```ts
    const summary = summarySnap.data() as Record<string, unknown>;
    if (summary.migrationInProgress === true) {
      throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
    }
    ```
  - The developer omitted the `isLockExpired` check in the read path. If an admin reconciliation run crashes or times out, user submissions automatically recover after 10 minutes, but the public summary API (`/api/research/dataset/summary`) remains deadlocked at HTTP 503 until manual database surgery.
- **Calibrated Risk Score:** Frequency: 5, Impact: 7 → **Score: 35** (Actionable).
- **Minimal Surgical Fix:**
  Add the 10-minute expiration check to `FirestoreResearchDatasetRepository.getDatasetSummary()`:
  ```ts
  const isLockExpired = typeof summary.migrationStartedAt === 'number' && (Date.now() - summary.migrationStartedAt) > 10 * 60 * 1000;
  if (summary.migrationInProgress === true && !isLockExpired) {
    throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
  }
  ```

---

### BUG-C10-08: Duplicate 215-Line Mobile useAuthoritativeStats Module Causes Split-Brain Caches
- **File Link:** [mobile/src/lib/useAuthoritativeStats.ts#L1-L215](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/lib/useAuthoritativeStats.ts#L1-L215) vs [src/lib/useAuthoritativeStats.ts#L1-L215](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L1-L215)
- **Hunter Claim:** `mobile/src/lib/useAuthoritativeStats.ts` is an exact 215-line copy-paste clone of `src/lib/useAuthoritativeStats.ts`. It instantiates duplicate module-level singletons (`statsCache`, `statsCacheGeneration`, `inFlightStatsRequest`). In contrast, `mobile/src/lib/settingsStore.ts` and `mobile/src/lib/errorReporter.ts` are 1-line re-exports.
- **Skeptic Challenge:** Confirmed that both modules coexist in the client bundle via `src/App.tsx:5` dynamic import of `@mobile/MobileAppWrapper`. Cache invalidation in one module does not invalidate the other. Score: 50.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:* `mobile/src/lib/useAuthoritativeStats.ts` is an exact duplicate (including the comment `"publicDataset is the single counting source for the desktop hero"`).
  - Both files declare separate module singletons:
    ```ts
    let statsCache: CachedStats | null = null;
    let statsCacheGeneration = 0;
    let inFlightStatsRequest: ... = null;
    ```
  - When a user in the mobile wrapper clears application data, only the mobile singleton is cleared. The desktop singleton remains cached with old counts, leading to desynchronization and redundant network requests.
- **Calibrated Risk Score:** Frequency: 10, Impact: 5 → **Score: 50** (Actionable).
- **Minimal Surgical Fix:**
  Replace the 215 duplicate lines in `mobile/src/lib/useAuthoritativeStats.ts` with a 1-line re-export, identical to `settingsStore.ts` and `errorReporter.ts`:
  ```ts
  export * from '../../../src/lib/useAuthoritativeStats';
  ```

---

### BUG-C10-09: 1-Year Root HTTP Cookie Set for 60-Second Client Stats Cache
- **File Link:** [src/lib/useAuthoritativeStats.ts#L86-L94](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L86-L94)
- **Hunter Claim:** `persistStats` sets a cookie with `path=/; max-age=31536000` (1 year) for a cache whose TTL is 60 seconds. Because it is scoped to `path=/`, the cookie is sent on every HTTP request to the server, creating useless header bloat since the server never reads it.
- **Skeptic Challenge:** Ran `git grep "pulse_authoritative_stats" server/` and found 0 occurrences. The server never reads this cookie. Unlike user settings (which prevent theme flashing on SSR), stats cache is purely client-side. Concurred with score 50.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:* In `src/lib/useAuthoritativeStats.ts:88–92`:
    ```ts
    const serialized = encodeURIComponent(JSON.stringify(stats));
    document.cookie = `${STATS_STORAGE_KEY}=${serialized}; path=/; max-age=31536000; SameSite=Lax`;
    ```
  - The cache TTL is 60 seconds (`STATS_TTL_MS = 60_000`).
  - Storing this in a root HTTP cookie with a 1-year expiration forces the browser to transmit the serialized JSON in the `Cookie:` header of every HTTP request (APIs, static assets, telemetry) for 365 days.
  - `localStorage` is completely sufficient for client persistence across page reloads.
- **Calibrated Risk Score:** Frequency: 10, Impact: 5 → **Score: 50** (Actionable).
- **Minimal Surgical Fix:**
  Remove the `document.cookie` persistence branch from `useAuthoritativeStats.ts`:
  ```ts
  function persistStats(stats: CachedStats): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
      } catch {}
    }
  }
  ```

---

### BUG-C10-10: In-Flight Stats Resolution Overwrites Post-Clear Component State
- **File Link:** [src/lib/useAuthoritativeStats.ts#L194-L200](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L194-L200)
- **Hunter Claim:** While line 174 checks `if (statsCacheGeneration === requestGeneration)` to avoid updating the module-level `statsCache`, lines 194–200 do not check the generation before calling `setResultsCount(count)`. If `clearAuthoritativeStatsCache()` is called while a read is in flight, the resolving promise sets the pre-clear result directly into the component state, reviving obsolete data.
- **Skeptic Challenge:** Verified against developer intent documented at line 97: *"A pre-reset request must never repopulate the cache after the user explicitly clears local app data."* Line 194 bypasses this contract and sets component state unconditionally. Concurred with score 36.
- **Referee Ruling:** **CONFIRMED**.
  - *Evidence:* In `src/lib/useAuthoritativeStats.ts:194–200`:
    ```ts
    inFlightStatsRequest.promise
      .then((count) => {
        if (active) {
          setResultsCount(count);
          setIsLoadingResults(false);
        }
      })
    ```
  - `inFlightStatsRequest` holds `{ generation: requestGeneration, promise: requestPromise }`.
  - When `clearAuthoritativeStatsCache()` runs, `statsCacheGeneration` increments. While the promise `.then` callback at line 174 respects the generation check, the component state setter at line 196 does not check the generation.
  - When the promise resolves, it executes `setResultsCount(count)` with the pre-clear count, reviving cleared data in the active hero UI.
- **Calibrated Risk Score:** Frequency: 6, Impact: 6 → **Score: 36** (Actionable).
- **Minimal Surgical Fix:**
  Check that the current generation matches the request generation before setting component state:
  ```ts
  inFlightStatsRequest.promise
    .then((count) => {
      if (active && statsCacheGeneration === requestGeneration) {
        setResultsCount(count);
        setIsLoadingResults(false);
      }
    })
  ```

---

### BUG-C10-11: Silent Metadata Dropping & Missing Token Redaction in Error Reporter
- **File Link:** [src/lib/errorReporter.ts#L31-L45](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/errorReporter.ts#L31-L45)
- **Hunter Claim:** Non-critical error severities (`EXPECTED_OPTIONAL_FAILURE`, `RECOVERABLE_FAILURE`, `USER_ACTION_REQUIRED`) omit `formattedLog` from console calls, dropping diagnostic metadata. Furthermore, `CRITICAL_FAILURE` logs `formattedLog` without redacting auth tokens or secrets.
- **Skeptic Challenge:** Traced all callers in `src/lib/firestore.ts` and `mobile/src/lib/firestore.ts`. Not a single caller passes metadata, tokens, or secrets. Furthermore, unit tests in `tests/unit/errorReporter.test.ts` explicitly test and assert that non-critical console calls are concise strings, reserving object dumps for critical errors. Hunter's proposal to add regex redactions is unrequested speculative code violating Ponytail and YAGNI. Score: 4.
- **Referee Ruling:** **DISMISSED (Score < 5 / Speculative / YAGNI)**.
  - *Evidence:*
    1. Inspection of all callers across `src/` and `mobile/` reveals that no caller passes `metadata` or sensitive tokens.
    2. In `tests/unit/errorReporter.test.ts`, tests explicitly verify that `console.debug`, `console.warn`, and `console.info` receive concise formatted strings rather than noisy metadata object dumps.
    3. Adding speculative token-scrubbing regexes would introduce overhead, alter tested function behavior, and violate the Ponytail rule: *"Skip unrequested features, wrappers, and config. A vague request gets the smallest version that does the core job."*
- **Calibrated Risk Score:** Frequency: 2, Impact: 2 → **Score: 4** (< 5 threshold).

---

## 3. Prioritized Implementation Plan for Confirmed Fixes

| Priority | Bug ID | Target File | Nature of Fix |
|:---:|---|---|---|
| **P1** | **BUG-C10-02** | [shared/lib/settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L287-L340) | Decouple explicit reduced motion override from bundled default boolean (`explicitReducedMotion`). |
| **P1** | **BUG-C10-01** | [firestoreResearchSubmissionRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L26-L101) | Decouple hot aggregate summary document update from primary ACID submission transaction. |
| **P1** | **BUG-C10-03** | [firestoreResearchSubmissionRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L80-L89) | Skip summary counter update on unreconciled summary rather than aborting participant submissions with HTTP 503. |
| **P2** | **BUG-C10-07** | [firestoreResearchDatasetRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchDatasetRepository.ts#L93-L96) | Add 10-minute lock expiration check (`isLockExpired`) to `getDatasetSummary()` to match submission repository. |
| **P2** | **BUG-C10-04** | [shared/lib/settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L408-L467) | Attach `osc.onended = () => { osc.disconnect(); gain.disconnect(); }` in `playAudioCue`. |
| **P2** | **BUG-C10-05** | [shared/lib/settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L136-L146) | In `storage` event listener, handle `e.newValue === null` by resetting in-memory defaults and clearing cookies. |
| **P3** | **BUG-C10-08** | [mobile/src/lib/useAuthoritativeStats.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/lib/useAuthoritativeStats.ts#L1-L215) | Replace duplicate 215-line copy-paste module with `export * from '../../../src/lib/useAuthoritativeStats'`. |
| **P3** | **BUG-C10-09** | [src/lib/useAuthoritativeStats.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L86-L94) | Remove 1-year root HTTP cookie persistence; rely exclusively on `localStorage`. |
| **P3** | **BUG-C10-10** | [src/lib/useAuthoritativeStats.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L194-L200) | Check `statsCacheGeneration === requestGeneration` before setting component state on promise resolution. |
