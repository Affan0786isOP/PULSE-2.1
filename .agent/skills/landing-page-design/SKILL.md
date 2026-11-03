---
name: landing-page-design
description: Complete landing page design and section architecture pipeline for building award-winning, conversion-optimized web pages. Combines hero section engineering (viewport typography, focal hierarchy, design direction extraction) with below-the-fold section systems (feature showcases, social proof, pricing matrices, process flows, metrics, CTA banners, footers). Use when creating, redesigning, or refining full landing pages, hero banners, or below-the-fold web sections.
---

# Landing Page Design

Unified architecture for building Awwwards/FWA-tier landing pages and high-impact web sections.

## When to Use & Routing

Evaluate what part of the landing page is being built or redesigned, and consult the appropriate reference file:

1. **Hero Section Development & Extraction**
   - **Scope:** First-screen experience, viewport-scale typography, visual direction from reference images, dominant focal points, and hero layout architectures (Split Editorial, Massive Type, Kinetic Canvas, Card Cloud, Minimal Monolith, Asymmetric Grid).
   - **Reference File:** Read [hero.md](references/hero.md) for full blueprints, CSS rules, and quality gates.

2. **Below-The-Fold Sections & Full-Page Choreography**
   - **Scope:** Feature showcases, social proof & testimonials, pricing comparison tables, process/how-it-works flows, case study carousels, stat counters, visual break sections, and conversion CTA footers.
   - **Reference File:** Read [sections.md](references/sections.md) for architectural blueprints, rhythm rules, and section transition diffs.

3. **Full Landing Page Projects**
   - Start with [hero.md](references/hero.md) to establish typography scale, color tokens, and focal points.
   - Proceed sequentially with [sections.md](references/sections.md) to build subsequent sections following the page-level rhythm and pacing guidelines.

## Core Universal Invariants
- **No AI Slop / Generic Grids:** Avoid standard 3-card equal-height grids with centered icon + bold heading + paragraph. Every section must have clear information asymmetry and intentional whitespace.
- **Strict Color Control:** Maximum 1 primary brand color, 1 neutral dark, 1 neutral light, and 1 sharp accent. No arbitrary purple/cyan gradient soup.
- **Viewport Typography:** Hero headings use viewport-relative units (clamp(...)) to ensure monumental scale without overflowing.
- **Content Precedence:** Real content structure dictates layout, never generic placeholder boilerplate.
