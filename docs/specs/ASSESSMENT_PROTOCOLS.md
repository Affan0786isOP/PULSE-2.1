# PULSE Assessment Protocols Specification

This specification documents the scientific protocols, stimulus presentation rules, timing invariants, and scoring calculations implemented across the 5 core PULSE assessments.

---

## 1. Visual Reaction Time (VRT Protocol `vrt-v1`)

### 1.1 Objective & Task Design
Evaluates simple motor response latency and anticipatory inhibition under variable foreperiod conditions.

### 1.2 Trial Lifecycle
1. **Standby Phase:** Screen displays `Awaiting` state with amber stimulus reticle.
2. **Foreperiod Generation:** A delay $T_f$ is randomly selected from a uniform distribution:
   - `SHORT`: $100\text{ms} \le T_f \le 500\text{ms}$ ($50\%$ probability)
   - `LONG`: $501\text{ms} \le T_f \le 3000\text{ms}$ ($50\%$ probability)
3. **Stimulus Presentation:** Reticle flashes `Stimulus Active` (cyan/white). Timestamp $T_{\text{stim}}$ is recorded using `performance.now()`.
4. **Response Detection:** User clicks or taps the display. Timestamp $T_{\text{resp}}$ is recorded.
5. **Validity Checks:**
   - Click before $T_{\text{stim}}$ $\to$ `FALSE_START_PRE_STIMULUS`
   - Response latency $T_{\text{resp}} - T_{\text{stim}} < 80\text{ms}$ $\to$ `ANTICIPATORY_TOO_FAST`
   - Response latency $> 3000\text{ms}$ $\to$ `TIMEOUT`
   - Valid range: $80\text{ms} \le RT \le 3000\text{ms}$ $\to$ `VALID`

### 1.3 Computed Metrics
- **Mean Reaction Time:** $\bar{RT} = \frac{1}{N_{\text{valid}}} \sum RT_i$
- **Median Reaction Time:** Middle value of sorted valid RTs.
- **Consistency Score:** $100 - \left(\frac{\sigma_{RT}}{\bar{RT}} \times 100\right)$ (clamped $0-100\%$).
- **Temporal Dynamics Analysis:**
  - Foreperiod Sensitivity: Difference between mean SHORT and LONG foreperiod RTs.
  - Foreperiod Transition Cost: Latency difference when transitioning from SHORT to LONG trials.
  - Adaptation Slope: Linear regression slope of RT across sequential trials.

---

## 2. Direction Discriminability (Flanker Protocol)

### 2.1 Objective & Task Design
Measures executive attentional control, selective focus, and vulnerability to visual interference via the Eriksen Flanker paradigm.

### 2.2 Stimulus Configuration
- **Array:** 5 horizontal chevron arrows displayed centrally.
- **Target:** The middle (3rd) arrow.
- **Flankers:** The 4 surrounding arrows (2 left, 2 right).
- **Conditions:**
  - *Congruent (50% of trials):* Flankers match target (`< < < < <` or `> > > > >`).
  - *Incongruent (50% of trials):* Flankers oppose target (`< < > < <` or `> > < > >`).
- **Trial Count:** 10 fixed sequential trials.

### 2.3 Computed Metrics
- **Accuracy:** $\frac{\text{Correct Trials}}{10} \times 100\%$
- **Flanker Interference Cost:** $\bar{RT}_{\text{incongruent}} - \bar{RT}_{\text{congruent}}$ (ms).

---

## 3. Color Recognition (Stroop Protocol)

### 3.1 Objective & Task Design
Measures cognitive flexibility, semantic inhibition, and processing speed via the classic Stroop color-word interference paradigm.

### 3.2 Stimulus Configuration
- **Color Set:** Red, Green, Blue, Yellow.
- **Conditions:**
  - *Congruent:* Word text matches font color (e.g., word "BLUE" printed in blue ink).
  - *Incongruent:* Word text contradicts font color (e.g., word "RED" printed in green ink).
- **Task Requirement:** Participant must identify the **ink color**, ignoring the semantic text meaning.
- **Trial Count:** 15 fixed sequential trials.

### 3.3 Computed Metrics
- **Accuracy:** $\frac{\text{Correct Choices}}{15} \times 100\%$
- **Stroop Interference Cost:** $\bar{RT}_{\text{incongruent}} - \bar{RT}_{\text{congruent}}$ (ms).

---

## 4. Spatial Block Memory (Corsi Protocol)

### 4.1 Objective & Task Design
Evaluates visuospatial short-term and working memory span using an interactive 9-block matrix.

### 4.2 Sequence Lifecycle
1. **Display Phase:** Blocks illuminate in a randomized sequence at $500\text{ms}$ active light-up with $300\text{ms}$ inter-block interval.
2. **Recall Phase:** Participant taps the blocks in identical sequential order.
3. **Progression:**
   - Begins at sequence length 2.
   - Increment length by +1 upon successful recall.
   - Max 1 error allowed; a second consecutive failure terminates the test.

### 4.3 Computed Metrics
- **Highest Level Reached:** Length of longest error-free sequence.
- **Working Memory Span:** Maximum sequence length recalled.
- **Accuracy & Total Duration:** Total attempts vs correct recall rounds and total elapsed time.

---

## 5. Number Memory Span (Digit Span Protocol)

### 5.1 Objective & Task Design
Measures verbal short-term memory and phonological loop capacity.

### 5.2 Protocol Rules
1. Sequence of numerical digits ($0-9$) presented with dynamic exposure window ($1000\text{ms} + \text{length} \times 200\text{ms}$).
2. User inputs recalled digits into numeric keypad or input field.
3. Starts at 3 digits; increments by 1 digit per successful level.
4. Terminates upon second failed attempt.

### 5.3 Computed Metrics
- **Digit Span:** Maximum digit length successfully reproduced.
- **Highest Level Reached:** Level index achieved.
