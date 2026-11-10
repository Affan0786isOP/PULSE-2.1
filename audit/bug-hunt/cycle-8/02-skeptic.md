# PULSE v2.1 — Cycle 8 Bug Skeptic Adversarial Audit Report

**Auditor:** Bug Skeptic Agent (Cycle 8)  
**Target Files Audited:**
1. `server/engines/assessmentEngine.ts`
2. `server/engines/reactionCalculator.ts`
3. `server/engines/memoryCalculator.ts`
4. `server/engines/flankerCalculator.ts`
5. `server/engines/stroopCalculator.ts`
6. `server/engines/prng.ts`
7. `mobile/src/components/ColorTest.tsx`

---

## 1. Executive Summary & Verdict Classification Matrix

| ID | Candidate Finding Summary | Hunter Score | Skeptic Verdict | Realistic Freq (1–10) | Realistic Impact (1–10) | Skeptic Risk Score (F×I) | Status |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **BUG-C8-01** | Hardcoded `trials.length !== 15` in Stroop engine rejects false-start retries permitted by `ASSESSMENT_TRIAL_LIMITS` (40) | 72 | **CONFIRMED** | 6 | 9 | **54** | Actionable Defect |
| **BUG-C8-02** | Timeout omission in accuracy denominator yields 100% accuracy when 90% of trials timed out | 56 | **CONFIRMED** | 5 | 8 | **40** | Actionable Defect |
| **BUG-C8-03** | Flanker summary derivation drops `rawLatencyMs` and `rawLatency`, producing null reaction time metrics | 48 | **CONFIRMED** | 5 | 8 | **40** | Actionable Defect |
| **BUG-C8-04** | Hardcoded `80.01ms` floor misclassifies legitimate 80.00ms responses as anticipatory false starts | 42 | **CONFIRMED** | 2 | 5 | **10** | Actionable Defect |
| **BUG-C8-05** | Mobile ColorTest awards success chime on false starts and omits 5 core metadata fields on timeout observations | 40 | **CONFIRMED** | 6 | 5 | **30** | Actionable Defect |
| **BUG-C8-06** | Stroop condition averages omit `t.rawLatency`, zero-diluting condition RTs and corrupting interference cost | 35 | **CONFIRMED** | 4 | 6 | **24** | Actionable Defect |
| **BUG-C8-07** | Trial limit discrepancy between `assessmentEngine` (105) and `memoryCalculator` (103) crashes valid runs | 30 | **DISMISSED** | 1 | 3 | **3** | **Score < 5 / YAGNI** |
| **BUG-C8-08** | Unchecked `rawRt` allows negative latency payloads to bypass structural physiological validation | 24 | **CONFIRMED** | 2 | 4 | **8** | Actionable Defect |
| **BUG-C8-09** | Missing `session.sessionId` property causes PRNG degradation to literal `"undefined"` seed strings | 20 | **DISPROVED** | 0 | 1 | **0** | **False Positive** |
| **BUG-C8-10** | Stroop derived metrics omit `totalFalseStarts`, `totalTrials`, and `totalIncorrect`, breaking unified reporting | 18 | **CONFIRMED** | 7 | 3 | **21** | Actionable Defect |

---

## 2. Detailed Stress-Test & Skeptical Analysis

---

### BUG-C8-01: Hardcoded `trials.length !== 15` in Stroop Engine Rejects False-Start Retries Permitted by `ASSESSMENT_TRIAL_LIMITS` (40)

- **Source Links:** [stroopCalculator.ts#L120-L122](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L120-L122), [assessmentEngine.ts#L11](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L11), and [ColorTest.tsx#L273-L308](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/components/ColorTest.tsx#L273-L308)
- **Skeptic Stress-Test & Codebase Verification:**
  - In [assessmentEngine.ts#L11](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L11), `ASSESSMENT_TRIAL_LIMITS['color-recognition']` is explicitly set to `40` to allow raw observation recording for repeated attempts following anticipatory false starts.
  - On the desktop client in [src/components/ColorTest.tsx#L263-L308](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/components/ColorTest.tsx#L263-L308), when `rawDelta < 80`, a false-start observation is appended to `rawObservationsRef.current`, the trial is retried via `startTrialSequence(true)`, and on completion all observations (`rawObservationsRef.current`) are submitted to the server. If 1 false start occurred, 16 observations are submitted.
  - In `server/engines/stroopCalculator.ts#L120-L122`, the engine unconditionally asserts:
    ```ts
    if (trials.length !== 15) {
      return { success: false, error: `Color recognition test requires exactly 15 trials (received ${trials.length}).` };
    }
    ```
  - Furthermore, lines 126–141 generate an array of exactly 15 plans (`plans`), and line 149 accesses `const plan = plans[i];`. If more than 15 observations are passed without deduplication, `plans[i]` is undefined.
  - While Hunter's estimate of Frequency = 8 is slightly high (users trigger false starts on ~10–20% of runs, Freq = 6), the Impact is a fatal 9/10 because 100% of desktop sessions with retried false starts are completely rejected by the server.
- **Verdict:** **CONFIRMED** (Realistic Freq: 6 × Impact: 9 = **54**).
- **Minimal Surgical Fix:**
  In `server/engines/stroopCalculator.ts`, deduplicate trials by logical position / `trialNumber` to the latest attempt before verifying that 15 completed logical trials exist, matching `flankerCalculator.ts#L171-L176`:
  ```ts
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

- **Source Links:** [flankerCalculator.ts#L190-L195](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L190-L195) and [stroopCalculator.ts#L241-L243](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L241-L243)
- **Skeptic Stress-Test & Codebase Verification:**
  - In `flankerCalculator.ts#L190-L194`:
    ```ts
    const validTrialsCount = dedupedTrials.filter(t => !t.falseStart && !t.timedOut).length;
    if (validTrialsCount === 0) {
      return { success: false, error: 'No valid trials found for Direction test.' };
    }
    const accuracy = Math.round(((totalCorrect / validTrialsCount) * 100.0) * 100) / 100;
    ```
  - In `stroopCalculator.ts#L241-L242`:
    ```ts
    const validTrialsCount = trials.filter(t => !t.falseStart && !t.timedOut).length;
    const accuracy = validTrialsCount > 0 ? Math.round(((correctCount / validTrialsCount) * 100.0) * 100) / 100 : 0;
    ```
  - In choice reaction tasks, a timeout (failure to respond within 3000ms) is an omission error on an active stimulus. In `DirectionTest.tsx#L265-L268`, timeouts are explicitly marked `accuracy: 0, timedOut: true, valid: false, correct: false`.
  - When a participant responds to 1 trial correctly and misses/times out on the remaining 9 trials:
    `validTrialsCount = 1`, `totalCorrect = 1`, resulting in `accuracy = 100%`!
  - Simultaneously, `flankerCalculator.ts#L214` calculates `totalIncorrect: Math.max(0, 10 - totalCorrect)` which evaluates to `9`.
  - The engine outputs an absurd contradiction: `{ accuracy: 100, totalCorrect: 1, totalIncorrect: 9, totalTrials: 10 }`.
  - Only pre-stimulus false starts (where the stimulus was aborted before evaluation) should be excluded from accuracy evaluation.
- **Verdict:** **CONFIRMED** (Realistic Freq: 5 × Impact: 8 = **40**).
- **Minimal Surgical Fix:**
  In `flankerCalculator.ts` and `stroopCalculator.ts`, calculate the accuracy denominator from all evaluated non-false-start trials:
  ```ts
  // In flankerCalculator.ts:
  const assessedTrialsCount = dedupedTrials.filter(t => !t.falseStart).length;
  const accuracy = assessedTrialsCount > 0 ? Math.round(((totalCorrect / assessedTrialsCount) * 100.0) * 100) / 100 : 0;

  // In stroopCalculator.ts:
  const assessedTrialsCount = trials.filter(t => !t.falseStart).length;
  const accuracy = assessedTrialsCount > 0 ? Math.round(((correctCount / assessedTrialsCount) * 100.0) * 100) / 100 : 0;
  ```

---

### BUG-C8-03: Flanker Summary Derivation Drops `rawLatencyMs` and `rawLatency`, Producing Null Reaction Time Metrics

- **Source Links:** [flankerCalculator.ts#L178-L188](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L178-L188) vs [flankerCalculator.ts#L26-L34](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L26-L34)
- **Skeptic Stress-Test & Codebase Verification:**
  - In `flankerCalculator.ts` lines 26–29 and 113–116, the engine explicitly parses `rawLatencyMs` and `rawLatency` to populate `rawRt` and `rawRtPhysiological`, correctly validating trials and setting `t.valid = true`.
  - However, in lines 178–188, when collecting valid reaction times into `validRTs`:
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
  - `dt.rawLatencyMs` and `dt.rawLatency` are omitted from the `rt` fallback chain.
  - If a client submits telemetry using `rawLatencyMs` (standard in v1.1.0 schema), `rt` evaluates to `null`.
  - Because `dt.valid` is `true`, `totalCorrect++` is executed, but `rt !== null` is false, so `validRTs` remains empty (`[]`).
  - Consequently, lines 198–207 evaluate `avg = null`, `fastest = null`, `slowest = null`, `median = null`, completely stripping all reaction time metrics from the resulting `derivedMetrics`.
- **Verdict:** **CONFIRMED** (Realistic Freq: 5 × Impact: 8 = **40**).
- **Minimal Surgical Fix:**
  In `server/engines/flankerCalculator.ts#L178-L184`, include `rawLatencyMs` and `rawLatency` in the fallback expression:
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

- **Source Links:** [stroopCalculator.ts#L81, L97, L196, L226](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L81), [reactionCalculator.ts#L92](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/reactionCalculator.ts#L92), [flankerCalculator.ts#L46](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L46), and [ColorTest.tsx#L262](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx#L262)
- **Skeptic Stress-Test & Codebase Verification:**
  - Across the entire PULSE platform, the physiological human threshold for anticipatory responses is standardized at `80.0ms`:
    - `reactionCalculator.ts#L92, L108, L238, L278`: `< 80.0`
    - `flankerCalculator.ts#L46, L61, L130, L157`: `< 80.0`
    - `mobile/src/components/ColorTest.tsx#L262`: `rawDelta < 80`
    - `src/components/ColorTest.tsx#L263`: `rawDelta < 80`
  - In `server/engines/stroopCalculator.ts`, an arbitrary `0.01ms` inflation was introduced across lines 81, 97, 196, and 226 (`< 80.01`).
  - When a user achieves a reaction time of exactly 80.00ms:
    - Client registers `isFalseStart = false` and `valid = true`.
    - Server `stroopCalculator.ts` evaluates `80.00 < 80.01` as `true`, flags `derivedFalseStart = true`, overrides `valid = false`, sets `qualityFlag = 'ANTICIPATORY_RESPONSE'`, and forces `accuracy = 0`.
  - While Hunter overstates Frequency as 6/10 (landing in the exact range `[80.00, 80.01)` is an edge case, realistic Freq = 2), it represents an unambiguous cross-engine discrepancy that creates client-server divergence at the lower bound.
- **Verdict:** **CONFIRMED** (Realistic Freq: 2 × Impact: 5 = **10**).
- **Minimal Surgical Fix:**
  In `server/engines/stroopCalculator.ts`, replace `80.01` with `80.0` on lines 81, 97, 196, and 226.

---

### BUG-C8-05: Mobile ColorTest Awards Success Chime on False Starts and Omits 5 Core Metadata Fields on Timeout Observations

- **Source Links:** [mobile/src/components/ColorTest.tsx#L244-L253, L467-L490](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx#L244-L253)
- **Skeptic Stress-Test & Codebase Verification:**
  - In `mobile/src/components/ColorTest.tsx#L244-L253`:
    ```ts
    const expected = currentInstruction === 'WORD' ? currentWord.name : currentColor.name;
    const correct = selectedColorName === expected;
    setFeedbackResult(correct ? 'CORRECT' : 'INCORRECT');
    if (correct) {
      playAudioCue('success');
      triggerHaptic('success');
    }
    ```
    This feedback check runs **before** checking `isFalseStart = rawDelta < 80` on line 262.
    If a participant taps a button within 10–70ms of stimulus onset and happens to match the target color, the UI displays green "CORRECT", plays the success chime, and fires a success haptic. On the server, this same trial is penalized as an anticipatory false start. The user receives positive reinforcement for an invalid, penalized trial.
  - Furthermore, on timeout observations in `mobile/src/components/ColorTest.tsx#L467-L490`, `rawObservationsRef.current.push` omits `trialIndex`, `sequenceNumber`, `attemptNumber`, `correct: false`, and `validity: 'TIMEOUT'`, degrading the telemetry schema relative to responded observations.
- **Verdict:** **CONFIRMED** (Realistic Freq: 6 × Impact: 5 = **30**).
- **Minimal Surgical Fix:**
  In `mobile/src/components/ColorTest.tsx`:
  1. Determine `isFalseStart = rawDelta < 80` before setting feedback. On false start, set `setFeedbackResult('INCORRECT')`, play `error` audio, and trigger `error` haptic.
  2. In the timeout handler (line 467), include all missing schema properties (`trialIndex: rawObservationsRef.current.length + 1`, `sequenceNumber: rawObservationsRef.current.length + 1`, `attemptNumber: 1`, `correct: false`, `validity: 'TIMEOUT'`).

---

### BUG-C8-06: Stroop Condition Averages Omit `t.rawLatency`, Zero-Diluting Condition RTs and Corrupting Interference Cost

- **Source Links:** [stroopCalculator.ts#L60-L69](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L60-L69), [stroopCalculator.ts#L178-L188](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L178-L188), and [stroopCalculator.ts#L261-L271](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L261-L271)
- **Skeptic Stress-Test & Codebase Verification:**
  - Hunter claimed: *"validateColorRecognitionTrial on line 65 specifically parses and validates t.rawLatency."*
  - **Skeptic Correction:** That statement was factually mistaken. Line 65 parses `t.reactionTime`, not `t.rawLatency`. In fact, `stroopCalculator.ts` **never** parses `t.rawLatency` anywhere—not in `validateColorRecognitionTrial` (line 60), not in `rawRtPhysiological` (line 178), nor in condition sums (lines 262, 266).
  - In contrast, all peer engines—[assessmentEngine.ts#L107](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L107), [reactionCalculator.ts#L84, L133](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/reactionCalculator.ts#L84), and [flankerCalculator.ts#L28, L115](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L28)—support `rawLatency`.
  - When a trial provides `rawLatency`, `assessmentEngine.ts` validates it, but `stroopCalculator.ts` fails to find an RT, marks `derivedTimedOut = true`, discards `isCorrect`, and leaves `congruentAvg`, `incongruentAvg`, and `interferenceCost` completely undefined.
  - Moreover, lines 262 and 266 evaluate `t.reactionTime ?? t.reactionTimeMs ?? t.rawReactionTime ?? t.rawLatencyMs ?? 0` instead of reusing the already validated `rawRtPhysiological`.
- **Verdict:** **CONFIRMED** (Realistic Freq: 4 × Impact: 6 = **24**).
- **Minimal Surgical Fix:**
  Add `rawLatency` support to `validateColorRecognitionTrial` and `rawRtPhysiological` in `server/engines/stroopCalculator.ts`, and in lines 262 and 266 include `t.rawLatency ?? 0` or assign the resolved physiological RT to `t.reactionTime`.

---

### BUG-C8-07: Trial Limit Discrepancy Between `assessmentEngine` (105) and `memoryCalculator` (103)

- **Source Links:** [assessmentEngine.ts#L12-L13](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L12-L13) vs [memoryCalculator.ts#L110, L201](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/memoryCalculator.ts#L110)
- **Skeptic Stress-Test & Codebase Verification:**
  - `assessmentEngine.ts#L12-L13` sets:
    ```ts
    'block-memory': 105,
    'number-memory': 105
    ```
    While `memoryCalculator.ts#L110, L201` checks:
    ```ts
    if (trials.length < 1 || trials.length > 103) {
      return { success: false, error: `Block memory trial count (${trials.length}) is outside valid range (1-103).` };
    }
    ```
  - Hunter claimed: *"Frequency: 5/10. Upper-limit boundary edge case for high-performing memory assessments."*
  - **Skeptic Reality Check:**
    - In Corsi Block Memory (`block-memory`), each level adds 1 block to recall. Normal human span is 5–7 blocks; world champions achieve ~15–20.
    - To generate 104 trials, a human would have to complete level 101, requiring them to memorize and accurately tap a sequence of **102 visual blocks** across 9 on-screen positions. This is physiologically and cognitively impossible for any human being.
    - In Number Memory (`number-memory`), reaching level 101 requires memorizing a 103-digit sequence in a single trial. No real user in PULSE has ever approached this ceiling.
  - The discrepancy between 105 and 103 is a benign constant divergence introduced during commit `106b9e4b`. It has zero real-world occurrence and affects only synthetic fuzzers passing >103 trials.
- **Verdict:** **DISMISSED (Score < 5 / Low Impact / YAGNI)** (Realistic Freq: 1 × Impact: 3 = **3** < 5).

---

### BUG-C8-08: Unchecked `rawRt` Allows Negative Latency Payloads to Bypass Structural Physiological Validation

- **Source Links:** [assessmentEngine.ts#L103-L107, L149-L151, L169-L175](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L103-L107)
- **Skeptic Stress-Test & Codebase Verification:**
  - In `server/engines/assessmentEngine.ts#L149-L151`:
    ```ts
    if (reactionTime !== null && (!Number.isFinite(reactionTime) || reactionTime < 0)) {
      return { success: false, error: `Invalid reactionTime at trial ${i + 1}.` };
    }
    ```
  - Non-negative validation is performed **exclusively** on `reactionTime`. It is not performed on `rawRt` (`rawReactionTime`, `rawLatencyMs`, `rawLatency`).
  - On line 170:
    ```ts
    const checkedRt = rawRt !== null ? rawRt : reactionTime;
    if (checkedRt !== null && checkedRt > 0) { ... }
    ```
    If `checkedRt <= 0`, the deviation check is skipped entirely.
  - If a malformed payload provides `{ rawReactionTime: -150, stimulusTimestamp: 1000, responseTimestamp: 1150 }` while omitting `reactionTime`, the outer gateway accepts the observation without error.
  - Downstream engines (`reactionCalculator`, `flankerCalculator`, `stroopCalculator`) catch `< 80ms` as a false start, but the outer gateway's physiological contract is breached.
- **Verdict:** **CONFIRMED** (Realistic Freq: 2 × Impact: 4 = **8**).
- **Minimal Surgical Fix:**
  In `server/engines/assessmentEngine.ts#L149`, validate the effective reaction time:
  ```ts
  const effectiveRt = reactionTime ?? rawRt;
  if (effectiveRt !== null && (!Number.isFinite(effectiveRt) || effectiveRt < 0)) {
    return { success: false, error: `Invalid reactionTime at trial ${i + 1}. Must be a non-negative number.` };
  }
  ```

---

### BUG-C8-09: Missing `session.sessionId` Property Causes PRNG Degradation to Literal `"undefined"` Seed Strings

- **Source Links:** [assessmentEngine.ts#L32](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L32) and [sessionModels.ts#L1-L8](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/models/sessionModels.ts#L1-L8)
- **Skeptic Stress-Test & Codebase Verification:**
  - In `assessmentEngine.ts#L32`:
    ```ts
    const sessionId = session ? session.sessionId : 'default_seed';
    ```
  - Hunter claimed: *"If the session parameter is an object (truthy) but does not have a sessionId property... sessionId becomes undefined... destroying cryptographic randomness."*
  - **Skeptic Audit:**
    - In `server/services/researchService.ts#L218`, the sole production caller passes `sessionCheck.session`.
    - `sessionCheck.session` is typed as `ExperimentSessionRecord` ([sessionModels.ts#L1-L8](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/models/sessionModels.ts#L1-L8)), where `sessionId: string` is a mandatory, non-optional primary key fetched directly from Firestore.
    - If `session` is omitted entirely (as in lightweight unit tests), `session` is falsy, correctly falling back to `'default_seed'`.
    - There is not a single code path or test fixture in the repository where an object lacking `sessionId` is passed as `session`.
  - The claim describes a hypothetical situation that cannot occur in the architecture.
- **Verdict:** **DISPROVED / DISMISSED (Score < 5 / False Positive)** (Realistic Freq: 0 × Impact: 1 = **0**).

---

### BUG-C8-10: Stroop Derived Metrics Omit `totalFalseStarts`, `totalTrials`, and `totalIncorrect`, Breaking Unified Reporting

- **Source Links:** [stroopCalculator.ts#L273-L284](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L273-L284), [researchRoutes.ts#L153-L157](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L153-L157), and [researchService.ts#L592-L595](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/researchService.ts#L592-L595)
- **Skeptic Stress-Test & Codebase Verification:**
  - In `server/engines/stroopCalculator.ts#L273-L284`, `derivedMetrics` outputs:
    ```ts
    const derivedMetrics: Record<string, any> = {
      accuracy,
      correctCount
    };
    ```
  - Compare this to `flankerCalculator.ts#L210-L216`:
    ```ts
    const derivedMetrics: Record<string, any> = {
      accuracy,
      totalCorrect,
      totalTrials: 10,
      totalIncorrect: Math.max(0, 10 - totalCorrect),
      totalFalseStarts: falseStartsCount
    };
    ```
  - In `server/routes/researchRoutes.ts#L153-L157`, when formatting results for the Telegram service:
    ```ts
    falseStartsCount: typeof dm.falseStartsCount === 'number'
      ? dm.falseStartsCount
      : (typeof dm.totalFalseStarts === 'number'
          ? dm.totalFalseStarts
          : undefined)
    ```
    Because `stroopCalculator.ts` omits `totalFalseStarts`, Telegram notifications for Color Recognition assessments **always** have `falseStartsCount: undefined`.
  - In `server/services/researchService.ts#L592-L594`, public dataset rows set `totalFalseStarts`, `totalCorrect`, and `totalIncorrect` to null because `derived` lacks these standardized properties.
- **Verdict:** **CONFIRMED** (Realistic Freq: 7 × Impact: 3 = **21**).
- **Minimal Surgical Fix:**
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

## 3. Summary of Cycle 8 Skeptic Findings

- **CONFIRMED Defects (8):**
  - **BUG-C8-01 (Score: 54):** Stroop engine rejects valid sessions with false starts due to `trials.length !== 15`.
  - **BUG-C8-02 (Score: 40):** Omission errors (timeouts) excluded from accuracy denominator in Flanker and Stroop, yielding 100% accuracy on failed sessions.
  - **BUG-C8-03 (Score: 40):** Missing `rawLatencyMs` and `rawLatency` in Flanker `validRTs` calculation wipes out summary RT metrics.
  - **BUG-C8-04 (Score: 10):** `80.01ms` floor in Stroop creates boundary invalidation at exactly 80.00ms.
  - **BUG-C8-05 (Score: 30):** Mobile ColorTest awards success chime on anticipatory false starts and drops metadata on timeouts.
  - **BUG-C8-06 (Score: 24):** Complete omission of `rawLatency` across Stroop engine zero-dilutes condition averages.
  - **BUG-C8-08 (Score: 8):** Negative `rawReactionTime` bypasses gateway physiological validation.
  - **BUG-C8-10 (Score: 21):** Missing `totalFalseStarts` and `totalCorrect` in Stroop derived metrics breaks Telegram notifications and research records.

- **DISMISSED / DISPROVED Defects (2):**
  - **BUG-C8-07 (Score: 3 < 5):** Constant mismatch between 105 and 103 trials in memory calculators. Dismissed under YAGNI (physically impossible for human memory recall to reach 104 trials in Corsi blocks).
  - **BUG-C8-09 (Score: 0):** Missing `session.sessionId` property. Disproved as a false positive (architecture strictly guarantees `sessionId: string` on all `ExperimentSessionRecord` objects).
