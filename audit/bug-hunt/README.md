# PULSE v2.1: Master Adversarial Bug Hunt Report

**Branch:** `audit/bug-hunt-reports`  
**Methodology:** 3-Agent Adversarial Pipeline (Hunter → Skeptic → Referee) with Ponytail Senior Developer Lens (`/ponytail-audit`).  
**Threshold Rule:** $\text{Frequency} \times \text{Impact} \ge 5$ required for actionability. Unrequested rare/speculative edge cases dismissed.

---

## Executive Summary

Over **9 consecutive adversarial cycles**, the pipeline performed deep inspection across desktop tests, mobile components, backend routes/services/engines, data synchronization layers, dataset transformation & analytics, core backend services, assessment calculation engines, rate limiting & session persistence, protocol validation, and Telegram dispatch pipelines:

- **Total Candidate Findings Audited:** 60
- **Dismissed as False Positives:** 13
- **Dismissed Below Threshold (Score < 5 / YAGNI):** 8
- **Confirmed Actionable Bugs:** 39
  - **Critical (7):** Total submission failure, data loss, or core bundle contamination
  - **Medium (31):** Real-world logic errors, query storms, or state desynchronization
  - **Low (1):** UI/notification contract discrepancy

---

## Confirmed Actionable Bugs (Ranked by Risk Score)

| # | Severity | Frequency | Impact | Risk Score | Target File | Line(s) | Defect Summary | Root-Cause Fix |
|---|---|---|---|---|---|---|---|---|
| **1** | **Critical** | 10 | 10 | **100** | `src/components/NumberMemoryTest.tsx` | 199, 342-343 | Monotonic `performance.now()` written into timestamps, causing 100% of desktop Number Memory submissions to fail authoritative session window checks with HTTP 400. | Use `Date.now()` for `stimulusWallTimestamp.current` and observation timestamps; keep `performance.now()` strictly for latency math. |
| **2** | **Critical** | 10 | 10 | **100** | `src/components/BlockMemoryTest.tsx` | 208, 335, 417 | Monotonic `performance.now()` written into timestamps, causing 100% of desktop Block Memory submissions to fail session window checks with HTTP 400. | Use `Date.now()` for `stimulusWallTimestamp.current` and observation timestamps; keep `performance.now()` strictly for latency math. |
| **3** | **Medium** | 10 | 8 | **80** | `server/services/leaderboardAppService.ts` | 88-136, 152 | Read-only rank lookup `getMyLeaderboardRank` triggers unconditional multi-document Firestore write transactions via `backfillLegacyOwnership` on every request. | Check `getEntriesByOwner` first; early-exit in `linkOwnerToEntry` if `priorMeta.ownerUid === ownerUid`. |
| **4** | **Critical** | 10 | 7 | **70** | `mobile/src/App.tsx` | 30 | Mobile lazy import of desktop About drags entire desktop app and all 9 desktop tests into mobile PWA bundle, duplicating chunks. | Replace desktop About import with lightweight mobile About view. |
| **5** | **Critical** | 6 | 10 | **60** | `src/components/DirectionTest.tsx` | 373-395, 424-445 | Desktop false start (<80ms or premature) observations omit required `targetDirection`, causing `flankerCalculator.ts` to reject submissions with HTTP 400. | Add `targetDirection: currentDirection.toLowerCase()` to observation objects in `interceptFalseStart` and the `< 80ms` branch. |
| **6** | **Medium** | 8 | 7 | **56** | `server/services/leaderboardAppService.ts` | 191-217 | `getMyLeaderboardRank` fans out into 8 parallel unindexed alias collection scans where 100% of alias results are discarded. | Remove alias fan-out loop; query only the canonical `rawType` matching `loadPublicLeaderboard`. |
| **7** | **Medium** | 7 | 8 | **56** | `server/config/rateLimits.ts` | 10-38 | Unverified client claims partitioning allows unauthenticated DoS floods and burns Firestore write quota. | Enforce verified IP fallback on unauthenticated requests. |
| **8** | **Critical** | 6 | 9 | **54** | `server/engines/stroopCalculator.ts` | 120-122 | Hardcoded `trials.length !== 15` strictly rejects color recognition submissions with retried false starts permitted by `ASSESSMENT_TRIAL_LIMITS` (40). | Deduplicate trials by logical position / `trialNumber` before enforcing the 15 completed trials requirement. |
| **9** | **Medium** | 9 | 6 | **54** | `server/routes/researchRoutes.ts`<br>`server/services/telegramNotifierService.ts` | 159<br>188-201 | Flanker & Stroop accuracy is multiplied by 100 twice, reporting 10,000% accuracy in Telegram notifications. | Remove duplicate `* 100` multiplier in Telegram message formatting. |
| **10** | **Critical** | 5 | 10 | **50** | `src/components/ColorTest.tsx` | 272-308 | False start observations append and retry without resetting trial array, exceeding 15 trials and violating `trials.length === 15` in `stroopCalculator.ts`. | Do not append retried false starts as extra trials, or slice/filter submitted observations to the 15 completed trials. |
| **11** | **Medium** | 10 | 5 | **50** | `server/routes/researchRoutes.ts` | 162-163 | Telegram notifications query `dm.maxSpan` & `dm.highestLevelAchieved` instead of `dm.longestSeq` & `dm.highestLevel`, displaying "N/A" on 100% of memory completions. | Map `maxSpan` to `dm.maxSpan ?? dm.longestSeq` and `highestLevelAchieved` to `dm.highestLevelAchieved ?? dm.highestLevel`. |
| **12** | **Critical** | 6 | 8 | **48** | `mobile/src/components/DirectionTest.tsx` | 423-445 | Mobile anticipatory responses (<80ms) push observations omitting `targetDirection`, causing `flankerCalculator.ts` rejection with HTTP 400. | Add `targetDirection: currentDirection.toLowerCase()` to `<80ms` observation payload in `captureResponse`. |
| **13** | **Medium** | 6 | 8 | **48** | `server/config/firestoreRateLimitStore.ts` | 62-73 | Firestore transaction contention error handler fails open, resetting hit counter to 1 under load. | Preserve cached count or increment local estimate rather than resetting to 1 on contention. |
| **14** | **Medium** | 8 | 6 | **48** | `server/services/telegramNotifierService.ts` | 405-410 | Premature loop break in outbox worker caps dispatch to 1 msg per 5s tick, stalling notifications under load. | Process batch items sequentially without premature loop termination. |
| **15** | **Medium** | 7 | 6 | **42** | `server/services/researchService.ts` | 356-358 | Provenance HMAC digests `temporalDynamics=[object Object]`, bypassing cryptographic verification of dynamic metrics. | Deterministically serialize nested objects with `JSON.stringify(val)` when constructing canonical metrics string. |
| **16** | **Medium** | 6 | 7 | **42** | `server/services/telegramNotifierService.ts` | 418-439 | Stale `lastSendTime` on dispatch error triggers unthrottled rapid-fire request storm against Telegram API. | Update `lastSendTime` on failure or apply exponential backoff. |
| **17** | **Medium** | 5 | 8 | **40** | `server/engines/flankerCalculator.ts`<br>`server/engines/stroopCalculator.ts` | 190-195<br>241-243 | Timeout omission in accuracy denominator (`!t.timedOut`) yields 100% accuracy when 90% of trials timed out. | Include omission timeouts in the accuracy denominator: `trials.filter(t => !t.falseStart).length`. |
| **18** | **Medium** | 5 | 8 | **40** | `server/engines/flankerCalculator.ts` | 178-188 | Flanker summary derivation drops `rawLatencyMs` and `rawLatency`, leaving `validRTs` empty and nulling out all summary RT metrics. | Include `rawLatencyMs` and `rawLatency` in the summary RT fallback chain. |
| **19** | **Medium** | 8 | 5 | **40** | `src/lib/trialStore.ts` | 226-255, 276-283 | Client attempts direct batch writes to `/trialObservations`, which are blocked (`allow write: if false;`), causing endless retry loops and memory growth. | Remove client direct Firestore batch writes to `/trialObservations` or purge queue on permission rejection. |
| **20** | **Medium** | 10 | 4 | **40** | `mobile/src/components/ReactionTest.tsx` | 322-347, 489-514 | Mobile visual reaction test omits high-precision timing telemetry and interval metadata (`stimulusScheduledAt`, `interStimulusIntervalMs`, etc.) required by research ingestion. | Populate mobile trial observations with high-precision timing and interval metrics matching desktop `ReactionTest.tsx`. |
| **21** | **Medium** | 6 | 6 | **36** | `server/services/researchService.ts` | 233-241 | Corrupted multi-attempt trial sequencing where `derivedAttemptNumber` freezes at 2 on consecutive retries. | Track attempt counts across iterations with a running `Map<number, number>` keyed by `trialNumber`. |
| **22** | **Medium** | 6 | 6 | **36** | `server/services/telegramNotifierService.ts` | 374-382 | Unbounded deduplication map causes memory leak and $O(N)$ synchronous main-thread stall on every page view. | Cap deduplication cache size or use TTL-based pruning. |
| **23** | **Medium** | 5 | 7 | **35** | `server/repositories/firestore/firestoreLeaderboardRepository.ts` | 30-49, 138-140 | `getAllEntriesForAdminPage` reads entire Firestore collection on each call; `adminService.ts` invokes it in a loop when filtering, causing an $O(N \times \text{pages})$ read storm. | Cache collection snapshot or filter over a single fetched set in `adminService.ts` rather than re-scanning entire collection each iteration. |
| **24** | **Medium** | 8 | 4 | **32** | `server/services/sessionService.ts` | 90-94 | `getAndValidateSession` strips `session` object on consumed checks, forcing duplicate database round-trips in researchService. | Return `session` in return object when `session.consumed` is true. |
| **25** | **Medium** | 5 | 6 | **30** | `mobile/src/components/BlockMemoryTest.tsx`<br>`mobile/src/components/NumberMemoryTest.tsx` | 580-594<br>575-589 | `pulse_settings_open` listener clears only `transitionTimeoutRef` instead of calling `clearAllTimers()`, leaving active sequences & countdowns running behind the settings modal. | Replace `clearTimeout(transitionTimeoutRef.current)` with `clearAllTimers()` in `handleSettingsOpen`. |
| **26** | **Low** | 10 | 3 | **30** | `server/routes/researchRoutes.ts` | 160 | Direction test Telegram notifications display "• Conflict Cost: N/A" on 100% of completions because 4-choice RT protocol does not derive conflict cost. | Remove the Conflict Cost line from the Direction notification template in `telegramNotifierService.ts`. |
| **27** | **Medium** | 5 | 6 | **30** | `server/routes/leaderboardRoutes.ts` | 151-168 | Dropped 409 Conflict status masks active participant erasure conflicts as 500 Internal Server Errors. | Add `errStatus === 409` check to route error handler. |
| **28** | **Medium** | 5 | 6 | **30** | `server/routes/researchRoutes.ts` | 205-252 | Missing `ABORTED` transaction error handling turns retryable summary lock contention into 500 errors. | Catch error code 10 / 'ABORTED' and return retryable 503 response. |
| **29** | **Medium** | 6 | 5 | **30** | `server/index.ts` | 76-89 | Unhandled promise rejection on server boot and error status masking converting 400/413 into 500. | Catch `startServer().catch(...)` and inspect `err.status ?? err.statusCode` in global error handler. |
| **30** | **Medium** | 6 | 5 | **30** | `mobile/src/components/ColorTest.tsx` | 244-253, 467-490 | Mobile ColorTest awards success audio/haptic chime on anticipatory false starts, and drops 5 core metadata fields on timeout observations. | Evaluate `rawDelta < 80` before playing feedback; restore missing schema fields on timeout observation payload. |
| **31** | **Medium** | 5 | 6 | **30** | `server/routes/researchRoutes.ts`<br>`server/services/personalBestService.ts` | 75-80<br>8-13 | Un-normalized `assessmentType` in Personal Best API rejects `colour-recognition` with HTTP 400 or inverts score logic. | Normalize assessmentType before validation and lookup. |
| **32** | **Medium** | 4 | 6 | **24** | `server/engines/stroopCalculator.ts` | 261-271 | Stroop condition averages omit `rawLatency`, zero-diluting condition RT sums and corrupting interference cost metrics. | Support `rawLatency` in trial extraction and condition averaging chains. |
| **33** | **Medium** | 3 | 7 | **21** | `scripts/migrateLeaderboardPrivacyAndAudit.ts` | 77-83, 98 | Using JavaScript `delete` with Firestore Admin `tx.set(metaRef, meta, { merge: true })` does not remove fields, permanently retaining invalid owner UIDs. | Assign `FieldValue.delete()` instead of `delete meta[key]`, or write using `tx.set(metaRef, meta)` without `{ merge: true }`. |
| **34** | **Medium** | 7 | 3 | **21** | `server/engines/stroopCalculator.ts` | 273-284 | Stroop derived metrics omit `totalFalseStarts`, `totalTrials`, and `totalIncorrect`, breaking unified reporting and telegram alerts. | Standardize `derivedMetrics` shape with `totalFalseStarts`, `totalCorrect`, `totalTrials: 15`, and `totalIncorrect`. |
| **35** | **Medium** | 4 | 4 | **16** | `server/routes/adminRoutes.ts` | 134-160 | Passing an invalid or stale pagination cursor throws `INVALID_CURSOR`, which falls back to HTTP 500 instead of HTTP 400 Bad Request. | Catch `INVALID_CURSOR` (or check `err.message === 'INVALID_CURSOR'`) and return HTTP 400 Bad Request with `{ success: false, error: 'Invalid cursor parameter' }`. |
| **36** | **Medium** | 4 | 4 | **16** | `src/lib/protocolValidators.ts` | 389-410 | `isValidProtocolObservation` lacks `'colour-recognition'` alias in switch, rejecting valid observations. | Add `'colour-recognition'` alias to observation validator switch. |
| **37** | **Medium** | 3 | 4 | **12** | `server/services/sessionService.ts`<br>`server/repositories/firestore/firestoreSessionRepository.ts` | 58-72<br>13 | Unsanitized forward slashes in `sessionId` crash Firestore document lookup with HTTP 500 instead of 400. | Sanitize/validate `sessionId` against invalid path characters before Firestore call. |
| **38** | **Medium** | 2 | 5 | **10** | `server/engines/stroopCalculator.ts` | 81, 97, 196, 226 | Arbitrary `80.01ms` floor misclassifies legitimate 80.00ms responses as anticipatory false starts. | Harmonize physiological floor to standard `80.0ms` across all 4 checks. |
| **39** | **Medium** | 2 | 4 | **8** | `server/engines/assessmentEngine.ts` | 149-151 | Negative reaction times on `rawRt` (`rawReactionTime`, `rawLatencyMs`, `rawLatency`) bypass gateway validation when `reactionTime` is omitted. | Validate `effectiveRt = reactionTime ?? rawRt` for non-negative finite bounds. |

---

## Cycle-by-Cycle Breakdown

- [**Cycle 1 (Core Tests & Assessment Engines)**](cycle-1/)
  - `01-hunter.md` | `02-skeptic.md` | `03-referee.md`
  - 4 Critical Bugs verified (`NumberMemoryTest` & `BlockMemoryTest` epoch timestamps, `DirectionTest` targetDirection, `ColorTest` 15-trial threshold).
- [**Cycle 2 (Server Routes, Data Store & Telemetry)**](cycle-2/)
  - `01-hunter.md` | `02-skeptic.md` | `03-referee.md`
  - 5 Bugs verified (`researchRoutes` Telegram mapping, `trialStore` direct writes, mobile `ReactionTest` timing telemetry, `adminService` read storm, conflict cost template).
- [**Cycle 3 (Mobile Assessments & Migration Scripts)**](cycle-3/)
  - `01-hunter.md` | `02-skeptic.md` | `03-referee.md`
  - 3 Bugs verified (mobile `DirectionTest` targetDirection, `migrateLeaderboardPrivacy` FieldValue.delete, mobile memory modal timers).
- [**Cycle 4 (Auth Middleware, SEO, Cache & Deduplication)**](cycle-4/)
  - `01-hunter.md` | `02-skeptic.md` | `03-referee.md`
  - 0 Actionable Bugs (5 false positives disproved, 3 dismissed below threshold; BUG-6 owner-index migration concern reclassified after code-path review).
- [**Cycle 5 (Admin Routing, Error Contracts & Standalone Scripts)**](cycle-5/)
  - `01-hunter.md` | `02-skeptic.md` | `03-referee.md`
  - 1 Bug verified (`adminRoutes` INVALID_CURSOR 500 vs 400).
- [**Cycle 6 (Shared Dataset Transformation, Filtering & Analytics)**](cycle-6/)
  - `01-hunter.md` | `02-skeptic.md` | `03-referee.md`
  - 0 Actionable Bugs (3 false positives disproved: server pre-normalization and mutually exclusive state partitions confirmed).
- [**Cycle 7 (Core Backend Services, Routes & Server Setup)**](cycle-7/)
  - `01-hunter.md` | `02-skeptic.md` | `03-referee.md`
  - 8 Bugs verified (`getMyLeaderboardRank` write amplification, asymmetric alias query storm, provenance HMAC temporalDynamics bypass, multi-attempt trial sequence freeze, `SessionService` dropped session on consumed check, dropped 409 conflict in leaderboardRoutes, unhandled ABORTED contention in researchRoutes, server.ts startup rejection & 500 status masking).
- [**Cycle 8 (Assessment Calculation Engines, PRNG & Mobile Color Test)**](cycle-8/)
  - `01-hunter.md` | `02-skeptic.md` | `03-referee.md`
  - 8 Bugs verified (`trials.length !== 15` Stroop retry rejection, accuracy timeout denominator inversion, Flanker null RT metrics on rawLatencyMs, 80.01ms physiological floor collision, Mobile ColorTest false start chime & missing timeout metadata, Stroop condition average rawLatency zero-dilution, negative latency gateway bypass, and missing Stroop derived metrics).
- [**Cycle 9 (Rate Limiting, Session Persistence, Protocol Validation & Telegram Alerts)**](cycle-9/)
  - `01-hunter.md` | `02-skeptic.md` | `03-referee.md`
  - 10 Bugs verified (mobile PWA desktop About bundle contamination, client IP rate limit claims partitioning, firestoreRateLimitStore contention fail-open reset, 10,000% Telegram accuracy double-multiplier, outbox worker premature loop break stalling dispatch, stale lastSendTime rapid-fire request storm, unbounded Telegram dedupe memory leak, un-normalized Personal Best HTTP 400 rejection, protocol observation missing colour-recognition switch alias, and unhandled slash in sessionId Firestore crash).

---

## Reconciliation Notes

The aggregate disposition totals are reconciled from the nine referee reports:

| Cycle | Candidates | Actionable | False positives | Below threshold |
|---|---:|---:|---:|---:|
| 1 | 5 | 4 | 0 | 1 |
| 2 | 7 | 5 | 2 | 0 |
| 3 | 4 | 3 | 1 | 0 |
| 4 | 8 | 0 | 5 | 3 |
| 5 | 3 | 1 | 0 | 2 |
| 6 | 3 | 0 | 3 | 0 |
| 7 | 10 | 8 | 1 | 1 |
| 8 | 10 | 8 | 1 | 1 |
| 9 | 10 | 10 | 0 | 0 |
| **Total** | **60** | **39** | **13** | **8** |

Cycle 4 BUG-6 is classified below threshold rather than as a false positive: the script can leave an unrelated stale owner-index pointer untouched and can overstate its console counter after early transaction returns, but no consuming path or production impact was established in the reviewed code. The Cycle 4 referee report records the evidence and follow-up tests.

## Security Review

[Security Cycle 1 — Hunter, Skeptic, and Referee](SECURITY%20CYCLE%201/) is a separate, incomplete source-only review. It contains one conditional admin-authentication finding (SEC-1) marked **Needs Validation**. It is not included in the 27 functional bug-hunt candidates or the 13 actionable functional bugs.

## Remediation

See the [Bug Fix Plan](BUG-FIX-PLAN.md) for the prioritized implementation sequence, regression coverage, and security validation gate.
