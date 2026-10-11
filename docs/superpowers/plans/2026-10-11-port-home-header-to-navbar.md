# Port Home Inline Header to Navbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the GooeyNav / retro pill-style navigation bar in `src/components/Navbar.tsx` with the clean, modern inline header styling and structure currently used on the Home page (`src/components/Home.tsx:137-220`), while preserving essential app-wide functionality (back button, mobile navigation drawer, title, rightContent, accessibility, and modals).

**Architecture:** Refactor `src/components/Navbar.tsx` to adopt the layout, brand lockup (`PulseLogo variant="horizontal"`), and top-level header design of `Home.tsx:137-220`. Integrate `usePwaInstall` to support the Install App pill button globally, while preserving the existing props (`onBack`, `title`, `rightContent`, `isAssessmentActive`, `currentView`, `onNavigate`), and ensuring mobile drawer and modal dialogs (Settings, Welcome) function seamlessly.

**Tech Stack:** React 19, Tailwind CSS, Lucide React, Motion (`motion/react`), React Router DOM (`Link`, `useLocation`, `useNavigate`).

**Spec:** Port `<header className="relative z-30 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-14 h-16 sm:h-20 flex items-center justify-between shrink-0">` design from `Home.tsx` to `Navbar.tsx`.

## Global Constraints

- Must preserve `Navbar` exported signature and props: `onNavigate`, `currentView`, `onBack`, `title`, `rightContent`, `isAssessmentActive`.
- Must preserve export `export { resolveActiveNavId };`.
- Must support responsive breakpoints cleanly (desktop horizontal links, mobile hamburger trigger & drawer).
- Must preserve WCAG accessibility: focus trapping on mobile drawer, Escape key handler, `inert` background handling, accessible labels.
- Zero TypeScript errors and clean `npm run build`.

## Review Focus

1. **Back button on sub-pages:** When on sub-pages (e.g. `/assessments`, `/reaction-test`), `onBack` or back chevron must remain clearly accessible next to the brand lockup or title.
2. **Assessment Active state:** When `isAssessmentActive` is true, Settings button must remain disabled and visually muted (`opacity-40 cursor-not-allowed pointer-events-none`).
3. **PWA Install Button:** Must render cleanly when installable (`pwa.isInstallable`) and properly trigger `pwa.promptInstall()` or `pwa.openInstallGuide()` without breaking desktop or mobile layouts.
4. **Active link indicators:** Desktop links (`Assessments`, `Leaderboard`, `Dataset`, `Analytics`, `About`) must clearly indicate active route matching `currentView` / `location.pathname`.
5. **Mobile drawer compatibility:** Mobile drawer must provide access to all links, Settings, and Info with keyboard trapping and screen reader compatibility intact.

---

### Task 1: Create Navbar Unit and Parity Test Suite

**Files:**
- Create: `tests/unit/navbarComponent.test.tsx`

**Interfaces:**
- Consumes: `Navbar` from `src/components/Navbar.tsx`
- Produces: Test suite validating brand lockup, navigation links, PWA install action, settings/info modal triggers, back button on sub-routes, and mobile hamburger drawer.

- [ ] **Step 1: Write the unit test suite for Navbar**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../../src/components/Navbar';

vi.mock('../../src/lib/usePwaInstall', () => ({
  usePwaInstall: () => ({
    isInstallable: true,
    hasNativePrompt: true,
    promptInstall: vi.fn(),
    openInstallGuide: vi.fn(),
  })
}));

describe('Navbar Component', () => {
  it('renders brand lockup linking to home', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" />
      </MemoryRouter>
    );
    const brandLink = screen.getByLabelText(/PULSE Home/i);
    expect(brandLink).toBeInTheDocument();
    expect(brandLink.getAttribute('href')).toBe('/');
  });

  it('renders navigation links for Assessments, Leaderboard, Dataset, Analytics, About', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /^assessments$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^leaderboard$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^dataset$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^analytics$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^about$/i })).toBeInTheDocument();
  });

  it('renders Settings and Info action buttons', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /platform information|app info|info/i })).toBeInTheDocument();
  });

  it('renders back button when on sub-routes', () => {
    const handleBack = vi.fn();
    render(
      <MemoryRouter initialEntries={['/assessments']}>
        <Navbar currentView="assessments" onBack={handleBack} />
      </MemoryRouter>
    );
    const backBtn = screen.getByRole('button', { name: /go back/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify initial failures against missing links or selectors**

Run: `npx vitest run tests/unit/navbarComponent.test.tsx`
Expected: FAIL (because Analytics is not in current Navbar, and accessible names match old pill styling)

- [ ] **Step 3: Commit test file**

```bash
git add tests/unit/navbarComponent.test.tsx
git commit -m "test: add Navbar component test suite"
```

---

### Task 2: Refactor `src/components/Navbar.tsx` with Home Header Design & PWA Actions

**Files:**
- Modify: `src/components/Navbar.tsx`

**Interfaces:**
- Consumes: `usePwaInstall` from `../lib/usePwaInstall`, `PulseLogo` from `./brand`, `resolveActiveNavId` from `../lib/navigation`
- Produces: Updated `Navbar` component matching Home design system.

- [ ] **Step 1: Update Navbar header markup and styling**

Update `src/components/Navbar.tsx`:
1. Import `Download` icon from `lucide-react` and `usePwaInstall` from `../lib/usePwaInstall`.
2. Update the nav link list to include:
   - `Assessments` (`/assessments`)
   - `Leaderboard` (`/leaderboard`)
   - `Dataset` (`/dataset`)
   - `Analytics` (`/analytics`)
   - `About` (`/about`)
3. Adopt the header container layout from Home:
   - Sticky top bar with glass/backdrop blur (`bg-[var(--surface-0)]/90 backdrop-blur-md border-b border-[var(--border-subtle)]`).
   - Inner container `max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-16 sm:h-20 flex items-center justify-between`.
4. Replace the old left mark with the horizontal Pulse brand lockup:
   - If not on home (`!isHome`), show back button immediately before the brand lockup.
   - Use `<PulseLogo variant="horizontal" size={28} color="var(--accent)" textColor="var(--text-primary)" />`.
5. Center Navigation:
   - Render clean text links with active indicator (e.g. underline or subtle accent text/glow):
   ```tsx
   <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-6 lg:gap-8">
     {navItems.map(item => (
       <Link
         key={item.id}
         to={item.to}
         className={`text-[13.5px] lg:text-[14.5px] font-medium transition-colors ${
           activeId === item.id 
             ? 'text-[var(--accent)] font-semibold' 
             : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
         }`}
       >
         {item.label}
       </Link>
     ))}
   </nav>
   ```
6. Right Action Controls:
   - Render `Install App` pill button when `pwa.isInstallable`.
   - Render circular or pill `Info` button with `<Info size={17} />`.
   - Render `Settings` button with `<Settings size={15} />` (disabled if `isAssessmentActive`).
   - Render responsive hamburger toggle (`md:hidden`) that toggles `isMobileMenuOpen`.
7. Mobile Drawer:
   - Update mobile menu links to reflect the new set of nav items while preserving all focus trapping and accessibility.

- [ ] **Step 2: Run Navbar unit tests**

Run: `npx vitest run tests/unit/navbarComponent.test.tsx`
Expected: PASS

- [ ] **Step 3: Run production build check**

Run: `npm run build`
Expected: PASS with 0 build errors.

- [ ] **Step 4: Commit Navbar changes**

```bash
git add src/components/Navbar.tsx
git commit -m "feat: port home page inline header design into Navbar component"
```

---

### Task 3: (Optional Verification & Clean-up) Replace Home inline header with `<Navbar />` if requested

**Files:**
- Modify: `src/components/Home.tsx`

**Interfaces:**
- Consumes: `<Navbar currentView="home" />`
- Produces: DRY Home component using the unified Navbar.

- [ ] **Step 1: Check Home header unification**

If desired, verify whether `Home.tsx` should now directly use `<Navbar currentView="home" />` to keep navigation 100% DRY across the application.

- [ ] **Step 2: Run full build and test suites**

Run: `npm run build`
Expected: PASS
