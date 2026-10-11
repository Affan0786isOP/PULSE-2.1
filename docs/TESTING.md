# PULSE Verification & Testing Guide

This document details the testing framework, type verification, protocol QA processes, and pre-merge validation checklists for the PULSE codebase.

---

## 1. Test Stack & Infrastructure
- **Unit & Integration Test Runner:** [Vitest](https://vitest.dev/) via `npm test` (`vitest run`); the configured project script does not add `--passWithNoTests`.
- **Static Type Checking:** TypeScript Compiler (`tsc --noEmit`)
- **Dual-Surface Validation:** Root desktop project (`tsconfig.json`) + mobile subproject (`mobile/tsconfig.json`)
- **Firestore Rules Verification:** No security-rule linter or ESLint command is configured in the current root `package.json`. Treat rule changes as unverified until covered by explicit emulator/security-rule tests or a separately configured validator.

---

## 2. Verification Commands

```bash
# 1. Run unit test suite
npm test

# 2. Run desktop type check
npm run lint

# 3. Run dual-surface type check (Desktop + Mobile)
npm run check

# 4. Run full production build verification
npm run build
npm run build:mobile
```

---

## 3. Protocol QA & Timing Verification

When modifying assessment components, verify the following timing and physiological invariants:

### 3.1 Visual Reaction Test QA
- **Stimulus Delay:** Confirm foreperiod falls within $100\text{ms} - 3000\text{ms}$.
- **Physiological Floor:** Clicks during standby or $< 80\text{ms}$ after stimulus must register as `FALSE_START_PRE_STIMULUS` or `ANTICIPATORY_TOO_FAST`.
- **Display Latency Offset:** Confirm RAF cadence estimation runs and is labeled as an estimate, not a physical measurement. Do not describe a frame-midpoint offset as direct hardware latency.

### 3.2 Direction Flanker QA
- **Arrow Alignment:** Center target arrow must correctly alternate between congruent (`< < < < <`) and incongruent (`< < > < <`) conditions across 10 trials.
- **Key Binding:** Both keyboard (`ArrowLeft`, `ArrowRight`) and touch controls must record identical timestamps.

### 3.3 Stroop Color Test QA
- **Semantic Mismatch:** Words must randomly display matching and non-matching ink colors across 15 trials.
- **Interference Calculation:** Verify that `interferenceCost` ($RT_{\text{incongruent}} - RT_{\text{congruent}}$) is accurately computed.

### 3.4 Working Memory QA (Block & Number Span)
- **Sequence Progression:** Sequence length must increment by 1 on success and terminate on second failure.
- **Span Calculation:** Verify longest successfully recalled sequence is submitted as `highestLevel`.

---

## 4. Pre-Merge Verification Checklist

Before submitting code changes, complete this checklist:

- [ ] `npm run check` passes with 0 TypeScript compilation errors.
- [ ] `npm test` passes all unit tests.
- [ ] `npm run build` generates `dist/` and `dist/server.js` without errors.
- [ ] `npm run build:mobile` generates mobile production bundle cleanly (redundant with the root build today, but useful for an isolated mobile check).
- [ ] `npm run test:e2e` passes the relevant Playwright tests when browsers and environment are available; if unavailable, explicitly record the blocker instead of claiming it passed.
- [ ] No direct client Firestore writes have been introduced (all mutations route through `server.ts`).
- [ ] No secret keys have been prefixed with `VITE_` or exposed in client files.
- [ ] No PII fields (name, email, IP) are included in `publicDataset` payloads.
- [ ] Reduced-motion mode disables CSS transitions/animations and suppresses non-essential Motion animations on both desktop and mobile.
- [ ] Mobile responsive layout has been verified at $375\text{px}$, $768\text{px}$, and $1280\text{px}$ viewports.
- [ ] Representative desktop and mobile pages (`/`, `/assessments`, one assessment, settings/modal, leaderboard, admin) use light surfaces, deep ink text, and the canonical blue accent without unintended dark cards or unreadable white text.
- [ ] Both first-paint HTML bootstraps and both settings stores set `data-theme="light"`; legacy saved `themeMode: "dark"` cannot re-enable dark styling.
- [ ] PWA manifest colors and browser theme-color metadata match the light palette.
- [ ] For reaction-test UI changes, inspect desktop and mobile screenshots and verify computed transition behavior is `none` while `STIMULUS_ACTIVE`.
