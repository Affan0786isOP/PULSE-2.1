---
name: apple-design
description: Apple's approach to interface design and fluid, physical motion, translated for the web. Use when building or reviewing gesture-driven UI, spring animations, drag/swipe/sheet interactions, momentum and interruptible transitions, translucent materials and depth, typography (optical sizing, tracking, leading), reduced-motion, or the design foundations (feedback, spatial consistency, restraint) behind Apple-style interfaces.
---

# Apple Design

Unified architecture for building fluid, Apple-style interfaces, tactile gestures, and physical spring animations on the web.

## When to Use & Routing

Evaluate what aspect of Apple-grade interface design is needed:

1. **Quick Reference & Formula Sheet (Immediate Values)**
   - Spring configs, damping/response pairs, velocity handoff formulas, momentum projection math, type tracking scales, and blur tokens.
   - **Reference File:** Read [quick-reference.md](references/quick-reference.md).

2. **Full Interaction & Motion Engineering Principles**
   - In-depth procedures for response latency, 1:1 direct manipulation, interruptibility, spring behavior, velocity handoffs, momentum projection, rubber-banding, frame-level smoothness, materials/depth, and typography.
   - **Reference File:** Read [principles.md](references/principles.md).

## Core Universal Invariants
1. **Kill Latency:** Response starts within 16ms of pointer-down. Give visual feedback immediately on touch/click.
2. **Behavior Over Animation:** Use physical springs instead of fixed-duration cubic-bezier curves for interactive UI.
3. **Interruptibility:** Running animations must start from the current on-screen value and absorb release velocity.
4. **Velocity Handoff:** Hand off pointer release velocity into the spring transition: `relativeVelocity = gestureVelocity / (target - current)`.
5. **Momentum Projection:** Project momentum to determine snap endpoints rather than snapping from the release position.
6. **Rubber-Banding:** Never hard-stop at boundaries; provide progressive resistance.
