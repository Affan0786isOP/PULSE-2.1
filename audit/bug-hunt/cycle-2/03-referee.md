# Cycle 2: Bug Referee Report

**Date:** 2026-11-10  
**Agent Role:** Bug Referee (Final Arbiter)  
**Subagent ID:** `1f66fe41-6cbe-4f9e-974d-f452c10a5abb`  
**Evaluation Scope:** Authoritative verification and risk scoring of Cycle 2 findings BUG-1 through BUG-7.

---

### Verified Bug Judgments

#### BUG-1
- **Hunter's claim:** Telegram assessment completion notifications for Block Memory and Number Memory protocol completions always display "N/A" for span and level because `researchRoutes.ts` queries metric property names that do not match the calculator's return contract.
- **Skeptic's response:** ACCEPT. The claim is verified. `server/engines/memoryCalculator.ts` returns derived metrics keyed as `longestSeq` and `highestLevel`, whereas `server/routes/researchRoutes.ts` queries `dm.maxSpan` and `dm.highestLevelAchieved`. Frequency (10) × Impact (5) = 50.
- **Your analysis:** Verified by source inspection. In `server/engines/memoryCalculator.ts` (lines 188-195 and 275-282), `deriveBlockMemoryMetrics` and `deriveNumberMemoryMetrics` return `{ highestLevel, longestSeq, totalCorrect, totalAttempts, overallAccuracy, totalTimeMs }`. In `server/routes/researchRoutes.ts` (lines 162-163), `metricsPayload` queries `dm.maxSpan` and `dm.highestLevelAchieved`. Neither key exists on `dm`, so both resolve to `null`. In `server/services/telegramNotifierService.ts` (lines 203-213), both values format as `'N/A'`. The Hunter and Skeptic are both correct.
- **Frequency (1-10):** 10
- **Impact (1-10):** 5
- **Risk Score:** 50
- **VERDICT:** ACTIONABLE BUG (Score ≥ 5)
- **Confidence:** High
- **True severity:** Medium
- **Suggested fix:** In `server/routes/researchRoutes.ts` lines 162-163, fall back to the calculator's return keys: `maxSpan: typeof dm.maxSpan === 'number' ? dm.maxSpan : (typeof dm.longestSeq === 'number' ? dm.longestSeq : null)` and `highestLevelAchieved: typeof dm.highestLevelAchieved === 'number' ? dm.highestLevelAchieved : (typeof dm.highestLevel === 'number' ? dm.highestLevel : null)`.

---

#### BUG-2
- **Hunter's claim:** Direction assessment Telegram notifications display "• Conflict Cost: N/A" on 100% of completions because `researchRoutes.ts` expects `dm.conflictCost` which is never computed or returned by `flankerCalculator.ts`.
- **Skeptic's response:** ACCEPT. `flankerCalculator.ts` implements a 4-direction choice RT protocol (UP/DOWN/LEFT/RIGHT) and does not compute or return `conflictCost`. Consequently, `dm.conflictCost` is undefined in `researchRoutes.ts`, `conflictCostMs` is set to `null`, and `telegramNotifierService.ts` formats it as `• Conflict Cost: N/A` on 100% of direction assessment notifications. Frequency (10) × Impact (3) = 30.
- **Your analysis:** Verified by source inspection. In `server/engines/flankerCalculator.ts`, `deriveDirectionMetrics` runs a 4-choice reaction time test on directional arrows; it contains no flanker conflict conditions (congruent vs. incongruent) and never derives `conflictCost`. In `server/routes/researchRoutes.ts` line 160, `conflictCostMs` evaluates to `null`. In `server/services/telegramNotifierService.ts` lines 186-193, direction notifications explicitly display `• Conflict Cost: ${conflict}` which evaluates to `'N/A'` on 100% of direction assessment notifications. Hunter and Skeptic are correct.
- **Frequency (1-10):** 10
- **Impact (1-10):** 3
- **Risk Score:** 30
- **VERDICT:** ACTIONABLE BUG (Score ≥ 5)
- **Confidence:** High
- **True severity:** Low
- **Suggested fix:** In `server/services/telegramNotifierService.ts` lines 186-193, remove the `Conflict Cost` line from the direction assessment notification template, or display applicable metrics such as Median RT or False Starts instead.

---

#### BUG-3
- **Hunter's claim:** The centralized Express error handler is registered asynchronously after awaiting static route registration during un-awaited server boot, causing serverless cold starts or route errors to leak raw stack traces to clients.
- **Skeptic's response:** DISPROVE. In production / Vercel (`process.env.NODE_ENV === 'production'` or `process.env.VERCEL`), `registerStaticRoutes(app)` executes 100% synchronously (lines 69-234 contain no `await` expressions). Although the function is declared `async`, awaiting a resolved promise enqueues continuation on the microtask queue. Under Node.js / V8 module import semantics (`api/index.ts` importing `server.js`), all microtasks are drained synchronously upon module evaluation before any incoming HTTP request or serverless event can be processed. Furthermore, in standalone Node.js environments, `app.listen(PORT)` at line 83 is executed strictly after `app.use(errorHandler)` at lines 76-80. The 4-arity error handler is fully registered and active before any request arrives, returning sanitized 500 JSON and preventing stack trace leaks. Frequency (0) × Impact (0) = 0 (< 5).
- **Your analysis:** The Skeptic is correct. Inspection of `server/routes/staticRoutes.ts` confirms that under production / Vercel, the function executes entirely synchronously with no asynchronous work. In V8/Node.js module execution, the microtask queue is completely drained at the completion of module evaluation (`api/index.ts` importing `server.js`) before the Vercel serverless request handler receives incoming HTTP traffic. For standalone Node.js, `app.listen(PORT)` is positioned on line 83 — strictly after line 76 where `app.use(errorHandler)` is mounted. In both runtimes, the global error handler is always active before any incoming request can hit an endpoint. The Hunter's claim is an invalid speculative theoretical race condition.
- **Frequency (1-10):** 0
- **Impact (1-10):** 0
- **Risk Score:** 0
- **VERDICT:** NOT A BUG
- **Confidence:** High
- **True severity:** N/A

---

#### BUG-4
- **Hunter's claim:** `trialStore.ts` attempts direct client Firestore batch writes to `/trialObservations`, which are unconditionally blocked with permission-denied by Firestore security rules, repeatedly re-queueing failed items and retrying on window exit.
- **Skeptic's response:** ACCEPT. `trialStore.ts` invokes `queueTrialForCloudSync` on every recorded trial, which triggers `flushPendingTrialObservations` to batch-write to `doc(db, 'trialObservations', obs.id)`. However, `firestore.rules` lines 34-37 explicitly enforces `allow write: if false; // Server authoritative` for `/trialObservations/{docId}`. All client batch writes fail with `permission-denied`. In the `catch` block (lines 250-252), failed items are prepended back to `pendingSyncQueue`, causing repeated retries every 600ms, on subsequent trials, and on `beforeunload`/`pagehide`, accumulating memory and emitting continuous console errors. Frequency (8) × Impact (5) = 40.
- **Your analysis:** Verified by source inspection. `firestore.rules` (lines 34-37) specifies `match /trialObservations/{docId} { allow read: if request.auth != null && resource.data.participantId == request.auth.uid; allow write: if false; }`. In `src/lib/trialStore.ts` (lines 224-255), `flushPendingTrialObservations` performs direct client-side batch writes to `trialObservations`. Every write fails with Firestore permission-denied. In the `catch` block (line 251), `pendingSyncQueue = [...itemsToSync, ...pendingSyncQueue]` prepends the rejected items back into the sync queue. This triggers endless retry attempts on debounced intervals, on each subsequent trial, and during `beforeunload` / `pagehide`, leaking memory and spamming errors. Research trials are intended to be submitted authoritatively via `/api/research/submit`. Both Hunter and Skeptic are correct.
- **Frequency (1-10):** 8
- **Impact (1-10):** 5
- **Risk Score:** 40
- **VERDICT:** ACTIONABLE BUG (Score ≥ 5)
- **Confidence:** High
- **True severity:** Medium
- **Suggested fix:** Remove or disable client-side direct Firestore writes to `/trialObservations` in `src/lib/trialStore.ts` (as research observations are handled authoritatively via the backend API), or discard failed items instead of perpetually prepending them back into `pendingSyncQueue`.

---

#### BUG-5
- **Hunter's claim:** `getAllEntriesForAdminPage` reads the entire `leaderboardResults` Firestore collection into memory on every admin page view, which is repeatedly invoked inside a `while` loop when filtering in `adminService.ts`.
- **Skeptic's response:** ACCEPT. `getAllEntriesForAdminPage` invokes `this.getAllLeaderboardResultDocs(db)` (line 139), which pages through the entire `leaderboardResults` collection via a `while (true)` loop with pageSize 250, reading every document into memory before sorting and slicing. In `server/services/adminService.ts` (lines 105-129), a `while (matchingEntries.length < safeLimit)` loop repeatedly calls `getAllEntriesForAdminPage` whenever filters (`targetAssessment` or `prefix`) are applied. Each iteration reads the entire Firestore collection from scratch, creating an O(N * (N/pageSize)) quadratic Firestore read storm that causes severe latency, memory pressure, and excessive Firestore billing costs. Frequency (5) × Impact (7) = 35.
- **Your analysis:** Verified by source inspection. In `server/repositories/firestore/firestoreLeaderboardRepository.ts` (lines 30-49 and 138-140), `getAllEntriesForAdminPage` calls `getAllLeaderboardResultDocs(db)` which loops through the entire `leaderboardResults` Firestore collection via a `while (true)` pagination loop reading every document. In `server/services/adminService.ts` (lines 105-129), a `while (matchingEntries.length < safeLimit)` loop repeatedly invokes `getAllEntriesForAdminPage` whenever a filter (`targetAssessment` or `prefix`) is present. Each step of the loop performs a full collection re-scan, resulting in an O(N * pages) Firestore read storm that causes high latency, memory bloat, and costly Firestore document reads. Both Hunter and Skeptic are correct.
- **Frequency (1-10):** 5
- **Impact (1-10):** 7
- **Risk Score:** 35
- **VERDICT:** ACTIONABLE BUG (Score ≥ 5)
- **Confidence:** High
- **True severity:** Medium
- **Suggested fix:** Cache the full document snapshot or perform in-memory filtering over a single fetched dataset in `adminService.ts`, rather than re-fetching the entire Firestore collection on each iteration of the pagination loop.

---

#### BUG-6
- **Hunter's claim:** The shared `FirestoreRateLimitStore` attached to the global API rate limiter updates a single document per client IP via Firestore transactions, which aborts under concurrent requests from shared IPs due to Firestore's 1 write/second per document limit.
- **Skeptic's response:** DISPROVE. The claim that concurrent requests abort due to Firestore's 1 write/sec document limit is false. `FirestoreRateLimitStore.increment` (lines 46-73) wraps the Firestore transaction inside a `try ... catch (err)` block. If Firestore transaction contention occurs, the error is caught, logged as a warning (`console.warn('[Rate limit store] Firestore counter error, falling back to memory counter...')`), and transparently falls back to an in-memory counter (`this.memoryFallback.get(key)`). The request is never aborted or rejected with HTTP 500; it completes normally with `{ totalHits, resetTime }`. Furthermore, authenticated endpoints partition keys by `uid:${uid}:ip:${ip}` (lines 33-38 of `rateLimits.ts`), preventing different users on shared IPs (e.g. university NATs) from colliding on the same document. Static assets and leaderboard reads are also skipped. This is a speculative non-issue already handled by design with fallback mechanisms. Realistic Frequency (1) × Impact (1) = 1 (< 5).
- **Your analysis:** The Skeptic is correct. Inspection of `server/config/firestoreRateLimitStore.ts` (lines 46-73) shows that the transaction is wrapped in a `try ... catch` block. If a transaction fails or times out due to document contention, the catch block logs a warning and transparently increments and reads from `this.memoryFallback`. It returns `{ totalHits, resetTime }` to Express-rate-limit. The incoming request is never aborted or errored. In addition, `createLimiterKey` in `server/config/rateLimits.ts` partitions authenticated users by `uid:${uid}:ip:${ip}`. Contention is gracefully mitigated by design.
- **Frequency (1-10):** 1
- **Impact (1-10):** 1
- **Risk Score:** 1
- **VERDICT:** NOT A BUG
- **Confidence:** High
- **True severity:** N/A

---

#### BUG-7
- **Hunter's claim:** Mobile `ReactionTest.tsx` omits all high-precision timing telemetry fields (`stimulusScheduledAt`, `stimulusPresentedAt`, `responseDetectedAt`, `interStimulusIntervalMs`, `interTrialIntervalMs`, and ISO `timestamp`) that desktop `ReactionTest.tsx` populates, degrading research trial records submitted from mobile devices.
- **Skeptic's response:** ACCEPT. Comparing `mobile/src/components/ReactionTest.tsx` (lines 489-514) with desktop `src/components/ReactionTest.tsx` (lines 560-595) confirms that the mobile implementation completely omits high-precision timing telemetry fields: `stimulusScheduledAt`, `stimulusScheduledAtPerfMs`, `stimulusPresentedAt`, `stimulusPresentedAtPerfMs`, `responseDetectedAt`, `responseDetectedAtPerfMs`, `interStimulusIntervalMs`, `interTrialIntervalMs`, `previousTrialEndedAt`, and ISO `timestamp`. When submitted to `/api/research/submit`, `server/services/researchService.ts` (lines 308-327) inspects these specific fields; because they are missing from mobile trials, the persisted research records for mobile participants lack all sub-millisecond hardware paint timings and ISI/ITI metrics. Frequency (10) × Impact (4) = 40.
- **Your analysis:** Verified by source inspection. Comparing `mobile/src/components/ReactionTest.tsx` (lines 322-347, 489-514) with desktop `src/components/ReactionTest.tsx` (lines 560-599) confirms that mobile omits `stimulusScheduledAt`, `stimulusScheduledAtPerfMs`, `stimulusPresentedAt`, `stimulusPresentedAtPerfMs`, `responseDetectedAt`, `responseDetectedAtPerfMs`, `interStimulusIntervalMs`, `interTrialIntervalMs`, `previousTrialEndedAt`, `validity`, `qualityFlag`, and ISO `timestamp`. In `server/services/researchService.ts` (lines 308-330), these exact fields are ingested into the database payload for scientific research analysis. Because the mobile client omits them, 100% of mobile visual reaction trials lack high-precision hardware timestamps and ISI/ITI metrics in the research database. Both Hunter and Skeptic are correct.
- **Frequency (1-10):** 10
- **Impact (1-10):** 4
- **Risk Score:** 40
- **VERDICT:** ACTIONABLE BUG (Score ≥ 5)
- **Confidence:** High
- **True severity:** Medium
- **Suggested fix:** In `mobile/src/components/ReactionTest.tsx`, align observation recording with desktop `src/components/ReactionTest.tsx` by capturing and pushing `stimulusScheduledAt`, `stimulusScheduledAtPerfMs`, `stimulusPresentedAt`, `stimulusPresentedAtPerfMs`, `responseDetectedAt`, `responseDetectedAtPerfMs`, `interStimulusIntervalMs`, `interTrialIntervalMs`, `previousTrialEndedAt`, `validity`, `qualityFlag`, and ISO `timestamp`.

---

## VERIFIED BUG REPORT

### Stats:
- Total reported by Hunter: 7
- Dismissed as false positives (Not a bug): 2 (BUG-3, BUG-6)
- Dismissed below threshold (Frequency × Impact < 5 or rare/future cases): 0
- Confirmed actionable bugs (Risk Score ≥ 5): 5 (BUG-1, BUG-2, BUG-4, BUG-5, BUG-7)
- Critical: 0 | Medium: 4 | Low: 1

### Confirmed Actionable Bugs (ordered by Risk Score descending):

| # | Severity | Frequency (1-10) | Impact (1-10) | Risk Score | File | Line(s) | Description | Suggested Fix |
|---|----------|------------------|---------------|------------|------|---------|-------------|---------------|
| **BUG-1** | Medium | 10 | 5 | 50 | `server/routes/researchRoutes.ts` | 162-163 | Telegram notifications for Block and Number Memory display "N/A" for span and level because `researchRoutes.ts` queries `dm.maxSpan` and `dm.highestLevelAchieved` instead of `dm.longestSeq` and `dm.highestLevel`. | Map `maxSpan` to `dm.maxSpan ?? dm.longestSeq` and `highestLevelAchieved` to `dm.highestLevelAchieved ?? dm.highestLevel`. |
| **BUG-4** | Medium | 8 | 5 | 40 | `src/lib/trialStore.ts` | 226-255, 276-283 | Client attempts direct batch writes to `/trialObservations`, which are unconditionally blocked (`allow write: if false`), causing endless retry loops and memory growth. | Remove client direct Firestore batch writes to `/trialObservations` or purge queue on permission rejection. |
| **BUG-7** | Medium | 10 | 4 | 40 | `mobile/src/components/ReactionTest.tsx` | 322-347, 489-514 | Mobile visual reaction test omits high-precision timing telemetry and validity metadata (`stimulusScheduledAt`, `interStimulusIntervalMs`, etc.) required by research ingestion. | Populate mobile trial observations with high-precision timing and interval metrics matching desktop `ReactionTest.tsx`. |
| **BUG-5** | Medium | 5 | 7 | 35 | `server/repositories/firestore/firestoreLeaderboardRepository.ts` | 30-49, 138-140 | `getAllEntriesForAdminPage` reads entire Firestore collection on every call; `adminService.ts` calls it in a loop when filtering, causing O(N * pages) quadratic read storm. | Cache collection snapshot or filter over a single fetched set in `adminService.ts` rather than re-scanning entire collection each iteration. |
| **BUG-2** | Low | 10 | 3 | 30 | `server/routes/researchRoutes.ts` | 160 | Direction test Telegram notifications display "• Conflict Cost: N/A" on 100% of completions because 4-choice RT protocol does not derive conflict cost. | Remove the Conflict Cost line from the Direction notification template in `telegramNotifierService.ts`. |

### Dismissed as False Positives:
- **BUG-3 (`server/index.ts`):** Centralized error handler registration timing. Disproved: static routes run synchronously in production, microtasks drain prior to request execution, and standalone server mounts listener strictly after the error handler.
- **BUG-6 (`server/config/firestoreRateLimitStore.ts`):** Firestore transaction write limit on rate limiter. Disproved: contention is caught by `try-catch` with automatic seamless fallback to in-memory counter with zero request drops or 500 errors.

### Low-Confidence Items (Flagged for Manual Review):
- None. High confidence across all 7 items based on direct codebase inspection.
