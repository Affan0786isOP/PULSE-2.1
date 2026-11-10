# PULSE v2.1: Master Adversarial Bug Hunt Report

**Branch:** `audit/bug-hunt-reports`  
**Methodology:** 3-Agent Adversarial Pipeline (Hunter → Skeptic → Referee) with Ponytail Senior Developer Lens (`/ponytail-audit`).  
**Threshold Rule:** $\text{Frequency} \times \text{Impact} \ge 5$ required for actionability. Unrequested rare/speculative edge cases dismissed.

---

## Executive Summary

Over **7 consecutive adversarial cycles**, the pipeline performed deep inspection across desktop tests, mobile components, backend routes/services/engines, data synchronization layers, dataset transformation & analytics, core backend services, and migration scripts:

- **Total Candidate Findings Audited:** 40
- **Dismissed as False Positives:** 12
- **Dismissed Below Threshold (Score < 5 / YAGNI):** 7
- **Confirmed Actionable Bugs:** 21
  - **Critical (5):** Total submission failure or data loss
  - **Medium (15):** Real-world logic errors, query storms, or state desynchronization
  - **Low (1):** UI/notification contract discrepancy

---

## Confirmed Actionable Bugs (Ranked by Risk Score)

| # | Severity | Frequency | Impact | Risk Score | Target File | Line(s) | Defect Summary | Root-Cause Fix |
|---|---|---|---|---|---|---|---|---|
| **1** | **Critical** | 10 | 10 | **100** | `src/components/NumberMemoryTest.tsx` | 199, 342-343 | Monotonic `performance.now()` written into timestamps, causing 100% of desktop Number Memory submissions to fail authoritative session window checks with HTTP 400. | Use `Date.now()` for `stimulusWallTimestamp.current` and observation timestamps; keep `performance.now()` strictly for latency math. |
| **2** | **Critical** | 10 | 10 | **100** | `src/components/BlockMemoryTest.tsx` | 208, 335, 417 | Monotonic `performance.now()` written into timestamps, causing 100% of desktop Block Memory submissions to fail session window checks with HTTP 400. | Use `Date.now()` for `stimulusWallTimestamp.current` and observation timestamps; keep `performance.now()` strictly for latency math. |
| **3** | **Medium** | 10 | 8 | **80** | `server/services/leaderboardAppService.ts` | 88-136, 152 | Read-only rank lookup `getMyLeaderboardRank` triggers unconditional multi-document Firestore write transactions via `backfillLegacyOwnership` on every request. | Check `getEntriesByOwner` first; early-exit in `linkOwnerToEntry` if `priorMeta.ownerUid === ownerUid`. |
| **4** | **Critical** | 6 | 10 | **60** | `src/components/DirectionTest.tsx` | 373-395, 424-445 | Desktop false start (<80ms or premature) observations omit required `targetDirection`, causing `flankerCalculator.ts` to reject submissions with HTTP 400. | Add `targetDirection: currentDirection.toLowerCase()` to observation objects in `interceptFalseStart` and the `< 80ms` branch. |
| **5** | **Medium** | 8 | 7 | **56** | `server/services/leaderboardAppService.ts` | 191-217 | `getMyLeaderboardRank` fans out into 8 parallel unindexed alias collection scans where 100% of alias results are discarded. | Remove alias fan-out loop; query only the canonical `rawType` matching `loadPublicLeaderboard`. |
| **6** | **Critical** | 5 | 10 | **50** | `src/components/ColorTest.tsx` | 272-308 | False start observations append and retry without resetting trial array, exceeding 15 trials and violating `trials.length === 15` in `stroopCalculator.ts`. | Do not append retried false starts as extra trials, or slice/filter submitted observations to the 15 completed trials. |
| **7** | **Medium** | 10 | 5 | **50** | `server/routes/researchRoutes.ts` | 162-163 | Telegram notifications query `dm.maxSpan` & `dm.highestLevelAchieved` instead of `dm.longestSeq` & `dm.highestLevel`, displaying "N/A" on 100% of memory completions. | Map `maxSpan` to `dm.maxSpan ?? dm.longestSeq` and `highestLevelAchieved` to `dm.highestLevelAchieved ?? dm.highestLevel`. |
| **8** | **Critical** | 6 | 8 | **48** | `mobile/src/components/DirectionTest.tsx` | 423-445 | Mobile anticipatory responses (<80ms) push observations omitting `targetDirection`, causing `flankerCalculator.ts` rejection with HTTP 400. | Add `targetDirection: currentDirection.toLowerCase()` to `<80ms` observation payload in `captureResponse`. |
| **9** | **Medium** | 7 | 6 | **42** | `server/services/researchService.ts` | 356-358 | Provenance HMAC digests `temporalDynamics=[object Object]`, bypassing cryptographic verification of dynamic metrics. | Deterministically serialize nested objects with `JSON.stringify(val)` when constructing canonical metrics string. |
| **10** | **Medium** | 8 | 5 | **40** | `src/lib/trialStore.ts` | 226-255, 276-283 | Client attempts direct batch writes to `/trialObservations`, which are blocked (`allow write: if false;`), causing endless retry loops and memory growth. | Remove client direct Firestore batch writes to `/trialObservations` or purge queue on permission rejection. |
| **11** | **Medium** | 10 | 4 | **40** | `mobile/src/components/ReactionTest.tsx` | 322-347, 489-514 | Mobile visual reaction test omits high-precision timing telemetry and interval metadata (`stimulusScheduledAt`, `interStimulusIntervalMs`, etc.) required by research ingestion. | Populate mobile trial observations with high-precision timing and interval metrics matching desktop `ReactionTest.tsx`. |
| **12** | **Medium** | 6 | 6 | **36** | `server/services/researchService.ts` | 233-241 | Corrupted multi-attempt trial sequencing where `derivedAttemptNumber` freezes at 2 on consecutive retries. | Track attempt counts across iterations with a running `Map<number, number>` keyed by `trialNumber`. |
| **13** | **Medium** | 5 | 7 | **35** | `server/repositories/firestore/firestoreLeaderboardRepository.ts` | 30-49, 138-140 | `getAllEntriesForAdminPage` reads entire Firestore collection on each call; `adminService.ts` invokes it in a loop when filtering, causing an $O(N \times \text{pages})$ read storm. | Cache collection snapshot or filter over a single fetched set in `adminService.ts` rather than re-scanning entire collection each iteration. |
| **14** | **Medium** | 8 | 4 | **32** | `server/services/sessionService.ts` | 90-94 | `getAndValidateSession` strips `session` object on consumed checks, forcing duplicate database round-trips in researchService. | Return `session` in return object when `session.consumed` is true. |
| **15** | **Medium** | 5 | 6 | **30** | `mobile/src/components/BlockMemoryTest.tsx`<br>`mobile/src/components/NumberMemoryTest.tsx` | 580-594<br>575-589 | `pulse_settings_open` listener clears only `transitionTimeoutRef` instead of calling `clearAllTimers()`, leaving active sequences & countdowns running behind the settings modal. | Replace `clearTimeout(transitionTimeoutRef.current)` with `clearAllTimers()` in `handleSettingsOpen`. |
| **16** | **Low** | 10 | 3 | **30** | `server/routes/researchRoutes.ts` | 160 | Direction test Telegram notifications display "• Conflict Cost: N/A" on 100% of completions because 4-choice RT protocol does not derive conflict cost. | Remove the Conflict Cost line from the Direction notification template in `telegramNotifierService.ts`. |
| **17** | **Medium** | 5 | 6 | **30** | `server/routes/leaderboardRoutes.ts` | 151-168 | Dropped 409 Conflict status masks active participant erasure conflicts as 500 Internal Server Errors. | Add `errStatus === 409` check to route error handler. |
| **18** | **Medium** | 5 | 6 | **30** | `server/routes/researchRoutes.ts` | 205-252 | Missing `ABORTED` transaction error handling turns retryable summary lock contention into 500 errors. | Catch error code 10 / 'ABORTED' and return retryable 503 response. |
| **19** | **Medium** | 6 | 5 | **30** | `server/index.ts` | 76-89 | Unhandled promise rejection on server boot and error status masking converting 400/413 into 500. | Catch `startServer().catch(...)` and inspect `err.status ?? err.statusCode` in global error handler. |
| **20** | **Medium** | 3 | 7 | **21** | `scripts/migrateLeaderboardPrivacyAndAudit.ts` | 77-83, 98 | Using JavaScript `delete` with Firestore Admin `tx.set(metaRef, meta, { merge: true })` does not remove fields, permanently retaining invalid owner UIDs. | Assign `FieldValue.delete()` instead of `delete meta[key]`, or write using `tx.set(metaRef, meta)` without `{ merge: true }`. |
| **21** | **Medium** | 4 | 4 | **16** | `server/routes/adminRoutes.ts` | 134-160 | Passing an invalid or stale pagination cursor throws `INVALID_CURSOR`, which falls back to HTTP 500 instead of HTTP 400 Bad Request. | Catch `INVALID_CURSOR` (or check `err.message === 'INVALID_CURSOR'`) and return HTTP 400 Bad Request with `{ success: false, error: 'Invalid cursor parameter' }`. |

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

---

## Reconciliation Notes

The aggregate disposition totals are reconciled from the seven referee reports:

| Cycle | Candidates | Actionable | False positives | Below threshold |
|---|---:|---:|---:|---:|
| 1 | 5 | 4 | 0 | 1 |
| 2 | 7 | 5 | 2 | 0 |
| 3 | 4 | 3 | 1 | 0 |
| 4 | 8 | 0 | 5 | 3 |
| 5 | 3 | 1 | 0 | 2 |
| 6 | 3 | 0 | 3 | 0 |
| 7 | 10 | 8 | 1 | 1 |
| **Total** | **40** | **21** | **12** | **7** |

Cycle 4 BUG-6 is classified below threshold rather than as a false positive: the script can leave an unrelated stale owner-index pointer untouched and can overstate its console counter after early transaction returns, but no consuming path or production impact was established in the reviewed code. The Cycle 4 referee report records the evidence and follow-up tests.

## Security Review

[Security Cycle 1 — Hunter, Skeptic, and Referee](SECURITY%20CYCLE%201/) is a separate, incomplete source-only review. It contains one conditional admin-authentication finding (SEC-1) marked **Needs Validation**. It is not included in the 27 functional bug-hunt candidates or the 13 actionable functional bugs.

## Remediation

See the [Bug Fix Plan](BUG-FIX-PLAN.md) for the prioritized implementation sequence, regression coverage, and security validation gate.
