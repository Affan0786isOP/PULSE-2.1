# PULSE v2.1 — Cycle 8 Adversarial Bug Hunt Report (Assessment Calculation Engines, PRNG, and Mobile Color Test)

**Auditor:** Bug Hunter Agent (Cycle 8)  
**Methodology:** Ponytail Senior Dev Audit (/ponytail-audit lens: correctness, concurrency/scale races under load, missing tests for risky logic, security boundaries, and lean bloat/dead code)  
**Threshold Applied:** Frequency (1–10) × Impact (1–10) ≥ 5.

---

## 1. Executive Summary

Cycle 8 focused on the core mathematical calculation engines, PRNG determinism, and mobile test execution components of the PULSE assessment platform:
1. `server/engines/assessmentEngine.ts`
2. `server/engines/reactionCalculator.ts`
3. `server/engines/memoryCalculator.ts`
4. `server/engines/flankerCalculator.ts`
5. `server/engines/stroopCalculator.ts`
6. `server/engines/prng.ts`
7. `mobile/src/components/ColorTest.tsx`

Ten concrete, high-impact defects were discovered. The findings range from a critical contract mismatch where the server rejects any Stroop assessment with false-start retries due to a hardcoded `trials.length !== 15` limit, an accuracy calculation inversion across Flanker and Stroop that awards 100% accuracy to sessions with 90% missed/timed-out trials, metric erasure in Flanker when modern `rawLatencyMs` telemetry is submitted, strict boundary misclassifications at 80.00ms due to hardcoded `80.01ms` thresholds, omitted client schema properties on mobile timeout observations, zero-diluted Stroop interference costs, and memory trial limit constant mismatches.

---

## 2. Quantitative Defect Ranking Matrix

| ID | Category | Target File | Defect Summary | Freq (1–10) | Impact (1–10) | Risk Score (F×I) |
|---|---|---|---|:---:|:---:|:---:|
| **BUG-C8-01** | Protocol Mismatch / Contract | [stroopCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L120-L122) | Hardcoded `trials.length !== 15` in Stroop engine rejects false-start retries permitted by `ASSESSMENT_TRIAL_LIMITS` (40) | 8 | 9 | **72** |
| **BUG-C8-02** | Statistical / Psychometrics | [flankerCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L190-L215) & [stroopCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L241-L242) | Timeout omission in accuracy denominator yields 100% accuracy when 90% of trials timed out | 7 | 8 | **56** |
| **BUG-C8-03** | Data Integrity / Protocol | [flankerCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L178-L188) | Flanker summary derivation drops `rawLatencyMs` and `rawLatency`, producing null reaction time metrics | 6 | 8 | **48** |
| **BUG-C8-04** | Boundary / Precision | [stroopCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L81) | Hardcoded `80.01ms` floor misclassifies legitimate 80.00ms responses as anticipatory false starts | 6 | 7 | **42** |
| **BUG-C8-05** | Protocol / Data Integrity | [ColorTest.tsx](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx#L246-L253) | Mobile ColorTest awards success chime on false starts and omits 5 core metadata fields on timeout observations | 8 | 5 | **40** |
| **BUG-C8-06** | Math / Correctness | [stroopCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L261-L271) | Stroop condition averages omit `t.rawLatency`, zero-diluting condition RTs and corrupting interference cost | 5 | 7 | **35** |
| **BUG-C8-07** | Gateway Discrepancy | [assessmentEngine.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L12-L13) & [memoryCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/memoryCalculator.ts#L110) | Trial limit discrepancy between `assessmentEngine` (105) and `memoryCalculator` (103) crashes valid runs | 5 | 6 | **30** |
| **BUG-C8-08** | Validation / Security | [assessmentEngine.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L149-L151) | Unchecked `rawRt` allows negative latency payloads to bypass structural physiological validation | 4 | 6 | **24** |
| **BUG-C8-09** | PRNG / Determinism | [assessmentEngine.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L32) | Missing `session.sessionId` property causes PRNG degradation to literal `"undefined"` seed strings | 4 | 5 | **20** |
| **BUG-C8-10** | Contract / Schema Bloat | [stroopCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L273-L284) | Stroop derived metrics omit `totalFalseStarts`, `totalTrials`, and `totalIncorrect`, breaking unified reporting | 6 | 3 | **18** |

---

## 3. Deep Dive Defect Analysis & Minimal Surgical Fixes

---

### BUG-C8-01: Hardcoded `trials.length !== 15` in Stroop Engine Rejects False-Start Retries Permitted by `ASSESSMENT_TRIAL_LIMITS` (40)

- **File Link:** [stroopCalculator.ts#L120-L122](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L120-L122) and [assessmentEngine.ts#L11](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L11)
- **Defect Description:**
  In `server/engines/assessmentEngine.ts`, the trial limit for the color recognition assessment is defined as 40:
  ```ts
  export const ASSESSMENT_TRIAL_LIMITS: Record<string, number> = {
    'visual-reaction': 30,
    direction: 30,
    'color-recognition': 40,
    'block-memory': 105,
    'number-memory': 105
  };
  ```
  The reason for the 40-trial envelope is to allow participants who trigger anticipatory false starts (`< 80ms`) or pre-stimulus taps to have their trials repeated (retried) while recording all raw observation attempts.
  However, in `server/engines/stroopCalculator.ts`:
  ```ts
  export function deriveColorRecognitionMetrics(ctx: DerivationContext): DerivationResult {
    const { trials, ageGroup, session, sessionId } = ctx;
    if (trials.length !== 15) {
      return { success: false, error: `Color recognition test requires exactly 15 trials (received ${trials.length}).` };
    }
  ```
  And inside the validation loop:
  ```ts
  for (let i = 0; i < trials.length; i++) {
    const t = trials[i];
    const plan = plans[i];
    const prngTrial = seedPRNG(sessionId + "-color-trial-" + i);
  ```
  `stroopCalculator.ts` strictly demands that `trials.length === 15` and directly indexes `plans[i]` and `seedPRNG(... + i)` with the raw observation index `i`.
  When a desktop client (`src/components/ColorTest.tsx#L305-L307`) or any client that properly records false-start observations and retries the trial submits its observation sequence (e.g., 1 false start + 15 valid trials = 16 observations), `assessmentEngine.ts` allows it through (16 <= 40), but `stroopCalculator.ts` unconditionally rejects the entire assessment with `Color recognition test requires exactly 15 trials (received 16)`.
- **Frequency:** 8/10. Happens on 100% of client sessions that experience at least one false start on clients adhering to retry protocols.
- **Impact:** 9/10. Outright assessment failure and rejection of valid participant data.
- **Surgical Root-Cause Fix:**
  In `server/engines/stroopCalculator.ts`, align `stroopCalculator` with `flankerCalculator.ts` and `reactionCalculator.ts`: deduplicate trials by logical position / `trialNumber`, ensure 15 completed non-false-start trials exist, and index `plans` and `prngTrial` by the logical trial index (`t.trialNumber - 1`):
  ```ts
  // Deduplicate to latest attempt per logical trialNumber
  const dedupedTrials = trials.filter((t, idx, arr) => {
    for (let i = arr.length - 1; i > idx; i--) {
      if (arr[i].trialNumber === t.trialNumber) return false;
    }
    return true;
  });

  if (dedupedTrials.length !== 15) {
    return { success: false, error: `Color recognition test requires exactly 15 logical trials (received ${dedupedTrials.length}).` };
  }
  ```

---

### BUG-C8-02: Timeout Omission in Accuracy Denominator Yields 100% Accuracy When 90% of Trials Timed Out

- **File Link:** [flankerCalculator.ts#L190-L215](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L190-L215), [stroopCalculator.ts#L241-L242](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L241-L242), and [ColorTest.tsx#L196](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx#L196)
- **Defect Description:**
  In `flankerCalculator.ts`:
  ```ts
  const validTrialsCount = dedupedTrials.filter(t => !t.falseStart && !t.timedOut).length;
  if (validTrialsCount === 0) {
    return { success: false, error: 'No valid trials found for Direction test.' };
  }
  const accuracy = Math.round(((totalCorrect / validTrialsCount) * 100.0) * 100) / 100;
  ...
  const derivedMetrics: Record<string, any> = {
    accuracy,
    totalCorrect,
    totalTrials: 10,
    totalIncorrect: Math.max(0, 10 - totalCorrect),
    totalFalseStarts: falseStartsCount
  };
  ```
  And identically in `stroopCalculator.ts`:
  ```ts
  const validTrialsCount = trials.filter(t => !t.falseStart && !t.timedOut).length;
  const accuracy = validTrialsCount > 0 ? Math.round(((correctCount / validTrialsCount) * 100.0) * 100) / 100 : 0;
  ```
  In psychometrics, a timeout in a choice reaction time task (Flanker arrow matching or Stroop color identification) is an omission error.
  By filtering out `!t.timedOut`, timeouts are excluded from the denominator.
  Consider a participant who responds to 1 trial correctly and misses / times out on the remaining 9 trials (or 14 trials in Stroop):
  - `totalCorrect` = 1
  - `validTrialsCount` = 1
  - `accuracy` = 1 / 1 = **100%**!
  In `flankerCalculator.ts`, the engine returns:
  `{ accuracy: 100, totalCorrect: 1, totalTrials: 10, totalIncorrect: 9 }`.
  This is a direct mathematical contradiction: 9 out of 10 trials were incorrect, but accuracy is reported as 100%. Fraudulent or severely distracted participants post 100% accuracy scores to public leaderboards despite failing 90% of the assessment.
- **Frequency:** 7/10. Affects any assessment where participants fail to respond within the 3000ms window on one or more trials.
- **Impact:** 8/10. Severe corruption of clinical psychometric data and leaderboard accuracy scores.
- **Surgical Root-Cause Fix:**
  In `flankerCalculator.ts`, `stroopCalculator.ts`, and `ColorTest.tsx`, the accuracy denominator must be the total evaluated trials (excluding only pre-stimulus false starts, where the stimulus was never processed):
  ```ts
  // In flankerCalculator.ts:
  const assessedTrialsCount = dedupedTrials.filter(t => !t.falseStart).length;
  const accuracy = assessedTrialsCount > 0 
    ? Math.round(((totalCorrect / assessedTrialsCount) * 100.0) * 100) / 100 
    : 0;

  // In stroopCalculator.ts:
  const assessedTrialsCount = trials.filter(t => !t.falseStart).length;
  const accuracy = assessedTrialsCount > 0 
    ? Math.round(((correctCount / assessedTrialsCount) * 100.0) * 100) / 100 
    : 0;
  ```

---

### BUG-C8-03: Flanker Summary Derivation Drops `rawLatencyMs` and `rawLatency`, Producing Null Reaction Time Metrics

- **File Link:** [flankerCalculator.ts#L178-L188](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L178-L188) vs [flankerCalculator.ts#L26-L35](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L26-L35)
- **Defect Description:**
  In `validateDirectionTrial`, `flankerCalculator.ts` explicitly supports the modern v1.1.0 telemetry protocol properties `rawLatencyMs` and `rawLatency`:
  ```ts
  let rawRt: number | null = null;
  if (t.rawReactionTime !== null && t.rawReactionTime !== undefined && !Number.isNaN(Number(t.rawReactionTime))) {
    rawRt = Number(t.rawReactionTime);
  } else if (t.rawLatencyMs !== null && t.rawLatencyMs !== undefined && !Number.isNaN(Number(t.rawLatencyMs))) {
    rawRt = Number(t.rawLatencyMs);
  } else if (t.rawLatency !== null && t.rawLatency !== undefined && !Number.isNaN(Number(t.rawLatency))) {
    rawRt = Number(t.rawLatency);
  ...
  ```
  And in lines 110-121, `rawRtPhysiological` is populated using this same chain.
  However, after trials are validated and deduplicated, lines 178-188 compute `validRTs`:
  ```ts
  for (const dt of dedupedTrials) {
    const rt = typeof dt.reactionTime === 'number'
      ? dt.reactionTime
      : (typeof dt.reactionTimeMs === 'number'
          ? dt.reactionTimeMs
          : (typeof dt.rawReactionTime === 'number' ? dt.rawReactionTime : null));
    if (dt.correct && (rt !== null || dt.valid)) {
      totalCorrect++;
      if (rt !== null) validRTs.push(rt);
    }
  }
  ```
  Notice that `dt.rawLatencyMs` and `dt.rawLatency` are completely missing from the fallback expression!
  When client telemetry transmits `rawLatencyMs` or `rawLatency` (without setting redundant `reactionTime`), `rt` evaluates to `null`.
  Because `dt.valid` is `true`, `totalCorrect++` is executed, but `validRTs.push(rt)` is skipped because `rt === null`.
  If all 10 trials use `rawLatencyMs`, `validRTs` remains `[]`.
  Then lines 198-207 evaluate:
  ```ts
  const avg = validRTs.length > 0 ? Math.round((sum / validRTs.length) * 100) / 100 : null;
  const fastest = validRTs.length > 0 ? Math.round(validRTs[0] * 100) / 100 : null;
  const slowest = validRTs.length > 0 ? Math.round(validRTs[validRTs.length - 1] * 100) / 100 : null;
  const median = ... : null;
  ```
  All latency metrics (`averageReactionTime`, `fastestReactionTime`, `slowestReactionTime`, `medianReactionTime`) are omitted from `derivedMetrics` and saved as `null` in Firestore, completely wiping out participant performance metrics.
- **Frequency:** 6/10. Occurs whenever clients or synthetic assessment tests submit standard `rawLatencyMs` or `rawLatency` payloads.
- **Impact:** 8/10. Total loss of reaction time metrics on Direction assessments.
- **Surgical Root-Cause Fix:**
  In `flankerCalculator.ts#L178-L188`, expand the latency fallback chain to include `rawLatencyMs` and `rawLatency`:
  ```ts
  const rt = typeof dt.reactionTime === 'number' && Number.isFinite(dt.reactionTime)
    ? dt.reactionTime
    : (typeof dt.reactionTimeMs === 'number' && Number.isFinite(dt.reactionTimeMs)
        ? dt.reactionTimeMs
        : (typeof dt.rawReactionTime === 'number' && Number.isFinite(dt.rawReactionTime)
            ? dt.rawReactionTime
            : (typeof dt.rawLatencyMs === 'number' && Number.isFinite(dt.rawLatencyMs)
                ? dt.rawLatencyMs
                : (typeof dt.rawLatency === 'number' && Number.isFinite(dt.rawLatency) ? dt.rawLatency : null))));
  ```

---

### BUG-C8-04: Hardcoded `80.01ms` Floor Misclassifies Legitimate 80.00ms Responses as Anticipatory False Starts

- **File Link:** [stroopCalculator.ts#L81, L97, L196, L226](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L81) vs [ColorTest.tsx#L262](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx#L262)
- **Defect Description:**
  Throughout PULSE (`reactionCalculator.ts#L92`, `flankerCalculator.ts#L46`, `constants.ts`, and client components), the canonical physiological human latency boundary is defined as `80.0ms`:
  ```ts
  // flankerCalculator.ts
  const derivedFalseStart = ... || (rawRt !== null && rawRt < 80.0);
  // ColorTest.tsx
  const isFalseStart = rawDelta < 80;
  ```
  However, in `server/engines/stroopCalculator.ts`, the threshold was hardcoded with an arbitrary `0.01ms` inflation across four distinct locations:
  - Line 81: `derivedFalseStart = ... || (rawRt !== null && rawRt < 80.01);`
  - Line 97: `if (rawRt === null || !Number.isFinite(rawRt) || rawRt < 80.01 || rawRt >= 3000.0)`
  - Line 196: `if (rawRtPhysiological !== null && rawRtPhysiological < 80.01)`
  - Line 226: `t.valid = ... && rawRtPhysiological >= 80.01 && rawRtPhysiological < 3000.0;`
  When a fast participant scores a response with a latency of exactly 80.00ms:
  1. The client `ColorTest.tsx` marks `isFalseStart = false` (`80 < 80` is false) and `valid = true`.
  2. The server receives `reactionTime = 80.00`.
  3. `stroopCalculator.ts` evaluates `80.00 < 80.01`, which is **true**!
  4. The server flags the trial as `derivedFalseStart = true`, marks `t.valid = false`, overrides `isCorrect = false`, and classifies it as `ANTICIPATORY_RESPONSE`.
- **Frequency:** 6/10. Triggers right at the lower physiological boundary.
- **Impact:** 7/10. False invalidation of legitimate human performance and client-server divergence.
- **Surgical Root-Cause Fix:**
  In `server/engines/stroopCalculator.ts`, replace all occurrences of `80.01` with `80.0` (matching `reactionCalculator.ts` and `flankerCalculator.ts`).

---

### BUG-C8-05: Mobile ColorTest Awards Success Chime on False Starts and Omits 5 Core Metadata Fields on Timeout Observations

- **File Link:** [mobile/src/components/ColorTest.tsx#L246-L253, L467-L490](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx#L246-L253)
- **Defect Description:**
  Two significant client-side defects exist in `mobile/src/components/ColorTest.tsx`:
  1. **False-Start Feedback Inversion:**
     When a user clicks earlier than 80ms (`rawDelta < 80`), lines 244-253 execute:
     ```ts
     const expected = currentInstruction === 'WORD' ? currentWord.name : currentColor.name;
     const correct = selectedColorName === expected;
     setFeedbackResult(correct ? 'CORRECT' : 'INCORRECT');
     if (correct) {
       playAudioCue('success');
       triggerHaptic('success');
     }
     ```
     If the user happened to guess the matching color within 30ms of stimulus presentation, the mobile UI flashes green "✓ CORRECT", chimes a success audio cue, and triggers success haptics. Yet on the server, `derivedFalseStart` flags it as an anticipatory error (`isCorrect = false`). The user receives misleading positive feedback for a penalized false start.
  2. **Timeout Observation Metadata Stripping:**
     When a round times out (`stimulusTimeout.current`), the pushed observation in `rawObservationsRef.current` (lines 467-490) omits five core fields present on responded trials:
     - `trialIndex` (omitted)
     - `sequenceNumber` (omitted)
     - `attemptNumber` (omitted)
     - `correct: false` (omitted)
     - `validity: 'TIMEOUT'` (omitted)
     This causes structural schema degradation in the stored research dataset and breaks downstream provenance digests.
- **Frequency:** 8/10. Occurs on every false start and every timeout event on mobile.
- **Impact:** 5/10. Incorrect sensory feedback to participant and inconsistent telemetry records.
- **Surgical Root-Cause Fix:**
  In `mobile/src/components/ColorTest.tsx`:
  1. On false start (`rawDelta < 80`), set `feedbackResult = 'INCORRECT'`, play the `error` audio cue, and fire the `error` haptic.
  2. On timeout, include all missing fields in `rawObservationsRef.current.push`:
  ```ts
  rawObservationsRef.current.push({
    experimentId: sessionId,
    condition,
    conditionLabel: trialCondition,
    test: 'color-recognition',
    trialNumber: rawObservationsRef.current.length + 1,
    trialIndex: rawObservationsRef.current.length + 1,
    sequenceNumber: rawObservationsRef.current.length + 1,
    attemptNumber: 1,
    wordName: nextWord.name,
    wordColor: nextColor.name,
    instruction: nextInstruction,
    userResponse: null,
    stimulusTimestamp: stimTime,
    responseTimestamp: null,
    reactionTime: null,
    rawReactionTime: null,
    displayDelayOffsetMs: null,
    displayDelayOffsetEstimated: null,
    displayDelayOffsetSource: null,
    accuracy: 0,
    correct: false,
    falseStart: false,
    timedOut: true,
    valid: false,
    validity: 'TIMEOUT',
    ageGroup: selectedAgeGroup || undefined,
    notes: `timeout_word:${nextWord.name},color:${nextColor.name},task:${nextInstruction},condition:${condition}`
  });
  ```

---

### BUG-C8-06: Stroop Condition Averages Omit `t.rawLatency`, Zero-Diluting Condition RTs and Corrupting Interference Cost

- **File Link:** [stroopCalculator.ts#L261-L271](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L261-L271)
- **Defect Description:**
  In `stroopCalculator.ts`, the cognitive interference cost (the Stroop effect metric: incongruent RT mean minus congruent RT mean) is derived via:
  ```ts
  if (congruentTrials.length > 0) {
    const cSum = congruentTrials.reduce((acc, t) => acc + Number(t.reactionTime ?? t.reactionTimeMs ?? t.rawReactionTime ?? t.rawLatencyMs ?? 0), 0);
    congruentAvg = Math.round((cSum / congruentTrials.length) * 100) / 100;
  }
  if (incongruentTrials.length > 0) {
    const iSum = incongruentTrials.reduce((acc, t) => acc + Number(t.reactionTime ?? t.reactionTimeMs ?? t.rawReactionTime ?? t.rawLatencyMs ?? 0), 0);
    incongruentAvg = Math.round((iSum / incongruentTrials.length) * 100) / 100;
  }
  if (congruentAvg !== undefined && incongruentAvg !== undefined) {
    interferenceCost = Math.round((incongruentAvg - congruentAvg) * 100) / 100;
  }
  ```
  `validateColorRecognitionTrial` on line 65 specifically parses and validates `t.rawLatency`.
  However, in lines 262 and 266, `t.rawLatency` is completely absent from the null-coalescing chain.
  If a client submits `rawLatency` (without setting `reactionTime`), the expression evaluates to `0`.
  The sum adds `0`, and `congruentAvg` or `incongruentAvg` evaluates to `0` (or a heavily diluted fractional value like `45.2ms` instead of `380ms`), completely destroying the calculated `interferenceCost` metric stored in research records.
- **Frequency:** 5/10. Affects any ingestion pipeline or client passing `rawLatency`.
- **Impact:** 7/10. Numerical corruption of key neuropsychological Stroop interference metrics.
- **Surgical Root-Cause Fix:**
  Normalize `t.reactionTime` when adding to `congruentTrials` and `incongruentTrials`:
  ```ts
  const analyticalRt = correctedRt !== null ? correctedRt : rawRtPhysiological!;
  t.reactionTime = analyticalRt;
  if (plan.condition === 'congruent') {
    congruentTrials.push(t);
  } else {
    incongruentTrials.push(t);
  }
  ```
  And update lines 262 and 266 to include `t.rawLatency`:
  `Number(t.reactionTime ?? t.reactionTimeMs ?? t.rawReactionTime ?? t.rawLatencyMs ?? t.rawLatency ?? 0)`

---

### BUG-C8-07: Trial Limit Constant Discrepancy Between `assessmentEngine.ts` (105) and `memoryCalculator.ts` (103)

- **File Link:** [assessmentEngine.ts#L12-L13](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L12-L13) vs [memoryCalculator.ts#L110, L201](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/memoryCalculator.ts#L110)
- **Defect Description:**
  In `server/engines/assessmentEngine.ts`, the trial limit table defines:
  ```ts
  export const ASSESSMENT_TRIAL_LIMITS: Record<string, number> = {
    'visual-reaction': 30,
    direction: 30,
    'color-recognition': 40,
    'block-memory': 105,
    'number-memory': 105
  };
  ```
  And line 28 validates:
  ```ts
  const maxTrials = (normalized && ASSESSMENT_TRIAL_LIMITS[normalized]) ?? MAX_TRIALS_PER_SESSION;
  if (trials.length > maxTrials) { ... }
  ```
  However, in `server/engines/memoryCalculator.ts`:
  - Line 110 (`deriveBlockMemoryMetrics`):
    `if (trials.length < 1 || trials.length > 103) return { success: false, error: 'Block memory trial count (${trials.length}) is outside valid range (1-103).' };`
  - Line 201 (`deriveNumberMemoryMetrics`):
    `if (trials.length < 1 || trials.length > 103) return { success: false, error: 'Number memory trial count (${trials.length}) is outside valid range (1-103).' };`
  A payload containing 104 or 105 trials successfully passes the authoritative gateway check in `assessmentEngine.ts`, only to fail inside `memoryCalculator.ts` with a 400 error.
- **Frequency:** 5/10. Upper-limit boundary edge case for high-performing memory assessments.
- **Impact:** 6/10. Architectural inconsistency between gateway router and engine calculator.
- **Surgical Root-Cause Fix:**
  Harmonize `memoryCalculator.ts` with `ASSESSMENT_TRIAL_LIMITS` by referencing the constant or allowing `<= 105`:
  ```ts
  if (trials.length < 1 || trials.length > 105) {
    return { success: false, error: `Block memory trial count (${trials.length}) is outside valid range (1-105).` };
  }
  ```

---

### BUG-C8-08: Unchecked `rawRt` Allows Negative Latency Payloads to Bypass Gateway Validation

- **File Link:** [assessmentEngine.ts#L149-L151, L169-L174](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L149-L151)
- **Defect Description:**
  In `server/engines/assessmentEngine.ts`, lines 149-151 perform physiological validation on `reactionTime`:
  ```ts
  if (reactionTime !== null && (!Number.isFinite(reactionTime) || reactionTime < 0)) {
    return { success: false, error: `Invalid reactionTime at trial ${i + 1}.` };
  }
  ```
  Notice that this non-negative validation is only performed on `reactionTime`. It is NEVER performed on `rawRt` (`rawReactionTime`, `rawLatencyMs`, `rawLatency`).
  Then, lines 169-174 validate timestamp deviation:
  ```ts
  const checkedRt = rawRt !== null ? rawRt : reactionTime;
  if (checkedRt !== null && checkedRt > 0) {
    const calculatedDelta = responseTimestamp - stimulusTimestamp;
    if (Math.abs(checkedRt - calculatedDelta) > 150) {
      return { success: false, error: ... };
    }
  }
  ```
  If a malformed or adversarial request provides `{ rawReactionTime: -25, stimulusTimestamp: 1000, responseTimestamp: 1050 }` while omitting `reactionTime`:
  1. `reactionTime` is `null`, so line 149 is skipped.
  2. `checkedRt = -25`.
  3. `checkedRt > 0` evaluates to **false**, so the deviation check is skipped!
  4. The trial passes the outer gateway with a negative reaction time.
- **Frequency:** 4/10. Occurs on malformed or adversarial trial payloads.
- **Impact:** 6/10. Negative latencies bypass outer gateway validation.
- **Surgical Root-Cause Fix:**
  In `server/engines/assessmentEngine.ts#L149`, validate `checkedRt` (or both `reactionTime` and `rawRt`):
  ```ts
  const effectiveRt = reactionTime ?? rawRt;
  if (effectiveRt !== null && (!Number.isFinite(effectiveRt) || effectiveRt < 0)) {
    return { success: false, error: `Invalid reactionTime at trial ${i + 1}. Must be a non-negative number.` };
  }
  ```

---

### BUG-C8-09: Unhandled `session.sessionId` Property Missing Causes PRNG Degradation to Literal `"undefined"` Seed

- **File Link:** [assessmentEngine.ts#L32](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L32)
- **Defect Description:**
  In `server/engines/assessmentEngine.ts`:
  ```ts
  const sessionId = session ? session.sessionId : 'default_seed';
  ```
  If the `session` parameter is an object (truthy) but does not have a `sessionId` property (e.g. `{ createdAt: 1700000000000, expiresAt: 1700000900000 }` from an unhydrated session document or test mock):
  `session.sessionId` evaluates to `undefined`.
  `sessionId` becomes `undefined`.
  This `undefined` value is passed into all downstream engine contexts:
  `const ctx = { trials, ageGroup, session, sessionId };`
  Then:
  - `flankerCalculator.ts`: `seedPRNG(sessionId + "-direction-" ...)` becomes `"undefined-direction-..."`
  - `stroopCalculator.ts`: `seedPRNG(sessionId + "-color-plans")` becomes `"undefined-color-plans"`
  - `memoryCalculator.ts`: `seedPRNG(sessionId + "-block-" ...)` becomes `"undefined-block-..."`
  - `reactionCalculator.ts`: `seedPRNG(`${sessionId}-reaction-delays-t...`)` becomes `"undefined-reaction-delays-..."`
  The seed degrades to a shared, predictable string, destroying cryptographic randomness and seed uniqueness.
- **Frequency:** 4/10. Occurs when session metadata objects lack an explicit `sessionId` key.
- **Impact:** 5/10. Seed determinism degradation and predictable pseudo-random generation.
- **Surgical Root-Cause Fix:**
  In `server/engines/assessmentEngine.ts#L32`, check `session?.sessionId`:
  ```ts
  const sessionId = (session && typeof session.sessionId === 'string' && session.sessionId.trim()) 
    ? session.sessionId.trim() 
    : 'default_seed';
  ```

---

### BUG-C8-10: Inconsistent Stroop Derived Metrics Signature (Missing `totalFalseStarts`, `totalTrials`, `totalIncorrect`)

- **File Link:** [stroopCalculator.ts#L273-L284](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L273-L284) vs [ColorTest.tsx#L607](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx#L607)
- **Defect Description:**
  In `server/engines/stroopCalculator.ts`, `derivedMetrics` are constructed as:
  ```ts
  const derivedMetrics: Record<string, any> = {
    accuracy,
    correctCount
  };
  if (avg !== null) derivedMetrics.averageReactionTime = avg;
  if (fastest !== null) derivedMetrics.fastestReactionTime = fastest;
  if (slowest !== null) derivedMetrics.slowestReactionTime = slowest;
  if (median !== null) derivedMetrics.medianReactionTime = median;
  if (congruentAvg !== undefined) derivedMetrics.congruentAvg = congruentAvg;
  if (incongruentAvg !== undefined) derivedMetrics.incongruentAvg = incongruentAvg;
  if (interferenceCost !== undefined) derivedMetrics.interferenceCost = interferenceCost;
  ```
  Comparing this to `flankerCalculator.ts#L210-L216`:
  ```ts
  const derivedMetrics: Record<string, any> = {
    accuracy,
    totalCorrect,
    totalTrials: 10,
    totalIncorrect: Math.max(0, 10 - totalCorrect),
    totalFalseStarts: falseStartsCount
  };
  ```
  And `reactionCalculator.ts#L332-L338`:
  ```ts
  totalFalseStarts: falseStartsCount
  ```
  Notice:
  1. `stroopCalculator.ts` names the count `correctCount`, whereas `flankerCalculator.ts` and `memoryCalculator.ts` name it `totalCorrect`.
  2. `stroopCalculator.ts` completely omits `totalFalseStarts`, `totalTrials`, and `totalIncorrect`.
  3. Client `ColorTest.tsx#L607` expects `res.derivedMetrics.totalCount`.
  This schema inconsistency creates fragmented payload shapes across assessments and causes missing metrics when aggregating assessment summaries.
- **Frequency:** 6/10. Affects every Color Recognition assessment result.
- **Impact:** 3/10. Schema fragmentation and contract inconsistency.
- **Surgical Root-Cause Fix:**
  In `server/engines/stroopCalculator.ts#L273-L284`, standardize the metrics shape:
  ```ts
  const falseStartsCount = trials.filter(t => t.falseStart).length;
  const derivedMetrics: Record<string, any> = {
    accuracy,
    correctCount,
    totalCorrect: correctCount,
    totalTrials: 15,
    totalCount: 15,
    totalIncorrect: Math.max(0, 15 - correctCount),
    totalFalseStarts: falseStartsCount
  };
  ```

---
