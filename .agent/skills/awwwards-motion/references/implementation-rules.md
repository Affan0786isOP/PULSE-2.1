# Framework-Agnostic Motion Building Rules

## Phase 3: Build the Motion (Framework-Agnostic Rules)

Implement layer by layer. Each layer builds on the previous one. Do not skip layers. **Never output massive boilerplate code blocks.** Instead, apply the following constraints when generating the actual code:

### Physical Correctness Rules

These apply to EVERY animation regardless of layer. Violations are automatic quality gate failures.

| Rule | Specification | Why |
|---|---|---|
| **Never `scale(0)`** | Start from `scale(0.9)` minimum, paired with `opacity: 0`. Range: `0.9-0.97` for UI, `0.95-0.97` for subtle entries. | Nothing in the physical world appears from absolute nothingness. `scale(0)` reads as a rendering glitch, not an entrance. |
| **Origin-aware transforms** | Popovers, tooltips, and dropdowns set `transform-origin` to the trigger element's position. **Modals are exempt** - modals stay `transform-origin: center` because they are viewport-anchored, not trigger-anchored. | Elements that grow from their source point create a spatial story. Elements that grow from their own center feel disconnected from the action that summoned them. |
| **Universal press feedback** | Every pressable element: `:active { transform: scale(0.97); transition: transform 160ms var(--ease-snap) }`. Subtle range: `0.95-0.98`. | A button that visually compresses on press confirms the interface registered the action. Missing press feedback makes the UI feel unresponsive regardless of actual latency. |
| **Ban `transition: all`** | Always specify exact properties: `transition: transform 200ms var(--ease-out), opacity 200ms var(--ease-out)`. | `transition: all` animates every property that changes - including `background-color`, `box-shadow`, `border` - causing off-GPU paint operations and visual artifacts. |
| **Asymmetric timing** | Deliberate user actions (press, hold, destructive confirm) = slow. System response (release, dismiss, confirm) = fast. Example: hold-to-delete overlay fills over `2s linear` on press, snaps back in `200ms var(--ease-out)` on release. | Slow where the user is deciding gives them control. Fast where the system responds gives them confidence. Symmetric timing feels mechanical. |

---

### Layer 1: Entry Animations (Page Load)
Every above-the-fold element needs a choreographed entrance.
- **Constraint:** Use staggered entry animations based on visual hierarchy (Containers → Headings → Subtext → CTAs → Decorators).
- **CSS:** Use `@keyframes` with `transform: translateY(24px)` and `filter: blur(6px)` to `0`, applying `--ease-out`. Stagger via `animation-delay`.
- **Framer Motion:** Use `staggerChildren: 0.12`. Children should fade-up and deblur.
- **GSAP:** Use `gsap.timeline()` with `.from()` tweens. Set `ease: "power3.out"`. Overlap tweens with `-=0.5`.

### Layer 2: Scroll-Triggered Reveals
Elements below the fold reveal as the user scrolls them into view.
- **Constraint:** Do not use scroll-jacking (preventing default scroll). Use scroll-linked (scrub) or threshold-triggered reveals.
- **Vanilla JS:** Use `IntersectionObserver` with a threshold of `0.15` and `rootMargin: "-50px"`. Unobserve after first trigger to prevent janky re-animation. Add an `is-visible` class that triggers CSS transitions.
- **GSAP:** Use `ScrollTrigger`. For sticky narrative sections, use `pin: true` and `scrub: 1` to link animation progress directly to scroll position.

### Layer 3: Interruptibility Rules

Animations that can be re-triggered before completing (toasts stacking, toggles, accordion spam, rapid hovers) MUST handle interruption gracefully. An animation that restarts from zero on re-trigger creates visual stutter.

| Mechanism | Behavior on interrupt | Use when |
|---|---|---|
| **CSS transitions** | Retargets from current value - smooth mid-flight reversal | Hovers, toggles, accordion expand/collapse, any rapidly-triggered state change |
| **CSS `@keyframes`** | Restarts from frame 0 - causes jump | One-shot reveals that fire once (scroll reveals with `unobserve`), ambient loops |
| **CSS `@starting-style`** | Defines entry state without JS - browser transitions from starting values on first render | Element entry animations without `useEffect` hacks. Modern replacement for `data-mounted` patterns |
| **WAAPI (`element.animate()`)** | JS control with CSS-thread performance. Hardware-accelerated, interruptible, zero library overhead | Programmatic sequences where you need JS timing control but CSS performance |
| **Springs (Framer Motion / GSAP)** | Carries velocity through interruption - the gold standard | Gesture-driven motion, drag interactions, anything a user can grab mid-flight |

**The 500ms rule:** If a user can trigger the same animation twice within 500ms (rapid clicking, hover flicking, toast spam), it MUST use CSS transitions or springs. Keyframes will stutter.

### Layer 8: State Transitions
Smooth transitions between UI states (modals, accordions, tabs).
- **Modals:** Use the native `<dialog>` element. Fade the `::backdrop` and scale/translate the dialog itself to create a 2-layer lifting effect. Modal scales from `scale(0.95)` + `opacity: 0`, never `scale(0)`. `transform-origin: center` (modals are viewport-anchored).
- **Accordions:** Use CSS Grid `grid-template-rows: 0fr` to `1fr` for smooth height animations without JS calculations.
- **Tabs:** Do not just crossfade active states. Use a sliding indicator (absolute positioned line) that `transform: translateX` to the active tab's coordinates for a physical connection.
- **Crossfade polish:** When two states visibly overlap during a crossfade (old content and new content both partially visible), add `filter: blur(2px)` during the mid-transition to blend them into one perceived transformation. Keep blur under `16px` - heavy blur is GPU-expensive, especially in Safari.

### Layer 8.5: Gesture & Drag Physics
For any draggable, swipeable, or dismissable surface (drawers, sheets, toasts, cards, carousels):

| Principle | Implementation |
|---|---|
| **Velocity-based dismissal** | Do not require dragging past a fixed distance threshold. Compute velocity: `Math.abs(dragDistance) / elapsedMs`. If `> 0.11`, dismiss regardless of distance. A quick flick is enough. |
| **Momentum projection** | On release, project the resting position using exponential decay: `projectedEnd = current + (velocity / 1000) * decayRate / (1 - decayRate)` where `decayRate ≈ 0.998`. Snap to the nearest target from the projected point, not the release point. |
| **Rubber-banding at boundaries** | When dragging past a natural edge (e.g., pulling a drawer above its max height), apply progressive resistance: `rubberband(overshoot, dimension, 0.55) = (overshoot * dimension * 0.55) / (dimension + 0.55 * abs(overshoot))`. Never hard-stop - the element should slow continuously like a physical object. |
| **Pointer capture** | Call `element.setPointerCapture(e.pointerId)` on drag start. This ensures tracking continues even when the pointer leaves the element's bounds. |
| **Multi-touch protection** | Once a drag begins, ignore additional touch points: `if (isDragging) return`. Switching fingers mid-drag without this causes the element to jump to the new position. |
| **Velocity handoff** | When the gesture ends and the spring animation begins, pass the finger's release velocity as the spring's initial velocity. There must be zero visual seam between the drag phase and the settle animation. |

### Layer 9: Loading and Preloader Sequences
- **Constraint:** Keep preloaders minimal. A simple expanding line (scaleX) with a numeric counter is more premium than a spinning circle.
- **Timing:** Never enforce artificial minimum load times over 2.5s. When resources (`document.fonts.ready`, images) are loaded, wipe the preloader away (e.g., via `clip-path`) and immediately trigger the Layer 1 Hero Entry.

### Layer 10: Signature Micro-Animations
Select exactly **1 to 3** of these per page. Restraint is what makes them signature - if everything is special, nothing is. Apply them only to the ONE element that deserves maximum attention (the hero heading, OR the primary CTA, OR the featured visual - not all three). The rest of the page uses the standard reveal vocabulary. This contrast is what makes the signature moment land.
1. **Text Scramble / Decode:** For hero headings or numbers. Cycle through random characters (`!<>-_\\/[]{}-=+*^?#_`) before locking into the real text.
2. **Border Draw:** Instead of fading a border, use pseudo-elements scaling from `0` to `1` on `scaleX`/`scaleY` with staggered delays to look like a pen tracing the edge.
3. **Ripple Click:** On primary buttons, spawn a radial-gradient circle exactly at `e.clientX / e.clientY` (cursor position) and scale it up to `4x` while fading opacity to `0`.
4. **Shimmer Loading:** For async data. Use a linear-gradient angled at `-20deg` moving from `200%` to `-200%` `background-position`.
5. **Morphing Blob Background:** For hero depth. Use an absolute positioned element with an 8-value `border-radius` (e.g., `60% 40% 30% 70% / 60% 30% 70% 40%`) animated over ~8 seconds.
6. **Tilt Parallax Cards:** On hover, track mouse position and apply slight `translate(x,y)` shifts to internal layers based on a `data-depth` multiplier to create a 3D diorama effect.
7. **Tooltip Float-Up:** Add a 100ms hover delay before floating tooltips up from below. Prevents accidental flashes when cursor passes by. **Skip-delay rule:** Once any tooltip in a group is already open, subsequent tooltips in the same toolbar/group open instantly with zero delay and zero animation. This makes the entire toolbar feel fast.
8. **Magnetic Cursor Elements:** Interactive elements that subtly pull toward the cursor when it enters their proximity zone (~40px). Use spring interpolation on the offset - direct mouse tracking feels robotic, spring-interpolated tracking feels alive.
8. **Gradient Border:** Use a `conic-gradient` with `@property --gradient-angle` animated linearly over 3 seconds to create a living, spinning edge.
9. **Cursor Trail:** If requested, use a small dot tracking exactly to the cursor, and a larger hollow circle that follows with a slight lerp (delay) for an elastic feel. Hide on touch devices.
10. **Clip-Path Reveals:** For major section transitions, reveal the next section by expanding a circle `clip-path: circle(0% at 50% 50%)` to `150%`.
