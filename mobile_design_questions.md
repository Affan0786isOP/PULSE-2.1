# PULSE Mobile Design Migration — Comprehensive Decision Matrix & Questions

This document compiles every single design, technical, responsive, and architectural question across the PULSE Mobile PWA redesign. Each question includes context, viable options, and our **(Recommended)** choice based on the desktop redesign and the empirical audit.

---

## 1. Mobile Homepage Hero (`mobile/src/components/hero/MobileHero.tsx`)

### Q1.1: 4 Quick Shortcut Buttons (Leaderboard, Dataset, Analytics, About Us)
- **Context:** On desktop, the 4 circular shortcut buttons were removed to eliminate visual clutter and focus user attention on the primary "Start Testing" CTA and the 3D assessment carousel. On mobile, you previously indicated keeping them.
- **Options:**
  - **Option A (Recommended):** Keep the 4 buttons as requested, but restyle them with crisp white circular cards (`bg-white`), high-contrast dark icons (`#090D1A`), subtle borders (`border-sky-100/90`), gentle shadows, and deep slate typography (`#334155`).
  - **Option B:** Modernize into a 2x2 grid of rounded rectangular cards with mini-descriptions.
  - **Option C:** Convert into a horizontal swipeable pill bar directly beneath the headline.

### Q1.2: Mobile Hero Subtitle Copy
- **Context:** Mobile currently uses: *"Reaction time, memory, attention and more — tested with precision, in your browser."* Desktop uses the approved copy: *"Test your reaction speed, memory and attention — right in your browser, with no account required."*
- **Options:**
  - **Option A (Recommended):** Update mobile subtitle to match the approved desktop copy emphasizing "with no account required" to reinforce the zero-barrier value proposition.
  - **Option B:** Retain the current shorter mobile copy for compactness on small viewports.

### Q1.3: Mobile Metrics Row (Bottom of Hero)
- **Context:** Mobile currently displays 3 columns: `5 Tests | [Results count] | [Globe Icon] Leaderboard`. Desktop displays: `5 Tests | [Results count] | Free (No sign-up)`.
- **Options:**
  - **Option A (Recommended):** Change the 3rd metric on mobile to "Free / No sign-up" (matching desktop), since Leaderboard is already prominently featured in the 4 circular shortcuts directly above.
  - **Option B:** Keep the Globe icon with "Leaderboard" link on the 3rd metric.

### Q1.4: "Explore Tests" Bottom Chevron Interaction
- **Context:** At the bottom of the mobile hero, there is a bouncing chevron with "EXPLORE TESTS". Clicking it currently navigates to `/assessments`.
- **Options:**
  - **Option A (Recommended):** Keep the bouncing chevron and label, smoothly navigating to `/assessments` with active tactile haptic feedback.
  - **Option B:** Replace the chevron with a secondary outline button ("Browse All 5 Protocols →") beneath the main CTA.

---

## 2. Mobile Assessments Hub (`mobile/src/components/Assessments.tsx`)

### Q2.1: Protocol Card Layout & Tap Behavior
- **Context:** You chose the compact format where the entire card is a single tap target.
- **Options:**
  - **Option A (Recommended):** Entire card is a single tap target with active tactile scale (`active:scale-[0.98] active:bg-slate-50`), styled in `bg-white`, `border-slate-200/80`, with a right chevron (`ChevronRight`) indicating forward navigation.
  - **Option B:** Keep the card without a right chevron, relying solely on touch elevation.

### Q2.2: Protocol Icon Badges on Light Cards
- **Context:** Currently, the protocol logos (`/brand/assessments/*.png`) are line-art icons that had low contrast on light backgrounds.
- **Options:**
  - **Option A (Recommended):** Place protocol marks inside a high-contrast container (`w-13 h-13 rounded-xl bg-slate-50 border border-slate-200/70 p-1.5`) with a subtle tinted radial glow behind each mark for crisp legibility.
  - **Option B:** Render marks directly on the white card without an icon bounding box.

### Q2.3: Telemetry Metadata on Mobile Cards
- **Context:** Desktop cards display test duration and trial count (e.g., `10 Trials`, `~2 mins`, `Latency (ms)`). Mobile currently shows `PROTOCOL 0X` and the domain category (e.g., `REACTION TIME`).
- **Options:**
  - **Option A (Recommended):** Include a compact secondary badge row on each mobile card showing trials and primary metric (e.g., `10 Trials • ms`).
  - **Option B:** Keep it strictly minimal with only `PROTOCOL 0X` and domain category to keep cards vertically compact.

---

## 3. Mobile Navigation Header (`mobile/src/components/Navbar.tsx`)

### Q3.1: Navbar Header Surface & Blur
- **Context:** Mobile navbar is sticky/fixed on top across all non-home pages. It currently uses dark `bg-[var(--surface-0)]`.
- **Options:**
  - **Option A (Recommended):** Translucent laboratory glass: `bg-white/90 backdrop-blur-md border-b border-slate-200/80 text-[#090D1A]` with safe-area notch padding (`env(safe-area-inset-top)`).
  - **Option B:** Solid opaque white: `bg-white border-b border-slate-200/80 text-[#090D1A]`.

### Q3.2: Navbar Back Button Behavior & Styling
- **Context:** The back arrow button on non-home pages currently navigates `navigate(-1)` if history exists, or defaults to `/`.
- **Options:**
  - **Option A (Recommended):** Restyle back button as a crisp rounded button (`w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 active:bg-slate-100 active:scale-95 shadow-xs`) preserving intelligent history fallback.
  - **Option B:** Make the back button a borderless touch target (`text-slate-600 hover:text-slate-900`).

### Q3.3: Assessment Active State (Lockout)
- **Context:** When a participant is actively taking a test, navigation must prevent accidental exits or modal openings.
- **Options:**
  - **Option A (Recommended):** During active test execution, switch the navbar into dark apparatus theme (`bg-[#12161B] text-white border-b border-[#20262D]`), hide the Settings/Info buttons, and replace the back button with a dedicated red/muted "Abort Test" button with confirmation.
  - **Option B:** Completely hide the navbar during active test trials (full screen immersion).

---

## 4. Mobile Leaderboard (`mobile/src/components/Leaderboard.tsx`)

### Q4.1: Protocol Tab Switching Interface
- **Context:** Mobile users switch between the 5 assessment leaderboards. Currently, it uses left/right arrows with horizontal indicator dots.
- **Options:**
  - **Option A (Recommended):** Horizontal swipeable pill tab bar with smooth scroll, where the active protocol has a vibrant `#0066FF` pill background and inactive protocols have clean slate pills (`bg-slate-100 text-slate-700`).
  - **Option B:** Keep the existing compact carousel layout with left/right chevron buttons and indicator dots, updated to light styling.

### Q4.2: Mobile Leaderboard Table Presentation
- **Context:** Mobile screens have limited horizontal space (360px–390px). Desktop shows Rank, Alias, Age Cohort, Score, Date.
- **Options:**
  - **Option A (Recommended):** Streamlined 3-column mobile table: `Rank (with medal icons for top 3) | Alias & Cohort (stacked) | Score & Unit`.
  - **Option B:** Full 4-column table with smaller font size and horizontal scrolling.

### Q4.3: Leaderboard Refresh & User Highlight
- **Context:** Users who opted-in have their entry highlighted in the table.
- **Options:**
  - **Option A (Recommended):** Highlight the user's row with a soft blue tint (`bg-blue-50/80 border-l-4 border-l-[#0066FF] text-[#0066FF] font-bold`) so they immediately spot their ranking.
  - **Option B:** Subtle badge ("YOU") next to their alias without background row tinting.

---

## 5. Mobile Performance Guide (`mobile/src/components/Improve.tsx`)

### Q5.1: Biological & Environmental Factor Badges
- **Context:** The Improve guide lists factors affecting reaction latency (Sleep, Stress, Screen Fatigue, Caffeine, Hydration, Exercise). Currently uses dark cards with neon borders.
- **Options:**
  - **Option A (Recommended):** Group into two clean laboratory sections:
    - Impairing Factors: `bg-rose-50 border border-rose-200 text-rose-800 font-medium rounded-xl p-3`.
    - Enhancing Factors: `bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium rounded-xl p-3`.
  - **Option B:** Individual cards for each factor with icon, title, and mini progress bar.

### Q5.2: Daily Habits Interactive Checklist
- **Context:** Users can check off 10 habits (e.g., Sleep 7-9 hours, Hydration, Screen break). Progress is persisted in `localStorage`.
- **Options:**
  - **Option A (Recommended):** Restyle checklist items as white elevated cards (`bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs`) with custom touch checkboxes that turn `#0066FF` with a checkmark on tap. Include a progress counter at the top (`X / 10 Habits Checked (X%)`).
  - **Option B:** Compact single table list with standard browser checkboxes.

### Q5.3: Scientific Research Evidence Ledger (Carousel)
- **Context:** A carousel rotates through peer-reviewed research findings.
- **Options:**
  - **Option A (Recommended):** Restyle carousel card as an observatory research card on white (`bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm`), featuring evidence badge (`Established Evidence` in emerald, `Association` in amber), study title, summary, and citation link.
  - **Option B:** Static scrollable accordion list instead of an auto-rotating carousel.

---

## 6. Dialogs & Modals (`mobile/src/components/*Modal.tsx`)

### Q6.1: Settings Modal (`SettingsModal.tsx`)
- **Context:** Mobile settings controls sound effects, haptics, reduced motion, exhibition mode, font scale, and app install.
- **Options:**
  - **Option A (Recommended):** Slide-up bottom sheet modal (`sheet`) with rounded top corners (`rounded-t-3xl bg-white text-[#090D1A]`), drag handle indicator, toggle switches with `#0066FF` active fill, and smooth entrance/dismiss animations.
  - **Option B:** Fullscreen modal with top close button (`fixed inset-0 bg-white`).

### Q6.2: Welcome Modal (`WelcomeModal.tsx`)
- **Context:** Displays onboarding guide on first visit (`Pick a test -> Respond -> Review`).
- **Options:**
  - **Option A (Recommended):** Laboratory light dialog card (`bg-white border border-slate-200 text-[#090D1A] shadow-2xl rounded-2xl`) with blue numbered step icons, "Don't show this again" checkbox, and primary "Start Cognitive Battery" button.
  - **Option B:** Fullscreen 3-step carousel with swipeable onboarding slides.

### Q6.3: Add to Home Screen (PWA) Install Modal
- **Context:** Provides iOS/Android specific instructions to install PULSE to the home screen.
- **Options:**
  - **Option A (Recommended):** Clean bottom sheet matching iOS/Android design standards with platform-specific step diagrams (Safari Share icon -> Add to Home Screen for iOS; native install prompt for Chrome/Android).
  - **Option B:** Simple alert card with text instructions.

---

## 7. Active Test Apparatus Mode Integration

### Q7.1: Stimulus Stage Background & Frame Latency
- **Context:** When the user enters an assessment (`/reaction-test`, `/direction-test`, etc.), the screen starts with Age Cohort Selection and then enters the active test.
- **Options:**
  - **Option A (Recommended):** 
    - Age Cohort Selection: Clean light theme (`theme="light"` / `bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD]`) matching the rest of the site.
    - Active Apparatus Stage: Instant switch to `#12161B` dark apparatus upon age selection, with high-contrast stimulus well, zero animation jitter, and `performance.now()` precision.
  - **Option B:** Keep the entire assessment route dark from initial load, including age selection.

### Q7.2: Touch Target Calibration on Mobile Test Engines
- **Context:** Touch input has different hardware latency and precision characteristics than physical keyboard/mouse.
- **Options:**
  - **Option A (Recommended):** Full-width touch trigger pad (`touch-none select-none active:scale-[0.99]`) with immediate visual feedback on `touchstart` / `pointerdown` rather than `click`, bypassing the 300ms mobile browser click delay.
  - **Option B:** Standard HTML button relying on synthetic click events.

---

## 8. Viewport & Device Edge Handling

### Q8.1: Safe Area Insets (Notch & Dynamic Island)
- **Context:** Modern iOS and Android devices feature notches, pill cutouts, and dynamic navigation bars.
- **Options:**
  - **Option A (Recommended):** Enforce strict CSS safe-area handling:
    - Header: `padding-top: max(0.75rem, env(safe-area-inset-top))`
    - Bottom controls: `padding-bottom: max(1rem, env(safe-area-inset-bottom))`
    - Body sides: `padding-left: env(safe-area-inset-left)`, `padding-right: env(safe-area-inset-right)`
  - **Option B:** Fixed 16px/24px padding without dynamic environment variables.

### Q8.2: Small Viewports (< 375px width, e.g. iPhone SE)
- **Context:** Older or smaller devices have ~320px–360px viewport width.
- **Options:**
  - **Option A (Recommended):** Use fluid `clamp()` sizing for headline typography (`clamp(2rem, 8vw, 2.75rem)`) and flex-wrap / compact gap spacing so no button or label ever overflows horizontally.
  - **Option B:** Fixed 390px baseline with horizontal scaling zoom.

---

## Summary of Recommendations

| Domain | Recommended Approach |
| :--- | :--- |
| **Mobile Hero Layout** | Keep 4 circular shortcuts, restyled on white with `#334155` labels; align metrics row to "5 Tests \| Results \| Free No sign-up"; update subtitle to approved copy. |
| **Assessments Hub** | Compact single-tap cards in laboratory light theme (`bg-white`, `border-slate-200/80`), protocol badges (`PROTOCOL 0X`), and high-contrast icon containers. |
| **Navigation Header** | Translucent laboratory glass (`bg-white/90 backdrop-blur-md`), light back button, dynamic transition to dark apparatus during active tests. |
| **Leaderboard** | 3-column streamlined table (`Rank \| Alias & Cohort \| Score & Unit`), horizontal scrollable protocol pill bar, user row highlighted in soft blue. |
| **Performance Guide** | Grouped factor tags (rose for latency, emerald for consistency), white habit cards with custom `#0066FF` checkboxes, research evidence carousel. |
| **Modals & Dialogs** | Modern slide-up bottom sheets with drag handles and high-contrast toggles. |
| **Test Apparatus** | Light Age Selection, switching to calibrated `#12161B` dark apparatus for active stimulus measurement with zero latency jitter. |
| **Responsive Standards** | Dynamic safe-area padding (`env(safe-area-inset-*)`) and fluid typography across 320px–430px mobile screens. |
