# PULSE v2.1 — Cycle 10 Adversarial Bug Hunt Skeptic Report (Verification, Challenge & Ruling)

**Auditor:** Bug Skeptic Agent (Cycle 10)  
**Methodology:** Ruthless adversarial stress-testing, production codebase verification, call-graph analysis, and Ponytail lazy senior dev rigor (/ponytail-audit & YAGNI lens).  
**Threshold Applied:** Real defect in production with Risk Score (Frequency × Impact) ≥ 5. Speculative, unrequested, or false-positive findings are aggressively disproved or dismissed.

---

## 1. Executive Summary & Verdict Scorecard

Cycle 10 audited eleven (11) candidate defects identified by the Bug Hunter across five core subsystems:
1. `src/lib/useAuthoritativeStats.ts` & `mobile/src/lib/useAuthoritativeStats.ts`
2. `server/repositories/firestore/firestoreResearchSubmissionRepository.ts`
3. `server/repositories/firestore/firestoreResearchDatasetRepository.ts`
4. `src/lib/settingsStore.ts` & `shared/lib/settingsStore.ts` & `mobile/src/lib/settingsStore.ts`
5. `src/lib/errorReporter.ts` & `mobile/src/lib/errorReporter.ts`

### Final Ruling Summary:
- **CONFIRMED:** 9 defects
- **DISPROVED (False Positive):** 1 defect (`BUG-C10-06`)
- **DISMISSED (Score < 5 / Speculative / YAGNI):** 1 defect (`BUG-C10-11`)

| ID | Target File | Category | Hunter Score | Skeptic Freq | Skeptic Impact | Skeptic Score | Final Verdict |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| **BUG-C10-01** | [firestoreResearchSubmissionRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L26-L101) | Concurrency / Scale | 56 | 5 | 8 | **40** | **CONFIRMED** |
| **BUG-C10-02** | [settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L287-L340) | Accessibility / Logic | 56 | 8 | 7 | **56** | **CONFIRMED** |
| **BUG-C10-03** | [firestoreResearchSubmissionRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L80-L89) | Resilience / Availability | 54 | 4 | 9 | **36** | **CONFIRMED** |
| **BUG-C10-04** | [settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L408-L467) | Performance / Memory | 54 | 9 | 5 | **45** | **CONFIRMED** |
| **BUG-C10-05** | [settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L136-L146) | Distributed State / Storage | 49 | 6 | 6 | **36** | **CONFIRMED** |
| **BUG-C10-06** | [firestoreResearchDatasetRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchDatasetRepository.ts#L54-L69) | Database / Query Precondition | 49 | 0 | 0 | **0** | **DISPROVED** |
| **BUG-C10-07** | [firestoreResearchDatasetRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchDatasetRepository.ts#L93-L96) | Deadlock / Availability | 42 | 5 | 7 | **35** | **CONFIRMED** |
| **BUG-C10-08** | [useAuthoritativeStats.ts (mobile)](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/lib/useAuthoritativeStats.ts#L1-L215) | Code Bloat / Duplication | 50 | 10 | 5 | **50** | **CONFIRMED** |
| **BUG-C10-09** | [useAuthoritativeStats.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L86-L94) | Network / Overhead | 50 | 10 | 5 | **50** | **CONFIRMED** |
| **BUG-C10-10** | [useAuthoritativeStats.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L194-L200) | Concurrency / Stale Closure | 36 | 6 | 6 | **36** | **CONFIRMED** |
| **BUG-C10-11** | [errorReporter.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/errorReporter.ts#L31-L45) | Observability / Telemetry | 40 | 2 | 2 | **4** | **DISMISSED** |

---

## 2. Deep Dive Adversarial Challenge & Ruling on Each Finding

---

### BUG-C10-01: Hot Document Write Contention on Summary Counter in Submission Transaction
- **File Link:** [firestoreResearchSubmissionRepository.ts#L26-L101](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L26-L101)
- **Hunter Claim:**
  Every participant assessment submission across the application locks and updates a single document `publicDatasetMeta/summary` within an ACID transaction (`tx.get` + `tx.set`). Because Google Cloud Firestore limits writes to ~1 write/sec per document and transactions use optimistic concurrency, concurrent submissions collide, abort after 5 retries, and fail user test saves with contention errors.
- **Skeptic Challenge & Code Verification:**
  - *Does Firestore allow this?* Firestore documentation is explicit: the hard write limit per document is ~1 write/second. In an optimistic locking transaction (`db.runTransaction`), reading `summaryDocRef` locks that document's read snapshot. If two or more transactions commit concurrently, all but one are rejected and forced to retry.
  - *Does the application decouple this?* No. In lines 26, 39, and 91–101, `summaryDocRef` is read and written directly inside the primary user submission transaction alongside `experimentSessions`, `publicDataset`, `assessmentResults`, and `assessmentTrials`.
  - *Skeptic Calibration:* Hunter's frequency of 7/10 is slightly aggressive for an indie research platform during low traffic, but in any concurrent scenario (e.g. 2–5 users finishing an assessment within a few seconds), transaction retries and contention aborts are mathematically guaranteed by Firestore's concurrency control. Realistic Frequency: 5/10, Impact: 8/10 (submission fails, user data discarded). Score: **40**.
- **Verdict:** **CONFIRMED**
- **Minimal Surgical Fix:**
  Decouple the summary counter increment from the participant's primary ACID submission transaction, or tolerate summary contention failure without aborting the participant's session and test persistence:
  ```ts
  // In FirestoreResearchSubmissionRepository:
  // Write sessionDocRef, publicDatasetDocRef, assessmentResultDocRef, and trials in tx.
  // Increment summaryDocRef outside the primary transaction, or isolate summary update errors.
  ```

---

### BUG-C10-02: Universal Settings Updates Permanently Sever OS Reduced-Motion Synchronization
- **File Link:** [shared/lib/settingsStore.ts#L287-L340](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L287-L340)
- **Hunter Claim:**
  `hasExplicitStoredReducedMotionPreference()` checks `typeof settings.reducedMotionEnabled === 'boolean'`. When a user modifies *any* setting (sound, theme, font scale), `updateSettings()` writes the full `UserSettings` object into localStorage, which always contains `reducedMotionEnabled: false` (or true). From that moment on, `hasExplicitStoredReducedMotionPreference()` returns `true` permanently, causing `handleMediaChange` in `useReducedMotionPreference()` to early-return and permanently ignore the OS accessibility setting (`prefers-reduced-motion: reduce`).
- **Skeptic Challenge & Code Verification:**
  - Let's trace the exact code path:
    1. Initially, localStorage is empty. `hasExplicitStoredReducedMotionPreference()` returns `false`. `mql.addEventListener('change', handleMediaChange)` responds to OS reduced motion toggles.
    2. User toggles `soundEnabled: false` or changes font size.
    3. `updateSettings({ soundEnabled: false })` executes `next = sanitizeSettings(partial, current)`.
    4. `sanitizeSettings` copies `reducedMotionEnabled` (which was initialized to `getDefaultReducedMotion()`).
    5. `localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next))` writes `{ soundEnabled: false, ..., reducedMotionEnabled: false }`.
    6. `hasExplicitStoredReducedMotionPreference()` reads `localStorage` and finds `typeof settings.reducedMotionEnabled === 'boolean'` is `true`!
    7. In `useReducedMotionPreference()`:
       ```ts
       const handleMediaChange = (event: MediaQueryListEvent | MediaQueryList) => {
         if (hasExplicitStoredReducedMotionPreference()) {
           return;
         }
         ...
       };
       ```
    8. The listener exits immediately on every OS change. The user never touched the reduced motion setting, yet the app permanently ignores their OS accessibility settings.
  - This is an unambiguous violation of WCAG 2.1 SC 2.3.3.
  - Realistic Frequency: 8/10 (happens immediately once any setting is saved). Impact: 7/10 (accessibility violation). Score: **56**.
- **Verdict:** **CONFIRMED**
- **Minimal Surgical Fix:**
  Distinguish between an explicit user override of reduced motion and the default bundled boolean. Either store an explicit flag (`explicitReducedMotion: true`) when the user explicitly toggles reduced motion in the Settings UI, or only store `reducedMotionEnabled` when explicitly passed in `partial`:
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
- **Hunter Claim:**
  If the `publicDatasetMeta/summary` document in Firestore is missing a counter, has a schema version drift, or has not been pre-initialized, `executeSubmissionTransaction` throws `DATASET_SUMMARY_RECONCILIATION_REQUIRED`. In `researchRoutes.ts:214`, this returns HTTP 503, rejecting the user's completed cognitive test and discarding their results.
- **Skeptic Challenge & Code Verification:**
  - Let's check lines 80–89 of `firestoreResearchSubmissionRepository.ts`:
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
  - And lines 214–219 of `server/routes/researchRoutes.ts`:
    ```ts
    if (errMsg === 'DATASET_SUMMARY_RECONCILIATION_REQUIRED') {
      return res.status(503).json({
        success: false,
        error: 'Research submissions are temporarily unavailable until Dataset summary reconciliation is complete.'
      });
    }
    ```
  - This is an extreme violation of fault isolation. A participant who just spent minutes performing a cognitive test should NEVER have their valid results rejected and discarded with HTTP 503 simply because an aggregate summary counter document requires maintenance.
  - Realistic Frequency: 4/10. Impact: 9/10 (platform-wide submission failure for valid users). Score: **36**.
- **Verdict:** **CONFIRMED**
- **Minimal Surgical Fix:**
  If `publicDatasetMeta/summary` fails validation or is unreconciled, log a warning and proceed with recording the participant's test records (`experimentSessions`, `publicDataset`, `assessmentResults`), skipping the summary increment rather than aborting the transaction:
  ```ts
  if (
    summary.schemaVersion !== 1 ||
    !isSafeNonNegativeInteger(totalRecords) ||
    !isSafeNonNegativeInteger(totalTrials) ||
    !counts ||
    canonicalTypes.some(type => !isSafeNonNegativeInteger(counts[type])) ||
    !isSafeNonNegativeInteger(currentCount)
  ) {
    // Log reconciliation needed without blocking participant's submission
    console.warn('[ResearchSubmission] Summary reconciliation required; skipping summary update');
  } else {
    tx.set(summaryDocRef, { ... }, { merge: true });
  }
  ```

---

### BUG-C10-04: Audio Engine Destination Graph Node Leak on Every Audio Cue
- **File Link:** [shared/lib/settingsStore.ts#L408-L467](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L408-L467)
- **Hunter Claim:**
  `playAudioCue` creates an `OscillatorNode` and `GainNode`, connects `gain.connect(ctx.destination)`, and calls `osc.stop(now + 0.04)`. Because `gain` is never disconnected from `ctx.destination`, `GainNode` instances are retained indefinitely by the native Web Audio graph, leaking memory and degrading the audio thread.
- **Skeptic Challenge & Code Verification:**
  - Does `osc.stop()` disconnect nodes? No. W3C Web Audio API specification explicitly states that stopping an `OscillatorNode` stops waveform scheduling, but does not disconnect the graph or downstream `GainNode` instances.
  - In browsers (Chromium, WebKit), nodes connected to `AudioContext.destination` remain referenced by the active audio graph until explicitly disconnected or the context is destroyed.
  - In PULSE, `playAudioCue` fires on every click, stimulus display, success chime, and error tone across dozens of trials per test. Hundreds of dead `GainNode` instances accumulate in the destination mixer inputs.
  - Realistic Frequency: 9/10 (every audio cue). Impact: 5/10 (graph node accumulation, audio thread overhead). Score: **45**.
- **Verdict:** **CONFIRMED**
- **Minimal Surgical Fix:**
  Attach an `onended` handler to the oscillator to disconnect both nodes from the destination:
  ```ts
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
  ```

---

### BUG-C10-05: Cross-Tab Settings Reset Resurrecting Loop / Sync Deadlock
- **File Link:** [shared/lib/settingsStore.ts#L136-L146](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L136-L146) & [shared/lib/settingsStore.ts#L248-L256](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L248-L256)
- **Hunter Claim:**
  When Tab 1 calls `resetSettingsToDefaults()`, it removes localStorage and clears cookies. Tab 2 receives a `storage` event (`e.newValue === null`) and calls `loadSettings()`. If Tab 2's cookie has not yet been cleared across processes, Tab 2's dual-storage self-healing branch (`!hasLocalStorage && hasCookie`) re-writes the deleted settings back to `localStorage`, resurrecting the deleted settings and undoing the reset.
- **Skeptic Challenge & Code Verification:**
  - Let's check lines 249–256:
    ```ts
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === SETTINGS_STORAGE_KEY) {
        const reloaded = loadSettings();
        cachedSettings = reloaded;
        applyDOMSettings(reloaded);
        window.dispatchEvent(new CustomEvent('pulse_settings_changed', { detail: reloaded }));
      }
    });
    ```
  - And lines 136–146 of `loadSettings()`:
    ```ts
    // Dual-storage self-healing: re-synchronize if one store was cleared or out-of-sync
    if (hasLocalStorage && !hasCookie) {
      writeSettingsCookie(sanitized);
    } else if (!hasLocalStorage && hasCookie) {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
      } catch { ... }
    }
    ```
  - When `e.key === SETTINGS_STORAGE_KEY` and `e.newValue === null`, the user in another tab intentionally executed a reset. Calling `loadSettings()` in this state directly triggers the `!hasLocalStorage && hasCookie` branch if the cookie hasn't updated or was read from memory, causing Tab 2 to actively resurrect the deleted settings in `localStorage`!
  - Realistic Frequency: 6/10. Impact: 6/10 (resets fail, user privacy/preference clearing defeated). Score: **36**.
- **Verdict:** **CONFIRMED**
- **Minimal Surgical Fix:**
  In the `storage` event listener, check if `e.newValue === null` (removal) and reset in-memory settings to defaults without invoking `loadSettings()`:
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
- **Hunter Claim:**
  `publicDataset` composite indexes in `firestore.indexes.json` reference `completedAtTimestamp`, which is never written to `publicDataset`. Hunter claims that multi-filter queries (e.g. `assessmentType in [...]` and `ageGroup == ...`) throw `Error: 9 FAILED_PRECONDITION: The query requires an index.` and crash the endpoint in production.
- **Skeptic Challenge & Code Verification:**
  - Let's check `queryRawDataset`:
    ```ts
    let q: Query = db.collection('publicDataset');
    if (options.assessmentType) {
      const aliases = getAssessmentTypeAliases(options.assessmentType);
      q = aliases.length === 1
        ? q.where('assessmentType', '==', aliases[0])
        : q.where('assessmentType', 'in', [...aliases]);
    }
    if (options.ageGroup) q = q.where('ageGroup', '==', options.ageGroup);
    if (options.completedAtMonth) q = q.where('completedAtMonth', '==', options.completedAtMonth);
    q = q.orderBy('__name__');
    ```
  - **Does Cloud Firestore require a composite index for this query?**
    **NO.** In Google Cloud Firestore:
    1. All filters in `queryRawDataset` are **equality / in** clauses (`where('assessmentType', 'in', ...)`, `where('ageGroup', '==', ...)`, `where('completedAtMonth', '==', ...)`). There are **zero inequality filters** (`<`, `>`, `<=`, `>=`).
    2. The sort order is strictly `orderBy('__name__')` (document ID), which is the default tie-breaker on all single-field indexes.
    3. According to official Firestore architecture, Firestore satisfies multiple equality and `in` filters with `orderBy('__name__')` by **merging single-field indexes** (zigzag merge join). It does NOT require a composite index and does NOT throw `FAILED_PRECONDITION`.
  - **Why are those indexes in `firestore.indexes.json`?**
    In Git commit `c96c743e16`, early indexing definitions were added for a planned sort by `completedAtTimestamp DESC`. When the implementation later adopted cursor-based pagination ordered by `__name__`, those three index entries became vestigial/unused. Unused indexes in `firestore.indexes.json` do not cause queries to fail.
  - The query executes cleanly via single-field index merging.
  - Score: Frequency 0 × Impact 0 = **0**.
- **Verdict:** **DISPROVED (False Positive)**

---

### BUG-C10-07: Missing Lock Expiration Check in getDatasetSummary() Causes Permanent API Deadlock
- **File Link:** [firestoreResearchDatasetRepository.ts#L93-L96](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchDatasetRepository.ts#L93-L96) & [firestoreResearchSubmissionRepository.ts#L61-L65](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L61-L65)
- **Hunter Claim:**
  `FirestoreResearchSubmissionRepository` safely checks whether a migration lock has expired after 10 minutes (`isLockExpired = (Date.now() - summary.migrationStartedAt) > 10 * 60 * 1000`). However, `FirestoreResearchDatasetRepository.getDatasetSummary()` checks only `if (summary.migrationInProgress === true)` without checking lock expiration. If a migration is killed or crashes midway, `getDatasetSummary()` stays permanently locked at HTTP 503 while submissions recover.
- **Skeptic Challenge & Code Verification:**
  - Let's compare both repositories side-by-side:
    - In `firestoreResearchSubmissionRepository.ts:62–65`:
      ```ts
      const isLockExpired = typeof summary.migrationStartedAt === 'number' && (Date.now() - summary.migrationStartedAt) > 10 * 60 * 1000;
      if (summary.migrationInProgress === true && !isLockExpired) {
        throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
      }
      ```
    - In `firestoreResearchDatasetRepository.ts:93–96`:
      ```ts
      const summary = summarySnap.data() as Record<string, unknown>;
      if (summary.migrationInProgress === true) {
        throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
      }
      ```
  - This is an undeniable logic asymmetry. If a reconciliation migration crashes, OOMs, or times out, `migrationInProgress` remains `true` with a valid `migrationStartedAt`.
  - After 10 minutes, user submissions resume and succeed because of `isLockExpired`.
  - But any visitor reading `/api/research/dataset/summary` receives HTTP 503 (`DATASET_SUMMARY_MIGRATION_IN_PROGRESS`) indefinitely because `getDatasetSummary()` never checks whether the lock has expired!
  - Realistic Frequency: 5/10. Impact: 7/10 (indefinite denial-of-service on public summary API). Score: **35**.
- **Verdict:** **CONFIRMED**
- **Minimal Surgical Fix:**
  Add the matching 10-minute lock expiration check to `FirestoreResearchDatasetRepository.getDatasetSummary()`:
  ```ts
  const isLockExpired = typeof summary.migrationStartedAt === 'number' && (Date.now() - summary.migrationStartedAt) > 10 * 60 * 1000;
  if (summary.migrationInProgress === true && !isLockExpired) {
    throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
  }
  ```

---

### BUG-C10-08: Duplicate 215-Line Mobile useAuthoritativeStats Module Causes Split-Brain Caches
- **File Link:** [mobile/src/lib/useAuthoritativeStats.ts#L1-L215](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/lib/useAuthoritativeStats.ts#L1-L215) vs [src/lib/useAuthoritativeStats.ts#L1-L215](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L1-L215)
- **Hunter Claim:**
  `mobile/src/lib/useAuthoritativeStats.ts` is an exact 215-line copy-paste clone of `src/lib/useAuthoritativeStats.ts`. While `settingsStore.ts` and `errorReporter.ts` in `mobile/` are 1-line re-exports, this file duplicates module singletons (`statsCache`, `statsCacheGeneration`, `inFlightStatsRequest`), creating split-brain state and bundle bloat.
- **Skeptic Challenge & Code Verification:**
  - Let's check `src/App.tsx:5`:
    ```ts
    const MobileAppWrapper = lazy(() => import('@mobile/MobileAppWrapper').then(m => ({ default: m.MobileAppWrapper || m.default })));
    ```
  - In the main client bundle, both desktop and mobile modules coexist.
  - When a user clears cache in `mobile/src/components/SettingsModal.tsx`, it calls `clearAuthoritativeStatsCache()` from `mobile/src/lib/useAuthoritativeStats.ts`.
  - This leaves the desktop module's `statsCache` populated!
  - Conversely, clearing data from desktop leaves mobile populated.
  - Furthermore, having 215 lines of duplicate logic (even retaining the desktop comment `"publicDataset is the single counting source for the desktop hero"`) directly violates DRY and increases bundle size.
  - Realistic Frequency: 10/10. Impact: 5/10 (split-brain in-memory singletons, redundant network calls, dead code bloat). Score: **50**.
- **Verdict:** **CONFIRMED**
- **Minimal Surgical Fix:**
  Replace `mobile/src/lib/useAuthoritativeStats.ts` with a 1-line re-export, matching the architecture of `settingsStore.ts` and `errorReporter.ts`:
  ```ts
  export * from '../../../src/lib/useAuthoritativeStats';
  ```

---

### BUG-C10-09: 1-Year Root HTTP Cookie Set for 60-Second Client Stats Cache
- **File Link:** [src/lib/useAuthoritativeStats.ts#L86-L94](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L86-L94)
- **Hunter Claim:**
  `persistStats` sets a cookie with `path=/; max-age=31536000` (1 year) for a cache whose TTL is 60 seconds (`STATS_TTL_MS = 60_000`). Because it is scoped to `path=/`, the cookie is attached to every HTTP request sent to the server, bloating headers unnecessarily since the server never reads it.
- **Skeptic Challenge & Code Verification:**
  - Let's check `src/lib/useAuthoritativeStats.ts:88–92`:
    ```ts
    const serialized = encodeURIComponent(JSON.stringify(stats));
    document.cookie = `${STATS_STORAGE_KEY}=${serialized}; path=/; max-age=31536000; SameSite=Lax`;
    ```
  - We ran `git grep "pulse_authoritative_stats" server/`: **0 results**.
  - The server never reads or inspects this cookie.
  - Unlike `pulse_user_settings` (which avoids theme flashing on initial SSR HTML render), `useAuthoritativeStats` is a client-side hook reading Firestore for the hero component.
  - `localStorage` already provides persistent storage across page reloads. Writing a 1-year cookie on `path=/` forces the browser to transmit the serialized stats string in the `Cookie:` header of every single HTTP request (APIs, static assets, telemetry) for a full year!
  - Realistic Frequency: 10/10. Impact: 5/10 (persistent network header bloat on every request). Score: **50**.
- **Verdict:** **CONFIRMED**
- **Minimal Surgical Fix:**
  Remove the `document.cookie` persistence from `useAuthoritativeStats.ts`. `localStorage` is completely sufficient for client persistence across reloads:
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
- **Hunter Claim:**
  While line 174 checks `if (statsCacheGeneration === requestGeneration)` before updating `statsCache`, lines 194–200 do not check the generation before calling `setResultsCount(count)`. If `clearAuthoritativeStatsCache()` is called while a read is in flight, the resolving promise sets the pre-clear result directly into the component state, reviving obsolete data.
- **Skeptic Challenge & Code Verification:**
  - Let's look at `clearAuthoritativeStatsCache()`:
    ```ts
    export function clearAuthoritativeStatsCache(): void {
      // Invalidate pending reads as well as stored values. A pre-reset request must
      // never repopulate the cache after the user explicitly clears local app data.
      statsCacheGeneration += 1;
      statsCache = null;
      inFlightStatsRequest = null;
      ...
    }
    ```
  - Notice the developer's explicit intent: *"A pre-reset request must never repopulate the cache after the user explicitly clears local app data."*
  - Now check lines 194–200:
    ```ts
    inFlightStatsRequest.promise
      .then((count) => {
        if (active) {
          setResultsCount(count);
          setIsLoadingResults(false);
        }
      })
    ```
  - Even though `statsCache` was not updated at line 174, the component state `setResultsCount(count)` is invoked unconditionally! The component revives the pre-clear count in the active hero UI right after the user hit "Clear Data".
  - Realistic Frequency: 6/10. Impact: 6/10 (violates explicit cache invalidation contract, resurrects cleared state). Score: **36**.
- **Verdict:** **CONFIRMED**
- **Minimal Surgical Fix:**
  Ensure the promise resolution checks `statsCacheGeneration === requestGeneration` before updating component state:
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
- **Hunter Claim:**
  Non-critical error severities (`EXPECTED_OPTIONAL_FAILURE`, `RECOVERABLE_FAILURE`, `USER_ACTION_REQUIRED`) omit `formattedLog` from console calls, silently dropping diagnostic metadata. Furthermore, `CRITICAL_FAILURE` logs `formattedLog` without redacting auth tokens or secrets.
- **Skeptic Challenge & Code Verification:**
  - Let's check callers of `reportError` in `src/lib/firestore.ts` and `mobile/src/lib/firestore.ts`:
    All callers pass `{ component: 'Firestore', action: 'ensureFirebaseReady' }`, etc. **Not a single caller in the entire codebase passes metadata, tokens, or passwords to `reportError`.**
  - The security claim of "token leakage" is completely speculative and hypothetical (YAGNI).
  - Furthermore, let's examine `tests/unit/errorReporter.test.ts`:
    The unit tests explicitly assert that `console.debug`, `console.warn`, and `console.info` receive ONLY the string prefix and message, reserving full object dumps for `CRITICAL_FAILURE`! This was an intentional design decision to prevent client browser consoles from being flooded with verbose objects on routine recoverable network retries.
  - Adding complex recursive regex redaction and altering console signatures breaks existing tests and violates the Ponytail senior dev rule ("Skip unrequested features, wrappers, and config. A vague request gets the smallest version that does the core job").
  - Realistic Frequency: 2/10. Impact: 2/10. Score: **4** (< 5 threshold).
- **Verdict:** **DISMISSED (Score < 5 / Speculative / YAGNI)**

---

## 3. Summary of Confirmed Fixes & Action Items

| Confirmed Bug ID | File Path | Surgical Resolution |
|---|---|---|
| **BUG-C10-01** | [firestoreResearchSubmissionRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L26-L101) | Decouple aggregate summary counter update from primary ACID user submission transaction. |
| **BUG-C10-02** | [shared/lib/settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L287-L340) | Track explicit reduced motion override via dedicated flag (`explicitReducedMotion`) rather than bundled boolean. |
| **BUG-C10-03** | [firestoreResearchSubmissionRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L80-L89) | Skip summary counter update on unreconciled summary document rather than aborting participant submissions with HTTP 503. |
| **BUG-C10-04** | [shared/lib/settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L408-L467) | Add `osc.onended = () => { osc.disconnect(); gain.disconnect(); }` to release native Web Audio nodes from `ctx.destination`. |
| **BUG-C10-05** | [shared/lib/settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L136-L146) | In `storage` event listener, handle `e.newValue === null` by resetting in-memory defaults and exiting early without running `loadSettings()`. |
| **BUG-C10-07** | [firestoreResearchDatasetRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchDatasetRepository.ts#L93-L96) | Add 10-minute lock expiration check (`isLockExpired`) to `getDatasetSummary()` to match `executeSubmissionTransaction()`. |
| **BUG-C10-08** | [mobile/src/lib/useAuthoritativeStats.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/lib/useAuthoritativeStats.ts#L1-L215) | Replace duplicate 215 lines with `export * from '../../../src/lib/useAuthoritativeStats'`. |
| **BUG-C10-09** | [src/lib/useAuthoritativeStats.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L86-L94) | Eliminate 1-year `document.cookie` persistence for client stats; rely solely on `localStorage`. |
| **BUG-C10-10** | [src/lib/useAuthoritativeStats.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L194-L200) | Check `statsCacheGeneration === requestGeneration` before setting component state on promise resolution. |
