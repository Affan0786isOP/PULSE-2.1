---
name: emil-design-eng
description: This skill encodes Emil Kowalski's philosophy on UI polish, component design, animation decisions, and the invisible details that make software feel great.
---

# Design Engineering

Emil Kowalski's philosophy on UI polish, component craft, spring motion, and micro-details.

## When to Use & Routing

Load specialized reference files based on the engineering challenge:

1. **Animation Decision Framework & Spring Physics**
   - Purpose evaluation, spring configs (bounce vs duration), interruptibility, and perceived speed.
   - **Reference File:** Read [animation-framework.md](references/animation-framework.md).

2. **Component Craft & Micro-Interactions**
   - Responsive buttons, origin-aware popovers, tooltip delay skipping, `@starting-style`, and blur masking.
   - **Reference File:** Read [component-patterns.md](references/component-patterns.md).

3. **CSS Transforms, Clip-Path & Gestures**
   - Percentage `translateY`, 3D depth transforms, interactive clip-path tabs, drag momentum, and boundary friction.
   - **Reference File:** Read [css-transforms-and-clip-path.md](references/css-transforms-and-clip-path.md).

4. **Performance Rules & Craft Checklist**
   - Composite-only rules, CSS variable recalculation caveats, asymmetric enter/exit timing, and the final review checklist.
   - **Reference File:** Read [performance-and-checklist.md](references/performance-and-checklist.md).

## Core Universal Invariants
1. **Unseen Details Compound:** High craft comes from the accumulation of micro-details that users feel rather than consciously see.
2. **Never Scale From 0:** Animate entry scale from `0.9` or `0.95`, never `0` (which looks cartoonish and unnatural).
3. **Origin-Aware Popovers:** Menu and popover origins must match their trigger button position.
4. **Composite-Only Operations:** Animate only `transform` and `opacity`.
