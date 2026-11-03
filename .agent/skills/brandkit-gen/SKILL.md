---
name: brandkit-gen
description: Premium brand-kit image generation skill for producing identity-studio-grade brand boards. Fires when the user asks for brand kits, logo concepts, identity systems, brand-system presentations, or brand-guidelines decks. Enforces an 8-phase pipeline - Visual Reference Acquisition (Phase 0), Brand Strategy, Identity Architecture, Panel Composition, Prompt Engineering, Visual Diff, Panel Surgery (Phase 6), Logo Originality Gate (Phase 7) - with quality gates at every phase. Phase 0 asks for a visual reference image and auto-generates a REFERENCE INSTRUCTION block that extracts texture, layout, and color DNA while blocking name/logo/palette cloning. Phase 6 enables single-panel regeneration and Figma compositing when individual panels fail. Phase 7 forces a geometry-difference audit between the generated mark and the reference image's symbol. 14 visual modes (including 4 reference-calibrated modes trained against Polished Snow, Nexus, Lumora, Thesis, and NORI studio work), 6 board layouts (including Mega System for 18-21 panels), logo hard constraints (3-primitive cap, favicon gate, one-sentence geometry rule), 25-point pre-flight checklist, detailed mockup specs (website hero, social media profile, app icon dock, physical products), and aggressive anti-slop protocol. Image generation only. Does not write code.
---

# Brand-Kit Image Generation

Studio-grade identity system and visual brand board generation pipeline.

## When to Use & Phase Routing

Identify the current design phase and load specialized references on demand:

1. **Visual Modes & Identity Architecture (Phase 2)**
   - 14 distinct visual modes (Dark Developer, Luxury Editorial, Calm Tech, Bold Neon), logo concept methods, canvas treatments, and palette structures.
   - **Reference File:** Read [visual-modes.md](references/visual-modes.md).

2. **Panel Composition, Layouts & Mockup Blueprints (Phases 3 & 4)**
   - 3x3 Full System boards, 2x3 compressed layouts, Mega Systems (18-21 panels), device mockups, and prompt engineering templates.
   - **Reference File:** Read [composition-and-mockups.md](references/composition-and-mockups.md).

3. **Panel Surgery & Logo Originality Gates (Phases 6 & 7)**
   - Single-panel repairs, Figma compositing, and geometry-divergence audits to prevent reference image cloning.
   - **Reference File:** Read [surgery-and-originality.md](references/surgery-and-originality.md).

4. **Anti-Slop Protocols, 25-Point Checklist & Examples**
   - Quality control across typography, layouts, palettes, and physical reality.
   - **Reference File:** Read [anti-slop-and-checklists.md](references/anti-slop-and-checklists.md).

## Core Universal Invariants
1. **Never Clone Reference Images:** Extract atmosphere, typography, and palette DNA; never replicate client logos or symbols.
2. **Anti-Slop Restraint:** Strict 3-color discipline maximum. No floating 3D glass or generic purple gradients.
3. **Favicon Legibility:** The core mark must remain completely legible down to 16x16 pixels.
