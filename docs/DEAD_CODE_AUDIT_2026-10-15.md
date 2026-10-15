# Dead Code Audit and Cleanup — 2026-10-15

## Scope

Audited `Affan0786isOP/PULSE-2.1` across the full frontend (desktop and mobile SPAs) using Codebase Memory MCP, Context Mode, and GRAVITAS. The audit workflow combines graph reachability analysis, symbol reference tracing, real browser screenshot captures across all desktop (1280x800) and mobile (393x851) routes, and verification against TypeScript, production build, and Vitest test suites.

## Removed Components & Files

| Path | Finding & Evidence |
| --- | --- |
| `mobile/src/components/DirectionDataset.tsx` | Exported a component whose entire implementation was `return null`; 0 app imports/callers found. (Cycle 1) |
| `src/components/ui/gooey-nav.tsx` | `GooeyNav` had no references outside its own source file. (Cycle 1) |
| `src/components/home/WhatIsPulseScene.tsx` | Section component had 0 references outside its own file; not part of the active landing page. (Cycle 1) |
| `src/components/brand/TelemetryMetricCard.tsx` | No consumers; exported only by brand barrel with static mock telemetry. (Cycle 1) |
| `src/components/brand/ProvenanceBadge.tsx` | Consumed only by unused telemetry card. (Cycle 1) |
| `src/components/brand/index.ts` | Removed exports for deleted brand components; retained `PulseLogo` and `StimulusReticle`. (Cycle 1) |
| `src/components/FullscreenPrompt.tsx` | 6-line stub whose entire implementation was `return null;`; 0 references repository-wide. (Cycle 2) |
| `mobile/src/components/FullscreenPrompt.tsx` | 7-line stub whose entire implementation was `return null;`; 0 references repository-wide. (Cycle 2) |
| `src/lib/modalScrollLock.ts` | Manual scroll lock helper with 0 callers; modal accessibility and focus traps are fully handled by `modalManager` via `useModalAccessibility`. (Cycle 2) |
| `mobile/src/lib/modalScrollLock.ts` | Unused scroll lock helper with 0 callers. (Cycle 2) |
| `mobile/src/components/SettingsModal.tsx` | Removed unused dead import `acquireScrollLock` on line 33. (Cycle 2) |
| `src/AuthContext.tsx` | 227-line desktop authentication stub decoupled during `7650c93`; desktop app operates completely anonymously with 0 auth dependencies; mobile has its own dedicated `mobile/src/AuthContext.tsx`. (Cycle 2) |

## Deliberately Retained

- `src/components/DatasetComingSoon.tsx`: Active route handler for deferred `/dataset` and `/analytics` routes with active regression test coverage.
- `StimulusReticle.tsx`: Documented in the design system and brand specifications as a reusable brand token component.
- Dataset explorer modules (`src/components/Dataset.tsx`, `DatasetFilterBar.tsx`, `DatasetHeader.tsx`, `DatasetContentSlot.tsx`, `lib/dataset/*`): Preserved as dormant public data feature components awaiting open research dataset release.
- Developer scratch scripts and audit test harnesses: Retained in `scratch/` and `docs/`.

## Validation & Verification

1. **TypeScript Checks (`npm run check`):**
   - `tsc --noEmit && cd mobile && tsc --noEmit` — **PASSED** (0 errors).
2. **Production Build (`npm run build`):**
   - Desktop Vite build: **PASSED** (13.17s).
   - Mobile Vite build: **PASSED** (9.37s).
   - Static SEO generation: **PASSED**.
   - Server esbuild bundle (`dist/server.js`): **PASSED** (209.7 kB).
3. **Vitest Unit Test Suite (`npm test`):**
   - 43 test files passed (43/43).
   - 374 unit tests passed (374/374).
4. **Visual & Routing Verification:**
   - Full route inspection at 1280x800 (Desktop) and 393x851 (Mobile Pixel 5).
   - Verified active routes: `/`, `/about`, `/assessments`, `/leaderboard`, `/dataset`, `/improve`, `/reaction-test`, `/direction-test`, `/block-memory`, `/number-memory`, `/color-test`, `/privacy`.
   - Modals inspected: Settings modal (tabs: General, Feedback, System/Calibration), Welcome modal, and AddToHomeScreen/PWA modal.


## Screenshot Harness Follow-up

The follow-up hardening changes are maintained in the audit-harness fix branch and require a fresh local run before their results can be claimed:

- Shared runner for baseline and after captures, so route discovery, readiness handling, telemetry, and capture behavior stay consistent.
- Discovers route paths from both SPA route declarations and the shared route registry (including aliases), plus a not-found probe.
- Uses a dedicated configurable port (`PULSE_AUDIT_PORT`, default 4317), verifies the port is available before starting the built server, and aborts if the spawned server exits before its health check succeeds.
- Uses a configurable output directory (`PULSE_AUDIT_SCREENSHOT_DIR`) or repository-local `artifacts/screenshots/{before,after}`; no user-specific absolute paths.
- Waits for route content/fonts, captures full-page screenshots, records console/page/network/HTTP errors, and exits nonzero for route-capture failures or uncaught page errors.
- Removed the obsolete `fullscreenPromptEnabled` property from desktop and mobile settings types/defaults/sanitizers/comparison logic; legacy stored keys are ignored by the existing whitelist-style sanitizer.

**Validation caveat:** These harness edits have not been run in this remote GitHub editing session. Run `npm run build`, then `node scratch/capture-screenshots.mjs` for the baseline at the appropriate pre-change revision and `node scratch/capture-after-screenshots.mjs` after the cleanup build. Review each generated `telemetry.json` and screenshot directory before claiming a clean visual audit.
