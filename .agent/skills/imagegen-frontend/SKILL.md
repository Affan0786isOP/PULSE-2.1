---
name: imagegen-frontend-web
description: Elite frontend image-direction skill for generating premium, conversion-aware website design reference images via ChatGPT image generation. Fires when the user asks to generate website mockups, landing page concepts, section design references, or UI comp images. Enforces ONE separate horizontal image PER section, composition variety (bans the default left-text/right-image on every section), background-image freedom, varied CTAs, varied hero scales, narrative concept spine, second-read moments, and a single consistent palette across all images. Outputs structured prompt blueprints that produce Awwwards-tier visual references a developer or coding model can accurately recreate. Image generation only - does not write code.
---

# Elite Frontend Image Art Direction

Directs section-by-section frontend image prompts for web references.

## When to Use & Phase Routing

Identify the art direction phase and load specialized references on demand:

1. **Combinatorial Art Direction Engine (Phase 2)**
   - Theme paradigms, hero architectures (Split Editorial, Massive Type, Minimal Monolith), composition anchors, signature components, and narrative spines.
   - **Reference File:** Read [art-direction-engine.md](references/art-direction-engine.md).

2. **Section Prompt Blueprints & Anti-Patterns (Phases 3 & 4)**
   - Prompt templates for heroes, feature grids, social proof, process flows, pricing cards, and footers. Banned defaults and CTA variations.
   - **Reference File:** Read [prompt-blueprints.md](references/prompt-blueprints.md).

3. **Visual Diff & Quality Auditing (Phase 5)**
   - Side-by-side consistency check across typography, palette harmony, section sequencing, and implementation readiness.
   - **Reference File:** Read [visual-diff-and-baseline.md](references/visual-diff-and-baseline.md).

## Core Universal Invariants
1. **One Horizontal Image Per Section:** Never generate generic full-page mockups that cram entire websites into a single prompt.
2. **Composition Variety:** Strictly ban identical repetitive 50/50 left-text/right-image layouts across consecutive sections.
3. **Shared Palette Spine:** All section prompts in a project must reuse the exact same color hexes and atmosphere rules.
