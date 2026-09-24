# PULSE Verification & Testing Guide

This document details the testing framework, type verification, protocol QA processes, and pre-merge validation checklists for the PULSE codebase.

---

## 1. Test Stack & Infrastructure
- **Unit & Integration Test Runner:** [Vitest](https://vitest.dev/) (`vitest run --passWithNoTests`)
- **Static Type Checking:** TypeScript Compiler (`tsc --noEmit`)
- **Dual-Surface Validation:** Root desktop project (`tsconfig.json`) + mobile subproject (`mobile/tsconfig.json`)
- **Security Rule Linter:** `@firebase/eslint-plugin-security-rules`

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
- **Display Latency Offset:** Confirm RAF calibration runs on initial mount and displays detected refresh rate.

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
- [ ] `npm run build:mobile` generates mobile production bundle cleanly.
- [ ] No direct client Firestore writes have been introduced (all mutations route through `server.ts`).
- [ ] No secret keys have been prefixed with `VITE_` or exposed in client files.
- [ ] No PII fields (name, email, IP) are included in `publicDataset` payloads.
- [ ] Reduced-motion mode has been tested and suppresses non-essential UI animations.
- [ ] Mobile responsive layout has been verified at $375\text{px}$, $768\text{px}$, and $1280\text{px}$ viewports.
