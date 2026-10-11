# PULSE Project Specification

**PULSE (Precision User Latency & Stimulus Evaluator)**  
*Authoritative Technical & Product Specification — Version 2.2*

---

## 1. Product Overview & Purpose
PULSE is a high-precision cognitive assessment platform, empirical research engine, and cryptographic latency benchmark suite. Designed for desktop workstations and mobile touchscreen devices, it captures high-resolution browser timing for reaction-time tasks and evaluates executive function, attentional conflict, and working memory across normalized demographic age cohorts. End-to-end timing accuracy varies by browser, display, and input hardware; display-delay values are estimates rather than direct physical measurements.

### Core Objectives
1. **Precision Cognitive Baselining:** Provide laboratory-grade measurement of motor response speed, flanker interference, Stroop inhibition, and spatial/verbal memory span.
2. **Open Empirical Science:** Aggregate anonymized assessment outcomes into a publicly queryable, downloadable dataset categorized by age cohort.
3. **Cryptographic Integrity:** Guarantee data provenance and prevent synthetic score manipulation using server-side HMAC-SHA256 attestation.
4. **Privacy-Oriented Architecture:** Avoid direct identity collection in participant flows and sanitize public research records. These design choices are privacy safeguards, not a certification of compliance with GDPR, the FTC Health Breach Notification Rule, Washington My Health My Data Act, or other laws; legal and operational compliance requires separate review.

---

## 2. Target Users & Cohorts
PULSE normalizes performance metrics across 7 standard age cohorts:
- `Children (8–12)`
- `Adolescents (13–17)`
- `Young adults (18–25)`
- `Adults (26–40)`
- `Middle-aged adults (41–60)`
- `Older adults (61–75)`
- `Seniors (76+)`

---

## 3. Core User Flows

```
[User Arrives]
      │
      ├─► Desktop Browser ──► Route: /
      └─► Mobile Browser  ──► Auto-Redirect: /mobile/
      │
[Cohort Selection] (Age bracket is selected for the assessment session; do not assume it is persisted as a user setting)
      │
[Assessment Execution]
      ├── Visual Reaction (/reaction-test)
      ├── Direction Flanker (/direction-test)
      ├── Color Stroop (/colour-recognition)
      ├── Block Memory Corsi (/block-memory)
      └── Number Memory Digit Span (/number-memory)
      │
[Result & Telemetry Breakdown]
      ├── Personal Best Detection
      ├── Temporal Dynamics Analysis
      ├── Server HMAC Attestation (POST /api/research/submit)
      └── Voluntary Leaderboard Opt-In (POST /api/leaderboard/submit)
      │
[Research & Discovery]
      ├── Public Dataset Explorer (/dataset)
      └── Cognitive Improvement Guidance (/improve)
```

---

## 4. Assessment Battery Specifications

### 4.1 Visual Reaction Time (VRT)
- **Status:** `IMPLEMENTED`
- **Scientific Foundation:** Simple Visual Reaction Time test with variable foreperiod preparation.
- **Protocol Parameters:**
  - Standard Trials: 10 sequential trial numbers are required by the current server calculator; invalid/false-start attempts may affect how many attempts are needed to obtain 10 valid responses.
  - Foreperiod: Randomized delay between $100\text{ms}$ and $3000\text{ms}$ (categorized as `SHORT` $\le 500\text{ms}$ vs `LONG` $> 500\text{ms}$).
  - Stimulus: Reticle state transitions from standby (`Awaiting`) to active signal (`Stimulus Active`).
  - Physiological Floor: $80\text{ms}$. Clicks before stimulus onset trigger `FALSE_START_PRE_STIMULUS`. Responses $< 80\text{ms}$ trigger `ANTICIPATORY_TOO_FAST`. Timeout threshold is $3000\text{ms}$.
- **Metrics Computed:**
  - Mean RT (ms), Median RT (ms), Fastest RT (ms), Slowest RT (ms).
  - Consistency Score ($0-100\%$).
  - Total False Starts.
  - Temporal Dynamics: Foreperiod sensitivity index, transition cost, adaptation slope, and habituation index.

### 4.2 Direction Discriminability (Flanker Task)
- **Status:** `IMPLEMENTED`
- **Scientific Foundation:** Eriksen Flanker Task measuring selective attention, executive control, and inhibitory filtering.
- **Protocol Parameters:**
  - Trials: 10 fixed trials.
  - Stimuli: 5 horizontal arrows (`< < < < <` or `< < > < <`). Center arrow is target; outer arrows are congruent (same direction) or incongruent (opposite direction).
  - Inputs: Keyboard Arrow Keys (`ArrowLeft`, `ArrowRight`) or on-screen touch buttons.
- **Metrics Computed:**
  - Accuracy ($0-100\%$), Total Correct / Incorrect.
  - Average & Median Reaction Time (ms).
  - Flanker Conflict Interference Cost ($RT_{\text{incongruent}} - RT_{\text{congruent}}$).

### 4.3 Color Recognition (Stroop Task)
- **Status:** `IMPLEMENTED`
- **Scientific Foundation:** Stroop Effect measuring cognitive flexibility, processing speed, and semantic interference.
- **Protocol Parameters:**
  - Trials: 15 fixed trials.
  - Stimuli: Color names (Red, Green, Blue, Yellow) rendered in congruent or conflicting ink colors.
  - Inputs: Multi-button selection tray matching ink colors.
- **Metrics Computed:**
  - Accuracy ($0-100\%$), Total Correct.
  - Congruent Mean RT vs Incongruent Mean RT.
  - Stroop Interference Cost (ms).

### 4.4 Spatial Block Memory (Corsi Block-Tapping)
- **Status:** `IMPLEMENTED`
- **Scientific Foundation:** Corsi Block-Tapping Test measuring visuospatial short-term and working memory span.
- **Protocol Parameters:**
  - Grid: 9 interactive blocks arranged in an asymmetric matrix.
  - Sequence: Sequence presentation highlights blocks with $500\text{ms}$ active illumination and $300\text{ms}$ inter-stimulus pause.
  - Progression: Starts at sequence length 2; increments by 1 on successful recall. 1 trial mistake allowed before termination.
- **Metrics Computed:**
  - Highest Level Reached, Longest Sequence Span.
  - Total Attempts, Total Correct, Overall Accuracy ($0-100\%$), Total Time (ms).

### 4.5 Number Memory (Digit Span)
- **Status:** `IMPLEMENTED`
- **Scientific Foundation:** Forward Digit Span task measuring verbal short-term phonological loop capacity.
- **Protocol Parameters:**
  - Sequence: Displays numerical sequence one digit at a time with configurable exposure window ($1000\text{ms} + \text{length} \times 200\text{ms}$).
  - Recall: Numeric keypad or keyboard text input.
  - Progression: Starts with 3 digits; increments by 1 digit per successful level.
- **Metrics Computed:**
  - Longest Digit Span, Highest Level Reached.
  - Overall Accuracy ($0-100\%$), Total Time (ms).

---

## 5. System Features & Implementation Matrix

| Module / Feature | Route / Interface | Status | Implementation Details |
| :--- | :--- | :--- | :--- |
| **Desktop Home & Hero** | `/` | `IMPLEMENTED` | Awwwards-tier animated canvas background, 3D assessment carousel, interactive live reticle, quick-start CTAs. |
| **Mobile PWA Sub-App** | `/mobile/` | `IMPLEMENTED` | Dedicated mobile entry point, touch-optimized layouts, service worker caching, standalone PWA install prompt. |
| **Device Auto-Routing** | Middleware & Client | `IMPLEMENTED` | Server routing uses mobile User-Agent/client-hint detection; client routing additionally considers viewport width (currently $\le 768\text{px}$), touch/pointer signals, and explicit override flags. |
| **Hardware Calibrator** | Background Hook | `IMPLEMENTED (ESTIMATE)` | RAF sampling estimates browser frame cadence and derives a frame-midpoint display-delay offset; it is not a direct physical display-latency measurement. |
| **Research Dataset Explorer UI** | `/dataset`, `/analytics` | `BACKEND IMPLEMENTED / UI COMING SOON` | The routes currently render `DatasetComingSoon`; server-side dataset retrieval/summary APIs exist, but the described interactive explorer and its exports are not available on these routes. |
| **Global Leaderboard** | `/leaderboard` | `IMPLEMENTED` | Top 100 rankings per assessment type, verified server HMAC tokens, strict opt-in alias validation. |
| **Leaderboard Opt-In** | Modal UI | `IMPLEMENTED` | The participant uses Firebase Anonymous Authentication; public submission eligibility is separate from auth anonymity and is governed by explicit opt-in, score validation, and display-alias rules. |
| **Cognitive Guidance** | `/improve` | `IMPLEMENTED` | Sleep, circadian timing, caffeine, and reaction training educational cards backed by scientific literature. |
| **Admin Console** | `/admin/*` | `IMPLEMENTED` | Passcode-protected overview, live leaderboard moderation (hide/delete with reason notes), and audit trail viewer. |
| **Privacy Policy & Terms** | `/privacy` | `IMPLEMENTED` | Comprehensive disclosure of zero-PII data handling, statutory compliance, and data subject rights. |
| **Multiplayer / Live Duels** | — | `PLANNED` | Real-time peer-to-peer cognitive reaction duels (Not implemented in v2.2). |
| **Native Mobile App (iOS/Android)**| App Stores | `PLANNED` | Capacitor/React Native native wrapper (Web PWA active in v2.2). |

---

## 6. Technical Constraints & Invariants
1. **Timing Accuracy:** Use `performance.now()` for measured latency. Browser timers may schedule a foreperiod or timeout, but must not calculate reaction latency. RAF frame timestamps are browser-frame estimates, not direct physical stimulus-onset measurements; never transition/animate stimulus elements while timing is active.
2. **Database Write Authority:** Direct client writes to canonical Firestore collections are blocked by security rules. Canonical mutations are performed through the Express backend; applicable research/leaderboard payloads receive server-side provenance signing.
3. **Storage Boundaries:** UI preferences/cache and in-progress trial state may use browser storage. Public dataset and leaderboard reads must use their authoritative API/Firestore paths, and canonical result persistence requires the server/Firestore path; do not describe browser storage as a canonical result or leaderboard fallback.


## 7. Verification and Claim Boundaries

- **Dataset status:** `/dataset` and `/analytics` currently render a Coming Soon page even though backend research dataset endpoints exist. Update this entry only after the user-facing explorer is implemented and verified.
- **Retention status:** The retention periods in `security/retention.md` are policy targets until deployed TTL/purge configuration is verified. The checked-in source did not establish automatic deletion or a participant-erasure workflow.
- **Measurement claims:** High-resolution timestamps do not prove sub-millisecond end-to-end accuracy on every browser/display/input configuration. Describe the display-delay offset as an estimate unless independent hardware validation supports a stronger claim.
- **Legal claims:** Privacy safeguards in source code do not alone establish statutory compliance; avoid compliance guarantees without legal and operational review.
