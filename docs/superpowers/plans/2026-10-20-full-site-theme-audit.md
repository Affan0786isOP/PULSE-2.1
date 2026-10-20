# Full-Site Visual Theme Audit Plan (Light & Dark Mode)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conduct an exhaustive, screenshot-driven visual audit of every single route, page, and interactive overlay in PULSE across both Light Mode and Dark Mode, identifying and surgically fixing any contrast mismatches, unstyled cards, svg bleeding, or layout shifts.

**Architecture:** Automated headless browser audit suite using Playwright capturing 1440px desktop (Light & Dark) and 390px mobile viewports for all 10 core routes, 5 protected cognitive apparatus test states, and 3 interactive modal dialogs. Captured screenshots are saved to the artifact directory and reviewed via the `screenshot-driven-ui` inspection loop with an automated contrast/token report. Any visual anomalies discovered will be resolved in surgical CSS/JSX patches and re-verified.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Playwright, Vitest, Node.js.

**Spec:** PULSE Observatory Slate Design System (Dark: `#0B0D10` base, `#12161B` panel, `#22C7D6` cyan accent, `#F5F7FA` text; Light: `#FFFFFF` base, `#F4F9FF` background gradient, `#0066FF` accent, `#090D1A` text).

---

## Global Constraints
- Protected apparatus routes (`/reaction-test`, `/direction-test`, `/colour-recognition`, `/block-memory`, `/number-memory`) MUST remain locked to `#12161B` Dark Apparatus mode regardless of whether Light or Dark preference is active.
- Light mode on general pages MUST maintain high-contrast dark text (`#090D1A`) with subtle glassmorphic slate borders.
- Dark mode on general pages MUST maintain luminous slate text (`#F5F7FA` main, `#94A3B8` muted) with `#0B0D10` base and `#12161B` card containers.
- Zero horizontal layout shift (CLS = 0) and zero header jumps when switching themes.
- Dual storage persistence (`localStorage` + `pulse_user_settings` cookie) must remain intact.

---

## Review Focus
1. **Unstyled or Hardcoded Text Colors**: Inline hex colors (e.g. `#090D1A`, `#111827`, `#000000`) that turn invisible or low-contrast when switched to dark mode.
2. **Card & Container Background Inversions**: Components with hardcoded `bg-white` or `bg-slate-50` that do not adapt to `dark:bg-[#12161B]`.
3. **SVG Wave Graphics Bleed**: Wave graphic fills/strokes retaining white `#FFFFFF` or `#E0F2FE` edges against `#0B0D10` backgrounds.
4. **Apparatus Exit Theme Restoration**: Navigating from a protected dark apparatus page back to a general page must faithfully restore the user's active theme (Light or Dark).
5. **Interactive Modals (Settings, Welcome, Admin Passcode)**: Modals and backdrops must properly style borders, inputs, and close buttons in both themes without clipping.

---

## Audit Matrix: Pages & States to Inspect

```
┌─────────────────────────────────┬──────────┬──────────┬──────────────────────────────────────────┐
│ Route / View                    │ Light    │ Dark     │ Focus Areas                              │
├─────────────────────────────────┼──────────┼──────────┼──────────────────────────────────────────┤
│ 1. Home (/)                     │ Checked  │ Checked  │ Hero, 3D Carousel, Results, Footer, Nav │
│ 2. About (/about)               │ Checked  │ Checked  │ Waves, Architecture Cards, Citations     │
│ 3. Assessments (/assessments)   │ Checked  │ Checked  │ 5 Protocol Cards, Side Waves, Badges     │
│ 4. Leaderboard (/leaderboard)   │ Checked  │ Checked  │ Protocol Tabs, Side Waves, Rank Table    │
│ 5. Improve (/improve)           │ Checked  │ Checked  │ Scientific Citations, Training Checklist │
│ 6. Dataset (/dataset)           │ Checked  │ Checked  │ Data Pipeline Preview, Notice Cards      │
│ 7. Privacy (/privacy)           │ Checked  │ Checked  │ Legal Prose, Typography, Consent Actions │
│ 8. Admin (/admin)               │ Checked  │ Checked  │ Passcode Input Gate, Moderation Table    │
│ 9. Not Found (/404)             │ Checked  │ Checked  │ Error Illustration, Return Button        │
│ 10. Settings Modal (3 tabs)     │ Checked  │ Checked  │ General, Feedback, System tabs           │
│ 11. Welcome Modal               │ Checked  │ Checked  │ Onboarding dialog, buttons, backdrop     │
│ 12. Reaction Test Apparatus     │ Invariant│ Dark App │ Locked to Dark, HUD, Stimulus, Result    │
│ 13. Direction Test Apparatus    │ Invariant│ Dark App │ Locked to Dark, Arrow glyphs, Feedback   │
│ 14. Block Memory Apparatus      │ Invariant│ Dark App │ Locked to Dark, 3x3 Grid, Sequence pulse │
│ 15. Number Memory Apparatus     │ Invariant│ Dark App │ Locked to Dark, Digit Display & Input    │
│ 16. Color Test Apparatus        │ Invariant│ Dark App │ Locked to Dark, Matrix Tiles, Timer HUD  │
└─────────────────────────────────┴──────────┴──────────┴──────────────────────────────────────────┘
```

---

## Bite-Sized Implementation Tasks

### Task 1: Headless Visual Audit Script Scaffolding
**Files:**
- Create: `scripts/audit-visual-themes.mjs`

- [ ] **Step 1:** Create `scripts/audit-visual-themes.mjs` using Playwright Chromium to launch against the Vite dev/preview server.
- [ ] **Step 2:** Configure the script to iterate through all 16 target views in both `themeMode: 'light'` and `themeMode: 'dark'` viewports (1440x900 desktop and 390x844 mobile).
- [ ] **Step 3:** Include automatic evaluation of computed background, color contrast, and any missing `data-theme` or `dark` class anomalies.
- [ ] **Step 4:** Save high-res screenshots with structured naming: `audit-[route]-[theme]-[viewport].png` into the conversation artifact scratch directory.
- [ ] **Step 5:** Verify script execution against local server.

### Task 2: Page Group A Visual Audit (Home, About, Assessments)
**Files:**
- Target: `src/components/Home.tsx`, `src/components/About.tsx`, `src/components/Assessments.tsx`, wave components.

- [ ] **Step 1:** Run capture on `/`, `/about`, and `/assessments` in Light and Dark mode.
- [ ] **Step 2:** Inspect screenshots with visual review.
- [ ] **Step 3:** Check for contrast issues, hardcoded white/slate borders, un-themed button states, or SVG stroke bleed.
- [ ] **Step 4:** Apply surgical fixes if any discrepancy is found.
- [ ] **Step 5:** Re-capture and verify clean appearance.

### Task 3: Page Group B Visual Audit (Leaderboard, Improve, Dataset)
**Files:**
- Target: `src/components/Leaderboard.tsx`, `src/components/Improve.tsx`, `src/components/DatasetComingSoon.tsx`.

- [ ] **Step 1:** Run capture on `/leaderboard`, `/improve`, and `/dataset` in Light and Dark mode.
- [ ] **Step 2:** Inspect rank table stripes, protocol selector tabs, scientific citation accordions, and coming soon badges.
- [ ] **Step 3:** Check search inputs, dropdown filters, and empty/loading states.
- [ ] **Step 4:** Apply surgical fixes if any contrast or token anomalies are detected.
- [ ] **Step 5:** Re-capture and verify visual fidelity.

### Task 4: Page Group C Visual Audit (Admin, Privacy, 404, Modals)
**Files:**
- Target: `src/components/admin/AdminPage.tsx`, `src/components/ResearchPrivacyPolicy.tsx`, `src/components/NotFound.tsx`, `src/components/SettingsModal.tsx`, `src/components/WelcomeModal.tsx`.

- [ ] **Step 1:** Run capture on `/admin` (both locked gate & unlocked table), `/privacy`, `/404`, and open states of `SettingsModal` (all 3 tabs) and `WelcomeModal`.
- [ ] **Step 2:** Inspect dialog backdrops, modal containers, toggle switches, radio cards, and legal typography.
- [ ] **Step 3:** Apply surgical fixes for any modal boundary, border, or text readability defects.
- [ ] **Step 4:** Re-capture and verify.

### Task 5: Protected Apparatus Cognitive Tests Audit & Transition Verification
**Files:**
- Target: `src/components/ReactionTest.tsx`, `src/components/DirectionTest.tsx`, `src/components/BlockMemoryTest.tsx`, `src/components/NumberMemoryTest.tsx`, `src/components/ColorTest.tsx`, `src/lib/routeTheme.ts`.

- [ ] **Step 1:** Run capture on all 5 cognitive tests when entered from both Light Mode and Dark Mode.
- [ ] **Step 2:** Verify that the apparatus surface remains strictly `#12161B` with `#22C7D6` accents, with no bright white flash or contrast degradation.
- [ ] **Step 3:** Verify that exiting the test via the back/home button properly restores Light Mode when the user preference is Light.
- [ ] **Step 4:** Verify test completion cards, score display, and retry/leaderboard navigation buttons.

### Task 6: Comprehensive Regression Testing & Walkthrough
**Files:**
- Test files: `tests/unit/desktopThemeSystem.test.tsx`, `tests/unit/settingsPersistence.test.ts`, all unit tests.

- [ ] **Step 1:** Run full test suite (`npx vitest run`) to confirm all 80+ test suites pass.
- [ ] **Step 2:** Run production build (`npm run build`) to ensure zero TypeScript or bundling regressions.
- [ ] **Step 3:** Generate audit walkthrough report detailing before/after findings across all pages.
- [ ] **Step 4:** Commit and push changes to `main`.

---

## Verification Plan
### Automated Tests
- `npm run build`: Must succeed with 0 errors across desktop and mobile bundles.
- `npx vitest run`: All 80 test files (630+ tests) must pass green.
- `node scripts/audit-visual-themes.mjs`: Automated exit code 0 verifying all screenshot targets captured and checked.

### Manual / Visual Verification
- Review all generated screenshots in Light and Dark mode.
- Inspect theme switch smoothness across Navbar toggle and Settings radio group.
- Confirm zero layout shift or navbar jumping on toggle.
