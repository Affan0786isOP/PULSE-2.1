# Cycle 3: Bug Hunter Report (Ponytail Senior Dev Lens)

**Date:** 2026-11-10  
**Agent Role:** Bug Hunter (Cycle 3)  
**Subagent ID:** `5da8aed0-ae12-4332-b2c1-0655a293b021`  
**Evaluation Scope:** Unexplored areas: `mobile/src/components/`, `scripts/`, `src/components/`, and background modal event handlers.

---

### Findings

#### BUG-1 | Severity: Critical | Points: 10
- **File:** `mobile/src/components/DirectionTest.tsx`
- **Line(s):** 423-445
- **Category:** logic
- **Estimated Frequency (1-10):** 6
- **Estimated Impact (1-10):** 8
- **Risk Score:** 48
- **Claim:** When a participant responds under 80ms (anticipatory physiological false start), `rawObservationsRef.current.push` omits the mandatory `targetDirection` property, causing the authoritative server calculator (`server/engines/flankerCalculator.ts`) to immediately reject the entire research submission with a 400 error.
- **Evidence:**
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
      return;
```
Compared with `server/engines/flankerCalculator.ts:10-12`:
```ts
  for (const [index, t] of trials.entries()) {
    if (typeof t.targetDirection !== 'string' || !t.targetDirection.trim()) {
      return { success: false, error: `Trial ${index + 1} is missing required 'targetDirection' field.` };
    }
```

---

#### BUG-2 | Severity: Medium | Points: 5
- **File:** `scripts/migrateLeaderboardPrivacyAndAudit.ts`
- **Line(s):** 77-83, 98
- **Category:** data-integrity
- **Estimated Frequency (1-10):** 3
- **Estimated Impact (1-10):** 7
- **Risk Score:** 21
- **Claim:** Invalid or missing metadata fields (ownerUid, sessionId, scoreMetric, idempotencyKey, qualityFlags) cannot be removed using JavaScript delete when writing via `tx.set(metaRef, meta, { merge: true })`, permanently retaining incorrect owner UIDs on private metadata records and allowing unauthorized users to claim or mutate other users' entries.
- **Evidence:**
```ts
        if (Number.isFinite(scoreMetric)) meta.scoreMetric = scoreMetric;
        else delete meta.scoreMetric;
        if (ownerUid) meta.ownerUid = ownerUid;
        else delete meta.ownerUid;
        if (sessionId) meta.sessionId = sessionId;
        else delete meta.sessionId;

        const idempotencyKey = existingMeta.idempotencyKey || row.idempotencyKey;
        if (typeof idempotencyKey === 'string') meta.idempotencyKey = idempotencyKey;
        else delete meta.idempotencyKey;

        const qualityFlags = existingMeta.qualityFlags || row.qualityFlags;
        if (Array.isArray(qualityFlags)) meta.qualityFlags = qualityFlags;
        else delete meta.qualityFlags;
...
        tx.set(metaRef, meta, { merge: true });
```
In the Firestore Admin SDK, `{ merge: true }` ignores omitted fields and does not delete existing document fields; `FieldValue.delete()` is required to delete fields.

---

#### BUG-3 | Severity: Medium | Points: 5
- **File:** `mobile/src/components/BlockMemoryTest.tsx`
- **Line(s):** 580-594 (also applies to `mobile/src/components/NumberMemoryTest.tsx:575-589`)
- **Category:** concurrency
- **Estimated Frequency (1-10):** 5
- **Estimated Impact (1-10):** 6
- **Risk Score:** 30
- **Claim:** The mobile `pulse_settings_open` event listener clears only `transitionTimeoutRef.current` instead of invoking `clearAllTimers()`, leaving active sequence playback timeouts and 3-2-1 countdown intervals running in the background while the settings modal is open.
- **Evidence:**
In `mobile/src/components/BlockMemoryTest.tsx:580-584`:
```ts
      if ((engineStateRef.current !== 'READY' || isStartingRef.current) && engineStateRef.current !== 'REPORT') {
        isStartingRef.current = false;
        if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
        if (activeRunIdRef.current) {
```
and `mobile/src/components/NumberMemoryTest.tsx:575-579`:
```ts
      if ((engineStateRef.current !== 'READY' || isStartingRef.current) && engineStateRef.current !== 'REPORT') {
        isStartingRef.current = false;
        if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
        if (activeRunIdRef.current) {
```
Whereas desktop counterparts (`src/components/BlockMemoryTest.tsx:589`, `src/components/NumberMemoryTest.tsx:604`) invoke `clearAllTimers()`, mobile leaves `sequenceTimeout.current` and `intervalRef.current` active, triggering state transitions and async tile playback behind the open modal.

---

#### BUG-4 | Severity: Medium | Points: 5
- **File:** `mobile/src/components/Leaderboard.tsx`
- **Line(s):** 42, 96-105
- **Category:** logic
- **Estimated Frequency (1-10):** 5
- **Estimated Impact (1-10):** 5
- **Risk Score:** 25
- **Claim:** The mobile Leaderboard component strictly matches `assessmentType` against internal protocol IDs rather than normalizing URL aliases or route names, causing valid query parameters like `?assessmentType=colour-recognition`, `reaction-test`, and `direction-test` to fail matching and be forcibly rewritten to `visual-reaction`.
- **Evidence:**
In `mobile/src/components/Leaderboard.tsx:42`:
```ts
  const initialProtocol = PROTOCOLS.find(p => p.id === searchParams.get('assessmentType'))?.id || 'visual-reaction';
```
and lines 96-101:
```ts
    const fromUrl = PROTOCOLS.find(p => p.id === searchParams.get('assessmentType'))?.id;
    if (!fromUrl) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('assessmentType', selectedProtocol);
      setSearchParams(nextParams, { replace: true });
    }
```
Because PROTOCOLS defines `route: 'colour-recognition'` with `id: 'color-recognition'` (and `reaction-test` for `visual-reaction`, `direction-test` for `direction`), incoming URL route parameters or aliases fail the strict `p.id === ...` lookup and are immediately overwritten with `visual-reaction`.

---

**TOTAL FINDINGS:** 4  
**TOTAL SCORE:** 25  
