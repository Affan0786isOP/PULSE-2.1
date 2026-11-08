# PULSE Verification & Testing Guide

This document details the testing framework, type verification, protocol QA processes, and pre-merge validation checklists for the PULSE codebase.

---

## 1. Test Stack & Infrastructure
- **Unit & Integration Test Runner:** [Vitest](https://vitest.dev/) (`npm test` runs `npm run audit:typography && vitest run`; the repository script does not use `--passWithNoTests`).
- **Static Type Checking:** TypeScript Compiler (`tsc --noEmit`)
- **Dual-Surface Validation:** Root desktop project (`tsconfig.json`) + mobile subproject (`mobile/tsconfig.json`)
- **Repository Typography Audit:** `scripts/audit-typography.mjs` (invoked automatically by `npm test`, `npm run check`, and `npm run build`).

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

# 5. Run the typography audit directly (also included in test/check/build)
npm run audit:typography

# 6. Run a read-only Dataset summary reconciliation preview
npm run dataset:reconcile-summary
```

---

## 3. Protocol QA & Timing Verification

When modifying assessment components, verify the following timing and physiological invariants:

### 3.1 Visual Reaction Test QA
- **Stimulus Delay:** Confirm foreperiod falls within $100\text{ms} - 3000\text{ms}$.
- **Physiological Floor:** Clicks during standby or $< 80\text{ms}$ after stimulus must register as `FALSE_START_PRE_STIMULUS` or `ANTICIPATORY_TOO_FAST`.
- **Latency scoring:** Confirm new Visual Reaction observations use unadjusted browser-measured latency rounded to two decimal places; do not expect a refresh-rate detector or display-offset calibration UI.

### 3.2 Direction Flanker QA
- **Arrow Alignment:** Center target arrow must correctly alternate between congruent (`< < < < <`) and incongruent (`< < > < <`) conditions across 10 trials.
- **Key Binding:** Both keyboard (`ArrowLeft`, `ArrowRight`) and touch controls must record identical timestamps.

### 3.3 Stroop Color Test QA
- **Semantic Mismatch:** Words must randomly display matching and non-matching ink colors across 15 trials.
- **Interference Calculation:** Verify that `interferenceCost` ($RT_{\text{incongruent}} - RT_{\text{congruent}}$) is accurately computed.

### 3.4 Working Memory QA (Block & Number Span)
- **Sequence Progression:** Sequence length must increment by 1 on success and terminate on second failure.
- **Span Calculation:** Verify longest successfully recalled sequence is submitted as `highestLevel`.

### 3.5 Dataset, cache & maintenance QA
- Verify `GET /api/research/dataset/summary` reads the single `publicDatasetMeta/summary` document and fails closed when the aggregate is missing or invalid; public summary reads must never scan `publicDataset`.
- Verify successful submissions update aggregate counts transactionally when the summary is initialized, and that reconciliation locks block submissions only during an apply run.
- Verify reconciliation dry-run writes nothing, apply requires explicit confirmation, and failed runs release their own lock where possible.
- Verify manual Dataset refresh sends `fresh=1`, bypasses client/CDN caches, and is limited to one first-page refresh per two minutes per IP.
- Verify client cache invalidation aborts stale pending requests and the stats-cache generation guard prevents pre-clear requests from repopulating cleared state.

### 3.6 Service-worker & legacy leaderboard QA
- Verify a service-worker active-session probe timeout/error fails closed and does not permit takeover while session state is unknown.
- Verify leaderboard reads retain legacy documents missing optional ordered fields and keep deterministic in-memory ranking/tie ordering.

---

## 4. Pre-Merge Verification Checklist

Before submitting code changes, complete this checklist:

- [ ] `npm run audit:typography` passes (also run automatically by test/check/build).
- [ ] `npm run check` passes with 0 TypeScript compilation errors.
- [ ] `npm test` passes all unit tests.
- [ ] `npm run build` generates `dist/` and `dist/server.js` without errors.
- [ ] `npm run build:mobile` generates mobile production bundle cleanly.
- [ ] No direct client Firestore writes have been introduced (all mutations route through `server.ts`).
- [ ] No secret keys have been prefixed with `VITE_` or exposed in client files.
- [ ] No PII fields (name, email, IP) are included in `publicDataset` payloads.
- [ ] Reduced-motion mode has been tested and suppresses non-essential UI animations.
- [ ] Active assessment lockout is honored (Navbar navigation, modals, and tab switching are blocked during ongoing cognitive testing).
- [ ] Mobile responsive layout has been verified at $375\text{px}$, $768\text{px}$, and $1280\text{px}$ viewports.


## 5. Toolchain baseline

The repository currently declares Node.js `>=24.12.0`, npm `10.9.7`, Vite `8.3.5`, TypeScript `~5.8.2`, and Vitest `5.0.5` in `package.json`. Re-check the manifest before copying these versions into CI or contributor instructions.
