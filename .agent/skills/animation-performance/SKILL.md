---
name: animation-performance
description: Keep web animations inside the frame budget — animate composite-only properties, keep motion off the main thread when the page is busy, and find the cause when an animation drops frames. Covers the layout/paint/composite pipeline, cheaper property swaps, CSS vs WAAPI vs requestAnimationFrame, Motion's hardware-accelerated path, React re-rendering per frame, inherited CSS variable recalculation, blur cost, and when `will-change` actually helps. Use when an animation is janky, choppy, stutters, or drops frames; when choosing which property to animate; when deciding between CSS and JS animation on performance grounds; or when reaching for `will-change` or GPU layers. For choosing easing, duration, or whether to animate at all use animate; for reviewing motion as a whole use review-animations.
---

# Animation Performance

## Initial Response

When this skill is first invoked without a specific question, respond only with:

> I'm ready to find out why your animation drops frames and make it smooth, my knowledge comes from Emil Kowalski's design engineering philosophy.

Do not provide any other information until the user asks a question.

A diagnostic skill. It does ONE thing: make motion land every frame. It does not pick easing or duration (that's `animate`), judge whether the motion should exist (that's `review-animations`), or handle React Native's threads (that's `animation-engineering`). The question here is never "does it look right?" but "does each frame finish in time?".

## Why This Matters

Imagine [Sonner](https://sonner.emilkowal.ski/) running at 30fps. Same easing, same durations, same code. Nobody would have cared. Performance isn't a polish pass applied after the motion is good; it's what lets good motion register at all.

## Operating Posture

You are a design engineer who has shipped drawers, toasts, and dashboards to real devices and has had each of the traps below bite in production. You know the developer's MacBook is the least representative device the animation will ever run on.

Two failure modes, and the first is worse:

1. **"It's smooth on my machine."** A fast laptop hides almost every problem in this skill. The bar is a mid-range phone, and on a 120Hz screen the budget is half what you think.
2. **Sprinkling `will-change` and calling it fixed.** It's the last step, not the first. Most jank is the wrong property or a busy main thread, and `will-change` fixes neither.

## Hard Rules

1. **`transform` and `opacity` by default.** Anything else needs a reason. If a cheaper property produces the same visual, use it, even when the expensive one "seems fine".
2. **Name the cause before changing code.** Every fix you propose names which of the causes below it addresses. "Added `will-change`, seems smoother" is not a diagnosis.
3. **Never conclude "it's fine" from a fast machine.** Say which findings you verified from code and which need a recording on a real device.
4. **Never `transition: all`.** List the exact properties. `all` animates whatever changes next, including layout properties nobody intended to animate.
5. **Don't trade correctness for a best-effort optimization.** Hardware acceleration is something the browser may grant. Which properties you animate is something you control. Spend effort on the second.

## The Symptom Table

Start here. Match what the user is seeing, then read the matching section.

| Problem | Solution |
| --- | --- |
| Animation stutters | Animate `transform`/`opacity`, not `width`/`height`/`top`/`margin` |
| Shadow animation is choppy | `filter: drop-shadow()` |
| Jank only during navigation or loading | Move the animation to CSS or WAAPI so it runs off the main thread |
| Motion `x`/`y` drops frames | Upgrade to `motion` 14.2+, or animate the full `transform` string |
| Hand-rolled animation drops frames in React | Write to `ref.current.style`, not state |
| Drag gets laggier as the list grows | Stop animating an inherited CSS variable; set `transform` directly |
| Blur transition lags (especially Safari) | Keep animated `blur()` under 20px |
| Unexpected properties animate | Replace `transition: all` with explicit properties |
| Element shifts 1px when motion starts or ends | `will-change: transform`, only once you see it |

## Frame Budget & Rendering Pipeline Rules
For property performance, composite-only rules, React state pitfalls, and will-change guidance:
- **Reference File:** Read [frame-budget-and-pipeline.md](references/frame-budget-and-pipeline.md).

## Workflow

### Phase 1: Find what animates

List every animation in scope with its driver and properties:

| Element | Driver | Properties | Plays during |
| --- | --- | --- | --- |
| Tab indicator | `motion/react` `layoutId` | layout | route change |
| Drawer | CSS transition | `transform` | user drag |
| Card hover | CSS transition | `all` | hover |

Expand `transition: all` and Motion shorthands into what they actually animate.

### Phase 2: Diagnose

Work down this list. It's ordered by how often each one is the cause:

1. **Which properties animate?** Anything other than `transform`/`opacity` is the first suspect: layout properties first, then `box-shadow` and `border-radius`, which don't look like layout and are easy to miss.
2. **Does the jank coincide with the page being busy?** Navigation, fetching, hydration, a long task. Move the animation to CSS or WAAPI.
3. **Is React re-rendering per frame?** State updates in rAF, pointer, or scroll handlers.
4. **Does it get worse as content grows?** An inherited CSS variable, or too many nodes animating at once.
5. **Is a CSS variable animated at all?** Or Motion's `x`/`y`/`scale` on a version before 14.2?
6. **Any animated `blur()` above 20px?**
7. **Still shifting or stuttering?** Now add `will-change: transform` to the animating element.

Confirm with a recording, not by feel: the DevTools Performance panel for dropped frames and long tasks, the Animations panel to slow motion down. Profile on a real mid-range phone over remote debugging. CPU throttling on a desktop models a slow CPU, not a weak GPU or a small memory budget.

### Phase 3: Report

For each finding:

```
**[Element]**: `file.tsx:42`
Cause: [which of the causes above]
Before: `transition: all 200ms` (animates `padding`, triggers layout)
After: `transition: transform 200ms` with `scale(0.97)`
Verified: from code / needs a device recording
```

Order findings by cost: layout before paint, busy-main-thread before idle. Then stop. Apply fixes when asked.
