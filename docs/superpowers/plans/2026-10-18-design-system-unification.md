# PULSE Design System Expansion: Comprehensive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Propagate the light-mode visual design system (from Home and Leaderboard) across the remaining pages of PULSE 2.1 (`/assessments`, `/about`, `/dataset`, `/improve`, `/privacy`, and the test canvases: Reaction, Direction, Colour, Block, Number Memory) using modular subagent-driven workflows and screenshot-driven verification.

**Architecture:** Standardize shared layout primitives (`PageShell`, `PageHeader`, `DecorativeWaves`, `SharedDotGrid`), migrate all hub pages from legacy dark CSS variables (`var(--bg-base)`, `var(--surface-1)`) to the proven Home/Leaderboard light aesthetic (`#FFFFFF` to `#EAF3FD` gradient, `#0066FF` brand blue, `#090D1A` typography, subtle sky borders), and wrap interactive test apparatus in crisp light card containers while preserving millisecond-grade timer stimulus contrast.

**Tech Stack:** React 19, Tailwind CSS v4, Motion (Framer Motion), Lucide React, Vitest, Playwright screenshot test harness.

**Spec:** Audited from `src/components/Home.tsx` and `src/components/Leaderboard.tsx`.

## Global Constraints
1. **Design Tokens:** Background gradient `bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD]`, primary brand `#0066FF`, text headline `#090D1A`, text body `#334155`, text muted `#64748B`, border subtle `border-slate-200/80` or `border-[#BFDBFE]`, dot matrix `radial-gradient(rgba(0,102,255,0.12) 1.2px, transparent 1.2px) 36px 36px`.
2. **Zero Functional Regression:** Do NOT break or modify timing hooks (`performance.now()`, `useRefreshRate`, trial records, Firestore submissions).
3. **Stimulus Invariant:** Active test stimuli (green reaction square, arrow SVGs, Stroop words, highlighted memory blocks, digit spans) must retain high-contrast clarity against their calibrated wells.
4. **Screenshot Verification:** Every task must compile (`npm run build`), pass unit tests, and capture a Playwright screenshot verification before completion.

## Review Focus
1. **Test canvas stimulus clarity:** Ensure the light container does not diminish visual reaction green or Stroop color visibility.
2. **Header & Navbar uniformity:** Ensure `Navbar theme="light"` is active across all migrated routes.
3. **Form controls & interactive elements:** Checkboxes, inputs, and buttons in `/improve` and `/privacy` must have accessible `#0066FF` focus rings.
4. **Mobile responsiveness:** Safe-area padding (`env(safe-area-inset-*)`) and responsive grid columns must remain intact.
5. **DOM & Test stability:** All existing Vitest suites must pass with zero broken selectors.

---

### Task 1: Design System Primitives & Shared Wave Shell
Extract and unify the reusable background dot grid, light page shell, and decorative wave components.

**Files:**
- Create: `src/components/layout/PageShell.tsx`
- Modify: `src/components/Navbar.tsx`
- Test: `tests/unit/pageShell.test.tsx`

**Interfaces:**
- Produces: `<PageShell title={string} description={string} currentView={string}>` wrapper supporting light background, dot grid, safe-area padding, and unified header.

- [ ] **Step 1: Write unit test for `PageShell`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `PageShell.tsx` with light gradient, dot-grid, and Navbar**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Verify build & commit**

---

### Task 2: Migrate Assessments Hub Page (`/assessments`)
Transform the assessments catalog into the light-mode card system with soft pale-blue medallions, prominent protocol tags, and secondary action outline buttons matching Home.

**Files:**
- Modify: `src/components/Assessments.tsx`
- Test: `tests/unit/assessmentsPage.test.tsx`

**Interfaces:**
- Consumes: `PageShell`, `HERO_ASSESSMENTS` assets.
- Produces: 5 light-mode protocol cards with `#090D1A` typography, `Try [Protocol] →` outline CTA, and `#0066FF` badges.

- [ ] **Step 1: Write unit test for light-mode Assessments page**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Refactor `Assessments.tsx` to use light palette, soft medallions, and outline buttons**
- [ ] **Step 4: Run test and build to verify PASS**
- [ ] **Step 5: Capture screenshot at 1080p and inspect**

---

### Task 3: Migrate About & Privacy Pages (`/about`, `/privacy`)
Update scientific documentation, privacy policy, and methodology cards to the light-theme editorial standard.

**Files:**
- Modify: `src/components/About.tsx`
- Modify: `src/components/ResearchPrivacyPolicy.tsx`
- Test: `tests/unit/aboutPrivacy.test.tsx`

- [ ] **Step 1: Write unit tests for About & Privacy light styling**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Update `About.tsx` and `ResearchPrivacyPolicy.tsx` with light cards, slate borders, and blue accents**
- [ ] **Step 4: Run tests to verify PASS**
- [ ] **Step 5: Capture screenshot and inspect**

---

### Task 4: Migrate Dataset & Performance Guide (`/dataset`, `/improve`)
Modernize Dataset coming-soon card and the interactive Performance Guide (habits checklist, physiological factor cards, and research ledger).

**Files:**
- Modify: `src/components/DatasetComingSoon.tsx`
- Modify: `src/components/Improve.tsx`
- Test: `tests/unit/improveDataset.test.tsx`

- [ ] **Step 1: Write unit test for Dataset and Improve page components**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Apply light background, pale-blue well cards, and crisp checkboxes in `Improve.tsx` and `DatasetComingSoon.tsx`**
- [ ] **Step 4: Run tests and verify PASS**
- [ ] **Step 5: Capture screenshot and inspect**

---

### Task 5: Migrate Assessment Test Canvases (Reaction, Direction, Colour, Block, Number)
Wrap the 5 active test engines into clean light-mode shells with light card frames while preserving high-contrast stimulus calibration within the test apparatus well.

**Files:**
- Modify: `src/components/ReactionTest.tsx`
- Modify: `src/components/DirectionTest.tsx`
- Modify: `src/components/ColorTest.tsx`
- Modify: `src/components/BlockMemoryTest.tsx`
- Modify: `src/components/NumberMemoryTest.tsx`
- Test: `tests/unit/testEnginesLightShell.test.tsx`

- [ ] **Step 1: Write unit tests for light apparatus container wrapper**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Update all 5 test components to use light chrome + light apparatus card wrapper with calibrated dark stimulus wells**
- [ ] **Step 4: Run tests and full build to verify PASS**
- [ ] **Step 5: Capture screenshots across all 5 test routes and inspect**

---

### Task 6: Global Visual QA & Multi-Resolution Audit
Execute complete screenshot verification across 720p, 1080p, 1440p, and 4K viewports across all routes to guarantee 100% visual consistency.

- [ ] **Step 1: Run full test suite (`npm run test:run` or vitest)**
- [ ] **Step 2: Run production build (`npm run build`)**
- [ ] **Step 3: Capture multi-viewport screenshots for all migrated routes**
- [ ] **Step 4: Perform visual diff inspection via `view_file`**
- [ ] **Step 5: Final review report**
