# Cycle 3: Bug Skeptic Report

**Date:** 2026-11-10  
**Agent Role:** Bug Skeptic (Cycle 3)  
**Subagent ID:** `bb93bb3a-6782-4897-a2c0-d7a10e5ab203`  
**Evaluation Scope:** Adversarial challenge of findings BUG-1 through BUG-4.

---

### Challenge Decisions

#### BUG-1 | Original: 10 pts
- **Counter-argument:** None. This is a severe, reproducible bug. In `mobile/src/components/DirectionTest.tsx`, when a participant reacts under 80ms (`rawLatency < 80`), the observation pushed to `rawObservationsRef.current` omits the `targetDirection` property (unlike `interceptFalseStart` at line 379, `interceptMissed` at line 255, and valid trials at line 484). When the assessment finishes, `rawObservationsRef.current` is submitted to `/api/research/submit`, where `server/engines/flankerCalculator.ts` strictly enforces `typeof t.targetDirection !== 'string' || !t.targetDirection.trim()`. The server immediately returns an error and `researchService.ts` throws an `AppError(..., 400)`, rejecting the entire 10-trial assessment. Realistic Frequency: 6/10, Impact: 8/10, Risk Score: 48.
- **Evidence:** 
In `mobile/src/components/DirectionTest.tsx:423-445`:
```ts
      const obsIndex3 = rawObservationsRef.current.length + 1;
      rawObservationsRef.current.push({
        trialIndex: obsIndex3,
        attemptNumber: attemptNumberRef.current,
        sequenceNumber: obsIndex3,
        experimentId: sessionId,
        condition: `arrow-${currentDirection.toLowerCase()}`,
        test: 'direction',
        trialNumber: currentTrialRef.current,
        stimulusTimestamp: stimWall,
        responseTimestamp: responseWallTime,
        reactionTime: netLatency,
        rawReactionTime: Number(rawLatency.toFixed(2)),
        displayDelayOffsetMs: null,
        displayDelayOffsetEstimated: null,
        displayDelayOffsetSource: null,
        accuracy: 0,
        falseStart: true,
        timedOut: false,
        valid: false,
        ageGroup: selectedAgeGroup || undefined,
        notes: 'anticipatory_response_<80ms'
      });
```
Directly rejected by `server/engines/flankerCalculator.ts:10-12`:
```ts
  if (typeof t.targetDirection !== 'string' || !t.targetDirection.trim()) {
    return { success: false, error: `Trial ${index + 1} is missing required 'targetDirection' field.` };
  }
```
- **Confidence:** 99%
- **Risk calc:** EV = (1% x 10) - (99% x 20) = -19.7
- **Decision:** ACCEPT

---

#### BUG-2 | Original: 5 pts
- **Counter-argument:** None. In the Firestore Admin SDK, calling `tx.set(metaRef, meta, { merge: true })` merges properties provided in `meta` into the document and leaves omitted properties in the Firestore document untouched. Deleting a key from a local JavaScript object via `delete meta.field` does NOT delete that field from Firestore when writing with `{ merge: true }`; `FieldValue.delete()` is required. Because `meta` is constructed as `{ ...existingMeta, ... }`, lines 78, 80, 82, 86, and 90 fail to remove invalid fields (`scoreMetric`, `ownerUid`, `sessionId`, `idempotencyKey`, `qualityFlags`) on existing metadata documents during migration reruns.
- **Evidence:**
In `scripts/migrateLeaderboardPrivacyAndAudit.ts:77-83, 98`:
```ts
        if (Number.isFinite(scoreMetric)) meta.scoreMetric = scoreMetric;
        else delete meta.scoreMetric;
        if (ownerUid) meta.ownerUid = ownerUid;
        else delete meta.ownerUid;
        if (sessionId) meta.sessionId = sessionId;
        else delete meta.sessionId;
...
        tx.set(metaRef, meta, { merge: true });
```
Whereas lines 99-101 for `publicRef` correctly use `FieldValue.delete()`:
```ts
        const scrub: Record<string, unknown> = {};
        for (const field of PRIVATE_PUBLIC_ROW_FIELDS) scrub[field] = FieldValue.delete();
        tx.update(publicRef, scrub);
```
- **Confidence:** 85%
- **Risk calc:** EV = (15% x 5) - (85% x 10) = -7.75
- **Decision:** ACCEPT

---

#### BUG-3 | Original: 5 pts
- **Counter-argument:** None. This is a real concurrency bug. In `mobile/src/components/BlockMemoryTest.tsx:580-594` and `mobile/src/components/NumberMemoryTest.tsx:575-589`, the `pulse_settings_open` event listener clears only `transitionTimeoutRef.current` and omits `clearAllTimers()`. Active timers stored in `sequenceTimeout.current` (used by `waitCancellable` during block sequence playback) and `intervalRef.current` (used by `startCountdown` for the 3-2-1 timer) continue running while the settings modal is open. When they fire, `startLevel(1)` or `waitCancellable` triggers async tile playback and state transitions to `'SHOWING'` or `'INPUT'` behind the modal, despite `activeRunIdRef.current` already being aborted.
- **Evidence:**
In `mobile/src/components/BlockMemoryTest.tsx:580-584`:
```ts
      if ((engineStateRef.current !== 'READY' || isStartingRef.current) && engineStateRef.current !== 'REPORT') {
        isStartingRef.current = false;
        if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
        if (activeRunIdRef.current) {
```
Contrasting with desktop `src/components/BlockMemoryTest.tsx:589`:
```ts
      if ((engineStateRef.current !== 'READY' || isStartingRef.current) && engineStateRef.current !== 'REPORT') {
        isStartingRef.current = false;
        clearAllTimers();
```
And `mobile/src/components/BlockMemoryTest.tsx:84-97` defines `clearAllTimers` to clean up all three handles:
```ts
  const clearAllTimers = useCallback(() => {
    if (sequenceTimeout.current) {
      clearTimeout(sequenceTimeout.current);
      sequenceTimeout.current = null;
    }
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
```
- **Confidence:** 95%
- **Risk calc:** EV = (5% x 5) - (95% x 10) = -9.25
- **Decision:** ACCEPT

---

#### BUG-4 | Original: 5 pts
- **Counter-argument:** The claim is a speculative non-issue based on a false premise.
1. The Hunter incorrectly assumes route paths (`reaction-test`, `direction-test`, `colour-recognition`) are valid query parameter values for `?assessmentType=`. In `PROTOCOLS`, the `route` property is strictly the destination view path for launching assessments via the "Play / Take Test" button (`onClick={() => onNavigate(currentProto.route)}`). It was never an alias for the query parameter contract.
2. Across the entire mobile application, every single component that navigates to the leaderboard exclusively passes canonical protocol IDs (`p.id`):
   - `ColorTest.tsx`: `onViewLeaderboard={() => onNavigate('/leaderboard?assessmentType=color-recognition')}`
   - `DirectionTest.tsx`: `onViewLeaderboard={() => onNavigate('/leaderboard?assessmentType=direction')}`
   - `ReactionTest.tsx`: `onViewLeaderboard={() => onNavigate('/leaderboard?assessmentType=visual-reaction')}`
   - `BlockMemoryTest.tsx`: `onViewLeaderboard={() => onNavigate('/leaderboard?assessmentType=block-memory')}`
   - `NumberMemoryTest.tsx`: `onViewLeaderboard={() => onNavigate('/leaderboard?assessmentType=number-memory')}`
   Not a single link or route in the application ever generates `?assessmentType=colour-recognition`, `reaction-test`, or `direction-test`.
3. In a mobile environment, users do not type query parameters into the URL bar. Realistic Frequency is 1/10. If an unknown query parameter is encountered, falling back to the default `visual-reaction` protocol tab is safe graceful degradation. Realistic Impact is 2/10.
4. Realistic Frequency (1) × Impact (2) = 2, which is strictly less than 5. Under the Frequency, Impact, and Reality Filter, this is a speculative non-issue that should be left alone.
- **Evidence:**
In `mobile/src/components/Leaderboard.tsx:12-18`:
```ts
const PROTOCOLS: { id: AssessmentType; route: string; name: string; shortName: string; unit: string; logo: string }[] = [
  { id: 'visual-reaction', route: 'reaction-test', name: 'VISUAL REACTION', shortName: 'Reaction', unit: 'ms', logo: '/brand/assessments/visual-reaction.png' },
  { id: 'direction', route: 'direction-test', name: 'DIRECTION', shortName: 'Direction', unit: 'ms', logo: '/brand/assessments/directional-choice.png' },
  { id: 'color-recognition', route: 'colour-recognition', name: 'COLOUR RECOGNITION', shortName: 'Colour', unit: 'ms', logo: '/brand/assessments/colour-recognition.png' },
  { id: 'block-memory', route: 'block-memory', name: 'BLOCK MEMORY', shortName: 'Block Mem', unit: 'Blocks', logo: '/brand/assessments/block-memory.png' },
  { id: 'number-memory', route: 'number-memory', name: 'NUMBER MEMORY', shortName: 'Number Mem', unit: 'Digits', logo: '/brand/assessments/number-memory.png' },
];
```
And usage on line 351:
```ts
<button onClick={() => onNavigate(currentProto.route)}>
```
- **Confidence:** 95%
- **Risk calc:** EV = (95% x 5) - (5% x 10) = 4.75 - 0.50 = +4.25
- **Decision:** DISPROVE

---

**SUMMARY:**
- Bugs disproved: 1 (total points claimed: 5)
- Bugs accepted as real: 3
- Final Score: 5 pts

**ACCEPTED BUG LIST:**
- BUG-1 | Severity: Critical
- BUG-2 | Severity: Medium
- BUG-3 | Severity: Medium
