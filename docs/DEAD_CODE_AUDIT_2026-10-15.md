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
