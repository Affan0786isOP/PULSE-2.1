# PULSE 2.1 — All-Pages Visual Polish & Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Systematically audit, polish, and visually verify every single page, assessment canvas, and modal dialog in PULSE 2.1 across desktop and mobile viewports using the `screenshot-driven-ui` loop and browser verification, maintaining 100% P0 stimulus timing integrity while perfecting CSS token scoping, typography, spacing, and micro-interactions.

**Architecture:** A 5-phase visual polish strategy starting with root-level CSS token scoping (`[data-theme="light"]`) so all semantic tokens automatically harmonize across all components, followed by targeted page-by-page visual polish (Content Hubs, Modals, Assessment Edge Chrome), and verified through an iterative `screenshot-driven-ui` feedback loop (Code -> Build -> Playwright/Browser Capture -> Inspect PNG via `view_file` -> Critique).

**Tech Stack:** React 19, TypeScript, Vite 6, Tailwind CSS v4, Motion 12, Playwright, Vitest.

**Spec:** `docs/superpowers/plans/2026-10-18-design-system-unification.md` & `screenshot-driven-ui` visual quality gates.

---

## Global Constraints

- **P0 Stimulus & Timing Freeze:** Zero edits to `performance.now()` timestamps, `useRefreshRate` display midpoint calibration, animation frame loops, foreperiod generators, or Firestore idempotency keys.
- **Calibrated Dark Apparatus:** All 5 active assessment engines retain their distraction-free `#12161B` dark apparatus well and baseline stimulus contrast. Minimal light chrome is restricted to the outer edge (`Navbar`).
- **Single Landmark & SEO Owner:** Exactly one `<main id="main-content">` landmark and functional skip link per route; `PageShell` remains the authoritative `<head>` metadata manager.
- **Accessible Contrast:** All text on light surfaces must meet or exceed WCAG AA contrast (minimum 4.5:1 for body copy `#334155` on white/pale-blue backgrounds).
- **Test Integrity:** Zero regressions across all 49 existing Vitest test files (405 tests passing).

---

## Review Focus

1. **Semantic CSS Token Scoping:** In `src/index.css`, `:root[data-theme="light"]` currently only matches `:root`. Any component or child relying on `var(--surface-2)` or `var(--text-primary)` (such as `HookSidebar` on `/improve`) will fall back to dark tokens if not scoped to `[data-theme="light"]`.
2. **Loading / Empty States:** Skeleton loaders and empty data tables (e.g. `/leaderboard` during initial fetch) must blend smoothly with the light card surface without harsh dark placeholders.
3. **Modal Dialog Aesthetics:** `SettingsModal`, `WelcomeModal`, and `AddToHomeScreenModal` must render crisp light surfaces, high-contrast switch toggles, and accessible focus outlines.
4. **Assessment Engine Age Selection & Report Card:** Pre-test cohort selector (`AgeSelection`) and post-test reward card (`AssessmentResultReward`) must feature refined light card typography, `#0066FF` buttons, and clear percentile visuals.
5. **Responsive Stacking & Padding:** Ensure edge padding (`max(1.5rem, env(safe-area-inset-*))`) and card grids wrap smoothly from 1440p down to 390px mobile viewports without horizontal scroll.

---

## File Structure & Ownership Matrix

| Task | Target Files to Modify | Isolated Test / Verification Files |
|---|---|---|
| **Task 1: Semantic Token Scoping** | `src/index.css` | `tests/unit/pageShell.test.tsx`, visual inspection |
| **Task 2: Content Hubs Polish** | `src/components/Assessments.tsx`, `src/components/Leaderboard.tsx`, `src/components/Improve.tsx`, `src/components/About.tsx`, `src/components/ResearchPrivacyPolicy.tsx`, `src/components/DatasetComingSoon.tsx` | `tests/unit/assessmentsPage.test.tsx`, `tests/unit/improveDataset.test.tsx`, `tests/unit/aboutPrivacy.test.tsx` |
| **Task 3: Modals & Dialogs Polish** | `src/components/SettingsModal.tsx`, `src/components/WelcomeModal.tsx`, `src/components/AddToHomeScreenModal.tsx`, `src/components/AssessmentInfoPanel.tsx` | `tests/unit/pwaInstallModal.test.tsx`, `tests/unit/AssessmentInfoPanel.test.tsx` |
| **Task 4: Assessment Edge Chrome & Rewards** | `src/components/AgeSelection.tsx`, `src/components/AssessmentResultReward.tsx`, `src/components/LeaderboardOptIn.tsx` | `tests/unit/reactionDirectionEngines.test.tsx`, `tests/unit/memoryColorEngines.test.tsx` |
| **Task 5: Screenshot-Driven Visual Audit Loop** | `scratch/capture-design-system-audit.mjs` (extended for modal & dynamic states) | 48 multi-viewport screenshots + dynamic modal screenshots in artifact directory |

---

## Detailed Task Specifications

### Task 1: Semantic Token Scoping in `src/index.css`
- **Objective:** Extend `:root[data-theme="light"]` in `src/index.css` to also match `[data-theme="light"]` and `.light`. This ensures that all CSS semantic tokens (`--surface-0`, `--surface-1`, `--surface-2`, `--surface-3`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-subtle`, `--border-default`, `--accent`) cascade cleanly into any component wrapped in `PageShell`.
- **Files:** `src/index.css`
- **Steps:**
  - [ ] Modify `src/index.css` line 113 to `:root[data-theme="light"], [data-theme="light"], .light`.
  - [ ] Ensure `--surface-2` is `#F1F5F9`, `--text-primary` is `#0F172A`, `--text-secondary` is `#475569`, `--text-muted` is `#546479`.
  - [ ] Run `npm run check` and `npm test tests/unit/pageShell.test.tsx`.
  - [ ] Verify that `HookSidebar` on `/improve` now displays a refined `#F1F5F9` background on active items instead of dark `#181D23`.

### Task 2: Content Hubs Visual Polish (`/assessments`, `/leaderboard`, `/improve`, `/about`, `/privacy`, `/dataset`)
- **Objective:** Polish micro-typography, badge contrast, card hover states, table borders, and responsive grid layouts across all documentation and hub pages.
- **Files:**
  - `src/components/Assessments.tsx`: Verify badge padding, icon container soft-blue background `#EAF5FF`, card hover transition (`hover:border-[#0066FF]/40 hover:shadow-md`).
  - `src/components/Leaderboard.tsx`: Refine skeleton loading rows so placeholder bars use `bg-slate-200/70 animate-pulse` on white cards; ensure protocol selector pills have crisp `#0066FF` active indicator and hover feedback.
  - `src/components/Improve.tsx`: Polish habit checklist items with visible `#0066FF` focus rings, smooth checkbox transitions, and clean research ledger cards.
  - `src/components/About.tsx` & `src/components/ResearchPrivacyPolicy.tsx`: Polish 4-tier data table borders (`border-slate-200`), table header background (`bg-slate-50/90`), and inline code pills (`bg-sky-50 text-sky-800 border-sky-200`).
  - `src/components/DatasetComingSoon.tsx`: Ensure card centering and subtle glow.
- **Steps:**
  - [ ] Apply surgical CSS/Tailwind refinements to the 6 content components.
  - [ ] Run targeted unit tests: `npm test tests/unit/assessmentsPage.test.tsx tests/unit/improveDataset.test.tsx tests/unit/aboutPrivacy.test.tsx`.
  - [ ] Verify clean builds: `npm run check`.

### Task 3: Modals, Dialogs, & Drawer Visual Polish
- **Objective:** Polish `SettingsModal`, `WelcomeModal`, `AddToHomeScreenModal`, and `AssessmentInfoPanel` to match the light-mode card system with high-contrast text, clear toggles, and smooth modal entrances.
- **Files:**
  - `src/components/SettingsModal.tsx`: Ensure modal dialog uses `bg-white/95 border-slate-200/90 shadow-2xl`, tab buttons have high-contrast active states, switch toggles use `#0066FF`, and slider tracks are clearly visible.
  - `src/components/WelcomeModal.tsx`: Ensure light dialog surface, clear typography, and accessible "Get Started" CTA.
  - `src/components/AddToHomeScreenModal.tsx`: Clean installation guide cards with step badges.
  - `src/components/AssessmentInfoPanel.tsx`: Drawer styling with crisp typography and heading hierarchy.
- **Steps:**
  - [ ] Audit modal JSX tokens for light-theme compatibility.
  - [ ] Run unit tests: `npm test tests/unit/pwaInstallModal.test.tsx tests/unit/AssessmentInfoPanel.test.tsx`.
  - [ ] Verify clean builds: `npm run check`.

### Task 4: Assessment Edge Chrome, Age Selection & Reward Cards (P0 Gate)
- **Objective:** Polish pre-test `AgeSelection`, post-test `AssessmentResultReward`, and `LeaderboardOptIn` while strictly freezing all active stimulus canvases and engine timing loops.
- **Files:**
  - `src/components/AgeSelection.tsx`: Refine cohort radio buttons with `border-slate-200 bg-white hover:border-[#0066FF]/50` and `#0066FF` selected state.
  - `src/components/AssessmentResultReward.tsx`: Refine post-test report card with light surface, large readable latency/accuracy stats, percentile badge, and action buttons (`Test Again`, `View Leaderboard`).
  - `src/components/LeaderboardOptIn.tsx`: Clean alias input field, validation messaging, and opt-in toggle.
  - 5 Assessment Engines: Verify edge chrome (`Navbar` at top) with `#12161B` apparatus canvas.
- **Steps:**
  - [ ] Apply refinements to `AgeSelection.tsx` and `AssessmentResultReward.tsx`.
  - [ ] Run engine test suites: `npm test tests/unit/reactionDirectionEngines.test.tsx tests/unit/memoryColorEngines.test.tsx tests/unit/oct4-regressions.test.ts`.
  - [ ] Verify clean type checks: `npm run check`.

### Task 5: Screenshot-Driven Visual Audit Loop & Final Approval
- **Objective:** Execute the complete `screenshot-driven-ui` loop across all 12 routes and interactive modals using Playwright and browser verification. Inspect captured PNGs directly via `view_file`.
- **Harness:** `scratch/capture-design-system-audit.mjs` (extended to capture open modal states and active test canvas states).
- **Steps:**
  - [ ] Build production assets: `npm run build`.
  - [ ] Run capture script across 4 viewports (`390×844`, `1280×720`, `1920×1080`, `2560×1440`) and modal dialog states.
  - [ ] Open and inspect captured PNGs directly using `view_file` to evaluate contrast, alignment, typography, and visual polish.
  - [ ] Critique results; if any visual flaw or misalignment is observed, apply surgical code adjustments and re-run.
  - [ ] Run full test suite: `npm test` (all 405 tests green).
  - [ ] Compile final walkthrough artifact with visual before/after proofs.

---

## Verification Commands & Acceptance Gates

```bash
# 1. Scoped Unit Tests
npm test tests/unit/pageShell.test.tsx tests/unit/assessmentsPage.test.tsx tests/unit/improveDataset.test.tsx tests/unit/aboutPrivacy.test.tsx tests/unit/reactionDirectionEngines.test.tsx tests/unit/memoryColorEngines.test.tsx

# 2. Complete Test Suite
npm test

# 3. TypeScript Compilation
npm run check

# 4. Production Build & SEO Pre-render
npm run build

# 5. Playwright Screenshot Capture & Visual Inspection
node scratch/capture-design-system-audit.mjs
```

### Final Acceptance Checklist
- [x] CSS token scoping `[data-theme="light"]` active in `src/index.css`.
- [x] Active sidebar item in `/improve` renders clean light slate background (`#F1F5F9`).
- [x] All 12 routes render zero horizontal scroll across `390×844` to `2560×1440`.
- [x] Modals (`Settings`, `Welcome`, `Info`) visually polished with high-contrast light theme styling.
- [x] Assessment stimulus wells remain 100% calibrated `#12161B` dark apparatus.
- [x] Sub-millisecond timing math and event loops remain untouched.
- [x] Full Vitest test suite passes with 0 failures (405/405 tests).
- [x] `npm run check` and `npm run build` exit with code 0.
