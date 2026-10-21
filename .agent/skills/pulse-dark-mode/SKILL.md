---
name: pulse-dark-mode
description: Use when implementing, auditing, or fixing dark mode in PULSE 2.1 desktop (src/) or mobile (mobile/src/). Covers proven token patterns, every class of bug discovered during the full-site dark mode audit, and the desktop vs mobile divergence in styling strategy.
---

# PULSE 2.1 Dark Mode — Implementation Guide & Bug Registry

## Overview

Dark mode in PULSE 2.1 is split across two styling strategies that must **never be mixed within the same platform**:

- **Desktop (`src/`):** Tailwind `dark:` utility prefixes hard-coded to PULSE's observatory palette.
- **Mobile (`mobile/src/`):** CSS custom property tokens (`var(--surface-1)`, `var(--accent)`, etc.) via the observatory token system. Do NOT add `dark:` Tailwind prefixes to mobile files.

---

## Token Reference

### Desktop Tailwind `dark:` Classes

| Purpose | Light | Dark |
|---|---|---|
| Primary surface | `bg-white` | `dark:bg-[#12161B]` |
| Secondary surface / cards | `bg-slate-50` | `dark:bg-[#181D23]` |
| Page background | `bg-[#F0F6FF]` | `dark:bg-[#0B0D10]` |
| Navbar / elevated surface | `bg-white/90` | `dark:bg-[#0B0D10]/90` |
| Subtle border | `border-slate-200` | `dark:border-slate-800` |
| Primary text | `text-[#090D1A]` | `dark:text-white` or `dark:text-[#F5F7FA]` |
| Muted / secondary text | `text-slate-500` | `dark:text-slate-400` |
| Accent / highlight | `text-[#0066FF]` | `dark:text-[#22C7D6]` |
| Accent border / selected | `border-[#0066FF]` | `dark:border-[#22C7D6]` |
| Accent background tint | `bg-sky-50` | `dark:bg-[#22C7D6]/10` |
| Accent CTA gradient | `from-[#0066FF]` | `dark:from-[#22C7D6]` |

### Mobile CSS Custom Property Tokens

```css
var(--surface-1)      /* primary surface */
var(--surface-2)      /* card / elevated */
var(--accent)         /* Signal Cyan #22C7D6 */
var(--text-primary)   /* primary text */
var(--text-secondary) /* muted text */
var(--border-subtle)  /* subtle dividers */
```

> [!IMPORTANT]
> Mobile components already define these tokens in observatory dark mode. Do not override with `dark:bg-[...]` Tailwind prefixes in mobile files — that breaks the token cascade.

---

## Bug Registry — All Confirmed Defects Found During Audit

### Bug 1 — Navbar Height Shift on Theme Toggle
**File:** `src/components/Navbar.tsx`  
**Symptom:** The entire page shifted down by ~16px when switching to dark mode.  
**Root Cause:** Theme-conditional height classes on the nav container:
```tsx
// ❌ BROKEN — different heights per theme
className={`... ${isLight ? 'h-14 sm:h-16' : 'h-16 sm:h-20'} ...`}
```
**Fix:** Use a single height class for both themes:
```tsx
// ✅ FIXED
className="... h-14 sm:h-16 min-[2560px]:h-20 ..."
```
**Rule:** Never branch layout-affecting classes (height, padding, margin) on theme state.

---

### Bug 2 — SVG Wave Crest: Hardcoded White Stroke in Dark Mode
**Files:** `src/components/home/DesktopWaveGraphic.tsx`, `src/components/leaderboard/LeaderboardSideWaves.tsx`, `mobile/src/components/hero/WaveGraphic.tsx`  
**Symptom:** A visible white/light line appeared along the foreground wave crest on dark backgrounds.  
**Root Cause:**  
- Crest highlight path had `stroke="#E0F2FE"` with `opacity="0.95"` — stark white against `#0B0D10`.  
- Ambient gradient had `stopColor="#FFFFFF" stopOpacity="0.95"` bleeding into the wave bottom edge.  
**Fix Pattern:**
```tsx
// Read theme with hook
const { isDark } = useSystemTheme();

// Crest stroke: light-mode stays white, dark-mode uses accent cyan
stroke={isDark ? '#22C7D6' : '#E0F2FE'}
strokeOpacity={isDark ? 0.45 : 0.95}
strokeWidth={isDark ? 1.5 : 2.2}

// Ambient gradient bottom stop: blend into background, not white
<stop offset="100%" stopColor={isDark ? '#0B0D10' : '#FFFFFF'} stopOpacity={isDark ? 1 : 0.95} />
```
**Rule:** SVG inline color props (`stroke`, `fill`, `stopColor`) always bypass CSS and Tailwind — they must be driven by a theme hook or CSS `currentColor`.

---

### Bug 3 — Animated Counter Locked to Light-Mode Color
**Files:** `src/components/ui/AnimatedResultCount.tsx`, `mobile/src/components/ui/AnimatedResultCount.tsx`  
**Symptom:** Homepage result counts stayed dark/black in dark mode, nearly invisible.  
**Root Cause:** Framer Motion `animate={{ color: '#090D1A' }}` hardcoded inline style overrides all CSS and Tailwind dark classes.  
**Fix:**
```tsx
// ❌ BROKEN — inline style overrides cascade
animate={{ color: hasUpdated ? ['#090D1A', '#0066FF', '#090D1A'] : '#090D1A' }}

// ✅ FIXED — currentColor inherits from CSS
animate={{ color: hasUpdated ? ['currentColor', 'var(--accent)', 'currentColor'] : 'currentColor' }}
```
**Rule:** Any Framer Motion `animate` or `style` property that sets `color`, `background`, or `opacity` bypasses Tailwind's dark mode. Use `currentColor` or CSS variables instead.

---

### Bug 4 — Modals: No Dark Surface, Light Backdrop
**Files:** `src/components/SettingsModal.tsx`, `src/components/WelcomeModal.tsx`, `src/components/AssessmentInfoPanel.tsx`  
**Symptom:** Modal dialogs had white/light backgrounds in dark mode.  
**Root Cause:** Modal containers had no `dark:` classes — inherited the white default.  
**Fix Pattern (Desktop):**
```tsx
// Modal backdrop
className="... dark:bg-black/60"

// Modal container
className="... dark:bg-[#12161B] dark:border-slate-800"

// Modal header
className="... dark:text-white dark:border-slate-800"

// Tabs / pills (active)
className="... dark:bg-[#22C7D6] dark:text-black"

// Tabs / pills (inactive)  
className="... dark:text-slate-400 dark:hover:bg-slate-800"

// Input / select fields
className="... dark:bg-[#181D23] dark:border-slate-700 dark:text-white"

// Labels / secondary text
className="... dark:text-slate-400"
```
**Special Case — AssessmentInfoPanel:** Uses a `.pulse-light-modal` wrapper class. Add a CSS block in `src/index.css` to override tokens for light-mode-locked modal context:
```css
.dark .pulse-light-modal {
  --surface-1: #12161B;
  --surface-2: #181D23;
  --text-primary: #F5F7FA;
  --text-secondary: #94A3B8;
  --border-subtle: #1E293B;
  --accent: #22C7D6;
}
```

---

### Bug 5 — Age Selection Cohort Cards: No Selected-State Dark Styling
**Files:** `src/components/AgeSelection.tsx`, `mobile/src/components/AgeSelection.tsx`  
**Symptom:** Selected cohort cards in age selection used `border-[#0066FF]`/`bg-sky-50` in both modes.  
**Fix:**
```tsx
// Selected card border
className={`... ${selected ? 'border-[#0066FF] dark:border-[#22C7D6]' : 'border-transparent'}`}

// Selected badge
className={`... ${selected ? 'bg-[#0066FF] dark:bg-[#22C7D6] dark:text-black' : ''}`}

// CTA gradient button
className="... from-[#0066FF] dark:from-[#22C7D6] to-[#0EA5E9] dark:to-[#0EA5E9]"
```

---

### Bug 6 — Mobile Navbar: Light Background on Non-Apparatus Routes
**File:** `mobile/src/components/Navbar.tsx`  
**Symptom:** Navbar stayed `bg-white/90` in dark mode on non-observatory pages.  
**Root Cause:** `navSurfaceClass` and `iconBtnClass` did not vary by `isDarkActive` on standard routes.  
**Fix:** Gate both class groups on the dark flag (mobile uses `isDarkActive` from `useSystemTheme`):
```tsx
const navSurfaceClass = isDarkActive
  ? 'bg-[#0B0D10]/90 border-slate-800'
  : 'bg-white/90 border-slate-200';
const iconBtnClass = isDarkActive
  ? 'bg-[#181D23] text-slate-300 border-slate-700'
  : 'bg-white text-slate-600 border-slate-200';
```

---

### Bug 7 — Mobile Hero: Hardcoded Light Fills (Cards, Badge, Stats)
**File:** `mobile/src/components/hero/MobileHero.tsx`  
**Symptom:** 2×2 shortcut cards, eyebrow badge, and stats dividers stayed white/light in dark mode.  
**Root Cause:** No `dark:` classes on any surface.  
**Fix:** Add dark tokens to each surface category:
```tsx
// Shortcut cards
dark:bg-[#12161B] dark:border-slate-800

// Eyebrow badge
dark:bg-[#22C7D6]/20 dark:text-[#22C7D6] dark:border-[#22C7D6]/30

// Stats dividers
dark:bg-slate-800

// Headline
dark:text-[#F5F7FA]
```

---

### Bug 8 — Mobile Leaderboard Navbar Text Overflow
**File:** `mobile/src/components/Leaderboard.tsx`  
**Symptom:** On 360–390px viewports, the leaderboard title and inline timestamp collided.  
**Root Cause:** Tight navbar row contained: Back + Pulse mark + Title + Timestamp + Refresh + Theme + Info + Settings = overflow.  
**Fix:**  
1. Remove the inline `formatRelativeTime(lastUpdated)` timestamp from the navbar header row.  
2. Surface the timestamp below the navbar, in the content area beneath the header.

---

### Bug 9 — Page / Section Lists: Hardcoded Light Backgrounds
**Files:** `mobile/src/components/Assessments.tsx`, `mobile/src/components/Leaderboard.tsx`, `mobile/src/components/Improve.tsx`  
**Pattern:** Protocol cards, tab pills, table rows, checklist items, biological factor boxes all had hardcoded light-mode fills.  
**Fix Template:**
```tsx
// Protocol cards
dark:bg-[#12161B] dark:border-slate-800

// Tab pills (active)
dark:bg-[#22C7D6] dark:text-black

// Tab pills (inactive)
dark:bg-[#181D23] dark:text-slate-400

// Table rows
dark:divide-slate-800 dark:hover:bg-[#181D23]/70

// Rank badges
dark:bg-[#181D23] dark:text-[#22C7D6]
```

---

## Audit Checklist

When reviewing a component for dark mode completeness:

- [ ] **Root container** — has `dark:bg-[...]` for surface color
- [ ] **All text nodes** — `dark:text-...` on primary and secondary text  
- [ ] **All borders / dividers** — `dark:border-slate-800`  
- [ ] **SVG inline props** — `stroke`, `fill`, `stopColor` driven by theme hook (not CSS)  
- [ ] **Framer Motion animate** — no hardcoded `color` values; use `currentColor` or `var(--accent)`  
- [ ] **Inline `style=` props** — no hardcoded `backgroundColor`, `color`, `borderColor`  
- [ ] **Selected / active states** — selected border/badge uses `dark:border-[#22C7D6]` / `dark:bg-[#22C7D6]`  
- [ ] **Modal dialogs** — backdrop + container + header + tabs + inputs + labels all themed  
- [ ] **Navigation height** — no theme-conditional `h-` classes that change layout  
- [ ] **Navbar surface** — separate class variables per `isDark/isDarkActive` flag  

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Mixing `dark:` Tailwind classes in mobile files | Mobile uses CSS tokens only — remove all `dark:` prefixes from mobile |
| SVG `stroke`/`fill` hardcoded light colors | Drive with `useSystemTheme()` hook |
| Framer Motion `animate={{ color: '#...' }}` | Use `currentColor` or `var(--accent)` |
| Navbar `h-` class split by theme | Unify to single height class |
| Inline `style={{ backgroundColor: '#...' }}` | Move to a Tailwind class or CSS variable |
| Changing dark token in desktop, forgetting mobile mirror | Check both files — desktop is `src/`, mobile is `mobile/src/` |
| Modal has no `dark:` classes | Every modal layer (backdrop, container, header, tabs, inputs) needs dark tokens |

---

## Platform Parity Invariant

Every visual surface fixed on desktop should be mirrored in mobile. After desktop fixes, run the same screenshot audit on `/mobile/` routes and inspect all matching components in `mobile/src/`. The token strategy differs (CSS vars vs Tailwind `dark:`), but the visual outcome must be identical.
