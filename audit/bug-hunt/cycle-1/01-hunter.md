# Cycle 1: Bug Hunter Report

**Date:** 2026-11-09  
**Agent Role:** Bug Hunter  
**Subagent ID:** `0ccd25c1-f08d-43e5-8c23-38bb3218d2c8`  
**Scope:** Core interactive test components, engines, and domain utilities.

---

### Findings

#### BUG-1 | Severity: Critical | Points: 10
- **File:** `src/components/DirectionTest.tsx`
- **Line(s):** 373-395
- **Category:** data-integrity
- **Estimated Frequency (1-10):** 6
- **Estimated Impact (1-10):** 10
- **Risk Score:** 60
- **Claim:** In desktop DirectionTest, `interceptFalseStart` pushes an observation object to `rawObservationsRef.current` without the required `targetDirection` property, causing the server derivation in `flankerCalculator.ts` to immediately reject the entire research submission with an HTTP 400 error.
- **Evidence:** `src/components/DirectionTest.tsx`:
```ts
    const obsIndex = rawObservationsRef.current.length + 1;
    rawObservationsRef.current.push({
      experimentId: sessionId,
      condition: 'flanker',
      conditionLabel: 'Flanker Direction Task',
      test: 'direction-flanker',
      trialNumber: currentTrial,
      trialIndex: obsIndex,
      sequenceNumber: obsIndex,
      attemptNumber: 1,
      userResponse: '',
      stimulusTimestamp: null,
      responseTimestamp: nowWall,
      reactionTime: null,
      rawReactionTime: null,
      accuracy: 0,
      correct: false,
      falseStart: true,
      timedOut: false,
      valid: false,
      validity: 'FALSE_START',
      ageGroup: selectedAgeGroup || undefined
    });
```
compared against `server/engines/flankerCalculator.ts`:
```ts
  if (typeof t.targetDirection !== 'string' || !t.targetDirection.trim()) {
    return { success: false, error: `Trial ${index + 1} is missing required 'targetDirection' field.` };
  }
```

---

#### BUG-2 | Severity: Critical | Points: 10
- **File:** `src/components/NumberMemoryTest.tsx`
- **Line(s):** 199, 308-309, 342-343
- **Category:** data-integrity
- **Estimated Frequency (1-10):** 10
- **Estimated Impact (1-10):** 10
- **Risk Score:** 100
- **Claim:** Desktop `NumberMemoryTest.tsx` stores monotonic document-relative `performance.now()` values instead of Unix epoch timestamps into `stimulusTimestamp` and `responseTimestamp`, causing the server assessment engine to fail authoritative session window validation and reject 100% of desktop Number Memory submissions with HTTP 400.
- **Evidence:** `src/components/NumberMemoryTest.tsx`:
```ts
stimulusWallTimestamp.current = performance.now();
...
stimulusTimestamp: stimulusWallTimestamp.current || (now - responseTime),
responseTimestamp: now,
```
(where `now = performance.now();`) compared against `server/engines/assessmentEngine.ts`:
```ts
    if (stimulusTimestamp < (session.createdAt - sessionWindowMargin)) {
      return {
        success: false,
        error: `Trial ${trialIndex} stimulusTimestamp is outside the authoritative session window.`
      };
    }
```

---

#### BUG-3 | Severity: Critical | Points: 10
- **File:** `src/components/BlockMemoryTest.tsx`
- **Line(s):** 208, 320-321, 335-336, 402-403, 417-418
- **Category:** data-integrity
- **Estimated Frequency (1-10):** 10
- **Estimated Impact (1-10):** 10
- **Risk Score:** 100
- **Claim:** Desktop `BlockMemoryTest.tsx` sets `stimulusWallTimestamp.current = performance.now()` and records trial timestamps using `performance.now()` instead of epoch timestamps, triggering server-side rejection in `assessmentEngine.ts` for all desktop Block Memory submissions.
- **Evidence:** `src/components/BlockMemoryTest.tsx`:
```ts
stimulusWallTimestamp.current = performance.now();
...
stimulusTimestamp: stimulusWallTimestamp.current || (now - responseTime),
responseTimestamp: now,
```
(where `now = performance.now();`) compared against `server/engines/assessmentEngine.ts`:
```ts
    if (stimulusTimestamp < (session.createdAt - sessionWindowMargin)) {
      return {
        success: false,
        error: `Trial ${trialIndex} stimulusTimestamp is outside the authoritative session window.`
      };
    }
```

---

#### BUG-4 | Severity: Critical | Points: 10
- **File:** `src/components/ColorTest.tsx`
- **Line(s):** 272-308
- **Category:** logic
- **Estimated Frequency (1-10):** 5
- **Estimated Impact (1-10):** 10
- **Risk Score:** 50
- **Claim:** Desktop `ColorTest.tsx` appends an observation on false start and retries the trial by calling `startTrialSequence(true)` which appends an additional trial observation upon completion, causing total trials to exceed 15 and triggering hard rejection by `stroopCalculator.ts`.
- **Evidence:** `src/components/ColorTest.tsx`:
```ts
    if (rawDelta < 80) {
      setEngineState('TRIAL_COMPLETE'); engineStateRef.current = 'TRIAL_COMPLETE';
      setStatusMessage('False Start');
      ...
      const obsIndex = rawObservationsRef.current.length + 1;
      rawObservationsRef.current.push({ ... });
      startTrialSequence(true);
      return;
    }
```
compared against `server/engines/stroopCalculator.ts`:
```ts
    if (trials.length !== 15) {
      return { success: false, error: `Color recognition test requires exactly 15 trials (received ${trials.length}).` };
    }
```

---

#### BUG-5 | Severity: Medium | Points: 5
- **File:** `shared/domain/leaderboardRanking.ts`
- **Line(s):** 73
- **Category:** edge-case
- **Estimated Frequency (1-10):** 4
- **Estimated Impact (1-10):** 5
- **Risk Score:** 20
- **Claim:** In `getDisplayedLeaderboardRank`, the fallback return value `sameAssessmentEntries.indexOf(entry) + 1` evaluates to `0` when evaluating an entry not contained in the given array whose score key was not already present in the rank cache.
- **Evidence:** `shared/domain/leaderboardRanking.ts`:
```ts
  // Edge case: the entry is not in the array but might be evaluated against it.
  const sameAssessmentEntries = entries.filter(candidate => candidate.assessmentType === entry.assessmentType);
  const key = scoreDisplayKey(entry);
  const firstIndex = sameAssessmentEntries.findIndex(candidate => scoreDisplayKey(candidate) === key);
  if (firstIndex >= 0) return firstIndex + 1;
  return sameAssessmentEntries.indexOf(entry) + 1;
```

---

**TOTAL FINDINGS:** 5  
**TOTAL SCORE:** 45  
