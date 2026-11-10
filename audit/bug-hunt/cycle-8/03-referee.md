# PULSE v2.1 — Cycle 8 Bug Referee Adjudication Report

**Role:** Bug Referee Agent (Cycle 8)  
**Task Scope:** Assessment Engines, PRNG Determinism, and Mobile Color Recognition Test  
**Target Scope Files:**
1. [server/engines/assessmentEngine.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts)
2. [server/engines/reactionCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/reactionCalculator.ts)
3. [server/engines/memoryCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/memoryCalculator.ts)
4. [server/engines/flankerCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts)
5. [server/engines/stroopCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts)
6. [server/engines/prng.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/prng.ts)
7. [mobile/src/components/ColorTest.tsx](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx)

**Standard Applied:** Actionability Threshold $\text{Risk Score} = \text{Frequency} \times \text{Impact} \ge 5$. Ponytail Senior Dev Minimalism (Zero Unrequested Abstractions, Surgical Diffs, Root-Cause Fixes).

---

## 1. Executive Summary & Definitive Adjudication Matrix

The Bug Referee has conducted independent static, architectural, and mathematical audits of all 10 candidates debated between the Bug Hunter and Bug Skeptic for Cycle 8.

### Definitive Adjudication Summary:
- **CONFIRMED (8 Defects):** BUG-C8-01, BUG-C8-02, BUG-C8-03, BUG-C8-04, BUG-C8-05, BUG-C8-06, BUG-C8-08, BUG-C8-10. All 8 defects satisfy the actionability threshold ($\text{Score} \ge 5$) and require surgical remediation.
- **DISMISSED (1 Candidate):** BUG-C8-07 ($\text{Score} = 3 < 5$). The trial limit divergence between 105 and 103 in memory calculators is humanly impossible to encounter in Corsi block memory or digit span testing. Dismissed under YAGNI / benign fuzzer-only boundary.
- **DISPROVED (1 Candidate):** BUG-C8-09 ($\text{Score} = 0$). False positive. `sessionCheck.session` is typed as `ExperimentSessionRecord` where `sessionId: string` is a mandatory primary key fetched from Firestore. An object lacking `sessionId` cannot exist in production, and unit tests safely fallback to `'default_seed'`.

| ID | Candidate Defect Summary | Hunter Score | Skeptic Score | Referee Freq | Referee Imp | Referee Final Score | Referee Verdict | Actionability Status |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **BUG-C8-01** | Hardcoded `trials.length !== 15` in Stroop engine rejects false-start retries permitted by `ASSESSMENT_TRIAL_LIMITS` (40) | 72 | 54 | 6 | 9 | **54** | **CONFIRMED** | Actionable Defect |
| **BUG-C8-02** | Timeout omission in accuracy denominator yields 100% accuracy when 90% of trials timed out | 56 | 40 | 5 | 8 | **40** | **CONFIRMED** | Actionable Defect |
| **BUG-C8-03** | Flanker summary derivation drops `rawLatencyMs` and `rawLatency`, producing null reaction time metrics | 48 | 40 | 5 | 8 | **40** | **CONFIRMED** | Actionable Defect |
| **BUG-C8-04** | Hardcoded `80.01ms` floor misclassifies legitimate 80.00ms responses as anticipatory false starts | 42 | 10 | 2 | 5 | **10** | **CONFIRMED** | Actionable Defect |
| **BUG-C8-05** | Mobile ColorTest awards success chime on false starts and omits 5 core metadata fields on timeout observations | 40 | 30 | 6 | 5 | **30** | **CONFIRMED** | Actionable Defect |
| **BUG-C8-06** | Stroop condition averages omit `t.rawLatency`, zero-diluting condition RTs and corrupting interference cost | 35 | 24 | 4 | 6 | **24** | **CONFIRMED** | Actionable Defect |
| **BUG-C8-07** | Trial limit discrepancy between `assessmentEngine` (105) and `memoryCalculator` (103) crashes valid runs | 30 | 3 | 1 | 3 | **3** | **DISMISSED** | Non-Actionable (Score < 5 / YAGNI) |
| **BUG-C8-08** | Unchecked `rawRt` allows negative latency payloads to bypass structural physiological validation | 24 | 8 | 2 | 4 | **8** | **CONFIRMED** | Actionable Defect |
| **BUG-C8-09** | Missing `session.sessionId` property causes PRNG degradation to literal `"undefined"` seed strings | 20 | 0 | 0 | 1 | **0** | **DISPROVED** | Non-Actionable (False Positive) |
| **BUG-C8-10** | Stroop derived metrics omit `totalFalseStarts`, `totalTrials`, and `totalIncorrect`, breaking unified reporting | 18 | 21 | 7 | 3 | **21** | **CONFIRMED** | Actionable Defect |

---

## 2. In-Depth Adjudication & Evidence-Backed Rulings

---

### BUG-C8-01: Hardcoded `trials.length !== 15` in Stroop Engine Rejects False-Start Retries Permitted by `ASSESSMENT_TRIAL_LIMITS` (40)

- **Target Source Links:**
  - [server/engines/stroopCalculator.ts#L120-L122](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L120-L122)
  - [server/engines/assessmentEngine.ts#L11](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L11)
  - [src/components/ColorTest.tsx#L273-L308](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/components/ColorTest.tsx#L273-L308)
- **The Debate:**
  - **Hunter:** `assessmentEngine.ts` sets `ASSESSMENT_TRIAL_LIMITS['color-recognition'] = 40` so clients can log false starts and retry trials up to 40 total attempts. But `stroopCalculator.ts#L120` strictly requires `trials.length === 15`. Any desktop run with a retried false start submits $\ge 16$ observations, passing `assessmentEngine` but crashing inside `stroopCalculator`.
  - **Skeptic:** Confirmed. Re-scored from 72 down to 54 (Freq: 6, Impact: 9) because false starts occur in 15–20% of sessions rather than 80%.
- **Referee Code Review & Adjudication:**
  In [assessmentEngine.ts#L11](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L11), the limit is explicitly 40. On the desktop client in [src/components/ColorTest.tsx#L263-L308](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/components/ColorTest.tsx#L263-L308), when `rawDelta < 80`, the false start is appended to `rawObservationsRef.current`, and `startTrialSequence(true)` repeats the trial. When finished, all observations are submitted.
  In [stroopCalculator.ts#L120-L122](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L120-L122):
  ```ts
  if (trials.length !== 15) {
    return { success: false, error: `Color recognition test requires exactly 15 trials (received ${trials.length}).` };
  }
  ```
  And lines 148–150 directly index `const plan = plans[i];`. If 16 observations were submitted, `plans[15]` would be `undefined`.
  This is a fatal protocol mismatch. Any legitimate desktop user who makes an anticipatory click has their entire assessment discarded with a 400 rejection.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 6, Impact: 9 $\rightarrow$ **54** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [server/engines/stroopCalculator.ts#L120-L122](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L120-L122), deduplicate trials by `trialNumber` to the latest attempt before validating trial count, matching `flankerCalculator.ts#L171-L176`:
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

- **Target Source Links:**
  - [server/engines/flankerCalculator.ts#L190-L195](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L190-L195)
  - [server/engines/stroopCalculator.ts#L241-L243](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L241-L243)
- **The Debate:**
  - **Hunter:** In both `flankerCalculator.ts` and `stroopCalculator.ts`, accuracy divides `totalCorrect` by `validTrialsCount = trials.filter(t => !t.falseStart && !t.timedOut).length`. Timeouts are omission errors. Excluding them means a user who gets 1 trial right and times out on 9 gets $1 / 1 = 100\%$ accuracy.
  - **Skeptic:** Confirmed. Re-scored from 56 down to 40 (Freq: 5, Impact: 8). Demonstrated that the engine returns `{ accuracy: 100, totalCorrect: 1, totalIncorrect: 9, totalTrials: 10 }`, an impossible internal contradiction.
- **Referee Code Review & Adjudication:**
  Direct inspection confirms the code in [server/engines/flankerCalculator.ts#L190](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L190):
  ```ts
  const validTrialsCount = dedupedTrials.filter(t => !t.falseStart && !t.timedOut).length;
  ...
  const accuracy = Math.round(((totalCorrect / validTrialsCount) * 100.0) * 100) / 100;
  ```
  And in [server/engines/stroopCalculator.ts#L241](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L241):
  ```ts
  const validTrialsCount = trials.filter(t => !t.falseStart && !t.timedOut).length;
  const accuracy = validTrialsCount > 0 ? Math.round(((correctCount / validTrialsCount) * 100.0) * 100) / 100 : 0;
  ```
  In psychometrics, a timeout ($> 3000\text{ms}$) on a stimulus is an omission error. Only pre-stimulus false starts (where the stimulus presentation was never initiated or evaluated) are excluded from accuracy denominator. Excluding timeouts allows unresponsive participants to achieve 100% accuracy on leaderboards while missing 90% of trials.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 5, Impact: 8 $\rightarrow$ **40** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [server/engines/flankerCalculator.ts#L190](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L190) and [server/engines/stroopCalculator.ts#L241](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L241), calculate the denominator from all assessed non-false-start trials:
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

- **Target Source Links:**
  - [server/engines/flankerCalculator.ts#L178-L188](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L178-L188)
  - [server/engines/flankerCalculator.ts#L110-L121](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L110-L121)
- **The Debate:**
  - **Hunter:** In `validateDirectionTrial`, lines 110–121 support `rawLatencyMs` and `rawLatency`. But lines 178–188 compute `rt` checking only `reactionTime`, `reactionTimeMs`, and `rawReactionTime`. If a client transmits `rawLatencyMs` or `rawLatency`, `rt` becomes `null`, `validRTs` remains empty, and all summary latency metrics (`averageReactionTime`, `fastestReactionTime`, `slowestReactionTime`, `medianReactionTime`) become `null`.
  - **Skeptic:** Confirmed. Re-scored from 48 down to 40 (Freq: 5, Impact: 8).
- **Referee Code Review & Adjudication:**
  Direct code inspection of [server/engines/flankerCalculator.ts#L178-L188](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L178-L188) verifies:
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
  `dt.rawLatencyMs` and `dt.rawLatency` are completely omitted. If client telemetry submits `rawLatencyMs` without setting redundant `reactionTime`, `rt === null`. Even though `dt.valid` is true and `totalCorrect` increments, `validRTs` remains `[]`. Lines 198–207 then assign `null` to `avg`, `fastest`, `slowest`, and `median`. The entire reaction time dataset for that assessment is wiped out upon Firestore ingestion.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 5, Impact: 8 $\rightarrow$ **40** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [server/engines/flankerCalculator.ts#L178-L184](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L178-L184), extend the fallback chain to include `rawLatencyMs` and `rawLatency`:
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

- **Target Source Links:**
  - [server/engines/stroopCalculator.ts#L81, L97, L196, L226](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L81)
  - [server/engines/reactionCalculator.ts#L92](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/reactionCalculator.ts#L92)
  - [server/engines/flankerCalculator.ts#L46](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/flankerCalculator.ts#L46)
  - [mobile/src/components/ColorTest.tsx#L262](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx#L262)
- **The Debate:**
  - **Hunter:** `stroopCalculator.ts` uses `80.01` instead of `80.0`. A participant response at 80.00ms is treated as a valid trial on the client (`80 < 80` is false) but flagged as a false start on the server (`80.00 < 80.01` is true).
  - **Skeptic:** Confirmed. Re-scored from 42 down to 10 (Freq: 2, Impact: 5). Landing in the exact $[80.00, 80.01)$ window is infrequent, but it represents an uncoordinated threshold divergence across engines.
- **Referee Code Review & Adjudication:**
  In `reactionCalculator.ts#L92`, `flankerCalculator.ts#L46`, and mobile `ColorTest.tsx#L262`, the physiological floor is uniformly `80.0ms`.
  In [server/engines/stroopCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts):
  - Line 81: `rawRt < 80.01`
  - Line 97: `rawRt < 80.01`
  - Line 196: `rawRtPhysiological < 80.01`
  - Line 226: `rawRtPhysiological >= 80.01`
  This arbitrary `0.01ms` float discrepancy causes any response at exactly 80.00ms to be classified on the server as `ANTICIPATORY_RESPONSE` (`isCorrect = false`, `accuracy = 0`), contradicting the client.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 2, Impact: 5 $\rightarrow$ **10** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [server/engines/stroopCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts), replace `80.01` with `80.0` at lines 81, 97, 196, and 226.

---

### BUG-C8-05: Mobile ColorTest Awards Success Chime on False Starts and Omits 5 Core Metadata Fields on Timeout Observations

- **Target Source Links:**
  - [mobile/src/components/ColorTest.tsx#L244-L253](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx#L244-L253)
  - [mobile/src/components/ColorTest.tsx#L467-L490](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx#L467-L490)
- **The Debate:**
  - **Hunter:** In `mobile/src/components/ColorTest.tsx`:
    1. Feedback chimes success when color matches even if `rawDelta < 80` (false start).
    2. Timeout handler omits 5 core metadata fields (`trialIndex`, `sequenceNumber`, `attemptNumber`, `correct: false`, `validity: 'TIMEOUT'`).
  - **Skeptic:** Confirmed. Re-scored from 40 down to 30 (Freq: 6, Impact: 5).
- **Referee Code Review & Adjudication:**
  Direct code inspection of [mobile/src/components/ColorTest.tsx#L244-L253](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx#L244-L253) reveals:
  ```ts
  const expected = currentInstruction === 'WORD' ? currentWord.name : currentColor.name;
  const correct = selectedColorName === expected;
  setFeedbackResult(correct ? 'CORRECT' : 'INCORRECT');
  if (correct) {
    playAudioCue('success');
    triggerHaptic('success');
  }
  ```
  This executes before `isFalseStart = rawDelta < 80` is evaluated on line 262. If a user taps prematurely at 30ms and guesses the right color, the UI awards green "CORRECT", triggers success haptics, and plays the success chime. On the server, `derivedFalseStart` marks it invalid and incorrect. The mobile app gives positive reinforcement for a penalized error.
  Furthermore, lines 467–490 in the timeout callback omit `trialIndex`, `sequenceNumber`, `attemptNumber`, `correct: false`, and `validity: 'TIMEOUT'`, causing schema gaps in stored observation datasets.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 6, Impact: 5 $\rightarrow$ **30** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [mobile/src/components/ColorTest.tsx](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx):
  1. Evaluate `const isFalseStart = rawDelta < 80;` prior to feedback. If `isFalseStart`, set `setFeedbackResult('INCORRECT')`, play `error` audio, and fire `error` haptic.
  2. On lines 467–490, include the 5 missing fields: `trialIndex: rawObservationsRef.current.length + 1`, `sequenceNumber: rawObservationsRef.current.length + 1`, `attemptNumber: 1`, `correct: false`, `validity: 'TIMEOUT'`.

---

### BUG-C8-06: Stroop Condition Averages Omit `t.rawLatency`, Zero-Diluting Condition RTs and Corrupting Interference Cost

- **Target Source Links:**
  - [server/engines/stroopCalculator.ts#L60-L69](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L60-L69)
  - [server/engines/stroopCalculator.ts#L178-L188](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L178-L188)
  - [server/engines/stroopCalculator.ts#L261-L271](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L261-L271)
- **The Debate:**
  - **Hunter:** Stroop condition averages omit `t.rawLatency`, causing the null coalescing chain to fall back to `0`, zero-diluting congruent and incongruent averages and wrecking `interferenceCost`.
  - **Skeptic:** Confirmed. Re-scored from 35 down to 24 (Freq: 4, Impact: 6). Skeptic correctly noted that Hunter made a factual error claiming line 65 parses `rawLatency` (line 65 parses `reactionTime`). In truth, `stroopCalculator.ts` never parses `rawLatency` anywhere.
- **Referee Code Review & Adjudication:**
  Inspection confirms both points:
  1. `stroopCalculator.ts#L60-L69` and `L178-L188` omit `t.rawLatency`, unlike `assessmentEngine.ts#L107`, `reactionCalculator.ts#L84`, and `flankerCalculator.ts#L28`.
  2. In lines 262 and 266:
     ```ts
     const cSum = congruentTrials.reduce((acc, t) => acc + Number(t.reactionTime ?? t.reactionTimeMs ?? t.rawReactionTime ?? t.rawLatencyMs ?? 0), 0);
     ```
     `t.rawLatency` is absent. If passed, it adds `0` to the sum, causing condition averages to drop to values like `35.4ms` instead of `380ms`.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 4, Impact: 6 $\rightarrow$ **24** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [server/engines/stroopCalculator.ts](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts), add `rawLatency` parsing in `validateColorRecognitionTrial` (line 65) and `rawRtPhysiological` (line 183), and normalize `t.reactionTime = correctedRt !== null ? correctedRt : rawRtPhysiological!` so condition averages compute cleanly.

---

### BUG-C8-07: Trial Limit Constant Discrepancy Between `assessmentEngine.ts` (105) and `memoryCalculator.ts` (103)

- **Target Source Links:**
  - [server/engines/assessmentEngine.ts#L12-L13](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L12-L13)
  - [server/engines/memoryCalculator.ts#L110, L201](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/memoryCalculator.ts#L110)
- **The Debate:**
  - **Hunter:** `assessmentEngine.ts` allows 105 trials, but `memoryCalculator.ts` checks `trials.length > 103`. Payloads with 104 or 105 trials pass the gateway but crash inside the engine. (Hunter Score: 30).
  - **Skeptic:** Dismissed under YAGNI (Score: 3 < 5). In Corsi block-tapping, human memory capacity is 5–9 blocks; world record is under 20. Reaching 104 trials in Corsi blocks requires reaching level 101 (recalling a 102-block sequence), which is physiologically impossible.
- **Referee Code Review & Adjudication:**
  The Skeptic's analysis is completely sound. The Corsi test terminates on consecutive failures. To generate 104 trials, a participant would need to memorize an impossible 102-element spatial block sequence. In Number Memory, level 101 requires memorizing 103 digits.
  No human user has ever generated or will ever generate $> 103$ trials in PULSE. The 2-trial divergence (103 vs 105) is a benign remnant from a refactoring commit that can only be reached by synthetic fuzzer payloads pushing 104+ objects. Under Ponytail senior dev principles ("Does it need to exist? Skip unrequested features, wrappers, and config"), this does not represent an actionable production defect.
- **Referee Ruling:** **DISMISSED (Score < 5 / YAGNI / Benign Fuzzer Edge Case)**
- **Final Risk Score:** Frequency: 1, Impact: 3 $\rightarrow$ **3** (Non-Actionable, $< 5$).
- **Action:** No code changes required.

---

### BUG-C8-08: Unchecked `rawRt` Allows Negative Latency Payloads to Bypass Gateway Validation

- **Target Source Links:**
  - [server/engines/assessmentEngine.ts#L103-L107, L149-L151, L169-L175](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L103-L107)
- **The Debate:**
  - **Hunter:** `assessmentEngine.ts#L149-L151` validates `reactionTime < 0`, but does not validate `rawRt` (`rawReactionTime`, `rawLatencyMs`, `rawLatency`). If `reactionTime` is omitted, negative latencies pass gateway validation. (Score: 24).
  - **Skeptic:** Confirmed. Re-scored to 8 (Freq: 2, Impact: 4). Downstream calculators flag `< 80ms` as a false start, but the outer gateway boundary is bypassed.
- **Referee Code Review & Adjudication:**
  In [server/engines/assessmentEngine.ts#L149-L151](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L149-L151):
  ```ts
  if (reactionTime !== null && (!Number.isFinite(reactionTime) || reactionTime < 0)) {
    return { success: false, error: `Invalid reactionTime at trial ${i + 1}.` };
  }
  ```
  And lines 169–175:
  ```ts
  const checkedRt = rawRt !== null ? rawRt : reactionTime;
  if (checkedRt !== null && checkedRt > 0) {
    const calculatedDelta = responseTimestamp - stimulusTimestamp;
    if (Math.abs(checkedRt - calculatedDelta) > 150) { ... }
  }
  ```
  If an adversary or buggy client submits `{ rawReactionTime: -50 }` without `reactionTime`, `reactionTime` is `null`, line 149 is skipped. `checkedRt = -50`, so `checkedRt > 0` is false, and the delta consistency check is skipped. The observation breaches outer gateway validation.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 2, Impact: 4 $\rightarrow$ **8** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [server/engines/assessmentEngine.ts#L149](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L149), validate the effective reaction time:
  ```ts
  const effectiveRt = reactionTime ?? rawRt;
  if (effectiveRt !== null && (!Number.isFinite(effectiveRt) || effectiveRt < 0)) {
    return { success: false, error: `Invalid reactionTime at trial ${i + 1}. Must be a non-negative number.` };
  }
  ```

---

### BUG-C8-09: Missing `session.sessionId` Property Causes PRNG Degradation to Literal `"undefined"` Seed Strings

- **Target Source Links:**
  - [server/engines/assessmentEngine.ts#L32](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/assessmentEngine.ts#L32)
  - [server/models/sessionModels.ts#L1-L8](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/models/sessionModels.ts#L1-L8)
  - [server/services/researchService.ts#L218](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/researchService.ts#L218)
- **The Debate:**
  - **Hunter:** If `session` is truthy but lacks `sessionId`, `sessionId` becomes `undefined`, which produces `"undefined-direction-..."` PRNG seeds, destroying cryptographic randomness. (Score: 20).
  - **Skeptic:** Disproved. False Positive (Score: 0). The sole production caller (`researchService.ts#L218`) passes `sessionCheck.session`, strictly typed as `ExperimentSessionRecord` where `sessionId: string` is a mandatory primary key from Firestore. Unit tests that omit `session` safely fallback to `'default_seed'`.
- **Referee Code Review & Adjudication:**
  The Skeptic's disproof is verified:
  1. In [server/models/sessionModels.ts#L1-L8](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/models/sessionModels.ts#L1-L8), `ExperimentSessionRecord` defines `sessionId: string` as a non-optional property.
  2. In [server/services/researchService.ts#L218](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/researchService.ts#L218), `sessionCheck.session` is guaranteed to have `sessionId`.
  3. When `session` is `undefined` (in standalone unit tests), `session ? session.sessionId : 'default_seed'` evaluates to `'default_seed'`.
  4. There is no callsite in the codebase that passes an object lacking `sessionId`. The hypothesized condition cannot happen in practice.
- **Referee Ruling:** **DISPROVED (False Positive)**
- **Final Risk Score:** Frequency: 0, Impact: 1 $\rightarrow$ **0** (Non-Actionable, $< 5$).
- **Action:** No code changes required.

---

### BUG-C8-10: Stroop Derived Metrics Omit `totalFalseStarts`, `totalTrials`, and `totalIncorrect`, Breaking Unified Reporting

- **Target Source Links:**
  - [server/engines/stroopCalculator.ts#L273-L284](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L273-L284)
  - [server/routes/researchRoutes.ts#L153-L157](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L153-L157)
  - [server/services/researchService.ts#L592-L595](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/researchService.ts#L592-L595)
  - [mobile/src/components/ColorTest.tsx#L607](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx#L607)
- **The Debate:**
  - **Hunter:** `stroopCalculator.ts` only outputs `{ accuracy, correctCount }`. Missing `totalFalseStarts`, `totalTrials`, and `totalIncorrect` creates contract fragmentation across engines. (Score: 18).
  - **Skeptic:** Confirmed. Re-scored to 21 (Freq: 7, Impact: 3). Proven by Telegram notifications receiving `falseStartsCount: undefined` and public dataset rows storing `null` for `totalFalseStarts` and `totalCorrect`.
- **Referee Code Review & Adjudication:**
  Direct code review confirms the contract gap:
  - In [server/routes/researchRoutes.ts#L153-L157](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L153-L157), `falseStartsCount` checks `dm.totalFalseStarts`. Because `stroopCalculator.ts` omits it, Telegram alerts for Color Recognition assessments always show `undefined`.
  - In [server/services/researchService.ts#L592-L594](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/researchService.ts#L592-L594), `totalFalseStarts`, `totalCorrect`, and `totalIncorrect` evaluate to `null` because `derived` lacks those standardized properties.
  - In [mobile/src/components/ColorTest.tsx#L607](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/src/components/ColorTest.tsx#L607), the client expects `res.derivedMetrics.totalCount`.
- **Referee Ruling:** **CONFIRMED**
- **Final Risk Score:** Frequency: 7, Impact: 3 $\rightarrow$ **21** (Actionable, $\ge 5$).
- **Minimal Surgical Fix (Ponytail):**
  In [server/engines/stroopCalculator.ts#L273-L284](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/engines/stroopCalculator.ts#L273-L284), standardize the metrics dictionary:
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

## 3. Prioritized Remediation Plan for Confirmed Defects

Under Ponytail senior developer principles (the smallest complete change that solves the root cause), the 8 confirmed defects can be remediated with concise, surgical diffs across just 4 files:

| Priority | Defect ID | File Target | Remediation Summary | Lines Changed |
|:---:|---|---|---|:---:|
| **P1** | **BUG-C8-01** | `server/engines/stroopCalculator.ts` | Deduplicate trials by `trialNumber` before asserting 15 completed logical trials | ~8 |
| **P1** | **BUG-C8-02** | `server/engines/flankerCalculator.ts` & `stroopCalculator.ts` | Base accuracy denominator on non-false-start trials instead of non-timeout trials | ~4 |
| **P1** | **BUG-C8-03** | `server/engines/flankerCalculator.ts` | Add `rawLatencyMs` and `rawLatency` to summary RT fallback chain | ~4 |
| **P2** | **BUG-C8-06** | `server/engines/stroopCalculator.ts` | Support `rawLatency` and normalize `t.reactionTime` before condition sums | ~6 |
| **P2** | **BUG-C8-05** | `mobile/src/components/ColorTest.tsx` | Suppress success chime on `rawDelta < 80`; restore 5 missing metadata fields on timeout | ~12 |
| **P3** | **BUG-C8-10** | `server/engines/stroopCalculator.ts` | Standardize `derivedMetrics` (`totalCorrect`, `totalTrials`, `totalCount`, `totalFalseStarts`, `totalIncorrect`) | ~8 |
| **P3** | **BUG-C8-04** | `server/engines/stroopCalculator.ts` | Replace `80.01` with canonical `80.0` at 4 sites | ~4 |
| **P3** | **BUG-C8-08** | `server/engines/assessmentEngine.ts` | Validate `reactionTime ?? rawRt` against negative values | ~3 |

---

## 4. Sign-off

- **Cycle:** 8 (Assessment Engines, PRNG Determinism, and Mobile Color Recognition)
- **Candidates Audited:** 10
- **Confirmed Actionable:** 8
- **Dismissed (Score < 5 / YAGNI):** 1 (BUG-C8-07)
- **Disproved (False Positive):** 1 (BUG-C8-09)
- **Referee Verdict:** Rulings finalized and documented. Ready for surgical patching and regression test verification.
