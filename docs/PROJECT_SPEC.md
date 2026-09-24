# PULSE Project Specification

**PULSE (Precision User Latency & Stimulus Evaluator)**  
*Authoritative Technical & Product Specification — Version 2.2*

---

## 1. Product Overview & Purpose
PULSE is a high-precision cognitive assessment platform, empirical research engine, and cryptographic latency benchmark suite. Designed for both desktop workstations and mobile touchscreen devices, it delivers sub-millisecond visual reaction timing, executive function evaluation, attentional conflict measurement, and working memory analysis across normalized demographic age cohorts.

### Core Objectives
1. **Precision Cognitive Baselining:** Provide laboratory-grade measurement of motor response speed, flanker interference, Stroop inhibition, and spatial/verbal memory span.
2. **Open Empirical Science:** Aggregate anonymized assessment outcomes into a publicly queryable, downloadable dataset categorized by age cohort.
3. **Cryptographic Integrity:** Guarantee data provenance and prevent synthetic score manipulation using server-side HMAC-SHA256 attestation.
4. **Privacy-Preserving Architecture:** Collect zero email addresses, zero passwords, and zero direct PII, ensuring compliance with global privacy regulations (GDPR, FTC Health Breach Notification, Washington My Health My Data Act).

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
[Cohort Selection] (Age bracket selection saved in localStorage)
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
  - Standard Trials: 5 sequential attempts.
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
| **Device Auto-Routing** | Middleware & Client | `IMPLEMENTED` | Screen width ($<768\text{px}$) & User-Agent detection redirects mobile visitors to `/mobile/` and desktop to `/`. |
| **Hardware Calibrator** | Background Hook | `IMPLEMENTED` | RAF sampling detects screen refresh rate (60Hz–240Hz) and display latency offset. |
| **Research Dataset Explorer** | `/dataset`, `/analytics` | `IMPLEMENTED` | Real-time multi-filter distribution curves (Visx/Recharts), cohort slicing, and CSV/JSON export. |
| **Global Leaderboard** | `/leaderboard` | `IMPLEMENTED` | Top 100 rankings per assessment type, verified server HMAC tokens, strict opt-in alias validation. |
| **Leaderboard Opt-In** | Modal UI | `IMPLEMENTED` | Self-selected public alias modal with profanity filter; guest/anonymous submissions excluded from public rank. |
| **Cognitive Guidance** | `/improve` | `IMPLEMENTED` | Sleep, circadian timing, caffeine, and reaction training educational cards backed by scientific literature. |
| **Admin Console** | `/admin/*` | `IMPLEMENTED` | Passcode-protected overview, live leaderboard moderation (hide/delete with reason notes), and audit trail viewer. |
| **Privacy Policy & Terms** | `/privacy` | `IMPLEMENTED` | Comprehensive disclosure of zero-PII data handling, statutory compliance, and data subject rights. |
| **Multiplayer / Live Duels** | — | `PLANNED` | Real-time peer-to-peer cognitive reaction duels (Not implemented in v2.2). |
| **Native Mobile App (iOS/Android)**| App Stores | `PLANNED` | Capacitor/React Native native wrapper (Web PWA active in v2.2). |

---

## 6. Technical Constraints & Invariants
1. **Timing Accuracy:** Timing must use `window.performance.now()`. Browser timers (`setTimeout`, `setInterval`) are strictly prohibited for reaction latency measurement.
2. **Database Write Authority:** Direct client writes to Firestore are blocked by security rules (`allow write: if false`). All writes are signed and executed server-side via `server.ts`.
3. **Storage Fallback:** If offline or Firestore is unavailable, local session history is stored in-memory and in `localStorage` without blocking the user.
