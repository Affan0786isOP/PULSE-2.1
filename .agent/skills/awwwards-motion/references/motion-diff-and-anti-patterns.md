# Motion Quality Gates & Anti-Patterns

## Phase 4: Motion Diff

Compare your animations against the Motion Brief and Timing Sheet. Walk through every category. Any FAIL blocks delivery.

### ⚡ Coverage Check (MANDATORY - Run First)

| Check | PASS/FAIL |
|---|---|
| **Every heading** on the page has a scroll reveal or entry animation | |
| **Every paragraph/body text** has at minimum a fade-up reveal | |
| **Every card** has a scroll reveal AND a hover state (lift + shadow) | |
| **Every button** has hover (lift/wipe/color) + active (press) + focus-visible states | |
| **Every link** has a hover underline animation or color shift | |
| **Every image** has a reveal animation (clip-path, scale-in, or fade) | |
| **Every input** has a focus state (glow, border shift, or label animation) | |
| **Every section** has scroll-triggered entry (no section just "sits there") | |
| **Every decorative element** has ambient motion (float, rotate, pulse) | |
| **Every divider/line** animates in (scaleX expansion or fade) | |
| **Every icon** has hover feedback (color, scale, or rotation shift) | |
| **Stats/numbers** count up from 0 when scrolled into view | |
| **Nav bar** has an entry animation on page load | |
| **Footer** has scroll-triggered stagger reveal on its contents | |
| Scroll the entire page top-to-bottom: ZERO static elements found | |

⚠ **If any row is FAIL, go back and add the missing animation before proceeding.** This is not optional. A page with 90% animation coverage has dead spots that destroy the premium feel.

### Feel Check

| Check | PASS/FAIL |
|---|---|
| Page entry completes in under 800ms total | |
| No element "pops" into existence without any animation | |
| Stagger follows visual hierarchy (heading before subtext before CTA) | |
| Scroll reveals trigger at a natural point (~15-20% element visibility) | |
| Hover feedback is immediate (perceived start ≤ 150ms) | |
| No animation feels "slow" or makes the user wait | |
| No animation draws attention to ITSELF rather than to the content | |
| **Cohesion test:** mute the page to just motion (blur your eyes). Do ALL animations feel like they belong to the same family? Same speed range, same intensity, same personality? | |
| **The compound test:** does the page feel "premium" without any single animation being showy? The goal is 20 invisible correct choices, not 1 theatrical one | |

### Easing Check

| Check | PASS/FAIL |
|---|---|
| No CSS keyword easings (ease, ease-in, ease-out) on visible animations | |
| All entry animations use --ease-out (snappy decel) | |
| All hover interactions use --ease-snap (energetic out) | |
| All state transitions use --ease-in-out (smooth) | |
| Easing palette is consistent across the entire page | |

### Performance Check

| Check | PASS/FAIL |
|---|---|
| All animations use ONLY `transform` and `opacity` (except clip-path reveals and filter:blur entries) | |
| No animations on `top`, `left`, `width`, `height`, `margin`, `padding` | |
| No `transition: all` anywhere - every transition specifies exact properties | |
| `will-change` is applied only to elements that are actively animating | |
| `will-change` is removed after animation completes (for one-shot animations) | |
| No `backdrop-filter` on scrolling elements (only fixed/sticky) | |
| Scroll listeners use `{ passive: true }` | |
| Page maintains 60fps during all animations (check DevTools → Performance) | |
| No layout thrashing (reading layout → writing layout in a loop) | |
| Framer Motion: no `x`/`y`/`scale` shorthand props on heavy pages - use `animate={{ transform: "translateX(100px)" }}` for GPU acceleration | |
| No CSS variable on a parent driving child transforms (e.g., `--swipe-amount`) - set `transform` directly on the element to avoid style recalculation storms | |

### Accessibility Check

| Check | PASS/FAIL |
|---|---|
| All motion respects `prefers-reduced-motion: reduce` | |
| Reduced motion fallback is opacity-only fade (no transforms, no parallax, no spring overshoot) | |
| Hover animations gated behind `@media (hover: hover) and (pointer: fine)` - touch devices fire hover on tap, causing false activation | |
| Split text has `aria-label` preserving the original text | |
| No essential information is conveyed ONLY through animation | |
| Focus states are visible and not obscured by animations | |
| Auto-playing animations (marquee, floats, gradients) can be paused (WCAG 2.2.2) | |
| Custom cursor does not appear on touch devices | |

### Technical Check

| Check | PASS/FAIL |
|---|---|
| Scroll reveal uses IntersectionObserver, not scroll event listener | |
| Scroll-linked animations use `scrub` (not triggered by scroll events) | |
| Touch devices have `smoothTouch: false` if using Lenis | |
| No scroll-jacking (overriding native scroll behavior) without clear justification | |
| Parallax is disabled on mobile (too janky on underpowered devices) | |
| Custom cursor is disabled on mobile/touch | |
| Preloader shows content within 3 seconds maximum | |
| No FOUC (flash of unstyled content) before animations initialize | |

### Composition Check

| Check | PASS/FAIL |
|---|---|
| Maximum 2-3 complex animations running simultaneously on screen | |
| No competing motion (two elements fighting for attention at the same time) | |
| Ambient motion (floats, gradients) does not compete with interactive motion | |
| Animation density matches the Motion Brief (minimal/moderate/rich) | |
| **Personality lock held:** every animation on the page belongs to the locked personality (Surgical/Physical/Cinematic). Zero personality drift. | |
| **Three-curve maximum held:** only 3 easing curves are used across the entire page. Grep the CSS - if you find a 4th curve, the palette leaked. | |
| **Intensity consistency:** scroll reveals all use the SAME transform distance (e.g., all `translateY(24px)`, not a mix of 20/30/40/60). Hover lifts all use the SAME offset (e.g., all `-4px`, not a mix). Stagger delays all use the SAME increment. | |
| Signature micro-animations are on at most 1-3 focal elements, not scattered everywhere | |

---

## The Anti-Patterns

These are the specific failures that turn premium motion into amateur animation. Check for all of them.

### ❌ The Franken-Motion
Different sections use different easing families - springs here, dramatic curves there, linear snaps elsewhere. Each animation is fine in isolation but the page feels like a patchwork quilt. **Fix:** Lock a personality in Phase 1 and enforce the Three-Curve Maximum. Every animation must belong to the same easing family. If the hero uses `--spring-snappy`, the scroll reveals use `--spring-snappy`. If the cards hover with `--ease-snap`, ALL interactive elements hover with `--ease-snap`. Cohesion is the #1 predictor of whether a page feels "premium" or "messy."

### ❌ The Slow Reveal
Everything fades in over 1.5 seconds. The page feels like it's buffering. **Fix:** Keep reveals under 800ms. The user came for content, not a curtain call.

### ❌ The Scroll Carnival
Every element has a different animation: this one slides left, that one bounces, this one rotates in. **Fix:** Use ONE reveal animation (fade-up-deblur) for all scroll reveals. Consistency reads as intentional.

### ❌ The Hover Disco
Buttons scale to 1.1x, cards rotate, links flash different colors. **Fix:** Hover effects should be subtle: 2px lift + shadow expansion for cards, background-color shift for buttons. The user shouldn't be startled.

### ❌ The Parallax Soup
Five layers of parallax on every section. Foreground, midground, background, all moving at different speeds. **Fix:** Maximum 2 parallax layers per viewport. One subtle background shift, one element float. More is motion sickness.

### ❌ The Text Disassembly
Every heading character-splits and reassembles from random positions. **Fix:** Character-split maximum ONE heading per page. Use word-reveal on section headings. Use simple fade-up on everything else.

### ❌ The Infinite Preloader
A 5-second preloader with elaborate animations before the content appears. **Fix:** Preloader maximum 2.5 seconds. If content loads faster, end sooner. Never add artificial delay.

### ❌ The Missing Reduced Motion
No `prefers-reduced-motion` media query anywhere. **Fix:** Every single animation must gate behind `prefers-reduced-motion: reduce` with an opacity-only fallback.

### ❌ The Layout Animator
Animating `width`, `height`, `top`, `left`, `padding`, `margin`, or `border-radius`. **Fix:** Only animate `transform` and `opacity`. Use `transform: scale()` instead of `width`/`height`. Use `transform: translate()` instead of `top`/`left`.

---

## Framework Decision Matrix

| If the project uses... | Use this motion stack |
|---|---|
| **Vanilla HTML/CSS/JS** | CSS keyframes + transitions + IntersectionObserver. Add GSAP only for scroll-pinning or complex timelines |
| **React (no framework)** | Framer Motion (`motion/react`). It handles AnimatePresence, layout animations, and gesture detection |
| **Next.js** | Framer Motion + View Transitions API for page transitions |
| **Vue** | `<Transition>` / `<TransitionGroup>` components + GSAP for scroll |
| **Astro** | View Transitions API (built-in) + CSS animations + GSAP for scroll |
| **Svelte** | Built-in `transition:` and `animate:` directives + GSAP for scroll |

**When to reach for GSAP:**
- Scroll-pinned (sticky) sequences where content changes as you scroll
- Horizontal scroll sections
- Complex timelines with overlapping animations
- Text splitting with SplitText plugin (premium, but best-in-class)

**When CSS is enough:**
- Entry animations (keyframes + animation-delay)
- Hover states (transitions)
- Simple scroll reveals (IntersectionObserver + CSS transitions)
- Floating/ambient motion (keyframes + infinite)
- Accordion/tab state changes (transitions)

---

## The Apple-Level Motion Standards

These are the non-negotiable standards that separate Apple/Awwwards motion from everything else. They apply regardless of framework. Memorize them.

> **Spring physics are mandatory.** Use CSS `linear()` spring curves or Framer Motion springs for EVERY primary animation (entries, reveals, modals, transitions). Cubic-bezier is acceptable only for secondary motion (hovers, color shifts, ambient). If the page feels "digital" instead of "physical," the easing is wrong.

> **Material 3 Expressive is the baseline.** Google's M3 Expressive easing - `cubic-bezier(0.05, 0.7, 0.1, 1.0)` - is the MINIMUM quality for any transition. If your easing is less intentional than this, replace it.

> **Every curve is a conscious choice.** The same 400ms animation with `ease`, `cubic-bezier(0.16, 1, 0.3, 1)`, and a spring `linear()` produces three completely different emotional responses: generic, professional, and alive. You must be able to justify WHY you chose each curve.

> **Stagger creates narrative.** Elements appearing simultaneously is a data dump. Elements appearing in sequence is a story. The stagger order IS your visual hierarchy. Apple staggers with 80-120ms precision.

> **Motion is restraint with intensity.** The most awarded sites have fewer animations, not more - but each one is more sophisticated. A single spring-physics text reveal with word masking is worth more than 20 generic fade-ins. Quality over quantity, always.

> **Performance is non-negotiable.** A 45fps animation is worse than no animation. Only animate `transform`, `opacity`, and `filter`. Test on a throttled CPU. If it's not 60fps, simplify until it is. Use `will-change` surgically.

> **Reduced motion is not optional.** Every animation gates behind `prefers-reduced-motion`. The reduced version uses opacity-only fades at shorter durations. No transforms, no parallax, no spring overshoot, no scroll-linked sequences.

> **The acid test.** Take a screenshot of your page. Put it next to apple.com, linear.app, vercel.com, or stripe.com. If your motion design looks like it belongs on a different planet, start over. If it looks like it could be a page on one of those sites, you've passed.
