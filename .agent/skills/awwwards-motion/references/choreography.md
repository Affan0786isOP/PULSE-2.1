# Easing Palettes, Spring Tiers & Timing Sheets

## Phase 2: Choreography

Motion is choreography. Every element has an entrance cue, a duration, an easing curve, and a relationship to the elements around it. This phase creates the timing sheet - the musical score of the page.

### → The Easing Palette

This is the single most important section in the entire skill. The easing palette defines the emotional language of every animation on the page. Using the wrong curve is like playing a wrong note in a symphony - even non-musicians can feel it.

The palette has THREE tiers, ordered by quality. Use the highest tier your browser support allows.

---

**TIER 1: Spring Physics via CSS `linear()` - THE GOLD STANDARD**

This is what Apple uses. This is what Material Design 3 Expressive uses. This is what separates $200k studio sites from templates. CSS `linear()` enables true spring physics with overshoot and settle - something `cubic-bezier()` fundamentally cannot achieve.

```css
/* BLUEPRINT: Spring-based easing palette via CSS linear()
   WHY: Real spring physics create motion that feels PHYSICAL.
   Objects in the real world don't follow cubic-bezier curves -
   they have mass, momentum, and elasticity. Springs overshoot
   their target and settle back, which reads as "alive" to the
   human eye. This is why every iOS animation feels tangible.

   These curves were generated from spring physics simulations
   with specific mass/stiffness/damping parameters. The linear()
   function plots the spring's position at discrete time steps,
   which the browser interpolates smoothly between. */

:root {
  /* 1. APPLE SNAPPY SPRING - Primary entrance/reveal easing
     Physics: mass=1, stiffness=400, damping=30
     Character: Explosive start, tiny overshoot (~2%), soft settle.
     This is the iOS sheet-present / notification-arrive curve.
     Use on: hero entries, scroll reveals, modal opens, everything
     that "arrives" on screen. This is your DEFAULT curve. */
  --spring-snappy: linear(
    0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.723 12.9%,
    0.938 16.7%, 1.017 19.4%, 1.067 22.5%, 1.089 26.0%,
    1.079 30.3%, 1.049 36.0%, 1.024 42.6%, 1.011 50.3%,
    1.004 59.2%, 1.001 69.3%, 1
  );
  --spring-snappy-duration: 0.55s;

  /* 2. APPLE SMOOTH SPRING - State changes, position shifts
     Physics: mass=1, stiffness=200, damping=24
     Character: Gentle acceleration, visible overshoot (~5%),
     two-phase settle. Feels like a precision instrument.
     This is the iOS page-transition / tab-switch curve.
     Use on: page transitions, tab switches, carousel slides,
     anything moving from position A to position B. */
  --spring-smooth: linear(
    0, 0.004, 0.016 2.3%, 0.063 4.7%, 0.141 7.2%,
    0.25 9.9%, 0.601 16.5%, 0.815 21.0%, 0.929 25.2%,
    0.987 29.0%, 1.025 33.5%, 1.042 38.0%, 1.04 43.5%,
    1.027 50.0%, 1.013 57.5%, 1.005 67.0%, 1.001 79.0%, 1
  );
  --spring-smooth-duration: 0.7s;

  /* 3. APPLE BOUNCY SPRING - Playful micro-interactions
     Physics: mass=1, stiffness=500, damping=18
     Character: Very fast, pronounced overshoot (~12%), visible
     bounce-settle. Feels playful, energetic, delightful.
     Use SPARINGLY on: toggles, like buttons, notification pops,
     small badges, emoji reactions. NEVER on large elements. */
  --spring-bouncy: linear(
    0, 0.014, 0.055 1.8%, 0.218 3.7%, 0.867 8.5%,
    1.085 10.7%, 1.212 12.9%, 1.264 15.0%, 1.262 17.0%,
    1.217 19.5%, 1.098 24.0%, 1.035 28.5%, 0.993 33.0%,
    0.981 38.0%, 0.988 45.0%, 0.998 55.0%, 1.001 68.0%, 1
  );
  --spring-bouncy-duration: 0.5s;

  /* 4. MATERIAL 3 EMPHASIZED - Google's expressive motion standard
     Source: Material Design 3 motion spec (legacy cubic-bezier fallback)
     Character: Very slow start, dramatic acceleration, gentle decelerate.
     This is the M3 "emphasized" transition for container transforms,
     shared element transitions, and FAB expansions.
     Use on: container morphs, expand/collapse, shared transitions. */
  --m3-emphasized: cubic-bezier(0.05, 0.7, 0.1, 1.0);
  --m3-emphasized-duration: 0.5s;

  /* 5. MATERIAL 3 EMPHASIZED as SPRING - for spring-capable contexts
     Physics: mass=1, stiffness=300, damping=22
     The spring equivalent of M3 Emphasized - with the overshoot
     that Google's spec now recommends via their spring system. */
  --m3-spring: linear(
    0, 0.007, 0.029 2.0%, 0.118 4.2%, 0.508 10.9%,
    0.797 15.4%, 0.951 19.2%, 1.029 22.2%, 1.074 25.6%,
    1.088 29.2%, 1.075 33.6%, 1.045 39.5%, 1.02 46.5%,
    1.007 55.0%, 1.001 66.0%, 1
  );
  --m3-spring-duration: 0.6s;
}
```

---

**TIER 2: Premium Cubic-Bezier Curves - STRONG FALLBACK**

For browsers that don't support `linear()`, or for secondary animations where spring overshoot would be inappropriate (ambient motion, background transitions, color shifts).

```css
:root {
  /* 6. SNAPPY DECEL - Tier 2 fallback for spring-snappy
     The best cubic-bezier approximation of the Apple snappy spring,
     minus the overshoot. Still far better than CSS keyword easings.
     Use when linear() is unavailable, or for secondary reveals. */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);

  /* 7. SMOOTH IN-OUT - for ambient position shifts
     Neither Material 3 nor Apple style - this is the Awwwards
     agency standard for smooth lateral movements, carousel
     auto-play, and background panning. */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);

  /* 8. ENERGETIC SNAP - for hover responses, interactive feedback
     Faster than --ease-out, designed for immediate tactile response.
     The curve front-loads 80% of the motion into the first 30% of
     the duration, creating a "snap" sensation. */
  --ease-snap: cubic-bezier(0.22, 1, 0.36, 1);

  /* 9. DRAMATIC IN-OUT - for hero reveals, cinematic entrances
     Extremely slow start ("winding up"), explosive middle,
     graceful deceleration. Use for the ONE theatrical moment
     per page - the hero heading reveal, a page transition wipe. */
  --ease-dramatic: cubic-bezier(0.77, 0, 0.175, 1);

  /* 10. CUBIC SPRING APPROXIMATION - bouncy without linear()
      The y2 value exceeds 1.0, causing overshoot. This is the
      closest cubic-bezier can get to a spring. Less natural than
      linear() springs but works everywhere. */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

**TIER 3: CSS Keyword Easings - BANNED**

`ease`, `ease-in`, `ease-out`, `ease-in-out`, `linear` - these CSS keywords are the typographic equivalent of Comic Sans. They have zero character, zero intentionality, zero soul. They exist because browsers needed a default, not because any designer chose them.

| CSS Keyword | Why it's banned | What to use instead |
|---|---|---|
| `ease` | Generic curve that matches nothing. The "I didn't think about this" easing. | `--spring-snappy` or `--ease-out` |
| `ease-in` | Slow start, fast end - objects accelerating into a wall. Almost never what you want. | `--ease-dramatic` (if you need a slow start) |
| `ease-out` | Better than `ease`, but still a bland, characterless deceleration. | `--spring-snappy` or `--ease-out` (the custom one) |
| `ease-in-out` | The "I want this to look smooth" default that looks like nothing. | `--spring-smooth` or `--ease-in-out` (the custom one) |
| `linear` | Objects don't move at constant speed in nature. Feels robotic and dead. | Only acceptable for `animation-timing-function` on infinite loops (marquees, spinners) |

⚠ **Drift Warning:** If you write `transition: all 0.3s ease` ANYWHERE in the codebase, the implementation has failed the quality bar. Every transition must use a named curve from the palette. No exceptions. No shortcuts. The easing palette is the DNA of the entire motion experience.

---

**→ The Three-Curve Maximum (CRITICAL)**

This is the constraint that creates cohesion. From the 10 curves above, each project picks exactly **THREE** - one primary, one secondary, one utility. Every animation on the page uses one of these three. No exceptions. Three curves from the same family sound like one voice; ten curves sound like a committee.

| Personality | Primary (entries, reveals) | Secondary (state changes, transitions) | Utility (hover, feedback, ambient) |
|---|---|---|---|
| **Surgical** | `--ease-out` | `--ease-in-out` | `--ease-snap` |
| **Physical** | `--spring-snappy` | `--spring-smooth` | `--ease-snap` |
| **Cinematic** | `--ease-dramatic` | `--spring-smooth` | `--ease-in-out` |

These are the recommended presets. You MAY substitute one curve if the project demands it (e.g., swap `--spring-bouncy` for `--spring-snappy` on a playful product) but you MUST NOT exceed three total. If you find yourself reaching for a fourth curve, one of your first three was chosen wrong.

**→ How to choose between Tier 1 and Tier 2:**

| Animation type | Use this tier | Why |
|---|---|---|
| **Hero entry, page load reveals** | Tier 1 (`--spring-snappy`) | First impression. Must feel physical and premium. |
| **Scroll reveals** | Tier 1 (`--spring-snappy`) | User sees dozens of these. Each one must feel alive. |
| **Button/card hover** | Tier 2 (`--ease-snap`) | Hover is fast and functional. Spring overshoot on hover feels jittery. |
| **Button click/active** | Tier 1 (`--spring-bouncy`) | Click feedback benefits from the satisfying "pop" of a spring bounce. |
| **Modal/dialog open** | Tier 1 (`--spring-smooth`) | Modals are spatial - they arrive from somewhere. Springs make this feel real. |
| **Tab switch/carousel** | Tier 1 (`--spring-smooth`) | Position changes need momentum and settle. |
| **Background color shift** | Tier 2 (`--ease-in-out`) | Color doesn't have mass. Springs on color feel wrong. |
| **Gradient animation** | Tier 2 (`--ease-in-out`) or `linear` | Ambient motion. No spring needed. |
| **Page transition** | Tier 1 (`--spring-smooth`) | Page navigation is a major spatial event. Must feel physical. |
| **Tooltip appear** | Tier 2 (`--ease-snap`) | Fast, functional, non-theatrical. |
| **Accordion expand** | Tier 1 (`--spring-snappy`) or Tier 1 (`--m3-spring`) | Height changes with spring settle feel premium. |
| **Floating/ambient** | CSS `linear` keyword | Continuous loops don't need easing - constant speed IS correct. |

---

**→ Framer Motion / Motion spring equivalents:**

```tsx
/* BLUEPRINT: Framer Motion spring presets matching the CSS palette
   WHY: When using Framer Motion (React), use these spring configs
   instead of the CSS linear() values. Framer Motion's spring()
   computes physics natively, giving even smoother results than
   the CSS approximation. These match the FEEL of the CSS palette. */

const springs = {
  // Matches --spring-snappy: fast, minimal overshoot
  snappy: { type: "spring", stiffness: 400, damping: 30, mass: 1 },

  // Matches --spring-smooth: gentle, visible settle
  smooth: { type: "spring", stiffness: 200, damping: 24, mass: 1 },

  // Matches --spring-bouncy: playful pop
  bouncy: { type: "spring", stiffness: 500, damping: 18, mass: 1 },

  // Matches --m3-spring: Material 3 emphasized
  emphasized: { type: "spring", stiffness: 300, damping: 22, mass: 1 },

  // For hover responses (no spring, just fast decel)
  snap: { type: "tween", duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

// Usage:
// <motion.div transition={springs.snappy} />
// <motion.div transition={springs.smooth} />
```

---

**→ GSAP spring equivalents:**

```javascript
/* BLUEPRINT: GSAP spring-like easing
   WHY: GSAP doesn't use spring physics natively, but its
   CustomEase plugin can replicate the feel. For standard use,
   these "power" easings are the closest GSAP equivalents. */

// snappy: "power3.out" or CustomEase
// smooth: "power2.inOut"
// bouncy: "back.out(1.7)"  - the 1.7 controls overshoot amount
// dramatic: "expo.inOut"
// snap: "power4.out"

// For true springs in GSAP, use the gsap-spring plugin:
// gsap.to(".element", { x: 100, ease: "spring({stiffness: 400, damping: 30})" });
```

### → The Timing Sheet

Map every animation in sequence. This is the score.

| Element | Trigger | Delay | Duration | Easing | Transform | Notes |
|---|---|---|---|---|---|---|
| Nav | Page load | 0ms | 600ms | --ease-out | opacity 0→1, y -20→0 | First element to appear |
| Hero eyebrow | Page load | 100ms | 700ms | --ease-out | opacity 0→1, y 20→0, blur 8→0 | Stagger start |
| Hero heading | Page load | 200ms | 800ms | --ease-out | opacity 0→1, y 30→0, blur 8→0 | Core focal point |
| Hero subtext | Page load | 320ms | 700ms | --ease-out | opacity 0→1, y 20→0 | After heading lands |
| Hero CTA | Page load | 440ms | 600ms | --ease-out | opacity 0→1, y 20→0, scale 0.95→1 | Last hero element |
| Section heading | Scroll (20% visible) | 0ms | 800ms | --ease-out | opacity 0→1, y 40→0 | Per section |
| Cards | Scroll (15% visible) | 0/80/160ms | 700ms | --ease-out | opacity 0→1, y 30→0 | Stagger per card |
| CTA buttons | Hover | 0ms | 500ms | --ease-snap | y 0→-2px, shadow increase | Immediate response |
| Cards | Hover | 0ms | 400ms | --ease-snap | y 0→-4px, shadow increase | Lift effect |

**Timing Rules:**

| Rule | Value | Why |
|---|---|---|
| Maximum total entry sequence | 800ms | Beyond 800ms, the page feels slow to load |
| Stagger increment | 80-150ms | Below 80ms feels simultaneous. Above 150ms feels sluggish |
| Hover response | ≤ 150ms perceived start | The user must feel instant feedback |
| Scroll reveal duration | 600-900ms | Long enough to notice, short enough to not obstruct |
| Page transition | 300-500ms | Fast enough to not break flow, slow enough to register |
| Micro-interaction (toggle, checkbox) | 200-350ms | Functional feedback, not theatrical |

⚠ **Drift Warning:** The #1 AI animation failure is making everything too slow. A 1.5-second fade-in on every section makes the page feel like it's loading, not revealing. Keep scroll reveals under 900ms. Keep hover responses under 500ms. Keep total page entry under 800ms.

### → Stagger Choreography

Stagger is not "delay each item by 100ms." Stagger follows visual hierarchy.

**Correct stagger order (top to bottom = first to last):**
```
1. Container/background (instant or 0ms)
2. Primary content (heading, hero image) - 100ms
3. Supporting content (subtext, description) - 220ms  
4. Interactive elements (CTAs, buttons) - 340ms
5. Decorative elements (badges, accents) - 440ms
```

**Stagger within grids (cards, features):**
```
For a 3-column grid, stagger left-to-right:
  Card 1: 0ms
  Card 2: 80ms
  Card 3: 160ms

For a 2x3 grid, stagger top-left to bottom-right:
  Row 1: 0ms, 80ms, 160ms
  Row 2: 120ms, 200ms, 280ms
```

⚠ **Drift Warning:** Never stagger more than 6-8 items. If you have 12 cards, stagger the first 4-6, then bring the rest in together. A 12-item stagger takes 1.2+ seconds and the user loses patience watching items appear one by one.

### ✓ Quality Gate: Choreography

Before moving to Phase 3, confirm:
- Easing palette is defined (not using CSS keyword easings)
- Timing sheet covers every moving element
- No animation exceeds 900ms duration
- Total page entry sequence is under 800ms
- Stagger increments are 80-150ms
- Stagger follows visual hierarchy, not DOM order
- No more than 6-8 items are individually staggered

---
