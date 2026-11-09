# Cycle 1: Bug Referee Report

**Date:** 2026-11-09  
**Agent Role:** Bug Referee (Final Arbiter)  
**Subagent ID:** `4f153646-f0b6-4621-b7bc-56405a885ff2`  
**Evaluation Scope:** Authoritative verification and risk scoring of findings BUG-1 through BUG-5.

---

### Verified Bug Judgments

#### BUG-1
- **Hunter's claim:** In desktop `DirectionTest.tsx`, `interceptFalseStart` pushes an observation object to `rawObservationsRef.current` without the required `targetDirection` property, causing server derivation in `flankerCalculator.ts` to reject the research submission with an HTTP 400 error.
- **Skeptic's response:** ACCEPT. Confirmed real and severe. Also notes anticipatory responses under 80ms have the same omission. When submitted, `server/engines/flankerCalculator.ts` strictly validates `targetDirection` via `validateDirectionTrial` and rejects the session, resulting in 100% submission loss whenever a false start occurs.
- **Your analysis:** Examination of `src/components/DirectionTest.tsx` confirms that `interceptFalseStart` (lines 373-394) and the anticipatory RT check (`rawLatency < 80`, lines 424-445) push trial observations omitting `targetDirection`. When `submitAssessmentResult` submits `rawObservationsRef.current` (line 674), the server calls `deriveDirectionMetrics` in `server/engines/flankerCalculator.ts`. Line 10 strictly requires `if (typeof t.targetDirection !== 'string' || !t.targetDirection.trim())` and returns a validation error, resulting in HTTP 400 and total data loss. Both the Hunter and Skeptic are correct that this is a critical defect.
- **Frequency (1-10):** 6
- **Impact (1-10):** 10
- **Risk Score:** 60
- **VERDICT:** ACTIONABLE BUG (Score ≥ 5)
- **Confidence:** High
- **True severity:** Critical
- **Suggested fix:** Add `targetDirection: currentDirection.toLowerCase()` to the observation payloads in `interceptFalseStart` and the `< 80ms` branch within `captureResponse` in `src/components/DirectionTest.tsx`.

---

#### BUG-2
- **Hunter's claim:** Desktop `NumberMemoryTest.tsx` stores monotonic document-relative `performance.now()` values instead of Unix epoch timestamps into `stimulusTimestamp` and `responseTimestamp`, causing the server assessment engine to fail authoritative session window validation and reject 100% of desktop Number Memory submissions with HTTP 400.
- **Skeptic's response:** ACCEPT. Confirmed real and critical. `stimulusWallTimestamp.current` is set to `performance.now()` (~1,000–60,000ms), which is compared against Unix epoch timestamps (~1.7e12ms) in `server/engines/assessmentEngine.ts`. 100% of desktop Number Memory submissions fail session window validation on trial 1.
- **Your analysis:** Examination of `src/components/NumberMemoryTest.tsx` confirms line 199 sets `stimulusWallTimestamp.current = performance.now()` and line 308 sets `const now = performance.now()`, which are then written directly to `stimulusTimestamp` and `responseTimestamp` in `rawObservationsRef.current` (lines 342-343). In `server/engines/assessmentEngine.ts` lines 153-155, the server checks `stimulusTimestamp < (session.createdAt - sessionWindowMargin)`. Because `performance.now()` is in the thousands of milliseconds while `session.createdAt` is a Unix epoch timestamp, this condition is guaranteed to evaluate to true on the very first trial. 100% of desktop submissions fail with HTTP 400. Both Hunter and Skeptic are correct.
- **Frequency (1-10):** 10
- **Impact (1-10):** 10
- **Risk Score:** 100
- **VERDICT:** ACTIONABLE BUG (Score ≥ 5)
- **Confidence:** High
- **True severity:** Critical
- **Suggested fix:** In `src/components/NumberMemoryTest.tsx`, record `Date.now()` into `stimulusWallTimestamp.current`, `stimulusTimestamp`, and `responseTimestamp` for wall-clock timestamps, while retaining `performance.now()` strictly for internal relative reaction time calculations.

---

#### BUG-3
- **Hunter's claim:** Desktop `BlockMemoryTest.tsx` sets `stimulusWallTimestamp.current = performance.now()` and records trial timestamps using `performance.now()` instead of epoch timestamps, triggering server-side rejection in `assessmentEngine.ts` for all desktop Block Memory submissions.
- **Skeptic's response:** ACCEPT. Confirmed real and critical. Exactly like BUG-2, monotonic millisecond timestamps are compared against absolute Unix epoch timestamps in `server/engines/assessmentEngine.ts`, rejecting 100% of desktop Block Memory submissions with HTTP 400.
- **Your analysis:** Examination of `src/components/BlockMemoryTest.tsx` confirms line 208 sets `stimulusWallTimestamp.current = performance.now()`, lines 320-321 and 402-403 set `now = performance.now()`, and lines 335-336 and 417-418 record these monotonic values into `stimulusTimestamp` and `responseTimestamp`. In `server/engines/assessmentEngine.ts` lines 153-155, the server compares `stimulusTimestamp` against `session.createdAt - sessionWindowMargin`. This guarantees failure on trial 1 for every desktop submission. Both Hunter and Skeptic are correct.
- **Frequency (1-10):** 10
- **Impact (1-10):** 10
- **Risk Score:** 100
- **VERDICT:** ACTIONABLE BUG (Score ≥ 5)
- **Confidence:** High
- **True severity:** Critical
- **Suggested fix:** In `src/components/BlockMemoryTest.tsx`, assign `Date.now()` to `stimulusWallTimestamp.current`, `stimulusTimestamp`, and `responseTimestamp`, preserving `performance.now()` only for relative duration measurement.

---

#### BUG-4
- **Hunter's claim:** Desktop `ColorTest.tsx` appends an observation on false start and retries the trial by calling `startTrialSequence(true)` which appends an additional trial observation upon completion, causing total trials to exceed 15 and triggering hard rejection by `stroopCalculator.ts`.
- **Skeptic's response:** ACCEPT. Confirmed real and high-impact. Anticipatory responses under 80ms append an observation with `falseStart: true` to `rawObservationsRef.current`. Retrying until 15 valid trials are reached causes `rawObservationsRef.current.length` to be >= 16. In `server/engines/stroopCalculator.ts`, lines 120-122 enforce `if (trials.length !== 15)`, causing immediate HTTP 400 rejection and complete data loss.
- **Your analysis:** Examination of `src/components/ColorTest.tsx` lines 272-308 shows that an anticipatory response (`rawDelta < 80`) pushes a trial observation to `rawObservationsRef.current` with `falseStart: true` and calls `startTrialSequence(true)` without advancing `trialDatasetRef.current`. The test continues until 15 valid trials are completed, each adding another observation to `rawObservationsRef.current`. Line 641 submits `trials: rawObservationsRef.current`. In `server/engines/stroopCalculator.ts` lines 120-122, `deriveColorRecognitionMetrics` strictly validates `if (trials.length !== 15)` and immediately rejects any payload with length != 15. Any session with a false start is rejected with HTTP 400. Both Hunter and Skeptic are correct.
- **Frequency (1-10):** 5
- **Impact (1-10):** 10
- **Risk Score:** 50
- **VERDICT:** ACTIONABLE BUG (Score ≥ 5)
- **Confidence:** High
- **True severity:** Critical
- **Suggested fix:** In `src/components/ColorTest.tsx`, do not append retried false starts as extra trials into the submitted array (or slice/filter the submitted observations to the 15 completed trials), or adjust `stroopCalculator.ts` to accept trial datasets containing false start retries.

---

#### BUG-5
- **Hunter's claim:** In `getDisplayedLeaderboardRank`, the fallback return value `sameAssessmentEntries.indexOf(entry) + 1` evaluates to `0` when evaluating an entry not contained in the given array whose score key was not already present in the rank cache.
- **Skeptic's response:** DISPROVE. Speculative non-issue and dead code branch under realistic usage. Tracing all callers (`src/components/Leaderboard.tsx`, `mobile/src/components/Leaderboard.tsx`, `server/services/leaderboardAppService.ts`, tests) shows `entry` is always a member of `entries`. Lines 47-58 populate `entriesMap` with `entry`, and lines 63-65 return the rank from `entriesMap.get(entry)`. The fallback code at line 73 is unreachable in production code. Frequency = 1/10, Impact = 1/10, Risk Score = 1 (< 5).
- **Your analysis:** Inspection of `shared/domain/leaderboardRanking.ts` lines 63-74 shows that lines 68-73 are fallback handling for an unlisted entry. While line 73 would evaluate `-1 + 1 = 0` if an external unlisted entry with a novel score were passed, comprehensive search across the codebase confirms that every caller (`src/components/Leaderboard.tsx:525`, `mobile/src/components/Leaderboard.tsx:328`, `server/services/leaderboardAppService.ts:230`) passes an `entry` that is already a member of `entries`. Line 64 always returns before lines 68-73 can ever execute. Per guidelines, unused speculative paths are rated Frequency 1 and Impact 1 (Risk Score 1 < 5) and left alone under YAGNI. The Skeptic is right.
- **Frequency (1-10):** 1
- **Impact (1-10):** 1
- **Risk Score:** 1
- **VERDICT:** DISMISSED (Score < 5 - Leave alone)
- **Confidence:** High
- **True severity:** Low
- **Suggested fix:** None needed (left alone per YAGNI / below threshold).

---

## VERIFIED BUG REPORT

### Stats:
- Total reported by Hunter: 5
- Dismissed as false positives (Not a bug): 0
- Dismissed below threshold (Frequency × Impact < 5 or rare/future cases): 1
- Confirmed actionable bugs (Risk Score ≥ 5): 4
- Critical: 4 | Medium: 0 | Low: 0

### Confirmed Actionable Bugs (ordered by Risk Score descending):

| # | Severity | Frequency (1-10) | Impact (1-10) | Risk Score | File | Line(s) | Description | Suggested Fix |
|---|----------|------------------|---------------|------------|------|---------|-------------|---------------|
| **BUG-2** | Critical | 10 | 10 | 100 | `src/components/NumberMemoryTest.tsx` | 199, 308-309, 342-343 | Monotonic `performance.now()` is recorded for `stimulusTimestamp` and `responseTimestamp` instead of Unix epoch timestamps, failing server session window validation and rejecting 100% of desktop Number Memory submissions with HTTP 400. | Use `Date.now()` for `stimulusWallTimestamp.current` and observation timestamps; keep `performance.now()` solely for internal latency math. |
| **BUG-3** | Critical | 10 | 10 | 100 | `src/components/BlockMemoryTest.tsx` | 208, 320-321, 335-336, 402-403, 417-418 | Monotonic `performance.now()` is recorded for `stimulusTimestamp` and `responseTimestamp` instead of Unix epoch timestamps, failing server session window validation and rejecting 100% of desktop Block Memory submissions with HTTP 400. | Use `Date.now()` for `stimulusWallTimestamp.current` and observation timestamps; keep `performance.now()` solely for internal latency math. |
| **BUG-1** | Critical | 6 | 10 | 60 | `src/components/DirectionTest.tsx` | 373-395, 424-445 | `interceptFalseStart` and anticipatory `< 80ms` observations omit `targetDirection`, causing `flankerCalculator.ts:validateDirectionTrial` to fail and reject the assessment with HTTP 400 whenever a false start occurs. | Add `targetDirection: currentDirection.toLowerCase()` to the observation payloads in `interceptFalseStart` and the `< 80ms` branch. |
| **BUG-4** | Critical | 5 | 10 | 50 | `src/components/ColorTest.tsx` | 272-308 | False start observations (< 80ms) are pushed to `rawObservationsRef.current` and retried, resulting in > 15 submitted trials, violating the strict `trials.length === 15` validation in `stroopCalculator.ts` and failing the submission with HTTP 400. | Do not append retried false starts as extra trials in the submitted array, or slice/filter submitted observations to the 15 completed trials. |

### Dismissed Below Threshold (Score < 5 - Left Alone per YAGNI):
- **BUG-5 (`shared/domain/leaderboardRanking.ts:73`):** In `getDisplayedLeaderboardRank`, evaluating an unlisted entry with a novel score returns `0` due to `indexOf(entry) + 1`. However, comprehensive tracing confirms that in all production callers (`src/components/Leaderboard.tsx`, `mobile/src/components/Leaderboard.tsx`, `server/services/leaderboardAppService.ts`), `entry` is always a member of `entries`, so lines 63-65 always return early from cache. Frequency = 1, Impact = 1, Risk Score = 1 (< 5). Left alone per YAGNI and threshold guidelines.

### Low-Confidence Items (Flagged for Manual Review):
- None. All items verified with high confidence against actual codebase implementations.
