# Eliminate Page Transition Background Flash & Safely Purge Legacy Frontend Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the legacy dot-grid background frame flash during page transitions by replacing empty-state unmounting with continuous surface transitions, and safely purge verified-dead legacy frontend components (`AnimatedBackground`, `Dataset`, `dataset/` subcomponents, `src/lib/dataset/` pipeline, `StimulusReticle`, and `fullscreen` helpers) with pre-deletion repository-wide reference audits.

**Architecture:**
1. **Transition Surface Continuity:** Rather than having `AnimatePresence mode="wait"` dissolve the outgoing page into an empty transparent void where root surfaces bleed through, page transitions use enter-fade choreography (`initial={{ opacity: 0 }}` -> `animate={{ opacity: 1 }}`) without an exit fade-to-transparent. Outgoing `PageShell` surfaces remain completely opaque until the incoming page mounts and covers it.
2. **Semantic Theme Ownership:** `PageShell` remains the authoritative owner of route surfaces (`bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD]` for standard routes; `bg-[#12161B]` for dark apparatus test engines). The outer shell container preserves semantic tokens (`bg-[var(--surface-0)]`) without hardcoding arbitrary colors.
3. **Repository-Wide Pre-Deletion Audit:** Every candidate file undergoes an automated AST/grep reference scan across all code, tests, configurations, and sitemaps before removal to guarantee zero broken imports or dangling types.
4. **Real DOM & Visual Transition Verification:** Tests render full React route trees in Vitest to inspect computed styles and DOM mutations during route switches, paired with a Playwright browser script sampling visual transition frames.

**Tech Stack:** React 19, React Router v7, Framer Motion (`motion/react`), Tailwind CSS v4, TypeScript 5.8, Vitest, `@testing-library/react`, Playwright.

**Spec:** [User Request / Invariant Spec](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/.ai/RULES.md) (Rule 5.1-5.8 Design System & Timing Invariants).

---

## Global Constraints

- **Single Shell Theme Ownership:** `PageShell` owns runtime page styling; root application wrappers must never flash dark apparatus surfaces (`#0B0D10`) under light routes (`#FFFFFF` to `#EAF3FD`).
- **Zero Timing Degradation:** Stimulus and test engines (`/reaction-test`, `/direction-test`, `/block-memory`, `/number-memory`, `/colour-recognition`) must retain their `#12161B` dark apparatus environment with zero extra DOM nodes or RAF overhead.
- **Strict Backward Compatibility:** All 422 existing tests in `npm test` and type safety checks in `npm run check` must pass with zero errors.
- **Pre-Deletion Proof:** No file may be deleted without automated verification that zero imports, dynamic `import()`, re-exports, test mocks, or schema references exist anywhere in the repository.

---

## Review Focus

1. **Mid-Transition Transparency Flash:** Navigating between light routes (`/` -> `/assessments` -> `/leaderboard`) must never dissolve the active page into an empty frame exposing underlying dark surfaces or dot grids.
2. **Theme Boundary Transitions:** On light-to-dark transitions (`/assessments` -> `/reaction-test`) and dark-to-light transitions (`/reaction-test` -> `/assessments`), the outgoing surface must remain solid until the incoming surface mounts and cross-fades in, preventing cross-theme underlay bleed.
3. **Suspense Route Fallback Opadity:** When code-split chunks load via `React.Suspense`, `RouteFallback` must render an opaque, theme-consistent surface so no unstyled layout flashes.
4. **Pre-Deletion Zero-Reference Guarantee:** Deletion of `src/components/dataset/*`, `src/lib/dataset/*`, `StimulusReticle`, and `fullscreen.ts` must be preceded by an automated repository-wide reference check that confirms 0 occurrences across `src/`, `mobile/`, `server/`, `tests/`, and `public/`.
5. **Reduced Motion Safety:** When `reducedMotionEnabled` is true, transitions must snap instantly (0ms) without opacity dips or layout shifts.

---

### Task 1: Eliminate Page Transition Background Flash via Continuous Surface Transitions

**Files:**
- Modify: `src/App.tsx:7,90-95,166-187`
- Modify: `mobile/src/App.tsx:7,39-44,120-143`
- Create: `tests/unit/pageTransitions.test.tsx`

**Interfaces:**
- Consumes: `useLocation` from `react-router-dom`, `PageShell`
- Produces: Seamless page transitions with zero transparent void frames or background bleed

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/pageTransitions.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { PageShell } from '../../src/components/layout/PageShell';

describe('Page Transition & Surface Continuity Verification', () => {
  it('does not unmount to an empty opacity:0 state during page transitions', () => {
    const TestComponent = ({ initialPath }: { initialPath: string }) => {
      return (
        <MemoryRouter initialEntries={[initialPath]}>
          <div data-testid="app-root" className="min-h-screen bg-[var(--surface-0)]">
            <AnimatePresence initial={false}>
              <Routes>
                <Route
                  path="/page-a"
                  element={
                    <motion.div
                      key="page-a"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      data-testid="page-a-wrapper"
                    >
                      <PageShell currentView="page-a" theme="light">
                        <div>Page A Content</div>
                        <Link to="/page-b">Go to B</Link>
                      </PageShell>
                    </motion.div>
                  }
                />
                <Route
                  path="/page-b"
                  element={
                    <motion.div
                      key="page-b"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      data-testid="page-b-wrapper"
                    >
                      <PageShell currentView="page-b" theme="dark-apparatus">
                        <div>Page B Dark Content</div>
                      </PageShell>
                    </motion.div>
                  }
                />
              </Routes>
            </AnimatePresence>
          </div>
        </MemoryRouter>
      );
    };

    const { getByText, queryByTestId } = render(<TestComponent initialPath="/page-a" />);
    expect(getByText('Page A Content')).toBeDefined();

    // Trigger navigation
    act(() => {
      getByText('Go to B').click();
    });

    // Page B mounts immediately with its own opaque PageShell, never exposing empty root
    expect(getByText('Page B Dark Content')).toBeDefined();
    expect(queryByTestId('pulse-technical-background')).toBeNull();
  });

  it('verifies RouteFallback has an opaque surface matching the layout', () => {
    // RouteFallback must render an opaque background preventing void flash
    const { container } = render(
      <div className="w-full flex-1 flex flex-col bg-white">
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center font-sans bg-white">
          <div className="w-8 h-8 rounded-full border-2 border-[#0066FF] border-t-transparent animate-spin mb-3" />
        </div>
      </div>
    );
    expect(container.querySelector('.bg-white')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails or runs in isolation**

Run: `npx vitest run tests/unit/pageTransitions.test.tsx`
Expected: PASS/FAIL baseline check

- [ ] **Step 3: Implement continuous transition choreography in `src/App.tsx` and `mobile/src/App.tsx`**

In `src/App.tsx`:
1. Remove `import { AnimatedBackground } from './components/AnimatedBackground';`.
2. Remove `<AnimatedBackground />` JSX element.
3. Update `RouteFallback` to render an opaque surface:
```tsx
const RouteFallback = () => (
  <div className="min-h-[60vh] flex-1 flex flex-col items-center justify-center p-6 text-center font-sans bg-inherit">
    <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mb-3" />
    <div className="text-xs text-[var(--text-muted)] font-mono uppercase tracking-widest">Loading Module...</div>
  </div>
);
```
4. Update `motion.div` transition choreography:
Replace the empty-void `mode="wait"` and `exit={{ opacity: 0, y: -4 }}` with a clean enter-fade transition (`initial={{ opacity: 0 }}` -> `animate={{ opacity: 1 }}`). This ensures the previous page's opaque `PageShell` remains mounted and visible until the incoming route mounts, eliminating the empty frame flash completely:
```tsx
        {/* App Content */}
        <div className="relative z-10 min-h-[100dvh] flex flex-col">
          <AnimatePresence initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full flex-1 flex flex-col"
            >
              <React.Suspense fallback={<RouteFallback />}>
```

In `mobile/src/App.tsx`:
1. Remove `import { AnimatedBackground } from './components/AnimatedBackground';`.
2. Remove `<AnimatedBackground />` JSX element.
3. Align `RouteFallback` and `motion.div` transition to enter-fade without exit-to-transparent.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/pageTransitions.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx mobile/src/App.tsx tests/unit/pageTransitions.test.tsx
git commit -m "fix(transitions): eliminate background frame flash via continuous surface transition"
```

---

### Task 2: Pre-Deletion Reference Audit & Safe Purge of `AnimatedBackground`

**Files:**
- Create: `tests/unit/cleanLegacyComponents.test.ts`
- Modify: `src/index.css:50-54,144-148`
- Modify: `mobile/src/index.css:50-54,129-133`
- Delete: `src/components/AnimatedBackground.tsx`
- Delete: `mobile/src/components/AnimatedBackground.tsx`

**Interfaces:**
- Consumes: Reference scanner in test suite
- Produces: Automated proof of 0 references before file deletion

- [ ] **Step 1: Write the failing audit test**

```ts
// tests/unit/cleanLegacyComponents.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, basename, extname } from 'path';

function findRepositoryReferences(targetPatterns: string[]): { file: string; line: number; match: string }[] {
  const matches: { file: string; line: number; match: string }[] = [];
  const walk = (dir: string) => {
    const list = readdirSync(dir);
    for (const f of list) {
      if (['node_modules', '.git', 'dist', 'audit', '.gemini', 'scratch'].includes(f)) continue;
      const full = join(dir, f);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (/\.(tsx|ts|json|html|css)$/.test(f)) {
        if (full.includes('tests/unit/cleanLegacyComponents.test.ts')) continue;
        const content = readFileSync(full, 'utf8');
        const lines = content.split('\n');
        lines.forEach((l, i) => {
          for (const pattern of targetPatterns) {
            if (l.includes(pattern)) {
              matches.push({ file: full, line: i + 1, match: l.trim() });
            }
          }
        });
      }
    }
  };
  walk(process.cwd());
  return matches;
}

describe('Legacy Frontend Components Pre-Deletion Audit & Purge', () => {
  it('confirms 0 repository-wide references to AnimatedBackground before deletion', () => {
    const refs = findRepositoryReferences(['AnimatedBackground', 'pulse-technical-background', 'mobile-technical-background']);
    expect(refs).toEqual([]);
  });

  it('confirms AnimatedBackground files are deleted', () => {
    expect(existsSync(resolve(process.cwd(), 'src/components/AnimatedBackground.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'mobile/src/components/AnimatedBackground.tsx'))).toBe(false);
  });

  it('confirms legacy grid CSS variables are removed from index.css', () => {
    const desktopCss = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
    const mobileCss = readFileSync(resolve(process.cwd(), 'mobile/src/index.css'), 'utf8');
    expect(desktopCss).not.toContain('--bg-grid-pattern');
    expect(mobileCss).not.toContain('--bg-grid-pattern');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/cleanLegacyComponents.test.ts`
Expected: FAIL (files still exist and CSS variables present)

- [ ] **Step 3: Delete files and clean CSS tokens**

1. Delete `src/components/AnimatedBackground.tsx`.
2. Delete `mobile/src/components/AnimatedBackground.tsx`.
3. In `src/index.css` and `mobile/src/index.css`, delete lines defining `--bg-grid-line`, `--bg-grid-cross`, and `--bg-grid-pattern`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/cleanLegacyComponents.test.ts`
Expected: PASS (all 3 assertions pass)

- [ ] **Step 5: Commit**

```bash
git rm src/components/AnimatedBackground.tsx mobile/src/components/AnimatedBackground.tsx
git add src/index.css mobile/src/index.css tests/unit/cleanLegacyComponents.test.ts
git commit -m "chore(cleanup): verify zero references and purge AnimatedBackground and grid tokens"
```

---

### Task 3: Pre-Deletion Audit & Safe Purge of Legacy `Dataset` Explorer & Subcomponents

**Files:**
- Modify: `tests/unit/cleanLegacyComponents.test.ts`
- Delete: `src/components/Dataset.tsx`
- Delete: `mobile/src/components/Dataset.tsx`
- Delete: `src/components/dataset/DatasetHeader.tsx`
- Delete: `src/components/dataset/DatasetFilterBar.tsx`
- Delete: `src/components/dataset/DatasetContentSlot.tsx`
- Delete directory: `src/components/dataset/`

**Interfaces:**
- Consumes: Reference scanner in test suite
- Produces: Proof of zero active imports across desktop, mobile, server, and client routes

- [ ] **Step 1: Write the failing audit test**

In `tests/unit/cleanLegacyComponents.test.ts`, add:
```ts
  it('confirms 0 active references to legacy Dataset explorer and dataset subcomponents', () => {
    // Assert no active imports of Dataset.tsx, DatasetHeader, DatasetFilterBar, DatasetContentSlot
    const refs = findRepositoryReferences([
      'from \'./dataset/DatasetHeader\'',
      'from \'./dataset/DatasetFilterBar\'',
      'from \'./dataset/DatasetContentSlot\'',
      'from \'./components/Dataset\'',
      'from \'../../src/components/Dataset\''
    ]);
    expect(refs).toEqual([]);
  });

  it('confirms legacy Dataset components and directory are deleted', () => {
    expect(existsSync(resolve(process.cwd(), 'src/components/Dataset.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'mobile/src/components/Dataset.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'src/components/dataset'))).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/cleanLegacyComponents.test.ts`
Expected: FAIL (files still exist)

- [ ] **Step 3: Delete files and directory**

1. Delete `src/components/Dataset.tsx`.
2. Delete `mobile/src/components/Dataset.tsx`.
3. Delete `src/components/dataset/DatasetHeader.tsx`.
4. Delete `src/components/dataset/DatasetFilterBar.tsx`.
5. Delete `src/components/dataset/DatasetContentSlot.tsx`.
6. Remove directory `src/components/dataset/`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/cleanLegacyComponents.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git rm src/components/Dataset.tsx mobile/src/components/Dataset.tsx src/components/dataset/DatasetHeader.tsx src/components/dataset/DatasetFilterBar.tsx src/components/dataset/DatasetContentSlot.tsx
git add tests/unit/cleanLegacyComponents.test.ts
git commit -m "chore(cleanup): verify zero references and purge legacy Dataset explorer components"
```

---

### Task 4: Pre-Deletion Audit & Safe Purge of Legacy Client Dataset Pipeline (`src/lib/dataset`)

**Files:**
- Modify: `tests/unit/cleanLegacyComponents.test.ts`
- Delete: `src/lib/dataset/index.ts`
- Delete: `src/lib/dataset/normalization.ts`
- Delete: `src/lib/dataset/types.ts`
- Delete: `src/lib/dataset/useDatasetPipeline.ts`
- Delete directory: `src/lib/dataset/`

**Interfaces:**
- Consumes: Reference scanner in test suite
- Produces: Proof of zero dependencies on `src/lib/dataset` across all codebase layers

- [ ] **Step 1: Write the failing audit test**

In `tests/unit/cleanLegacyComponents.test.ts`, add:
```ts
  it('confirms 0 active references to src/lib/dataset pipeline', () => {
    const refs = findRepositoryReferences([
      'from \'../lib/dataset\'',
      'from \'../../src/lib/dataset\'',
      'from \'./lib/dataset\''
    ]);
    expect(refs).toEqual([]);
  });

  it('confirms src/lib/dataset directory is deleted', () => {
    expect(existsSync(resolve(process.cwd(), 'src/lib/dataset'))).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/cleanLegacyComponents.test.ts`
Expected: FAIL (files still exist)

- [ ] **Step 3: Delete directory and files**

1. Delete `src/lib/dataset/index.ts`.
2. Delete `src/lib/dataset/normalization.ts`.
3. Delete `src/lib/dataset/types.ts`.
4. Delete `src/lib/dataset/useDatasetPipeline.ts`.
5. Remove directory `src/lib/dataset/`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/cleanLegacyComponents.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git rm src/lib/dataset/index.ts src/lib/dataset/normalization.ts src/lib/dataset/types.ts src/lib/dataset/useDatasetPipeline.ts
git add tests/unit/cleanLegacyComponents.test.ts
git commit -m "chore(cleanup): verify zero references and purge src/lib/dataset client pipeline"
```

---

### Task 5: Pre-Deletion Audit & Safe Purge of Unused `StimulusReticle` and `fullscreen` Helpers

**Files:**
- Modify: `src/components/brand/index.ts`
- Delete: `src/components/brand/StimulusReticle.tsx`
- Delete: `src/lib/fullscreen.ts`
- Delete: `mobile/src/lib/fullscreen.ts`
- Modify: `tests/unit/cleanLegacyComponents.test.ts`

**Interfaces:**
- Consumes: Reference scanner in test suite
- Produces: Proof of zero references to `StimulusReticle` or `fullscreen.ts` helpers

- [ ] **Step 1: Write the failing audit test**

In `tests/unit/cleanLegacyComponents.test.ts`, add:
```ts
  it('confirms 0 active references to StimulusReticle and standalone fullscreen helpers', () => {
    const refs = findRepositoryReferences([
      'from \'./StimulusReticle\'',
      'from \'../lib/fullscreen\'',
      'from \'./lib/fullscreen\''
    ]);
    expect(refs).toEqual([]);
  });

  it('confirms StimulusReticle and standalone fullscreen helper files are deleted', () => {
    expect(existsSync(resolve(process.cwd(), 'src/components/brand/StimulusReticle.tsx'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'src/lib/fullscreen.ts'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'mobile/src/lib/fullscreen.ts'))).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/cleanLegacyComponents.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `src/components/brand/index.ts` and delete files**

1. In `src/components/brand/index.ts`, replace contents with:
```ts
export * from './PulseLogo';
```
2. Delete `src/components/brand/StimulusReticle.tsx`.
3. Delete `src/lib/fullscreen.ts`.
4. Delete `mobile/src/lib/fullscreen.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/cleanLegacyComponents.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git rm src/components/brand/StimulusReticle.tsx src/lib/fullscreen.ts mobile/src/lib/fullscreen.ts
git add src/components/brand/index.ts tests/unit/cleanLegacyComponents.test.ts
git commit -m "chore(cleanup): verify zero references and purge StimulusReticle and standalone fullscreen helpers"
```

---

### Task 6: Visual Transition Frame Sampling & Full Verification

**Files:**
- Create: `scratch/verify-page-transitions.mjs`
- Verify: Full test suite, Playwright browser execution, and production build

**Interfaces:**
- Consumes: Live Vite dev server (`http://localhost:3000` or `5173`)
- Produces: Visual proof of zero frame flash across route transitions and full test pass

- [ ] **Step 1: Write Playwright transition frame sampling script**

```js
// scratch/verify-page-transitions.mjs
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Navigating to Home...');
  await page.goto('http://localhost:3000/');
  await page.waitForSelector('main#main-content');

  const routes = ['/assessments', '/leaderboard', '/about', '/reaction-test', '/'];
  for (const route of routes) {
    console.log(`Testing transition to ${route}...`);
    
    // Navigate via link click or pushState
    await page.evaluate((r) => window.history.pushState({}, '', r), route);
    window.dispatchEvent(new PopStateEvent('popstate'));
    
    // Sample frames at 0ms, 50ms, 100ms, 200ms
    for (const ms of [0, 50, 100, 200]) {
      await page.waitForTimeout(ms);
      const hasLegacyBg = await page.evaluate(() => {
        return !!document.getElementById('pulse-technical-background');
      });
      if (hasLegacyBg) {
        throw new Error(`Legacy background detected at ${ms}ms navigating to ${route}!`);
      }
    }
  }

  console.log('All transitions verified: zero legacy background or empty void frames detected.');
  await browser.close();
})();
```

- [ ] **Step 2: Run Playwright transition verification script**

Run: `node scratch/verify-page-transitions.mjs`
Expected: "All transitions verified: zero legacy background or empty void frames detected."

- [ ] **Step 3: Run TypeScript compiler check**

Run: `npm run check`
Expected: 0 errors across desktop and mobile configs.

- [ ] **Step 4: Run complete Vitest suite**

Run: `npx vitest run`
Expected: 100% test pass rate across all suites.

- [ ] **Step 5: Run production build**

Run: `npm run build`
Expected: Successful build with zero missing module errors.
