# PULSE v2.1: Master Adversarial Bug Hunt Report

**Branch:** `audit/bug-hunt-reports`  
**Methodology:** 3-Agent Adversarial Pipeline (Hunter → Skeptic → Referee) with Ponytail Senior Developer Lens (`/ponytail-audit`).  
**Threshold Rule:** $\text{Frequency} \times \text{Impact} \ge 5$ required for actionability. Unrequested rare/speculative edge cases dismissed.

---

## Executive Summary

Over **11 consecutive adversarial cycles**, the pipeline performed deep inspection across desktop tests, mobile components, backend routes/services/engines, data synchronization layers, dataset transformation & analytics, core backend services, assessment calculation engines, rate limiting & session persistence, stats caching & research storage repositories, client settings sync, Telegram dispatch pipelines, PWA service workers & lifecycle, and device routing:

- **Total Candidate Findings Audited:** 85 (84 functional + 1 security)
- **Dismissed as False Positives:** 15
- **Dismissed Below Threshold (Score < 5 / YAGNI):** 13
- **Confirmed Actionable Bugs:** 57
  - **Critical (8):** Total submission failure, data loss, core bundle contamination, or admin authentication bypass
  - **Medium (48):** Real-world logic errors, query storms, or state desynchronization
  - **Low (1):** UI/notification contract discrepancy

---

## Confirmed Actionable Bugs (Ranked by Risk Score)

| # | Severity | Frequency | Impact | Risk Score | Target File | Line(s) | Defect Summary | Root-Cause Fix |
|---|---|---|---|---|---|---|---|---|
| **1** | **Critical** | 10 | 10 | **100** | `src/components/NumberMemoryTest.tsx` | 199, 342-343 | Monotonic `performance.now()` written into timestamps, causing 100% of desktop Number Memory submissions to fail authoritative session window checks with HTTP 400. | Use `Date.now()` for `stimulusWallTimestamp.current` and observation timestamps; keep `performance.now()` strictly for latency math. |
| **2** | **Critical** | 10 | 10 | **100** | `src/components/BlockMemoryTest.tsx` | 208, 335, 417 | Monotonic `performance.now()` written into timestamps, causing 100% of desktop Block Memory submissions to fail session window checks with HTTP 400. | Use `Date.now()` for `stimulusWallTimestamp.current` and observation timestamps; keep `performance.now()` strictly for latency math. |
| **3** | **Medium** | 10 | 8 | **80** | `server/services/leaderboardAppService.ts` | 88-136, 152 | Read-only rank lookup `getMyLeaderboardRank` triggers unconditional multi-document Firestore write transactions via `backfillLegacyOwnership` on every request. | Check `getEntriesByOwner` first; early-exit in `linkOwnerToEntry` if `priorMeta.ownerUid === ownerUid`. |
| **4** | **Critical** | 8 | 10 | **80** | `server/index.ts`<br>`server/middleware/adminAuth.ts`<br>`server/routes/adminRoutes.ts` | 2-4<br>8-37<br>66-108 | Master admin passcode `180611` and fallback secret accepted whenever `NODE_ENV !== 'production'` (or unset), allowing unauthenticated callers to acquire admin JWTs and perform mutations. | Remove master passcode and fallback secret; require explicit `ADMIN_PASSCODE` and `PULSE_ADMIN_SESSION_SECRET` variables and fail closed on startup. |
| **5** | **Medium** | 9 | 8 | **72** | `src/lib/pwaStore.ts` | 76-79 | `detectIsAndroidAppMode` treats any `android-app://` referrer (Gmail, Twitter, etc.) as an installed PWA, permanently suppressing install CTAs and banners on Android. | Only match `android-app://` if the package name matches Trusted Web Activity (TWA) or explicitly exclude standard third-party apps. |
| **6** | **Critical** | 10 | 7 | **70** | `mobile/src/App.tsx` | 30 | Mobile lazy import of desktop About drags entire desktop app and all 9 desktop tests into mobile PWA bundle, duplicating chunks. | Replace desktop About import with lightweight mobile About view. |
| **7** | **Critical** | 6 | 10 | **60** | `src/components/DirectionTest.tsx` | 373-395, 424-445 | Desktop false start (<80ms or premature) observations omit required `targetDirection`, causing `flankerCalculator.ts` to reject submissions with HTTP 400. | Add `targetDirection: currentDirection.toLowerCase()` to observation objects in `interceptFalseStart` and the `< 80ms` branch. |
| **8** | **Medium** | 8 | 7 | **56** | `server/services/leaderboardAppService.ts` | 191-217 | `getMyLeaderboardRank` fans out into 8 parallel unindexed alias collection scans where 100% of alias results are discarded. | Remove alias fan-out loop; query only the canonical `rawType` matching `loadPublicLeaderboard`. |
| **9** | **Medium** | 7 | 8 | **56** | `server/config/rateLimits.ts` | 10-38 | Unverified client claims partitioning allows unauthenticated DoS floods and burns Firestore write quota. | Enforce verified IP fallback on unauthenticated requests. |
| **10** | **Medium** | 8 | 7 | **56** | `shared/lib/settingsStore.ts` | 287-340 | Saving any setting persists `reducedMotionEnabled: false`, permanently severing OS `prefers-reduced-motion` synchronization. | Track explicit user overrides with a dedicated flag (`explicitReducedMotion: true`). |
| **11** | **Medium** | 7 | 8 | **56** | `server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts` | 57 | Missing lock-expiration logic in `FirestoreDatasetSummaryMaintenanceRepository` causes permanent deadlock of Admin UI and API upon interrupted migrations. | Add the 10-minute lock expiration check matching submission repository. |
| **12** | **Medium** | 7 | 8 | **56** | `server/services/telegramNotifierService.ts` | 278-283 | Telemetry ingestion causes unbounded memory leak and synchronous O(N) event loop sweep on every page-view request via `pageViewEventIds`. | Enforce maximum map size and prune oldest entries when threshold is reached. |
| **13** | **Critical** | 6 | 9 | **54** | `server/engines/stroopCalculator.ts` | 120-122 | Hardcoded `trials.length !== 15` strictly rejects color recognition submissions with retried false starts permitted by `ASSESSMENT_TRIAL_LIMITS` (40). | Deduplicate trials by logical position / `trialNumber` before enforcing the 15 completed trials requirement. |
| **14** | **Medium** | 9 | 6 | **54** | `server/routes/researchRoutes.ts`<br>`server/services/telegramNotifierService.ts` | 159<br>188-201 | Flanker & Stroop accuracy is multiplied by 100 twice, reporting 10,000% accuracy in Telegram notifications. | Remove duplicate `* 100` multiplier in Telegram message formatting. |
| **15** | **Critical** | 5 | 10 | **50** | `src/components/ColorTest.tsx` | 272-308 | False start observations append and retry without resetting trial array, exceeding 15 trials and violating `trials.length === 15` in `stroopCalculator.ts`. | Do not append retried false starts as extra trials, or slice/filter submitted observations to the 15 completed trials. |
| **16** | **Medium** | 10 | 5 | **50** | `server/routes/researchRoutes.ts` | 162-163 | Telegram notifications query `dm.maxSpan` & `dm.highestLevelAchieved` instead of `dm.longestSeq` & `dm.highestLevel`, displaying "N/A" on 100% of memory completions. | Map `maxSpan` to `dm.maxSpan ?? dm.longestSeq` and `highestLevelAchieved` to `dm.highestLevelAchieved ?? dm.highestLevel`. |
| **17** | **Medium** | 10 | 5 | **50** | `mobile/src/lib/useAuthoritativeStats.ts` | 1-215 | 215-line copy-paste clone of desktop stats hook causes dual module-level singletons and split-brain cache states. | Re-export desktop stats hook from mobile. |
| **18** | **Medium** | 10 | 5 | **50** | `src/lib/useAuthoritativeStats.ts` | 86-94 | 1-year root HTTP cookie set for 60s client stats cache forces unnecessary header bloat onto every backend request. | Remove cookie persistence; use localStorage alone for client-side stats caching. |
| **19** | **Medium** | 7 | 7 | **49** | `mobile/public/sw.js` | 317-336 | Stale-while-revalidate fetch listener returns `undefined` on network failure, triggering browser `TypeError: Failed to convert value to 'Response'` in `event.respondWith()`. | Return `new Response(null, { status: 504, statusText: 'Gateway Timeout' })` if neither network nor cache has the asset. |
| **20** | **Critical** | 6 | 8 | **48** | `mobile/src/components/DirectionTest.tsx` | 423-445 | Mobile anticipatory responses (<80ms) push observations omitting `targetDirection`, causing `flankerCalculator.ts` rejection with HTTP 400. | Add `targetDirection: currentDirection.toLowerCase()` to `<80ms` observation payload in `captureResponse`. |
| **21** | **Medium** | 6 | 8 | **48** | `server/config/firestoreRateLimitStore.ts` | 62-73 | Firestore transaction contention error handler fails open, resetting hit counter to 1 under load. | Preserve cached count or increment local estimate rather than resetting to 1 on contention. |
| **22** | **Medium** | 8 | 6 | **48** | `server/services/telegramNotifierService.ts` | 405-410 | Premature loop break in outbox worker caps dispatch to 1 msg per 5s tick, stalling notifications under load. | Process batch items sequentially without premature loop termination. |
| **23** | **Medium** | 6 | 8 | **48** | `server/repositories/firestore/firestoreResearchSubmissionRepository.ts` | 26-101 | Hot document write contention on `publicDatasetMeta/summary` violates Firestore ~1 write/sec limit under concurrency. | Decouple summary counter updates from the participant's primary ACID submission transaction. |
| **24** | **Medium** | 5 | 9 | **45** | `server/repositories/firestore/firestoreResearchSubmissionRepository.ts` | 80-89 | Missing auxiliary counter in summary document aborts participant assessment submission transactions with HTTP 503. | Skip or warn on summary counter errors rather than throwing inside participant submission transaction. |
| **25** | **Medium** | 9 | 5 | **45** | `shared/lib/settingsStore.ts` | 408-467 | `playAudioCue` permanently leaks `GainNode` instances attached to `AudioContext.destination` without `onended` disconnect. | Register `osc.onended = () => { osc.disconnect(); gain.disconnect(); }`. |
| **26** | **Medium** | 7 | 6 | **42** | `server/services/researchService.ts` | 356-358 | Provenance HMAC digests `temporalDynamics=[object Object]`, bypassing cryptographic verification of dynamic metrics. | Deterministically serialize nested objects with `JSON.stringify(val)` when constructing canonical metrics string. |
| **27** | **Medium** | 6 | 7 | **42** | `server/services/telegramNotifierService.ts` | 418-439 | Stale `lastSendTime` on dispatch error triggers unthrottled rapid-fire request storm against Telegram API. | Update `lastSendTime` on failure or apply exponential backoff. |
| **28** | **Medium** | 5 | 8 | **40** | `server/engines/flankerCalculator.ts`<br>`server/engines/stroopCalculator.ts` | 190-195<br>241-243 | Timeout omission in accuracy denominator (`!t.timedOut`) yields 100% accuracy when 90% of trials timed out. | Include omission timeouts in the accuracy denominator: `trials.filter(t => !t.falseStart).length`. |
| **29** | **Medium** | 5 | 8 | **40** | `server/engines/flankerCalculator.ts` | 178-188 | Flanker summary derivation drops `rawLatencyMs` and `rawLatency`, leaving `validRTs` empty and nulling out all summary RT metrics. | Include `rawLatencyMs` and `rawLatency` in the summary RT fallback chain. |
| **30** | **Medium** | 8 | 5 | **40** | `src/lib/trialStore.ts` | 226-255, 276-283 | Client attempts direct batch writes to `/trialObservations`, which are blocked (`allow write: if false;`), causing endless retry loops and memory growth. | Remove client direct Firestore batch writes to `/trialObservations` or purge queue on permission rejection. |
| **31** | **Medium** | 10 | 4 | **40** | `mobile/src/components/ReactionTest.tsx` | 322-347, 489-514 | Mobile visual reaction test omits high-precision timing telemetry and interval metadata (`stimulusScheduledAt`, `interStimulusIntervalMs`, etc.) required by research ingestion. | Populate mobile trial observations with high-precision timing and interval metrics matching desktop `ReactionTest.tsx`. |
| **32** | **Medium** | 6 | 6 | **36** | `server/services/researchService.ts` | 233-241 | Corrupted multi-attempt trial sequencing where `derivedAttemptNumber` freezes at 2 on consecutive retries. | Track attempt counts across iterations with a running `Map<number, number>` keyed by `trialNumber`. |
| **33** | **Medium** | 6 | 6 | **36** | `server/services/telegramNotifierService.ts` | 374-382 | Unbounded deduplication map causes memory leak and $O(N)$ synchronous main-thread stall on every page view. | Cap deduplication cache size or use TTL-based pruning. |
| **34** | **Medium** | 6 | 6 | **36** | `shared/lib/settingsStore.ts` | 136-146 | Cross-tab self-healing resurrection loop prevents settings reset whenever multiple tabs are open. | Early-return on `storage` event when `newValue === null` without calling `loadSettings()`. |
| **35** | **Medium** | 6 | 6 | **36** | `src/lib/useAuthoritativeStats.ts` | 194-200 | In-flight stats resolution does not verify cache generation before updating component state, reviving pre-clear counts. | Add `statsCacheGeneration === requestGeneration` check before setting component state. |
| **36** | **Medium** | 5 | 7 | **35** | `server/repositories/firestore/firestoreLeaderboardRepository.ts` | 30-49, 138-140 | `getAllEntriesForAdminPage` reads entire Firestore collection on each call; `adminService.ts` invokes it in a loop when filtering, causing an $O(N \times \text{pages})$ read storm. | Cache collection snapshot or filter over a single fetched set in `adminService.ts` rather than re-scanning entire collection each iteration. |
| **37** | **Medium** | 5 | 7 | **35** | `server/repositories/firestore/firestoreResearchDatasetRepository.ts` | 93-96 | Missing lock expiration check in `getDatasetSummary()` permanently wedges dataset summary API at HTTP 503 on interrupted migrations. | Add the 10-minute lock expiration check matching submission repository. |
| **38** | **Medium** | 8 | 4 | **32** | `server/services/sessionService.ts` | 90-94 | `getAndValidateSession` strips `session` object on consumed checks, forcing duplicate database round-trips in researchService. | Return `session` in return object when `session.consumed` is true. |
| **39** | **Medium** | 5 | 6 | **30** | `mobile/src/components/BlockMemoryTest.tsx`<br>`mobile/src/components/NumberMemoryTest.tsx` | 580-594<br>575-589 | `pulse_settings_open` listener clears only `transitionTimeoutRef` instead of calling `clearAllTimers()`, leaving active sequences & countdowns running behind the settings modal. | Replace `clearTimeout(transitionTimeoutRef.current)` with `clearAllTimers()` in `handleSettingsOpen`. |
| **40** | **Low** | 10 | 3 | **30** | `server/routes/researchRoutes.ts` | 160 | Direction test Telegram notifications display "• Conflict Cost: N/A" on 100% of completions because 4-choice RT protocol does not derive conflict cost. | Remove the Conflict Cost line from the Direction notification template in `telegramNotifierService.ts`. |
| **41** | **Medium** | 5 | 6 | **30** | `server/routes/leaderboardRoutes.ts` | 151-168 | Dropped 409 Conflict status masks active participant erasure conflicts as 500 Internal Server Errors. | Add `errStatus === 409` check to route error handler. |
| **42** | **Medium** | 5 | 6 | **30** | `server/routes/researchRoutes.ts` | 205-252 | Missing `ABORTED` transaction error handling turns retryable summary lock contention into 500 errors. | Catch error code 10 / 'ABORTED' and return retryable 503 response. |
| **43** | **Medium** | 6 | 5 | **30** | `server/index.ts` | 76-89 | Unhandled promise rejection on server boot and error status masking converting 400/413 into 500. | Catch `startServer().catch(...)` and inspect `err.status ?? err.statusCode` in global error handler. |
| **44** | **Medium** | 6 | 5 | **30** | `mobile/src/components/ColorTest.tsx` | 244-253, 467-490 | Mobile ColorTest awards success audio/haptic chime on anticipatory false starts, and drops 5 core metadata fields on timeout observations. | Evaluate `rawDelta < 80` before playing feedback; restore missing schema fields on timeout observation payload. |
| **45** | **Medium** | 5 | 6 | **30** | `server/routes/researchRoutes.ts`<br>`server/services/personalBestService.ts` | 75-80<br>8-13 | Un-normalized `assessmentType` in Personal Best API rejects `colour-recognition` with HTTP 400 or inverts score logic. | Normalize assessmentType before validation and lookup. |
| **46** | **Medium** | 5 | 5 | **25** | `server/middleware/deviceRouting.ts` | 98-107 | Premature `/mobile` static path early-exit skips routing cookie generation and query parameter cleanup on `/mobile/` requests. | Parse routing cookies and query flags before static path check. |
| **47** | **Medium** | 5 | 5 | **25** | `src/lib/pwaStore.ts` | 358-368 | Display-mode change handler fails to recompute `isInstallable`, leaving `isInstallable: true` when app becomes standalone. | Recompute `isInstallable = !isStandalone && !!deferredPrompt` in display mode listener. |
| **48** | **Medium** | 6 | 4 | **24** | `mobile/public/sw.js` | 268-298 | Navigation handler caches parameterized URLs blindly into Cache Storage, polluting offline cache. | Normalize request URLs to clean pathname before caching or matching. |
| **49** | **Medium** | 4 | 6 | **24** | `server/engines/stroopCalculator.ts` | 261-271 | Stroop condition averages omit `rawLatency`, zero-diluting condition RT sums and corrupting interference cost metrics. | Support `rawLatency` in trial extraction and condition averaging chains. |
| **50** | **Medium** | 3 | 7 | **21** | `scripts/migrateLeaderboardPrivacyAndAudit.ts` | 77-83, 98 | Using JavaScript `delete` with Firestore Admin `tx.set(metaRef, meta, { merge: true })` does not remove fields, permanently retaining invalid owner UIDs. | Assign `FieldValue.delete()` instead of `delete meta[key]`, or write using `tx.set(metaRef, meta)` without `{ merge: true }`. |
| **51** | **Medium** | 7 | 3 | **21** | `server/engines/stroopCalculator.ts` | 273-284 | Stroop derived metrics omit `totalFalseStarts`, `totalTrials`, and `totalIncorrect`, breaking unified reporting and telegram alerts. | Standardize `derivedMetrics` shape with `totalFalseStarts`, `totalCorrect`, `totalTrials: 15`, and `totalIncorrect`. |
| **52** | **Medium** | 2 | 8 | **16** | `server/repositories/firestore/firestoreDatasetSummaryMaintenanceRepository.ts` | 104-117 | `completeReconciliation` commits stale counts over newer submissions if reconciliation scan exceeds 10-minute lock window. | Atomically re-verify `migrationInProgress` and compare timestamp before committing summary. |
| **53** | **Medium** | 4 | 4 | **16** | `server/routes/adminRoutes.ts` | 134-160 | Passing an invalid or stale pagination cursor throws `INVALID_CURSOR`, which falls back to HTTP 500 instead of HTTP 400 Bad Request. | Catch `INVALID_CURSOR` (or check `err.message === 'INVALID_CURSOR'`) and return HTTP 400 Bad Request with `{ success: false, error: 'Invalid cursor parameter' }`. |
| **54** | **Medium** | 4 | 4 | **16** | `src/lib/protocolValidators.ts` | 389-410 | `isValidProtocolObservation` lacks `'colour-recognition'` alias in switch, rejecting valid observations. | Add `'colour-recognition'` alias to observation validator switch. |
| **55** | **Medium** | 3 | 4 | **12** | `server/services/sessionService.ts`<br>`server/repositories/firestore/firestoreSessionRepository.ts` | 58-72<br>13 | Unsanitized forward slashes in `sessionId` crash Firestore document lookup with HTTP 500 instead of 400. | Sanitize/validate `sessionId` against invalid path characters before Firestore call. |
| **56** | **Medium** | 2 | 5 | **10** | `server/engines/stroopCalculator.ts` | 81, 97, 196, 226 | Arbitrary `80.01ms` floor misclassifies legitimate 80.00ms responses as anticipatory false starts. | Harmonize physiological floor to standard `80.0ms` across all 4 checks. |
| **57** | **Medium** | 2 | 4 | **8** | `server/engines/assessmentEngine.ts` | 149-151 | Negative reaction times on `rawRt` (`rawReactionTime`, `rawLatencyMs`, `rawLatency`) bypass gateway validation when `reactionTime` is omitted. | Validate `effectiveRt = reactionTime ?? rawRt` for non-negative finite bounds. |

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
- [**Cycle 10 (Stats Caching, Storage Repositories, Client Settings & Error Reporting)**](cycle-10/)
  - `01-hunter.md` | `02-skeptic.md` | `03-referee.md`
  - 9 Bugs verified (hot document write contention on publicDatasetMeta/summary, settings save breaking OS prefers-reduced-motion sync, missing summary counter aborting submissions with HTTP 503, playAudioCue GainNode memory leak, cross-tab settings resurrection loop, missing lock expiration check wedging getDatasetSummary(), mobile useAuthoritativeStats 215-line duplicate clone, 1-year stats cookie HTTP header bloat, and in-flight stats race reviving pre-clear counts).
- [**Cycle 11 (Service Worker & PWA Lifecycle, Device Routing, Telemetry Ingestion & Dataset Maintenance)**](cycle-11/)
  - `01-hunter.md` | `02-skeptic.md` | `03-referee.md`
  - 8 Bugs verified (`detectIsAndroidAppMode` referrer suppression of install prompts, dataset summary reconciliation admin deadlock, Telegram notifier interval timer leak, service worker stale-while-revalidate undefined network crash, service worker query cache pollution, device routing premature static path skip, PWA display-mode stale `isInstallable`, and summary reconciliation lock expiration race).

---

## Reconciliation Notes

The aggregate disposition totals are reconciled from the eleven referee reports:

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
| 10 | 11 | 9 | 1 | 1 |
| 11 | 13 | 8 | 1 | 4 |
| Security 1 | 1 | 1 | 0 | 0 |
| **Total** | **85** | **57** | **15** | **13** |

Cycle 4 BUG-6 is classified below threshold rather than as a false positive: the script can leave an unrelated stale owner-index pointer untouched and can overstate its console counter after early transaction returns, but no consuming path or production impact was established in the reviewed code. The Cycle 4 referee report records the evidence and follow-up tests.

## Security Review

[Security Cycle 1 — Hunter, Skeptic, and Referee](SECURITY%20CYCLE%201/) has been validated and confirmed. Finding **SEC-1** is verified as an actionable **Critical** vulnerability (Risk Score: 80) and has been integrated into the Master Table of Ranked Actionable Bugs (Rank 4) and the [Bug Fix Plan](BUG-FIX-PLAN.md).

## Remediation

See the [Bug Fix Plan](BUG-FIX-PLAN.md) for the prioritized implementation sequence, regression coverage, and security validation gate.
