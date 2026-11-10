# PULSE v2.1 — Cycle 10 Adversarial Bug Hunt Report (Authoritative Stats Caching, Research Storage Repositories, Client Settings & Error Reporting)

**Auditor:** Bug Hunter Agent (Cycle 10)  
**Methodology:** Ponytail Senior Dev Audit (/ponytail-audit lens: correctness, concurrency/scale races under load, missing tests for risky logic, security boundaries, and lean bloat/dead code)  
**Threshold Applied:** Frequency (1–10) × Impact (1–10) ≥ 5.

---

## 1. Executive Summary

Cycle 10 conducted an adversarial audit of the authoritative statistics caching system, research submission and dataset repositories, client dual-storage settings store, and telemetry error reporter:
1. `src/lib/useAuthoritativeStats.ts` & `mobile/src/lib/useAuthoritativeStats.ts`
2. `server/repositories/firestore/firestoreResearchSubmissionRepository.ts`
3. `server/repositories/firestore/firestoreResearchDatasetRepository.ts`
4. `src/lib/settingsStore.ts` & `mobile/src/lib/settingsStore.ts` (delegating to `shared/lib/settingsStore.ts`)
5. `src/lib/errorReporter.ts` & `mobile/src/lib/errorReporter.ts`

Eleven (11) concrete defects were uncovered. The findings include:
- A high-contention bottleneck in Firestore transactions attempting to write to a single hot aggregate document (`publicDatasetMeta/summary`), violating Firestore's ~1 write/sec limit under concurrent user submissions;
- An unhandled fate-sharing dependency where corrupt or unreconciled summary document data aborts user assessment submissions with HTTP 503 errors;
- A permanent deadlock in the public dataset summary API caused by missing lock-expiration checks on stale migration locks;
- Missing composite indexes for multi-filter public dataset queries against `publicDataset`, causing production query failures;
- A race condition in `useAuthoritativeStats` where pre-clear in-flight requests resolve and overwrite cleared client state;
- An aggressive dual-storage self-healing loop in `settingsStore` that resurrects cleared settings across browser tabs, defeating user reset actions;
- An accessibility defect in `settingsStore` where modifying any setting permanently disconnects the application from the operating system's `prefers-reduced-motion` media queries;
- An audio engine leak where `playAudioCue` permanently retains un-disconnected `GainNode` instances attached to `AudioContext.destination`;
- A 1-year HTTP cookie written for a 60-second in-memory stats cache, polluting every browser request header;
- Complete diagnostic metadata loss in `errorReporter` for all non-critical log events;
- A 215-line duplicate module in mobile stats caching creating split-brain in-memory singletons.

---

## 2. Quantitative Defect Ranking Matrix

| ID | Category | Target File | Defect Summary | Freq (1–10) | Impact (1–10) | Risk Score (F×I) |
|---|---|---|---|:---:|:---:|:---:|
| **BUG-C10-01** | Concurrency / Scale | [firestoreResearchSubmissionRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L26-L101) | Hot document write contention on `publicDatasetMeta/summary` violates Firestore's ~1 write/sec limit under concurrent submissions | 7 | 8 | **56** |
| **BUG-C10-02** | Accessibility / Logic | [settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L287-L340) | Modifying any setting sets `reducedMotionEnabled`, permanently severing OS `prefers-reduced-motion` synchronization | 8 | 7 | **56** |
| **BUG-C10-03** | Resilience / Availability | [firestoreResearchSubmissionRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L80-L89) | Corrupt or unreconciled aggregate summary document aborts participant assessment submission transactions with HTTP 503 | 6 | 9 | **54** |
| **BUG-C10-04** | Performance / Memory | [settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L408-L467) | `playAudioCue` permanently leaks `GainNode` instances attached to `AudioContext.destination` without `onended` disconnect | 9 | 6 | **54** |
| **BUG-C10-05** | Distributed State / Storage | [settingsStore.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L139-L146) | Cross-tab self-healing resurrection loop prevents settings reset whenever multiple tabs are open | 7 | 7 | **49** |
| **BUG-C10-06** | Database / Query Precondition | [firestoreResearchDatasetRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchDatasetRepository.ts#L54-L69) | Multi-filter public dataset queries fail in production due to mismatched indexes referencing absent field `completedAtTimestamp` | 7 | 7 | **49** |
| **BUG-C10-07** | Deadlock / Availability | [firestoreResearchDatasetRepository.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchDatasetRepository.ts#L93-L96) | Missing lock expiration check in `getDatasetSummary()` permanently wedges dataset summary API on interrupted migrations | 6 | 7 | **42** |
| **BUG-C10-08** | Code Bloat / Duplication | [useAuthoritativeStats.ts (mobile)](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/lib/useAuthoritativeStats.ts#L1-L215) | 215-line copy-paste clone of desktop stats hook causes dual module-level singletons and split-brain cache states | 10 | 5 | **50** |
| **BUG-C10-09** | Network / Overhead | [useAuthoritativeStats.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L88-L92) | 1-year root HTTP cookie set for 60s client stats cache forces bloat header onto every backend HTTP request | 10 | 5 | **50** |
| **BUG-C10-10** | Concurrency / Stale Closure | [useAuthoritativeStats.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L194-L200) | In-flight stats resolution does not verify cache generation before updating component state, reviving pre-clear counts | 6 | 6 | **36** |
| **BUG-C10-11** | Observability / Telemetry | [errorReporter.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/errorReporter.ts#L31-L45) | Non-critical error severities silently drop diagnostic metadata context, and critical logging leaks unredacted tokens | 8 | 5 | **40** |

---

## 3. Deep Dive Defect Analysis & Minimal Surgical Fixes

---

### BUG-C10-01: Hot Document Write Contention on Summary Counter in Submission Transaction

- **File Link:** [firestoreResearchSubmissionRepository.ts#L26-L101](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchSubmissionRepository.ts#L26-L101)
- **Defect Description:**
  In `FirestoreResearchSubmissionRepository.executeSubmissionTransaction`:
  ```ts
  const summaryDocRef = db.collection('publicDatasetMeta').doc('summary');
  ...
  await db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionDocRef);
    const summarySnap = await tx.get(summaryDocRef);
    ...
    tx.set(summaryDocRef, {
      schemaVersion: 1,
      totalRecords: totalRecords + 1,
      totalTrials: totalTrials + summaryTrialCount,
      counts: {
        ...counts,
        [canonicalAssessmentType]: currentCount + 1
      },
      lastUpdatedAt: input.completedAtTimestamp
    }, { merge: true });
  ```
  Every participant assessment submission across the entire application locks and updates a single document: `publicDatasetMeta/summary`.
  Google Cloud Firestore enforces a strict write rate limit of **~1 write per second per document**.
  Under concurrent traffic (e.g. users finishing tests in batches, classrooms, or multiple visitors completing assessments within seconds), concurrent Firestore transactions attempting to read and write `publicDatasetMeta/summary` collide. Firestore aborts the transactions with contention errors (`ABORTED: Too much contention on these documents`), leading to transaction timeouts, submission failures, and dropped participant data.
- **Frequency:** 7/10. Under concurrent submissions (>1 submission/sec), transaction aborts are guaranteed by Firestore architecture.
- **Impact:** 8/10. Aborts the entire submission transaction, preventing participants from saving their test scores.
- **Surgical Root-Cause Fix:**
  Decouple the aggregate summary update from the participant's ACID submission transaction, or tolerate summary contention without aborting the primary submission. The primary records (`experimentSessions`, `publicDataset`, `assessmentResults`, `assessmentTrials`) must commit reliably:
  ```ts
  // In executeSubmissionTransaction:
  // Write the session, publicDataset, results, and trials inside the primary transaction.
  // Increment the aggregate summary outside the primary transaction using FieldValue.increment
  // or a fire-and-forget / scheduled counter reconciler, ensuring contention does not roll back user submissions.
  ```

---

### BUG-C10-02: Universal Settings Updates Permanently Sever OS Reduced-Motion Synchronization

- **File Link:** [shared/lib/settingsStore.ts#L287-L340](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L287-L340)
- **Defect Description:**
  In `shared/lib/settingsStore.ts`:
  ```ts
  export function hasExplicitStoredReducedMotionPreference(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const settings = JSON.parse(raw);
        if (settings && typeof settings.reducedMotionEnabled === 'boolean') {
          return true;
        }
      }
    } catch {}
    ...
  }
  ```
  When a user changes *any* preference in the application (for example, toggling sound or selecting a font size), `updateSettings()` persists the full `UserSettings` object into `localStorage.setItem(SETTINGS_STORAGE_KEY, ...)`, which automatically bundles `reducedMotionEnabled: false` (or true).
  From that moment onward, `settings.reducedMotionEnabled` is a boolean in localStorage, causing `hasExplicitStoredReducedMotionPreference()` to return `true` permanently.
  In `useReducedMotionPreference`:
  ```ts
  const handleMediaChange = (event: MediaQueryListEvent | MediaQueryList) => {
    if (hasExplicitStoredReducedMotionPreference()) {
      return;
    }
    const nextVal = 'matches' in event ? event.matches : mql.matches;
    setReducedMotion((prev) => (prev !== nextVal ? nextVal : prev));
  };
  ```
  Because `hasExplicitStoredReducedMotionPreference()` always returns `true`, the media query listener permanently early-returns and ignores all changes to the user's OS-level accessibility setting (`prefers-reduced-motion: reduce`). This violates WCAG 2.1 Success Criterion 2.3.3.
- **Frequency:** 8/10. Happens as soon as any user updates any setting.
- **Impact:** 7/10. Breaking accessibility compliance for users with vestibular/motion sensitivity.
- **Surgical Root-Cause Fix:**
  Track whether the reduced motion preference was explicitly set by the user using a distinct flag or separate explicit key (`explicitReducedMotion: boolean`), rather than checking if `reducedMotionEnabled` is a boolean in the default object:
  ```ts
  export interface UserSettings {
    ...
    explicitReducedMotion?: boolean;
  }
  
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
- **Defect Description:**
  In `FirestoreResearchSubmissionRepository`:
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
  When the aggregate metadata summary document in Firestore is missing a property, has schema version drift, or has not yet been initialized by an admin reconciliation run, the submission transaction throws `DATASET_SUMMARY_RECONCILIATION_REQUIRED`.
  This error causes the entire Firestore transaction to abort.
  In `server/routes/researchRoutes.ts`:
  ```ts
  if (errMsg === 'DATASET_SUMMARY_RECONCILIATION_REQUIRED') {
    return res.status(503).json({
      success: false,
      error: 'Research submissions are temporarily unavailable until Dataset summary reconciliation is complete.'
    });
  }
  ```
  Consequently, all users across the platform attempting to submit legitimate cognitive test results receive an HTTP 503 error, discarding their test data. A background analytics summary defect must never block primary transactional submission recording.
- **Frequency:** 6/10. Occurs on new environments, during migrations, or if any summary counter field is missing.
- **Impact:** 9/10. Complete platform-wide outage for test submissions.
- **Surgical Root-Cause Fix:**
  If the summary document is missing or invalid, bypass the summary update or log a warning rather than aborting the transaction:
  ```ts
  if (
    summary.schemaVersion !== 1 ||
    !isSafeNonNegativeInteger(totalRecords) ||
    !isSafeNonNegativeInteger(totalTrials) ||
    !counts ||
    canonicalTypes.some(type => !isSafeNonNegativeInteger(counts[type])) ||
    !isSafeNonNegativeInteger(currentCount)
  ) {
    // Log reconciliation needed without aborting the participant's submission transaction
    console.warn('[ResearchSubmission] Summary reconciliation required; skipping summary update');
  } else {
    tx.set(summaryDocRef, { ... }, { merge: true });
  }
  ```

---

### BUG-C10-04: Audio Engine Destination Graph Node Leak on Every Audio Cue

- **File Link:** [shared/lib/settingsStore.ts#L408-L467](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L408-L467)
- **Defect Description:**
  In `shared/lib/settingsStore.ts`, `playAudioCue()` synthesizes audio cues using Web Audio API nodes:
  ```ts
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
  ```
  Calling `osc.stop()` only terminates waveform generation from the oscillator. The `GainNode` remains permanently connected to `ctx.destination`.
  Because `AudioContext.destination` maintains strong references to active input nodes in the native Web Audio graph, the `GainNode` cannot be garbage collected.
  In an active session with dozens or hundreds of trials and button clicks, hundreds of orphaned `GainNode` instances accumulate in the audio graph. This causes memory retention and audio thread rendering degradation.
- **Frequency:** 9/10. Fires on every single click, stimulus presentation, and feedback cue.
- **Impact:** 6/10. Degrades audio engine performance and accumulates un-garbage-collected native Web Audio nodes.
- **Surgical Root-Cause Fix:**
  Attach an `onended` handler to the oscillator to disconnect both the oscillator and the gain node from the destination graph:
  ```ts
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
  ```

---

### BUG-C10-05: Cross-Tab Settings Reset Resurrecting Loop / Sync Deadlock

- **File Link:** [shared/lib/settingsStore.ts#L139-L146](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L139-L146) & [shared/lib/settingsStore.ts#L249-L256](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/shared/lib/settingsStore.ts#L249-L256)
- **Defect Description:**
  In `shared/lib/settingsStore.ts`:
  ```ts
  // Dual-storage self-healing: re-synchronize if one store was cleared or out-of-sync
  if (hasLocalStorage && !hasCookie) {
    writeSettingsCookie(sanitized);
  } else if (!hasLocalStorage && hasCookie) {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // Ignore localStorage write errors in private mode
    }
  }
  ```
  When Tab 1 calls `resetSettingsToDefaults()`, it executes:
  `localStorage.removeItem(SETTINGS_STORAGE_KEY); clearSettingsCookie();`
  Browser dispatches a `storage` event to Tab 2 (`e.key === SETTINGS_STORAGE_KEY`, `e.newValue === null`).
  Tab 2's `storage` event handler invokes `loadSettings()`.
  Inside `loadSettings()` in Tab 2, `hasLocalStorage` is `false`, but Tab 2's in-memory `document.cookie` still contains the old settings cookie (due to cross-process cookie delay or caching).
  Tab 2's self-healing branch executes:
  `localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));`
  Tab 2 immediately re-writes the deleted settings back into `localStorage`.
  This triggers another `storage` event in Tab 1, which reloads the resurrected settings from localStorage and re-writes the cookie.
  The reset is completely defeated whenever multiple tabs are open.
- **Frequency:** 7/10. Happens reliably on multi-tab sessions when clearing cache or resetting preferences.
- **Impact:** 7/10. Breaks data reset/privacy guarantees and locks the user into stale preferences.
- **Surgical Root-Cause Fix:**
  In the `storage` event listener, if `e.newValue === null`, recognize that the settings were deliberately cleared or removed, and do not resurrect from cookie:
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
- **Defect Description:**
  In `FirestoreResearchDatasetRepository.queryRawDataset`:
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
  However, in `firestore.indexes.json`, the only three composite indexes defined for `publicDataset` are:
  ```json
  { "fieldPath": "assessmentType", "order": "ASCENDING" },
  { "fieldPath": "completedAtTimestamp", "order": "DESCENDING" }
  ...
  { "fieldPath": "ageGroup", "order": "ASCENDING" },
  { "fieldPath": "completedAtTimestamp", "order": "DESCENDING" }
  ...
  { "fieldPath": "assessmentType", "order": "ASCENDING" },
  { "fieldPath": "ageGroup", "order": "ASCENDING" },
  { "fieldPath": "completedAtTimestamp", "order": "DESCENDING" }
  ```
  Crucially, `completedAtTimestamp` is **never written** to `publicDataset` documents (in `server/services/researchService.ts:451`, only `completedAtMonth` is saved), and `queryRawDataset` orders by `__name__`, not `completedAtTimestamp`.
  Meanwhile, there are **no composite indexes** for `(assessmentType, ageGroup, __name__)` or `(completedAtMonth, __name__)`.
  In production Cloud Firestore, when an `in` filter (such as `color-recognition` with 8 aliases) is paired with `ageGroup`, Firestore throws:
  `Error: 9 FAILED_PRECONDITION: The query requires an index.`
- **Frequency:** 7/10. Fails for users filtering the Dataset explorer by assessment type and age cohort.
- **Impact:** 7/10. Endpoint crashes with HTTP 500 in production Firestore.
- **Surgical Root-Cause Fix:**
  Add the matching composite indexes for `publicDataset` in `firestore.indexes.json`, and clean up the dead indexes referencing the non-existent `completedAtTimestamp` field.

---

### BUG-C10-07: Missing Lock Expiration Check in getDatasetSummary() Causes Permanent API Deadlock

- **File Link:** [firestoreResearchDatasetRepository.ts#L93-L96](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreResearchDatasetRepository.ts#L93-L96)
- **Defect Description:**
  In `FirestoreResearchSubmissionRepository.executeSubmissionTransaction`:
  ```ts
  const isLockExpired = typeof summary.migrationStartedAt === 'number' && (Date.now() - summary.migrationStartedAt) > 10 * 60 * 1000;
  if (summary.migrationInProgress === true && !isLockExpired) {
    throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
  }
  ```
  The submission repository safely respects a 10-minute timeout on migration locks.
  However, in `FirestoreResearchDatasetRepository.getDatasetSummary()`:
  ```ts
  const summary = summarySnap.data() as Record<string, unknown>;
  if (summary.migrationInProgress === true) {
    throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
  }
  ```
  `getDatasetSummary()` omits the `isLockExpired` check.
  If a background reconciliation process is terminated, OOM-killed, or fails midway, `migrationInProgress` remains `true` in Firestore.
  While submissions automatically recover after 10 minutes, `getDatasetSummary()` remains wedged indefinitely, throwing `DATASET_SUMMARY_MIGRATION_IN_PROGRESS` and returning HTTP 503 on `/api/research/dataset/summary` until manual database intervention occurs.
- **Frequency:** 6/10. Triggers whenever any migration process crashes or times out.
- **Impact:** 7/10. Permanent denial of service for the public dataset summary API.
- **Surgical Root-Cause Fix:**
  Add the 10-minute lock expiration check to `FirestoreResearchDatasetRepository.getDatasetSummary()`:
  ```ts
  const isLockExpired = typeof summary.migrationStartedAt === 'number' && (Date.now() - summary.migrationStartedAt) > 10 * 60 * 1000;
  if (summary.migrationInProgress === true && !isLockExpired) {
    throw new Error('DATASET_SUMMARY_MIGRATION_IN_PROGRESS');
  }
  ```

---

### BUG-C10-08: Duplicate 215-Line Mobile useAuthoritativeStats Module Causes Split-Brain Caches

- **File Link:** [mobile/src/lib/useAuthoritativeStats.ts#L1-L215](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/lib/useAuthoritativeStats.ts#L1-L215) vs [src/lib/useAuthoritativeStats.ts#L1-L215](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L1-L215)
- **Defect Description:**
  `mobile/src/lib/useAuthoritativeStats.ts` is an exact 215-line copy-paste clone of `src/lib/useAuthoritativeStats.ts` (even containing the comment `"publicDataset is the single counting source for the desktop hero"`).
  Unlike `settingsStore.ts` and `errorReporter.ts` (which re-export shared code), this duplication instantiates separate module singletons:
  - `statsCache`
  - `statsCacheGeneration`
  - `inFlightStatsRequest`
  When desktop and mobile code are co-bundled or shared in PWA transitions, calling `clearAuthoritativeStatsCache()` in one module leaves the other module's in-memory cache populated, creating split-brain state, redundant Firestore `getCountFromServer` network calls, and unnecessary bundle weight.
- **Frequency:** 10/10. Present in every build and execution of the mobile application.
- **Impact:** 5/10. Cache desynchronization and code bloat.
- **Surgical Root-Cause Fix:**
  Re-export from the desktop library in `mobile/src/lib/useAuthoritativeStats.ts`, identical to `settingsStore.ts` and `errorReporter.ts`:
  ```ts
  export * from '../../../src/lib/useAuthoritativeStats';
  ```

---

### BUG-C10-09: 1-Year Root HTTP Cookie Set for 60-Second Client Stats Cache

- **File Link:** [src/lib/useAuthoritativeStats.ts#L88-L92](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useAuthoritativeStats.ts#L88-L92)
- **Defect Description:**
  In `useAuthoritativeStats.ts`:
  ```ts
  const serialized = encodeURIComponent(JSON.stringify(stats));
  document.cookie = `${STATS_STORAGE_KEY}=${serialized}; path=/; max-age=31536000; SameSite=Lax`;
  ```
  The stats cache TTL is 60 seconds (`STATS_TTL_MS = 60_000`).
  Yet `persistStats()` sets a cookie with `max-age=31536000` (1 year) with `path=/`.
  Because it is scoped to `path=/`, the browser attaches this cookie to **every single HTTP request** sent to the server (API calls, telemetry, static assets).
  The server never reads or uses this cookie. It represents completely unnecessary HTTP header bloat inflating every network transmission.
- **Frequency:** 10/10. Appended to every outgoing HTTP request from the browser.
- **Impact:** 5/10. Persistent cookie header bloat and bandwidth overhead.
- **Surgical Root-Cause Fix:**
  Remove the `document.cookie` persistence for authoritative stats. `localStorage` is completely sufficient for client-side persistence across page reloads without leaking into HTTP request headers:
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
- **Defect Description:**
  In `useAuthoritativeStats.ts`:
  When `clearAuthoritativeStatsCache()` is called while a read is in flight:
  `statsCacheGeneration` is incremented, and `statsCache` and `inFlightStatsRequest` are set to `null`.
  While line 174 checks `if (statsCacheGeneration === requestGeneration)` to avoid updating the module-level `statsCache`, lines 194-200 in the component hook's effect do not check the generation:
  ```ts
  inFlightStatsRequest.promise
    .then((count) => {
      if (active) {
        setResultsCount(count);
        setIsLoadingResults(false);
      }
    })
  ```
  If the hook remains mounted (or user opens Settings, clears data, and closes Settings), `inFlightStatsRequest.promise` resolves and executes `setResultsCount(count)` with the pre-clear query result.
  The component displays the obsolete pre-clear count, violating the contract that cleared cache states must not be repopulated.
- **Frequency:** 6/10. Occurs whenever local data is cleared while a stats request is in flight.
- **Impact:** 6/10. Displays stale pre-reset data in the active hero UI.
- **Surgical Root-Cause Fix:**
  Capture `requestGeneration` and check whether it matches `statsCacheGeneration` before setting component state:
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
- **Defect Description:**
  In `src/lib/errorReporter.ts`:
  `reportError` constructs `formattedLog` containing `context.metadata`, `component`, `action`, and `timestamp`.
  However, in the switch statement:
  ```ts
  switch (severity) {
    case 'EXPECTED_OPTIONAL_FAILURE':
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[PULSE Debug] Optional feature unavailable (${formattedLog.component}:${formattedLog.action}):`, message);
      }
      break;
    case 'RECOVERABLE_FAILURE':
      console.warn(`[PULSE Warning] Recoverable error (${formattedLog.component}:${formattedLog.action}):`, message);
      break;
    case 'USER_ACTION_REQUIRED':
      console.info(`[PULSE Info] User action required (${formattedLog.component}:${formattedLog.action}):`, message);
      break;
    case 'CRITICAL_FAILURE':
      console.error(`[PULSE Critical] System failure (${formattedLog.component}:${formattedLog.action}):`, message, formattedLog);
      break;
  }
  ```
  For `EXPECTED_OPTIONAL_FAILURE`, `RECOVERABLE_FAILURE`, and `USER_ACTION_REQUIRED`, `formattedLog` (and all passed `context.metadata`) is completely omitted from the console calls. Any diagnostic context passed by callers in `mobile/src/lib/firestore.ts` or `src/lib/firestore.ts` is silently discarded.
  Furthermore, for `CRITICAL_FAILURE`, `formattedLog` is logged raw without any sanitization or redaction of auth tokens, participant IDs, or secret keys that may be present in `metadata`.
- **Frequency:** 8/10. Affects all non-critical and critical error reporting events across the application.
- **Impact:** 5/10. Loss of critical debugging telemetry and potential token/PII leakage in console logs.
- **Surgical Root-Cause Fix:**
  Include sanitized `formattedLog` or metadata in non-critical console calls, and sanitize sensitive token/credential keys before logging:
  ```ts
  function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!metadata) return undefined;
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(metadata)) {
      if (/token|auth|secret|password|key/i.test(k)) {
        sanitized[k] = '[REDACTED]';
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }
  ```
