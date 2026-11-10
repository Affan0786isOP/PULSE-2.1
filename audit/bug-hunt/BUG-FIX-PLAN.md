# PULSE v2.1 — Complete Bug Remediation & Wave-Gate Plan

**Repository:** Affan0786isOP/PULSE-2.1  
**Planning branch:** audit/bug-hunt-reports  
**Plan revision:** 2 — complete 57-finding wave plan  
**Planning baseline:** 843f657e13b3fb535cd58d5f752648827e51e102  
**Current planning-branch head checked:** 07afaf86f42e035a8c6fd38e4901048b4c073451  
**Scope:** All 57 confirmed actionable findings from Functional Bug Hunt Cycles 1–11 and Security Cycle 1.  
**Mode:** One wave at a time. Implement → audit that wave only → remediate → re-audit → merge → next wave.

---

## 1. Non-negotiable workflow

The remediation is divided into seven independently closable waves. Do not begin implementation of a later wave while the current wave is awaiting audit approval or merge.

For each wave, follow this exact loop:

1. **Freeze scope.** Confirm the wave's finding IDs, source reports, dependency notes, baseline SHA, and acceptance criteria. No unrelated cleanup enters the wave.
2. **Implement only this wave.** Fix its assigned findings and add regression tests. Keep changes reviewable; do not bundle future-wave fixes.
3. **Run implementation verification.** Run targeted tests, relevant suites, type checks, builds, and any required Firestore emulator or browser checks. Record exact commands and results.
4. **Independent wave audit.** Use a separate Hunter → Skeptic → Referee review of:
   - every original finding assigned to this wave;
   - the implementation diff and directly affected contracts/callers;
   - regression tests and whether they actually fail before the fix;
   - regressions introduced by the wave;
   - security, privacy, scientific-unit, and persistence invariants touched by the diff.

   The auditor must not expand into a general repository bug hunt. Findings outside the wave are documented and queued, not silently pulled into the active wave. An out-of-scope issue may block the wave only when it creates a direct regression, violates a security boundary, or makes the wave unsafe to merge.
5. **Remediate audit findings.** Any confirmed in-scope defect or regression is fixed on the same wave branch. Update tests and the audit response.
6. **Repeat the wave audit.** Re-audit the changed wave diff and all previously failed criteria. Repeat until the Referee issues APPROVE TO MERGE.
7. **Merge gate.** Merge only after every original finding in the wave is closed, every audit blocker is resolved, required tests pass, and the final audit report records the exact reviewed head SHA.
8. **Freeze the result.** Record the merge commit SHA and use it as the base for the next wave.

### Required audit verdicts

- **APPROVE TO MERGE:** every in-scope finding is fixed and verified; no unresolved blocking issue or regression remains.
- **REVISE:** one or more in-scope defects, test gaps, or regressions remain. Return to implementation; do not merge.
- **BLOCKED:** a required environment, emulator, credential/deployment fact, or reproducible test is unavailable. Do not present the wave as approved.

A green build alone is not a merge approval. A source edit alone is not a fix. A finding is closed only when the original failure mode is covered by a passing regression test and the independent audit accepts the result.

---

## 2. Branch, PR, and merge discipline

- Keep audit/bug-hunt-reports as the audit-plan/report branch; do not use it as a dumping ground for application fixes.
- Create one implementation branch per wave from the agreed integration branch and its recorded starting SHA (for example, fix/wave-01-submission-security).
- Open one PR per wave. The PR must contain only that wave's implementation, tests, and wave-specific evidence.
- The PR description must list Master finding IDs, source cycle IDs, tests, known risks, and the final audit report.
- Do not merge a wave with an unresolved REVISE or BLOCKED result.
- After merge, record the merge SHA and use that exact state as the next wave's baseline. Do not implement Wave 2 on top of an unmerged Wave 1 branch.
- If a finding is already changed in the current repository state, do not assume it is fixed. It must still pass the same wave's reproduction, regression, build, and independent audit gates.

**Integration-branch selection is an explicit pre-implementation check.** Before Wave 1 starts, compare main, audit/bug-hunt-reports, and the intended deployment baseline. Select the correct code integration target; preserve this report branch separately.

---

## 3. Wave map

| Wave | Scope | Findings | Main merge risk |
|---|---|---:|---|
| **1** | Critical submission, admin-authentication, and privacy integrity | 10 | Rejected/lost submissions, admin boundary, privacy metadata |
| **2** | Assessment science, scoring, provenance, and trial contracts | 10 | Incorrect research metrics or corrupted trial evidence |
| **3** | Firestore persistence, transaction safety, and read amplification | 10 | Data loss, submission outages, deadlocks, runaway reads |
| **4** | Backend API contracts, session handling, and rate-limit boundaries | 8 | Incorrect authorization, request failures, unstable API behavior |
| **5** | Mobile/PWA lifecycle, service worker, and device routing | 6 | Broken offline/app lifecycle and mobile assessment state |
| **6** | Telegram notifications, dispatch reliability, and telemetry memory | 7 | Wrong alerts, stalled delivery, unbounded process memory |
| **7** | Client settings, stats-cache coherence, and audio resource lifecycle | 6 | Persistent preference corruption, stale state, resource leaks |
| **Total** | **All confirmed actionable findings** | **57** | |

The wave split is based on shared behavior and verification needs, not original audit-cycle order. Each Master finding appears in exactly one wave.

---

# 4. Wave 1 — Critical submission, authentication, and privacy integrity

**Scope:** 10 findings. This is the first implementation wave.  
**Source:** Cycles 1, 3, 9; Security Cycle 1.  
**Merge condition:** all submission, authentication, privacy-migration, and mobile-bundle checks pass and the Wave 1 Referee approves the exact PR head.

| Master ID | Source finding | Severity / risk | Target | Required correction and closure evidence | Status |
|---|---|---:|---|---|---|
| **#1** | C1 BUG-2 — Number Memory epoch timestamps | Critical / 100 | src/components/NumberMemoryTest.tsx | Use epoch wall-clock values (Date.now) for persisted session timestamps; keep performance.now for durations/latency. Test a normal trial and multi-level run through the server session-window validator. | Not started |
| **#2** | C1 BUG-3 — Block Memory epoch timestamps | Critical / 100 | src/components/BlockMemoryTest.tsx | Apply the same clock-domain separation as #1. Test first and subsequent levels; verify valid payloads pass authoritative session-window validation while duration math remains monotonic. | Not started |
| **#4** | Security SEC-1 — Hardcoded admin passcode and signing-secret fallback | Critical / 80 | server/index.ts; server/middleware/adminAuth.ts; server/routes/adminRoutes.ts | Remove 180611 and all built-in signing-secret fallbacks. Require explicit strong server-side ADMIN_PASSCODE and PULSE_ADMIN_SESSION_SECRET in every environment; fail closed when absent/weak. Test missing env, unset NODE_ENV, rejection of the legacy passcode/secret, and token verification. Separately verify actual hosting/preview environment and rotate credentials/invalidate sessions if exposure is found. | Not started |
| **#6** | C9 BUG-C9-02 — Mobile About imports desktop About and contaminates mobile bundle | Critical / 60 | mobile/src/App.tsx; mobile About module and mobile bundle tests | Ensure the mobile route imports only the mobile About implementation. Verify generated mobile bundle/chunks do not contain the desktop About dependency chain or desktop-only tests. A mobile About implementation has already appeared in the current planning branch; treat it as unverified implementation, not a closed finding, until bundle separation and tests pass. | Code changed; wave audit pending |
| **#7** | C1 BUG-1 — Desktop Direction false-start records omit targetDirection | Critical / 60 | src/components/DirectionTest.tsx | Ensure every observation path, including pre-stimulus false starts and under-80ms responses, carries canonical targetDirection. Validate each payload category against the server Direction validator. | Not started |
| **#13** | C8 BUG-C8-01 — Stroop server hardcodes 15 trials while retry contract permits false starts | Critical / 54 | server/engines/stroopCalculator.ts; protocol trial-limit contract | Reconcile attempted observations, false-start retries, and the 15 completed scored trials. Preserve retry evidence and do not weaken validation by blindly accepting arbitrary trial counts. Regression-test zero, one, and repeated false starts through the authoritative calculator. | Not started |
| **#15** | C1 BUG-4 — Desktop ColorTest submits false-start retries in the scored-trial array | Critical / 50 | src/components/ColorTest.tsx | Separate attempt/false-start evidence from the 15 completed scored trials. Do not solve this by blindly slicing the first 15 events. Test multiple retries and prove all 15 valid scored responses plus false-start evidence reach the server correctly. Coordinate with #13. | Not started |
| **#20** | C3 BUG-1 — Mobile Direction under-80ms records omit targetDirection | Critical / 48 | mobile/src/components/DirectionTest.tsx | Add canonical targetDirection to the anticipatory observation and validate mobile false-start, pre-stimulus, timeout, and valid-response payloads against the same server contract as desktop. | Not started |
| **#50** | C3 BUG-2 — Firestore migration uses JavaScript delete with merge write | Medium / 21 | scripts/migrateLeaderboardPrivacyAndAudit.ts | Use FieldValue.delete for fields that must be removed (or a verified full replacement preserving all valid fields). Add emulator fixtures proving invalid private fields are absent after migration, valid fields remain, public fields are scrubbed, and reruns are idempotent. Production execution requires backup/restore readiness and a canary. | Not started |
| **#57** | C8 BUG-C8-08 — Negative raw latency bypasses gateway validation | Medium / 8 | server/engines/assessmentEngine.ts | Validate the effective latency (reactionTime ?? rawRt) for finite, non-negative bounds so alternate raw fields cannot bypass validation when the primary field is omitted. Test negative, NaN, infinite, missing, and valid values through the gateway. | Not started |

### Wave 1 specific safeguards

- Never replace monotonic latency measurements with Date.now. Only persisted wall-clock/session timestamps use epoch time.
- Do not discard false-start events to satisfy the Stroop exact-15 contract. Preserve the scientific attempt history while deriving exactly the expected completed scored trials.
- SEC-1 must fail closed in development, preview, staging, and production. Non-production is not permission to use a repository-known credential.
- The privacy migration must be tested against emulator fixtures before any production run.
- #6 is already changed in the current branch, but remains open until bundle-level verification and independent audit pass.

---

# 5. Wave 2 — Assessment science, scoring, provenance, and trial contracts

**Scope:** 10 findings.  
**Merge condition:** all assessment calculations and research fields have explicit units, correct denominator/validity semantics, deterministic provenance, and regression coverage.

| Master ID | Source finding | Severity / risk | Target | Required correction and closure evidence | Status |
|---|---|---:|---|---|---|
| **#26** | C7 BUG-C7-03 — HMAC canonicalization turns temporalDynamics into [object Object] | Medium / 42 | server/services/researchService.ts | Canonically serialize nested metric values before digesting. Test stable hashes for equivalent objects, changed hashes when nested values change, and verification compatibility for the intended record format. | Not started |
| **#28** | C8 BUG-C8-02 — Timed-out trials omitted from accuracy denominator | Medium / 40 | server/engines/flankerCalculator.ts; server/engines/stroopCalculator.ts | Count omissions/timeouts as non-correct attempts according to the protocol; do not let timeout-heavy sessions report inflated accuracy. Test mixed valid, incorrect, false-start, and timed-out trials. | Not started |
| **#29** | C8 BUG-C8-03 — Flanker summary drops rawLatencyMs / rawLatency | Medium / 40 | server/engines/flankerCalculator.ts | Include supported raw-latency fallback fields in normalized RT extraction. Test summary mean/median/valid RT values using each accepted input field and null behavior when none exists. | Not started |
| **#31** | C2 BUG-7 — Mobile ReactionTest omits high-precision timing metadata | Medium / 40 | mobile/src/components/ReactionTest.tsx; server/services/researchService.ts | Bring mobile observation semantics into parity with desktop for scheduled/presented/response timestamps, performance counterparts, ISI/ITI, prior-trial end, validity/quality, and ISO timestamp. Preserve correct clock domains, units, and nullability. Test mobile payload normalization and persistence. | Not started |
| **#32** | C7 BUG-C7-04 — Multi-attempt trial sequencing freezes attempt number at 2 | Medium / 36 | server/services/researchService.ts | Track attempt counts across repeated attempts per logical trial. Test three or more attempts on the same trial and interleaved trial numbers; verify stable deterministic sequence derivation. | Not started |
| **#44** | C8 BUG-C8-05 — Mobile ColorTest plays success feedback on false starts and omits timeout metadata | Medium / 30 | mobile/src/components/ColorTest.tsx | Suppress success audio/haptics for anticipatory responses and restore required timeout-observation metadata. Test valid, false-start, and timeout feedback/payload paths. | Not started |
| **#49** | C8 BUG-C8-06 — Stroop condition averages omit rawLatency | Medium / 24 | server/engines/stroopCalculator.ts | Include rawLatency in trial extraction and condition averaging without zero-diluting RT sums. Test condition means and interference-cost calculations with mixed supported latency fields. | Not started |
| **#51** | C8 BUG-C8-10 — Stroop derived metrics omit unified reporting fields | Medium / 21 | server/engines/stroopCalculator.ts | Return canonical derived-metric fields, including totalFalseStarts, totalCorrect, totalTrials, and totalIncorrect. Test calculator contract and downstream reporting. | Not started |
| **#54** | C9 BUG-C9-09 — Protocol observation validator omits colour-recognition alias | Medium / 16 | src/lib/protocolValidators.ts | Accept the documented British spelling alias without changing canonical protocol IDs. Test both supported spellings and rejection of unrelated values. | Not started |
| **#56** | C8 BUG-C8-04 — Stroop uses an inconsistent 80.01ms physiological floor | Medium / 10 | server/engines/stroopCalculator.ts | Harmonize all relevant threshold comparisons to the protocol's exact 80.0ms boundary. Test 79.99ms, 80.00ms, and 80.01ms to prevent boundary disagreement. | Not started |

### Wave 2 specific safeguards

- Do not change scientific definitions merely to make tests pass. Confirm intended protocol semantics before changing denominators, thresholds, or interference calculations.
- Keep wall-clock timestamps, monotonic timestamps, and elapsed durations distinct.
- Any provenance canonicalization change must include verification and compatibility considerations for already stored records.
- Do not modify unrelated assessment screens or introduce protocol redesign during this wave.

---

# 6. Wave 3 — Firestore persistence, transaction safety, and read amplification

**Scope:** 10 findings.  
**Merge condition:** Firestore behavior is covered by emulator-backed or equivalently isolated repository tests; no submission transaction depends on a fragile auxiliary counter; lock leases and read costs are bounded.

| Master ID | Source finding | Severity / risk | Target | Required correction and closure evidence | Status |
|---|---|---:|---|---|---|
| **#3** | C7 BUG-C7-01 — Read-only rank lookup triggers Firestore write transactions | Medium / 80 | server/services/leaderboardAppService.ts | Remove unconditional owner-backfill writes from rank reads; early-exit when ownership is already linked. Test read-only rank lookups issue no writes for already-linked owners and perform only necessary repairs. | Not started |
| **#8** | C7 BUG-C7-02 — Eight parallel alias collection scans return discarded results | Medium / 56 | server/services/leaderboardAppService.ts | Remove redundant alias fan-out and query the canonical assessment type used by the public leaderboard path. Test canonical filtering and bounded query count. | Not started |
| **#11** | C11 BUG-C11-02 — Dataset summary maintenance lock can remain held forever | Medium / 56 | server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts | Add and test an explicit lock lease/expiration policy for interrupted maintenance operations. Verify expired locks can be recovered and active locks cannot be stolen. | Not started |
| **#21** | C9 BUG-C9-03 — Firestore rate-limit contention handler resets hit count to 1 | Medium / 48 | server/config/firestoreRateLimitStore.ts | Preserve the known count or a safe increment estimate on transaction contention instead of resetting the counter. Test contention/retry behavior and ensure fallback cannot silently weaken the configured limit. | Not started |
| **#23** | C10 BUG-C10-01 — Hot summary document creates Firestore write contention | Medium / 48 | server/repositories/firestore/firestoreResearchSubmissionRepository.ts | Decouple the hot public summary counter from the participant's primary atomic submission path, while preserving eventual reconciliation and correctness. Test concurrent submissions and verify accepted participant records are not lost. | Not started |
| **#24** | C10 BUG-C10-03 — Missing auxiliary summary counter aborts participant submission | Medium / 45 | server/repositories/firestore/firestoreResearchSubmissionRepository.ts | Treat auxiliary summary/counter maintenance as recoverable rather than allowing its absence to abort the primary participant record transaction. Test missing/corrupt summary documents and prove authoritative submission persists. | Not started |
| **#30** | C2 BUG-4 — Client retries Firestore writes that rules permanently deny | Medium / 40 | src/lib/trialStore.ts; firestore.rules | Remove forbidden client write path or permanently discard/classify permission-denied events; retain authoritative server submission. Test permission-denied cannot create a 600ms retry loop or unbounded queue. | Not started |
| **#36** | C2 BUG-5 — Admin pagination re-reads full leaderboard collection in a loop | Medium / 35 | server/repositories/firestore/firestoreLeaderboardRepository.ts; server/services/adminService.ts | Avoid repeated full scans per filtered page. Prefer stable indexed pagination or one bounded fetch/filter pass as appropriate. Test read counts, cursor progression, and legacy rows so entries are not silently omitted. | Not started |
| **#37** | C10 BUG-C10-07 — getDatasetSummary can be permanently wedged by an expired lock | Medium / 35 | server/repositories/firestore/firestoreResearchDatasetRepository.ts | Apply and test the intended lock-expiration recovery logic for interrupted migration, active lock, expired lock, and successful retry paths. | Not started |
| **#52** | C11 BUG-C11-08 — Long reconciliation can overwrite newer submissions with stale counts | Medium / 16 | server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts | Revalidate the lease/lock inside the completion transaction and refuse to publish stale reconciliation counts after the lease expires or newer writes supersede the snapshot. Test concurrent submission during a long scan. | Not started |

### Wave 3 specific safeguards

- Preserve primary participant submission durability even if derived summary maintenance fails.
- Do not replace read amplification with an unbounded in-memory scan or silently omit legacy rows.
- Define lock ownership, lease expiry, renewal, and completion checks consistently across maintenance repositories.
- Firestore emulator tests are required for contention, missing counters, lock expiry, reconciliation races, and migration recovery.

---

# 7. Wave 4 — Backend API contracts, session handling, and rate-limit boundaries

**Scope:** 8 findings.  
**Merge condition:** authorization and rate limiting remain safe; request validation and HTTP status codes are deterministic; session identifiers cannot escape their intended document boundary.

| Master ID | Source finding | Severity / risk | Target | Required correction and closure evidence | Status |
|---|---|---:|---|---|---|
| **#9** | C9 BUG-C9-01 — Unverified client claims influence unauthenticated rate-limit partitioning | Medium / 56 | server/config/rateLimits.ts | Do not trust caller-controlled identity/IP claims as the sole unauthenticated rate-limit key. Use a verified server-observed source and preserve authenticated UID partitioning. Test spoofed headers, missing identity, shared NAT behavior, and abuse resistance. | Not started |
| **#38** | C7 BUG-C7-05 — Consumed session validation omits the session object | Medium / 32 | server/services/sessionService.ts | Return the validated session in the consumed-check result when the contract requires it, avoiding duplicate database reads. Test consumed and unconsumed session paths and repository call counts. | Not started |
| **#41** | C7 BUG-C7-06 — Leaderboard erasure 409 conflicts are returned as 500 | Medium / 30 | server/routes/leaderboardRoutes.ts | Preserve the explicit conflict status in route error mapping. Test a real erasure conflict returns 409 and unexpected errors remain 500. | Not started |
| **#42** | C7 BUG-C7-07 — Firestore ABORTED contention is not mapped to retryable response | Medium / 30 | server/routes/researchRoutes.ts | Recognize transaction contention (ABORTED) and return established retryable response without masking unrelated failures. Test error-code and generic-failure paths. | Not started |
| **#43** | C7 BUG-C7-08 — Startup promise rejection and HTTP error status masking | Medium / 30 | server/index.ts | Handle server startup rejection explicitly and preserve validated status/statusCode values in the global error handler. Test rejected startup and representative 400/413/500 responses. | Not started |
| **#45** | C9 BUG-C9-05 — Personal Best API does not normalize colour-recognition | Medium / 30 | server/routes/researchRoutes.ts; server/services/personalBestService.ts | Normalize assessment type before validation/lookup and preserve correct score direction. Test canonical and supported alias inputs, including score-order semantics. | Not started |
| **#53** | C5 BUG-1 — Invalid admin pagination cursor becomes HTTP 500 | Medium / 16 | server/routes/adminRoutes.ts | Map specific invalid/stale cursor condition to HTTP 400 with a stable client-safe response. Generic server failures must remain 500. Test malformed, stale, and valid cursors. | Not started |
| **#55** | C9 BUG-C9-10 — Slash in sessionId crashes Firestore document lookup | Medium / 10 | server/services/sessionService.ts; server/repositories/firestore/firestoreSessionRepository.ts | Validate session IDs against Firestore document-path constraints before repository access. Test slash, empty, malformed, oversized, and valid identifiers; invalid user input must return 400 rather than 500. | Not started |

### Wave 4 specific safeguards

- Rate-limit hardening must not make users behind a shared NAT collide unnecessarily or trust spoofable headers.
- Do not globally change error contracts. Correct only the specific error mapping supported by the route's established contract.
- Input validation must happen before constructing Firestore document references.

---

# 8. Wave 5 — Mobile/PWA lifecycle, service worker, and device routing

**Scope:** 6 findings.  
**Merge condition:** mobile navigation, installability, cache behavior, and timer lifecycle are coherent across browser/PWA states; service-worker fetch handlers always return valid responses.

| Master ID | Source finding | Severity / risk | Target | Required correction and closure evidence | Status |
|---|---|---:|---|---|---|
| **#5** | C11 BUG-C11-01 — Any android-app referrer is treated as installed PWA | Medium / 80 | src/lib/pwaStore.ts | Detect only the actual trusted installed-app/TWA context; unrelated Android app referrers must not suppress installation UI. Test representative third-party referrers and the valid installed-app case. | Not started |
| **#19** | C11 BUG-C11-05 — Service worker stale-while-revalidate can resolve undefined | Medium / 49 | mobile/public/sw.js | Ensure every event.respondWith branch resolves to a valid Response, including cache miss plus network failure. Test online, cached-offline, and uncached-offline cases. | Not started |
| **#39** | C3 BUG-3 — Mobile memory assessments leave timers running when settings opens | Medium / 30 | mobile/src/components/BlockMemoryTest.tsx; mobile/src/components/NumberMemoryTest.tsx | Invoke full timer cleanup and cancel in-flight assessment activity when settings opens. Use fake timers to test sequence playback and countdown interruption; assert no later state transitions, haptics, or audio. | Not started |
| **#46** | C11 BUG-C11-10 — /mobile/ static-path early exit skips routing-cookie synchronization | Medium / 25 | server/middleware/deviceRouting.ts | Restrict the static-asset bypass so document requests still process routing flags, cookies, and query cleanup. Test /mobile/, /mobile/assets/*, and force-mobile/force-desktop query paths. | Not started |
| **#47** | C11 BUG-C11-11 — Standalone display-mode transition leaves isInstallable true | Medium / 21 | src/lib/pwaStore.ts | Recompute installability whenever standalone/install state changes. Test browser → standalone transitions and ensure contradictory installed/installable states are impossible. | Not started |
| **#48** | C11 BUG-C11-09 — Service worker caches parameterized navigation URLs | Medium / 24 | mobile/public/sw.js | Normalize navigation cache keys or explicitly exclude parameterized/private navigation requests. Test query variants, clean shell lookup, and cache cardinality. | Not started |

### Wave 5 specific safeguards

- Preserve the existing canonical route and responsive-surface contract.
- Do not cache private or user-specific navigation responses as public app-shell entries.
- Do not make service-worker recovery depend on an unavailable network response.
- Test lifecycle events with realistic browser/PWA state transitions, not only pure helper mocks.

---

# 9. Wave 6 — Telegram notifications, dispatch reliability, and telemetry memory

**Scope:** 7 findings.  
**Merge condition:** alert values are correct, dispatch processes work at the intended rate, failures remain throttled, and long-running process memory is bounded.

| Master ID | Source finding | Severity / risk | Target | Required correction and closure evidence | Status |
|---|---|---:|---|---|---|
| **#12** | C11 BUG-C11-03 — pageViewEventIds grows without bound and is swept on every page view | Medium / 50 | server/services/telegramNotifierService.ts | Bound event-ID retention and make pruning incremental/TTL-based rather than an unbounded O(N) synchronous sweep per page view. Test maximum size, eviction, deduplication correctness, and sustained ingestion. | Not started |
| **#14** | C9 BUG-C9-04 — Flanker/Stroop accuracy is multiplied by 100 twice in Telegram | Medium / 54 | server/routes/researchRoutes.ts; server/services/telegramNotifierService.ts | Normalize percentage units at one boundary and remove duplicate formatting multiplication. Test representative 0–100% values for Flanker and Stroop notifications. | Not started |
| **#16** | C2 BUG-1 — Memory notification reads property names absent from calculator contract | Medium / 50 | server/routes/researchRoutes.ts; server/engines/memoryCalculator.ts | Map actual longestSeq/highestLevel outputs into the notification DTO. Test Block and Number Memory notifications with real calculator-shaped metrics. | Not started |
| **#22** | C9 BUG-C9-06 — Premature outbox loop break dispatches at most one message per tick | Medium / 48 | server/services/telegramNotifierService.ts | Process intended bounded batch without premature termination. Test multiple queued messages, ordering, and per-tick limits. | Not started |
| **#27** | C9 BUG-C9-07 — Failed Telegram send leaves stale lastSendTime and causes request storm | Medium / 42 | server/services/telegramNotifierService.ts | Update throttle state on failure or apply bounded exponential backoff. Test repeated provider failures and prove requests remain throttled. | Not started |
| **#33** | C9 BUG-C9-08 — Deduplication map grows without bound and incurs O(N) work per page view | Medium / 36 | server/services/telegramNotifierService.ts | Bound the separate deduplication cache with TTL/capacity-aware pruning and preserve deduplication semantics. Test eviction, repeated IDs, and sustained load. Verify this independently from #12; do not assume one fix closes both maps. | Not started |
| **#40** | C2 BUG-2 — Direction Telegram notification displays unsupported Conflict Cost as N/A | Low / 30 | server/services/telegramNotifierService.ts | Remove unsupported Conflict Cost field from the four-choice Direction notification. Do not synthesize a metric without a protocol change and validation. Test Direction retains valid metrics and omits Conflict Cost. | Not started |

### Wave 6 specific safeguards

- Test notifications at the route-to-DTO-to-message boundary, not only string-formatting helpers.
- Keep provider failures throttled and retryable; avoid both message loss and uncontrolled retry storms.
- Verify bounded memory behavior under long-running or high-volume event sequences.

---

# 10. Wave 7 — Client settings, stats-cache coherence, and audio resource lifecycle

**Scope:** 6 findings.  
**Merge condition:** user preferences remain synchronized as intended, cache invalidation is race-safe, and audio resources are released.

| Master ID | Source finding | Severity / risk | Target | Required correction and closure evidence | Status |
|---|---|---:|---|---|---|
| **#10** | C10 BUG-C10-02 — Saving any setting severs OS reduced-motion synchronization | Medium / 56 | shared/lib/settingsStore.ts | Distinguish explicit user overrides from inherited prefers-reduced-motion; saving an unrelated setting must not silently create a reduced-motion override. Test OS preference changes before and after unrelated setting updates. | Not started |
| **#17** | C10 BUG-C10-08 — Duplicate mobile useAuthoritativeStats creates split-brain cache state | Medium / 50 | mobile/src/lib/useAuthoritativeStats.ts; src/lib/useAuthoritativeStats.ts | Consolidate to one authoritative implementation where the shared module boundary permits it. Test desktop/mobile consumers share invalidation and in-flight request behavior; avoid importing desktop-only UI dependencies into mobile. | Not started |
| **#18** | C10 BUG-C10-09 — One-year root cookie persists a 60-second stats cache marker | Medium / 50 | src/lib/useAuthoritativeStats.ts | Remove unnecessary root HTTP cookie persistence for client-only short-lived stats caching. Test cache TTL/invalidation and confirm unrelated backend requests no longer carry the oversized cookie. | Not started |
| **#25** | C10 BUG-C10-04 — Audio cue graph leaks GainNodes | Medium / 45 | shared/lib/settingsStore.ts | Disconnect oscillator and gain nodes when playback ends; ensure cleanup also occurs on errors/cancellation. Test repeated cue playback and resource cleanup. | Not started |
| **#34** | C10 BUG-C10-05 — Cross-tab settings reset resurrects deleted settings | Medium / 36 | shared/lib/settingsStore.ts | Handle cross-tab storage-clear event without reloading stale values back into storage. Test reset with two tabs/storage-event simulations and verify deletion remains stable. | Not started |
| **#35** | C10 BUG-C10-10 — In-flight stats request overwrites state after cache clear | Medium / 36 | src/lib/useAuthoritativeStats.ts | Guard state updates with cache/request generation identity so an old response cannot revive pre-clear values. Test clear-during-request, stale response completion, and subsequent refresh. | Not started |

### Wave 7 specific safeguards

- Preserve explicit user settings while allowing OS preference synchronization when no explicit override exists.
- Do not solve duplicate caches by creating another singleton or another copy of the hook.
- Verify both data freshness and request/header behavior after cache changes.

---

## 11. Cross-wave dependency rules

1. **Wave 1 → Wave 2:** Wave 2 scoring/telemetry changes build on valid submission payloads and trial contracts. Wave 1 must merge first.
2. **Wave 2 → Wave 3:** Firestore persistence tests should use the finalized normalized assessment payload and metric contract.
3. **Wave 3 → Wave 4:** API/session/rate-limit behavior must be validated against stable persistence and repository contracts.
4. **Wave 4 → Wave 5:** Device-routing and mobile lifecycle changes must preserve stabilized API/session behavior.
5. **Wave 5 → Wave 6:** Notification/telemetry work must not rely on broken mobile/PWA lifecycle behavior or stale event delivery.
6. **Wave 6 → Wave 7:** Settings/cache finalization happens after notification/telemetry behavior is stable; shared cache or telemetry modules must not be edited concurrently across waves.

A dependency may be pulled earlier only when the Referee documents why it is necessary to close the active wave. The wave scope and register must then be updated before implementation begins.

---

## 12. Universal test and merge gates

Every wave must satisfy all applicable gates.

### A. Original-bug reproduction
- A regression test captures the original failure mode.
- The test is shown to fail against the pre-fix implementation (or an equivalent controlled reproduction is recorded).
- The test passes against the candidate fix.
- The exact Master ID is linked to the test name/path.

### B. Regression protection
- Relevant unit/component tests pass.
- Relevant integration/API tests pass.
- TypeScript checks pass for affected surfaces.
- Production build passes for affected surfaces.
- No unexplained failures are waived as pre-existing without evidence against the wave baseline.

### C. Data, privacy, and security
- Firestore emulator tests are mandatory for rules, transactions, migrations, locks, counters, and pagination behavior that depends on Firestore semantics.
- No participant submission is silently dropped to satisfy a validator.
- No private owner/session data is added to public records, logs, notifications, or test snapshots.
- Authentication must fail closed; no known fallback credentials or signing keys remain.
- Scientific units, time domains, trial counts, and accuracy denominators are explicit and test-covered.

### D. Independent audit
- Audit only the active wave and its diff, including direct callers/contracts needed to evaluate it.
- Each original finding receives an explicit FIXED, NOT FIXED, or NOT REPRODUCIBLE disposition with evidence.
- Every new in-scope issue receives severity, impact, reproduction, and remediation status.
- The Referee records APPROVE TO MERGE, REVISE, or BLOCKED against the exact head SHA.
- An audit that did not inspect the changed diff or required tests cannot approve the wave.

### E. Merge evidence
The final wave record must contain:
- Wave number and in-scope Master IDs.
- Base SHA and final PR head SHA.
- Changed files and implementation commit(s).
- Regression test names and exact command results.
- Build/type-check results.
- Emulator/browser/runtime evidence where applicable.
- Hunter, Skeptic, and Referee reports.
- All audit findings and their closure commits.
- Final APPROVE TO MERGE verdict and merge commit SHA.

Only then may the wave be merged.

---

## 13. Wave status register

| Wave | Findings | Implementation | Independent audit | Merge | Status |
|---|---:|---|---|---|---|
| Wave 1 — Critical submission/auth/privacy | 10 | Not started (one pre-existing code change awaits verification) | Not started | Not started | Planned |
| Wave 2 — Assessment science and trial contracts | 10 | Not started | Not started | Not started | Planned |
| Wave 3 — Firestore persistence and concurrency | 10 | Not started | Not started | Not started | Planned |
| Wave 4 — API, sessions, and rate limits | 8 | Not started | Not started | Not started | Planned |
| Wave 5 — Mobile/PWA lifecycle | 6 | Not started | Not started | Not started | Planned |
| Wave 6 — Notifications and telemetry dispatch | 7 | Not started | Not started | Not started | Planned |
| Wave 7 — Settings, cache, and audio resources | 6 | Not started | Not started | Not started | Planned |
| **Total** | **57** |  |  |  | **0 merged** |

---

## 14. Audit reconciliation and exclusions

The master audit's 57 actionable findings reconcile as follows:

| Source | Actionable findings included |
|---|---:|
| Cycle 1 | 4 |
| Cycle 2 | 5 |
| Cycle 3 | 3 |
| Cycle 4 | 0 |
| Cycle 5 | 1 |
| Cycle 6 | 0 |
| Cycle 7 | 8 |
| Cycle 8 | 8 |
| Cycle 9 | 10 |
| Cycle 10 | 9 |
| Cycle 11 | 8 |
| Security Cycle 1 | 1 |
| **Total** | **57** |

The following are deliberately excluded from remediation scope:
- All 15 findings adjudicated as false positives.
- All 13 findings adjudicated below the actionability threshold.
- Cycle 4 BUG-6 owner-index migration concern, which remains a documented follow-up/invariant investigation rather than an implementation bug.
- No new issue is promoted into the 57-finding register without evidence and an explicit triage decision.

The plan does not authorize speculative cleanup, unrelated refactors, protocol redesign, or blanket changes to error/status contracts.

---

## 15. Current baseline and planning limitations

- The original audit/fix-plan baseline is 843f657e13b3fb535cd58d5f752648827e51e102.
- The planning branch head inspected is 07afaf86f42e035a8c6fd38e4901048b4c073451, 23 commits ahead of that baseline and not behind it.
- The comparison shows a mobile About implementation change (mobile/src/App.tsx, new mobile About component, associated test), corresponding to Master finding #6. It appears to remove the desktop About import from the mobile entrypoint, but no bundle audit or test execution was performed here; therefore #6 remains open pending Wave 1 verification.
- The other audited application targets were not among the files changed in that baseline-to-current comparison. Their status must still be checked at the start of their wave; the planning baseline is not a substitute for implementation-time source inspection.
- No application fixes, tests, builds, emulator runs, or live deployment probes were performed while preparing this plan.
- SEC-1 is source-confirmed as an actionable security defect, but the effective runtime environment and deployed exposure were not established by the source-only audit. The implementation must remove the vulnerable fallback regardless, and deployment-owner verification/credential rotation is a separate required operational check.

---

## 16. Start condition for Wave 1

Before touching application code:

1. Verify the intended integration branch and compare its HEAD with the planning baseline.
2. Create the Wave 1 implementation branch from that exact integration baseline.
3. Re-check all ten Wave 1 targets at that branch HEAD; identify any code that has already changed.
4. Establish baseline test results for the relevant files and commands.
5. Create the Wave 1 finding/test checklist and freeze scope.
6. Begin implementation only after that pre-flight is recorded.

**Plan outcome:** the complete 57-finding backlog is allocated to seven gated waves. The next action is Wave 1 pre-flight and implementation—not parallel work on later waves.