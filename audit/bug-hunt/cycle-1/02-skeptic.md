# Cycle 1: Bug Skeptic Report

**Date:** 2026-11-09  
**Agent Role:** Bug Skeptic  
**Subagent ID:** `3593eb23-d193-49dc-8971-74cab3359a23`  
**Evaluation Scope:** Adversarial challenge of BUG-1 through BUG-5.

---

### Challenge Decisions

#### BUG-1 | Original: 10 pts
- **Counter-argument:** None. The reported issue is confirmed real and severe. In desktop `DirectionTest.tsx`, premature triggers handled by `interceptFalseStart` (and anticipatory responses under 80ms) push observation objects to `rawObservationsRef.current` without the required `targetDirection` property. When the test completes, `rawObservationsRef.current` is submitted to the backend. The server derivation in `server/engines/flankerCalculator.ts` iterates over all submitted trials and calls `validateDirectionTrial`, which strictly checks `if (typeof t.targetDirection !== 'string' || !t.targetDirection.trim())` and returns a failure result. In turn, `server/services/researchService.ts` catches this validation failure and throws an HTTP 400 `AppError('Trial validation failed', 400)`, causing total submission loss whenever a participant commits a false start. Realistic Frequency is 6/10 and Impact is 10/10 (Frequency × Impact = 60).
- **Evidence:** `src/components/DirectionTest.tsx` lines 373-394 sets `test: 'direction'`, `stimulusTimestamp: null`, `falseStart: true`, but completely omits `targetDirection`. In `server/engines/flankerCalculator.ts` lines 10-12:
```ts
  if (typeof t.targetDirection !== 'string' || !t.targetDirection.trim()) {
    return { success: false, error: `Trial ${index + 1} is missing required 'targetDirection' field.` };
  }
```
- **Confidence:** 99% (that this is a real bug)
- **Risk calc:** EV of disproving = (1% x 10) - (99% x 20) = -19.7 pts
- **Decision:** ACCEPT

---

#### BUG-2 | Original: 10 pts
- **Counter-argument:** None. The reported issue is confirmed real and critical. In desktop `NumberMemoryTest.tsx`, `stimulusWallTimestamp.current` is assigned `performance.now()`, and `rawObservationsRef.current.push` sets `stimulusTimestamp: stimTime` and `responseTimestamp: now` where both are monotonic, document-relative timestamps from `performance.now()`. When submitted, `server/engines/assessmentEngine.ts` enforces `if (stimulusTimestamp < (session.createdAt - sessionWindowMargin))`. Because `session.createdAt` is a Unix epoch timestamp (~1.7e12 ms) while `performance.now()` is in the order of milliseconds since page origin (~1,000–60,000 ms), this condition is guaranteed to evaluate to true on the very first trial. As a result, 100% of desktop Number Memory submissions are rejected with an HTTP 400 error. Realistic Frequency is 10/10 and Impact is 10/10 (Frequency × Impact = 100).
- **Evidence:** `src/components/NumberMemoryTest.tsx` line 199 (`stimulusWallTimestamp.current = performance.now()`) and lines 342-343 (`stimulusTimestamp: stimTime, responseTimestamp: now`). In `server/engines/assessmentEngine.ts` lines 153-155:
```ts
      if (session) {
        if (stimulusTimestamp < (session.createdAt - sessionWindowMargin) || stimulusTimestamp > (session.expiresAt + sessionWindowMargin)) {
          return { success: false, error: `Trial ${i + 1} stimulusTimestamp is outside the authoritative session window.` };
        }
```
- **Confidence:** 99% (that this is a real bug)
- **Risk calc:** EV of disproving = (1% x 10) - (99% x 20) = -19.7 pts
- **Decision:** ACCEPT

---

#### BUG-3 | Original: 10 pts
- **Counter-argument:** None. The reported issue is confirmed real and critical. Identical to BUG-2, desktop `BlockMemoryTest.tsx` sets `stimulusWallTimestamp.current = performance.now()` and records `stimulusTimestamp: stimTime` and `responseTimestamp: now` using `performance.now()`. When submitted to `submitAssessmentResult`, `server/engines/assessmentEngine.ts` checks `stimulusTimestamp` against `session.createdAt - sessionWindowMargin`. Because monotonic milliseconds are compared against absolute Unix epoch timestamps, 100% of desktop Block Memory submissions fail session window validation and are rejected with an HTTP 400 error. Realistic Frequency is 10/10 and Impact is 10/10 (Frequency × Impact = 100).
- **Evidence:** `src/components/BlockMemoryTest.tsx` line 208 (`stimulusWallTimestamp.current = performance.now()`), lines 335-336, and lines 417-418 (`stimulusTimestamp: stimTime, responseTimestamp: now`). In `server/engines/assessmentEngine.ts` lines 153-155:
```ts
      if (session) {
        if (stimulusTimestamp < (session.createdAt - sessionWindowMargin) || stimulusTimestamp > (session.expiresAt + sessionWindowMargin)) {
          return { success: false, error: `Trial ${i + 1} stimulusTimestamp is outside the authoritative session window.` };
        }
```
- **Confidence:** 99% (that this is a real bug)
- **Risk calc:** EV of disproving = (1% x 10) - (99% x 20) = -19.7 pts
- **Decision:** ACCEPT

---

#### BUG-4 | Original: 10 pts
- **Counter-argument:** None. The reported issue is confirmed real and high-impact. In desktop `ColorTest.tsx`, when an anticipatory response under 80ms occurs, an observation is appended to `rawObservationsRef.current` with `falseStart: true`, and the trial is retried via `startTrialSequence(true)`. When that retried trial subsequently completes, another trial observation is appended to `rawObservationsRef.current`. Because the test continues until 15 valid trials are reached, any participant false start causes `rawObservationsRef.current.length` to be >= 16. When submitted, `server/engines/stroopCalculator.ts` strictly enforces `if (trials.length !== 15)`, causing immediate HTTP 400 rejection and complete data loss for any session with a false start. Realistic Frequency is 5/10 and Impact is 10/10 (Frequency × Impact = 50).
- **Evidence:** `src/components/ColorTest.tsx` lines 272-308 (`rawObservationsRef.current.push({ ... falseStart: true ... })` followed by `startTrialSequence(true)`). In `server/engines/stroopCalculator.ts` lines 120-122:
```ts
    if (trials.length !== 15) {
      return { success: false, error: `Color recognition test requires exactly 15 trials (received ${trials.length}).` };
    }
```
- **Confidence:** 99% (that this is a real bug)
- **Risk calc:** EV of disproving = (1% x 10) - (99% x 20) = -19.7 pts
- **Decision:** ACCEPT

---

#### BUG-5 | Original: 5 pts
- **Counter-argument:** This is a speculative non-issue and dead code branch that cannot occur under realistic application usage. Comprehensive tracing of all callers of `getDisplayedLeaderboardRank` across the entire codebase (`src/components/Leaderboard.tsx` line 525, `mobile/src/components/Leaderboard.tsx` line 328, `server/services/leaderboardAppService.ts` lines 225-230, and unit tests) reveals that `entry` is ALWAYS an element passed directly from the `entries` array. Because `entry` is always a member of `entries`, lines 47-58 populate `entriesMap` with `entry`, and lines 63-65 (`const rank = entriesMap.get(entry); if (rank !== undefined) return rank;`) always return the cached rank. The fallback code at lines 68-73 is dead/unreachable in all actual production code paths. Furthermore, even if hypothetically called with an unlisted entry whose score matches an existing score, line 72 resolves it. Evaluating an unlisted entry with a novel score is a rare, speculative theoretical case that no caller performs. Realistic Frequency = 1/10, Realistic Impact = 1/10, giving Frequency × Impact = 1 (< 5).
- **Evidence:** In `src/components/Leaderboard.tsx`:
```ts
displayedEntries.map((entry, idx) => {
  const rank = getDisplayedLeaderboardRank(displayedEntries, entry);
```
In `server/services/leaderboardAppService.ts`:
```ts
const publicSelf = visible.find(entry => entry.id === ownedBest.id);
if (!publicSelf) {
  return { rank: null, scoreMetric: ownedScore, displayName: ownedName, pendingReview: false };
}
return {
  rank: getDisplayedLeaderboardRank(visible, publicSelf),
...
```
In `shared/domain/leaderboardRanking.ts`:
```ts
  const rank = entriesMap.get(entry);
  if (rank !== undefined) {
    return rank;
  }
```
Line 64 always returns before line 73 is ever evaluated in production.
- **Confidence:** 95%
- **Risk calc:** EV = (95% x 5) - (5% x 10) = 4.75 - 0.50 = +4.25 pts
- **Decision:** DISPROVE

---

**SUMMARY:**
- Bugs disproved: 1 (total points claimed: 5)
- Bugs accepted as real: 4
- Your final score: 5

**ACCEPTED BUG LIST:**
- BUG-1 (Critical)
- BUG-2 (Critical)
- BUG-3 (Critical)
- BUG-4 (Critical)
