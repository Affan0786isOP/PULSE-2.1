---
name: awwwards-motion-design
description: Motion design pipeline for building Awwwards/Apple-tier animations, micro-interactions, scroll sequences, page transitions, and kinetic typography. Enforces the principles that separate award-winning motion from generic CSS transitions - intentional easing, scroll-linked choreography, staggered reveals, magnetic interactions, text splitting, parallax depth, morphing state transitions, and the invisible micro-animations that make interfaces feel alive. Every animation must justify its existence, respect reduced-motion, and run at 60fps. Motion is choreography, not decoration.
---

# Awwwards-Tier Motion Design

Production pipeline for award-winning choreography, kinetic typography, scroll sequences, and signature micro-interactions.

## When to Use & Phase Routing

Evaluate which motion design phase is active and load references on demand:

1. **Easing Palettes, Spring Tiers & Timing Calculations (Phase 2)**
   - Spring-based easing via CSS `linear()` (Apple snappy/smooth springs), cubic-bezier curves, timing sheets, and stagger choreography.
   - **Reference File:** Read [choreography.md](references/choreography.md).

2. **Framework-Agnostic Implementation Rules (Phase 3)**
   - Physical correctness rules, page load entry animations, scroll reveals, interruptibility, state transitions, gesture/drag physics, and preloaders.
   - **Reference File:** Read [implementation-rules.md](references/implementation-rules.md).

3. **Motion Verification & Anti-Pattern Auditing (Phase 4)**
   - 7-point motion diff (coverage, feel, easing, performance, accessibility, technical, composition) and hard anti-patterns (Franken-motion, layout animations, hover discos).
   - **Reference File:** Read [motion-diff-and-anti-patterns.md](references/motion-diff-and-anti-patterns.md).

## Core Universal Invariants
1. **Motion Justification:** Every animation must guide focus, express hierarchy, or confirm action. No decorative filler.
2. **Composite-Only Properties:** Only animate `transform` and `opacity`. Never animate layout properties (`width`, `height`, `top`, `margin`).
3. **Respect Reduced Motion:** Always provide `@media (prefers-reduced-motion: reduce)` fallbacks (instant opacity transitions).
4. **Target 60fps Frame Budget:** Keep animations off the main thread where possible; use WAAPI or GPU-accelerated transforms.
