# PULSE Mobile Design Migration & Leaderboard Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the PULSE mobile client (`mobile/src/`) to the Laboratory Light design system with high-contrast typography (`#090D1A`), crisp white cards (`bg-white border-slate-200/80`), 2x2 rounded shortcut cards on the mobile hero, fluid safe-area spacing, and calibrated `#12161B` dark apparatus for active test engines, while removing any user/first-place row highlighting across both mobile and desktop leaderboards for uniform presentation.

**Architecture:** 
- Mobile surfaces adopt the light palette (`bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD]`, `bg-white`, `border-slate-200/80`, `text-[#090D1A]`).
- The 4 quick navigation links on the mobile hero are arranged into a sleek 2x2 grid of rounded rectangular cards with subtle border, high-contrast dark icons, and `#334155` typography (Option 1.1 B).
- Mobile Navbar adopts a translucent laboratory glass header (`bg-white/90 backdrop-blur-md border-b border-slate-200/80`) with safe-area notch padding and switches dynamically to `#12161B` dark apparatus styling during active test sessions.
- In both `src/components/Leaderboard.tsx` and `mobile/src/components/Leaderboard.tsx`, all rows render uniformly with standard hover states—no row is highlighted or treated differently.
- Stimulus test engines (`ReactionTest`, `DirectionTest`, `ColorTest`, `BlockMemoryTest`, `NumberMemoryTest`) preserve the calibrated `#12161B` dark apparatus mode with zero animation jitter and monotonic `performance.now()` hardware timing.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Motion (framer-motion v12), Vite, Vitest, Playwright.

**Spec:** [`mobile_design_questions.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile_design_questions.md) & [`docs/DESIGN_SYSTEM.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/DESIGN_SYSTEM.md)

## Global Constraints
- Do not touch, break, or modify sacred timing or telemetry logic: `performance.now()` monotonic timing, PRNG seeds, RAF callbacks, Firestore submission payload contracts, or 80ms physiological floors.
- Active test engines must remain in calibrated `#12161B` dark apparatus mode to eliminate display latency bias and pupil strain.
- Age Selection screen uses clean light theme (`theme="light"` / `bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD]`), switching to `#12161B` apparatus immediately upon age selection.
- All interactive touch targets must satisfy minimum tap bounds ($44\times44\text{px}$ touch target or padded hit area) with `touch-none select-none` on test engines.
- Dynamic safe-area padding (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`) must be used for all fixed/sticky chrome.
- Leaderboards (both desktop and mobile) must display all participant rows normally and uniformly without special highlights, accents, or user badges.

## Review Focus
1. **Desktop and Mobile Leaderboard Uniformity:** Verify that no row has a special background tint (`bg-sky-50`, `bg-blue-50`), border accent (`border-l-4`), or badge separating it from other entries; every row must use the exact same hover and base classes.
2. **2x2 Mobile Hero Grid Layout:** Ensure the 4 shortcut cards format cleanly into two columns of two rows on screens from 320px (iPhone SE) to 430px (iPhone Pro Max) without overflowing or wrapping titles awkwardly.
3. **Active Test Navbar Lockout:** Confirm that during active test execution (`isAssessmentActive={true}`), the Navbar turns dark (`#12161B`), Settings and Info buttons are disabled/hidden, and accidental back navigation is safely handled.
4. **Mobile Assessments Tap Targets:** Verify all 5 protocol cards on `/assessments` are full-card tap targets with active scale (`active:scale-[0.98]`) and navigate instantly.
5. **Dark Flash Prevention:** Confirm that moving between `/mobile/`, `/mobile/assessments`, `/mobile/leaderboard`, `/mobile/improve`, and active tests generates zero dark flashes or unstyled frame flickers.

---

### Task 1: Leaderboard Row Uniformity (Desktop & Mobile)

**Files:**
- Modify: `src/components/Leaderboard.tsx:505-530`
- Modify: `mobile/src/components/Leaderboard.tsx:300-335`
- Test: `tests/unit/leaderboardRowStyling.test.tsx`

**Interfaces:**
- Consumes: `displayedEntries` from `getLeaderboardResults`
- Produces: Uniform table rows where every participant row receives identical styling (`hover:bg-slate-50/60` on desktop, `hover:bg-slate-50` on mobile light card) with rank medals for 1-3.

- [ ] **Step 1: Write test verifying uniform leaderboard row styling**

```tsx
// tests/unit/leaderboardRowStyling.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Leaderboard } from '../../src/components/Leaderboard';

describe('Leaderboard Uniform Row Styling', () => {
  it('does not apply special highlight or background to any row', async () => {
    // Assert no row has bg-sky-50 or user-specific highlight class
    const { container } = render(
      <MemoryRouter initialEntries={['/leaderboard']}>
        <Leaderboard onNavigate={() => {}} />
      </MemoryRouter>
    );
    expect(container.querySelectorAll('.bg-sky-50\\/50')).toHaveLength(0);
    expect(container.querySelectorAll('.bg-blue-50')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/leaderboardRowStyling.test.tsx`
Expected: FAIL (because `src/components/Leaderboard.tsx` currently has `isFirst ? 'bg-sky-50/50 ...'`).

- [ ] **Step 3: Remove row highlight in `src/components/Leaderboard.tsx`**

Replace lines 517–522 in `src/components/Leaderboard.tsx`:
```tsx
className="transition-colors hover:bg-slate-50/70"
```
Removing the conditional `isFirst ? 'bg-sky-50/50...'` highlight so all entries render uniformly.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/leaderboardRowStyling.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Leaderboard.tsx tests/unit/leaderboardRowStyling.test.tsx
git commit -m "fix(leaderboard): normalize desktop leaderboard row styling to render all entries uniformly"
```

---

### Task 2: Mobile Hero Shortcuts 2x2 Grid & Copy Update

**Files:**
- Modify: `mobile/src/components/hero/MobileHero.tsx:120-250`
- Test: `tests/unit/mobileHero.test.tsx`

**Interfaces:**
- Consumes: `useAuthoritativeStats()`, navigation routes (`/leaderboard`, `/dataset`, `/analytics`, `/about`, `/assessments`)
- Produces: 2x2 grid of rounded rectangular cards, updated subtitle copy, and metrics row with "Free / No sign-up".

- [ ] **Step 1: Write test for 2x2 grid and hero copy**

```tsx
// in tests/unit/mobileHero.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileHero } from '../../mobile/src/components/hero/MobileHero';

describe('MobileHero Refined Layout', () => {
  it('renders the approved subtitle copy emphasizing no account required', () => {
    render(
      <MemoryRouter>
        <MobileHero onOpenMenu={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Test your reaction speed, memory and attention — right in your browser, with no account required\./i)).toBeInTheDocument();
  });

  it('renders 4 quick navigation shortcut cards in a 2x2 grid', () => {
    render(
      <MemoryRouter>
        <MobileHero onOpenMenu={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByLabelText(/Open Leaderboard/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Open Dataset/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Open Analytics/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Open About Us/i)).toBeInTheDocument();
  });

  it('renders "Free / No sign-up" as the 3rd metric column', () => {
    render(
      <MemoryRouter>
        <MobileHero onOpenMenu={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Free/i)).toBeInTheDocument();
    expect(screen.getByText(/No sign-up/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/mobileHero.test.tsx`
Expected: FAIL (copy and metrics mismatch).

- [ ] **Step 3: Implement 2x2 Grid, Subtitle Copy, and Metrics in `MobileHero.tsx`**

In `mobile/src/components/hero/MobileHero.tsx`:
1. Subtitle:
```tsx
<p className="text-[#475569] text-[14.5px] leading-[1.52] max-w-[340px] font-normal mb-6">
  Test your reaction speed, memory and attention — right in your browser, with no account required.
</p>
```
2. 2x2 Grid replacing the 4-column row:
```tsx
<div className="grid grid-cols-2 gap-2.5 mb-6">
  <button 
    onClick={() => handleFeatureClick('/leaderboard')}
    aria-label="Open Leaderboard"
    className="flex items-center gap-3 p-3 rounded-2xl bg-white shadow-[0_2px_10px_rgba(0,102,255,0.05)] border border-sky-100/90 hover:border-[#0066FF]/30 active:scale-[0.98] transition-all text-left"
  >
    <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-[#090D1A] shrink-0 border border-sky-100/80">
      <Trophy size={20} strokeWidth={2.2} />
    </div>
    <div className="min-w-0">
      <span className="text-[13px] font-bold text-[#090D1A] block leading-tight">Leaderboard</span>
      <span className="text-[10px] text-[#64748B] block mt-0.5 font-medium truncate">Rankings & Cohorts</span>
    </div>
  </button>
  {/* Dataset, Analytics, About Us follow the exact same 2x2 card pattern */}
</div>
```
3. Metrics Row 3rd Column:
```tsx
<div className="flex flex-col items-center text-center">
  <span className="font-heading font-bold text-[22px] leading-tight text-[#090D1A] tracking-tight">
    Free
  </span>
  <span className="text-[11px] font-medium text-[#64748B] mt-0.5 leading-tight">
    No sign-up
  </span>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/mobileHero.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/hero/MobileHero.tsx tests/unit/mobileHero.test.tsx
git commit -m "feat(mobile): implement 2x2 shortcut cards, copy alignment, and free metric on mobile hero"
```

---

### Task 3: Mobile Navbar Laboratory Glass & Active Test Apparatus Mode

**Files:**
- Modify: `mobile/src/components/Navbar.tsx:50-145`
- Test: `tests/unit/mobileNavbar.test.tsx`

**Interfaces:**
- Consumes: `isAssessmentActive` prop, `onBack`, `onNavigate`
- Produces: Translucent light navbar header for standard pages (`bg-white/90 backdrop-blur-md border-slate-200/80 text-[#090D1A]`) and dark apparatus header during active test trials (`bg-[#12161B] text-white border-[#20262D]`).

- [ ] **Step 1: Write test for Navbar styling in standard and active test modes**

```tsx
// tests/unit/mobileNavbar.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../../mobile/src/components/Navbar';

describe('Mobile Navbar Laboratory Light & Apparatus Lockout', () => {
  it('renders translucent light laboratory header on standard routes', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/assessments']}>
        <Navbar onNavigate={() => {}} title="Assessments" />
      </MemoryRouter>
    );
    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('bg-white/90');
    expect(nav).toHaveClass('backdrop-blur-md');
  });

  it('switches to dark apparatus header and disables settings when assessment is active', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/reaction-test']}>
        <Navbar onNavigate={() => {}} isAssessmentActive={true} title="Visual Reaction" />
      </MemoryRouter>
    );
    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('bg-[#12161B]');
    const settingsBtn = screen.getByLabelText(/Settings/i);
    expect(settingsBtn).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/mobileNavbar.test.tsx`
Expected: FAIL (currently uses `bg-[var(--surface-0)]`).

- [ ] **Step 3: Update `mobile/src/components/Navbar.tsx`**

Update styling based on `isAssessmentActive`:
```tsx
const navSurfaceClass = isAssessmentActive
  ? 'bg-[#12161B] text-white border-b border-[#20262D]'
  : 'bg-white/90 backdrop-blur-md text-[#090D1A] border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]';
```
Restyle the back button and logo container with crisp light borders and active touch feedback.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/mobileNavbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/Navbar.tsx tests/unit/mobileNavbar.test.tsx
git commit -m "feat(mobile): add laboratory glass navbar with dynamic dark apparatus transition during tests"
```

---

### Task 4: Mobile Assessments Hub (`Assessments.tsx`)

**Files:**
- Modify: `mobile/src/components/Assessments.tsx:60-150`
- Test: `tests/unit/mobileAssessments.test.tsx`

**Interfaces:**
- Consumes: Protocol list metadata, `onNavigate`
- Produces: Clean laboratory light cards (`bg-white`, `border-slate-200/80`, `shadow-xs`), `PROTOCOL 0X` badge, high-contrast icon container, and right chevron.

- [ ] **Step 1: Write test for mobile assessments hub layout**

```tsx
// tests/unit/mobileAssessments.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Assessments } from '../../mobile/src/components/Assessments';

describe('Mobile Assessments Hub Laboratory Light', () => {
  it('renders all 5 protocols with light card surfaces and protocol numbers', () => {
    const { container } = render(
      <MemoryRouter>
        <Assessments onNavigate={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('PROTOCOL 01')).toBeInTheDocument();
    expect(screen.getByText('PROTOCOL 05')).toBeInTheDocument();
    expect(screen.getByText('Visual Reaction')).toBeInTheDocument();
    expect(screen.getByText('Number Memory')).toBeInTheDocument();
    const cards = container.querySelectorAll('button');
    expect(cards[0]).toHaveClass('bg-white');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/mobileAssessments.test.tsx`
Expected: FAIL (currently uses `bg-[var(--surface-1)]`).

- [ ] **Step 3: Update `mobile/src/components/Assessments.tsx` to Laboratory Light**

Apply:
- Root: `bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD] text-[#090D1A]`
- Cards: `bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,102,255,0.04)] active:scale-[0.98] active:bg-slate-50 transition-all`
- Icon container: `w-14 h-14 rounded-xl bg-slate-50 border border-slate-200/80 p-2 flex items-center justify-center shrink-0`
- Right chevron: `<ChevronRight size={18} className="text-slate-400 shrink-0" />`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/mobileAssessments.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/Assessments.tsx tests/unit/mobileAssessments.test.tsx
git commit -m "feat(mobile): migrate assessments hub to laboratory light cards with high contrast badges"
```

---

### Task 5: Mobile Leaderboard Hub (`Leaderboard.tsx`)

**Files:**
- Modify: `mobile/src/components/Leaderboard.tsx:120-360`
- Test: `tests/unit/mobileLeaderboard.test.tsx`

**Interfaces:**
- Consumes: Protocol list, Firestore entries, `getDisplayedLeaderboardRank`
- Produces: Horizontal scrollable protocol pill bar (`#0066FF` active pill), white table card, streamlined 3-column table (`Rank | Alias & Cohort | Score & Unit`), and uniform row presentation (no user highlights).

- [ ] **Step 1: Write test for mobile leaderboard light interface**

```tsx
// tests/unit/mobileLeaderboard.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Leaderboard } from '../../mobile/src/components/Leaderboard';

describe('Mobile Leaderboard Laboratory Light', () => {
  it('renders protocol pill selector and clean light table card', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/leaderboard']}>
        <Leaderboard onNavigate={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    const panel = container.querySelector('#leaderboard-panel');
    expect(panel).toHaveClass('bg-white');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/mobileLeaderboard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Update `mobile/src/components/Leaderboard.tsx`**

1. Horizontal scrollable pill bar:
```tsx
<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 px-1 mb-3 shrink-0" role="tablist">
  {PROTOCOLS.map((p) => {
    const isSelected = p.id === selectedProtocol;
    return (
      <button
        key={p.id}
        onClick={() => selectProtocol(p.id)}
        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
          isSelected
            ? 'bg-[#0066FF] text-white shadow-sm shadow-[#0066FF]/25'
            : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 active:bg-slate-100'
        }`}
      >
        {p.shortName}
      </button>
    );
  })}
</div>
```
2. Leaderboard Table Container:
```tsx
<div id="leaderboard-panel" className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,102,255,0.03)] flex-1 min-w-0">
  {/* Table rows render uniformly with standard hover */}
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/mobileLeaderboard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/Leaderboard.tsx tests/unit/mobileLeaderboard.test.tsx
git commit -m "feat(mobile): migrate leaderboard to laboratory light with scrollable pill selector and uniform rows"
```

---

### Task 6: Mobile Performance Guide (`Improve.tsx`)

**Files:**
- Modify: `mobile/src/components/Improve.tsx:140-499`
- Test: `tests/unit/mobileImprove.test.tsx`

**Interfaces:**
- Consumes: `PHYSIOLOGICAL_FACTORS`, `PREPARATION_HABITS`, `researchEntries`
- Produces: Rose/emerald grouped latency factor tags, white habit cards with `#0066FF` touch checkboxes, and research evidence card.

- [ ] **Step 1: Write test for mobile Improve light presentation**

```tsx
// tests/unit/mobileImprove.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Improve } from '../../mobile/src/components/Improve';

describe('Mobile Improve Guide Laboratory Light', () => {
  it('renders factor sections and habit checklist cards in light theme', () => {
    render(
      <MemoryRouter>
        <Improve onNavigate={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/IMPROVE/i)).toBeInTheDocument();
    expect(screen.getByText(/Physiological Factors/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails or needs updates**

Run: `npx vitest run tests/unit/mobileImprove.test.tsx`

- [ ] **Step 3: Update `mobile/src/components/Improve.tsx` to Laboratory Light**

1. Grouped factor tags:
   - Impairing factors: `bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3`
   - Enhancing factors: `bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3`
2. Habit cards: `bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs` with custom `#0066FF` active checkbox fill.
3. Research carousel card: `bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm text-[#090D1A]`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/mobileImprove.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/Improve.tsx tests/unit/mobileImprove.test.tsx
git commit -m "feat(mobile): migrate improve guide to laboratory light with grouped factor tags and clean checklist"
```

---

### Task 7: Mobile Modals & Age Selection Light Polish

**Files:**
- Modify: `mobile/src/components/SettingsModal.tsx`
- Modify: `mobile/src/components/WelcomeModal.tsx`
- Modify: `mobile/src/components/AddToHomeScreenModal.tsx`
- Modify: `mobile/src/components/AgeSelection.tsx`
- Test: `tests/unit/mobileModals.test.tsx`

**Interfaces:**
- Consumes: Modal state (`isOpen`), settings callbacks
- Produces: Bottom sheet modals (`rounded-t-3xl bg-white text-[#090D1A]`), `#0066FF` active toggles, and light Age Selection screen.

- [ ] **Step 1: Write tests for modal styling and Age Selection light surface**

```tsx
// tests/unit/mobileModals.test.tsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgeSelection } from '../../mobile/src/components/AgeSelection';

describe('Mobile Age Selection Laboratory Light', () => {
  it('renders age cohort buttons on light gradient background', () => {
    const { container } = render(
      <AgeSelection onSelect={() => {}} onCancel={() => {}} assessmentId="visual-reaction" />
    );
    expect(screen.getByText('Young Adults')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Update `AgeSelection.tsx` and modal frames**

1. Set `AgeSelection.tsx` container background to `bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD] text-[#090D1A]`, with age option cards in `bg-white border border-slate-200/80 hover:border-[#0066FF] shadow-xs`.
2. Polish `SettingsModal.tsx`, `WelcomeModal.tsx`, and `AddToHomeScreenModal.tsx` modal cards into `bg-white text-[#090D1A] border-slate-200` with `#0066FF` primary accents and clean touch controls.

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run tests/unit/mobileModals.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/AgeSelection.tsx mobile/src/components/SettingsModal.tsx mobile/src/components/WelcomeModal.tsx mobile/src/components/AddToHomeScreenModal.tsx tests/unit/mobileModals.test.tsx
git commit -m "feat(mobile): restyle age selection and modals to laboratory light cards with blue accents"
```

---

### Task 8: End-to-End Verification, Visual Audit & Test Suite

**Files:**
- Execute: `scratch/audit-mobile.mjs`
- Test: Full Vitest suite (`npm test`)
- Check: TypeScript verification (`npm run check`)
- Build: Production bundle build (`npm run build`)

- [ ] **Step 1: Run TypeScript type checker**

Run: `npm run check`
Expected: 0 errors across entire workspace.

- [ ] **Step 2: Run full Vitest suite**

Run: `npm test`
Expected: All 60+ test suites passing (500+ tests).

- [ ] **Step 3: Execute Playwright Mobile Visual Audit**

Run: `node scratch/audit-mobile.mjs`
Inspect generated screenshots in `scratch/`:
- `scratch/mobile-home.png` (Verify 2x2 shortcut cards, copy, metrics)
- `scratch/mobile-assessments.png` (Verify light protocol cards)
- `scratch/mobile-leaderboard.png` (Verify light table, uniform rows without user highlights)
- `scratch/mobile-improve.png` (Verify grouped factors and clean checklist)

- [ ] **Step 4: Commit final verification artifact**

```bash
git add -A
git commit -m "chore(mobile): complete mobile design migration and visual verification"
```

---

## Execution Handoff

Plan complete and saved to [`docs/superpowers/plans/2026-10-18-mobile-design-migration.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/superpowers/plans/2026-10-18-mobile-design-migration.md). Please review the plan.

Which execution approach would you prefer?
- **Subagent-driven** — A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough.
- **Native (Recommended)** — I implement every task myself in this session, task-by-task with immediate test runs and Playwright screenshot verification. Fast, direct, and zero context loss.

Does the plan capture everything you want, and should we proceed with Native execution?
