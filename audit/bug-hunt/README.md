# PULSE v2.1: Master Adversarial Bug Hunt Report

**Branch:** `audit/bug-hunt-reports`  
**Methodology:** 3-Agent Adversarial Pipeline (Hunter → Skeptic → Referee) with Ponytail Senior Developer Lens (`/ponytail-audit`).  
**Threshold Rule:** $\text{Frequency} \times \text{Impact} \ge 5$ required for actionability. Unrequested rare/speculative edge cases dismissed.

---

## Executive Summary

Over **5 consecutive adversarial cycles**, the pipeline performed deep inspection across desktop tests, mobile components, backend routes/services/engines, data synchronization layers, and migration scripts:

- **Total Candidate Findings Audited:** 27
- **Dismissed as False Positives:** 8
- **Dismissed Below Threshold (Score < 5 / YAGNI):** 6
- **Confirmed Actionable Bugs:** 13
  - **Critical (5):** Total submission failure or data loss
  - **Medium (7):** Real-world logic errors, query storms, or state desynchronization
  - **Low (1):** UI/notification contract discrepancy

---

## Confirmed Actionable Bugs (Ranked by Risk Score)

| # | Severity | Frequency | Impact | Risk Score | Target File | Line(s) | Defect Summary | Root-Cause Fix |
|---|---|---|---|---|---|---|---|---|
| **1** | **Critical** | 10 | 10 | **100** | `src/components/NumberMemoryTest.tsx` | 199, 342-343 | Monotonic `performance.now()` written into timestamps, causing 100% of desktop Number Memory submissions to fail authoritative session window checks with HTTP 400. | Use `Date.now()` for `stimulusWallTimestamp.current` and observation timestamps; keep `performance.now()` strictly for latency math. |
| **2** | **Critical** | 10 | 10 | **100** | `src/components/BlockMemoryTest.tsx` | 208, 335, 417 | Monotonic `performance.now()` written into timestamps, causing 100% of desktop Block Memory submissions to fail session window checks with HTTP 400. | Use `Date.now()` for `stimulusWallTimestamp.current` and observation timestamps; keep `performance.now()` strictly for latency math. |
| **3** | **Critical** | 6 | 10 | **60** | `src/components/DirectionTest.tsx` | 373-395, 424-445 | Desktop false start (<80ms or premature) observations omit required `targetDirection`, causing `flankerCalculator.ts` to reject submissions with HTTP 400. | Add `targetDirection: currentDirection.toLowerCase()` to observation objects in `interceptFalseStart` and the `< 80ms` branch. |
| **4** | **Critical** | 5 | 10 | **50** | `src/components/ColorTest.tsx` | 272-308 | False start observations append and retry without resetting trial array, exceeding 15 trials and violating `trials.length === 15` in `stroopCalculator.ts`. | Do not append retried false starts as extra trials, or slice/filter submitted observations to the 15 completed trials. |
| **5** | **Medium** | 10 | 5 | **50** | `server/routes/researchRoutes.ts` | 162-163 | Telegram notifications query `dm.maxSpan` & `dm.highestLevelAchieved` instead of `dm.longestSeq` & `dm.highestLevel`, displaying "N/A" on 100% of memory completions. | Map `maxSpan` to `dm.maxSpan ?? dm.longestSeq` and `highestLevelAchieved` to `dm.highestLevelAchieved ?? dm.highestLevel`. |
| **6** | **Critical** | 6 | 8 | **48** | `mobile/src/components/DirectionTest.tsx` | 423-445 | Mobile anticipatory responses (<80ms) push observations omitting `targetDirection`, causing `flankerCalculator.ts` rejection with HTTP 400. | Add `targetDirection: currentDirection.toLowerCase()` to `<80ms` observation payload in `captureResponse`. |
| **7** | **Medium** | 8 | 5 | **40** | `src/lib/trialStore.ts` | 226-255, 276-283 | Client attempts direct batch writes to `/trialObservations`, which are blocked (`allow write: if false;`), causing endless retry loops and memory growth. | Remove client direct Firestore batch writes to `/trialObservations` or purge queue on permission rejection. |
| **8** | **Medium** | 10 | 4 | **40** | `mobile/src/components/ReactionTest.tsx` | 322-347, 489-514 | Mobile visual reaction test omits high-precision timing telemetry and interval metadata (`stimulusScheduledAt`, `interStimulusIntervalMs`, etc.) required by research ingestion. | Populate mobile trial observations with high-precision timing and interval metrics matching desktop `ReactionTest.tsx`. |
| **9** | **Medium** | 5 | 7 | **35** | `server/repositories/firestore/firestoreLeaderboardRepository.ts` | 30-49, 138-140 | `getAllEntriesForAdminPage` reads entire Firestore collection on each call; `adminService.ts` invokes it in a loop when filtering, causing an $O(N \times \text{pages})$ read storm. | Cache collection snapshot or filter over a single fetched set in `adminService.ts` rather than re-scanning entire collection each iteration. |
| **10** | **Medium** | 5 | 6 | **30** | `mobile/src/components/BlockMemoryTest.tsx`<br>`mobile/src/components/NumberMemoryTest.tsx` | 580-594<br>575-589 | `pulse_settings_open` listener clears only `transitionTimeoutRef` instead of calling `clearAllTimers()`, leaving active sequences & countdowns running behind the settings modal. | Replace `clearTimeout(transitionTimeoutRef.current)` with `clearAllTimers()` in `handleSettingsOpen`. |
| **11** | **Low** | 10 | 3 | **30** | `server/routes/researchRoutes.ts` | 160 | Direction test Telegram notifications display "• Conflict Cost: N/A" on 100% of completions because 4-choice RT protocol does not derive conflict cost. | Remove the Conflict Cost line from the Direction notification template in `telegramNotifierService.ts`. |
| **12** | **Medium** | 3 | 7 | **21** | `scripts/migrateLeaderboardPrivacyAndAudit.ts` | 77-83, 98 | Using JavaScript `delete` with Firestore Admin `tx.set(metaRef, meta, { merge: true })` does not remove fields, permanently retaining invalid owner UIDs. | Assign `FieldValue.delete()` instead of `delete meta[key]`, or write using `tx.set(metaRef, meta)` without `{ merge: true }`. |
| **13** | **Medium** | 4 | 4 | **16** | `server/routes/adminRoutes.ts` | 134-160 | Passing an invalid or stale pagination cursor throws `INVALID_CURSOR`, which falls back to HTTP 500 instead of HTTP 400 Bad Request. | Catch `INVALID_CURSOR` (or check `err.message === 'INVALID_CURSOR'`) and return HTTP 400 Bad Request with `{ success: false, error: 'Invalid cursor parameter' }`. |

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


---

## Reconciliation Notes

The aggregate disposition totals are reconciled from the five referee reports:

| Cycle | Candidates | Actionable | False positives | Below threshold |
|---|---:|---:|---:|---:|
| 1 | 5 | 4 | 0 | 1 |
| 2 | 7 | 5 | 2 | 0 |
| 3 | 4 | 3 | 1 | 0 |
| 4 | 8 | 0 | 5 | 3 |
| 5 | 3 | 1 | 0 | 2 |
| **Total** | **27** | **13** | **8** | **6** |

Cycle 4 BUG-6 is classified below threshold rather than as a false positive: the script can leave an unrelated stale owner-index pointer untouched and can overstate its console counter after early transaction returns, but no consuming path or production impact was established in the reviewed code. The Cycle 4 referee report records the evidence and follow-up tests.

## Security Review

[Security Cycle 1 — Hunter, Skeptic, and Referee](SECURITY%20CYCLE%201/) is a separate, incomplete source-only review. It contains one conditional admin-authentication finding (SEC-1) marked **Needs Validation**. It is not included in the 27 functional bug-hunt candidates or the 13 actionable functional bugs.

## Remediation

See the [Bug Fix Plan](BUG-FIX-PLAN.md) for the prioritized implementation sequence, regression coverage, and security validation gate.
