# Home Page Navigation Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the desktop Home page to remove the top navbar, placing navigation buttons in a dedicated right-side panel and shifting the typography and assessment slides to the left side.

**Architecture:** The `Home.tsx` layout will transition from a single-column vertical stack to a two-column responsive grid (or flex layout) on desktop viewports. The top `<Navbar>` component will be removed exclusively from the Home page. The new right-side navigation panel will mirror the links previously available in the navbar (Assessments, Leaderboard, Dataset, Privacy, Settings, Login/Admin).

**Tech Stack:** React, Tailwind CSS, Framer Motion, React Router DOM

**Spec:** The user requested "removing the navbar from just the home page and having the buttons for navigation on the right side and move the assessments slides to the left".

## Global Constraints

- Must not affect the Navbar presence on other pages (e.g. Assessments, Leaderboard).
- Must remain fully responsive (stacking vertically on tablet/mobile screens if needed, though mobile already has a separate entrypoint).
- Must retain all functional links and settings toggles that were accessible from the Navbar.

## Review Focus

- **Responsive scaling:** The 3D Carousel (AssessmentHero3D) might overflow or look cramped when forced into a left column. Ensure the left column has adequate width (`lg:w-2/3` or `lg:w-3/4`) and the carousel scales properly.
- **Missing Navigation:** Ensure the user can still access "Settings" and "Login/Admin" which were part of the Navbar's right-side actions.
- **Animations:** Check that removing the Navbar doesn't break any page-load staggering (the Navbar had its own animation).

---

### Task 1: Restructure Home.tsx Layout

**Files:**
- Modify: `src/components/Home.tsx`

**Interfaces:**
- Consumes: Existing route paths, `useReducedMotionPreference`, `SettingsModal` (if needed to trigger settings).

- [ ] **Step 1: Remove the top Navbar**
  Remove `<Navbar currentView="home" />` from the JSX.

- [ ] **Step 2: Update the main container layout to a two-column grid**
  Change the `<main>` element to use a grid layout on large screens.
  ```tsx
  <main 
    id="main-content" 
    tabIndex={-1} 
    className="w-full max-w-7xl mx-auto flex-1 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 focus-visible:outline-none pt-8 pb-12 px-6"
  >
  ```

- [ ] **Step 3: Wrap existing content in a left column div**
  Enclose the Top Typographic Section, 3D Assessment Carousel, and Bottom Action Section in a left column container.
  ```tsx
  <div className="flex flex-col items-start text-left w-full relative z-20">
    {/* Typographic Section (Update flex/text alignment to left) */}
    {/* AssessmentHero3D */}
    {/* Bottom Action Section (Update alignment to left) */}
  </div>
  ```

- [ ] **Step 4: Create the right-side navigation panel**
  Add a new `<aside>` or `<div>` for the right column containing the navigation buttons stacked vertically.
  ```tsx
  <aside className="w-full flex flex-col gap-4 relative z-20 pt-16">
    <div className="flex items-center gap-2 mb-6">
      <PulseLogo variant="mark" size={32} color="#00F0FF" />
      <span className="font-heading font-semibold text-xl tracking-wide text-[#F8FAFC]">Pulse</span>
    </div>
    
    <nav className="flex flex-col gap-3">
      {/* Add buttons/links for Assessments, Leaderboard, Dataset, Privacy, Settings, Admin Login */}
    </nav>
  </aside>
  ```

- [ ] **Step 5: Migrate Navbar actions to the right panel**
  Since the Navbar is removed, ensure the "Settings" button (which opens `SettingsModal`) is added to this right panel. You may need to add `const [isSettingsOpen, setIsSettingsOpen] = useState(false);` to `Home.tsx` and import `SettingsModal`.

- [ ] **Step 6: Run type checker and verify build**
  Run: `npm run check`
  Expected: PASS

- [ ] **Step 7: Commit**
  ```bash
  git add src/components/Home.tsx
  git commit -m "feat(home): redesign layout to side-by-side with right navigation panel"
  ```
