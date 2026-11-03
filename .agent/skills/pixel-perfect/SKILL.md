---
name: pixel-perfect-replication
description: Image-to-code replication pipeline. When the user provides a screenshot or design reference, this skill runs a structured extraction across seven layers (grid, type, color, spacing, components, atmosphere, interaction), builds an Extraction Sheet before any code is written, implements with exact fidelity to the reference, and verifies through inline Quality Gates and a final Visual Diff. The reference image is the spec. The code is a translation, not an interpretation.
---

# Pixel-Perfect Design Replication

Exact image-to-code implementation pipeline utilizing structured 7-layer design token extraction.

## When to Use & Phase Routing

Follow the structured replication pipeline and load references on demand:

1. **7-Layer Deep Extraction (Phase 2)**
   - Extract grid layout, typography styles, exact color hexes, spacing scale, component inventory, atmosphere (shadows, blur), and interaction states into the Extraction Sheet.
   - **Reference File:** Read [deep-extraction.md](references/deep-extraction.md).

2. **Step-by-Step Build Execution (Phase 3)**
   - Sequential build passes: Foundation tokens -> Skeleton layout -> Typography -> Components -> Atmosphere -> Responsive -> Interactions.
   - **Reference File:** Read [build-execution.md](references/build-execution.md).

3. **Visual Diff & Asset Classification (Phase 4)**
   - Side-by-side verification gates, font matching fallbacks, low-resolution handling, and photo/texture asset reproduction.
   - **Reference File:** Read [visual-diff-and-assets.md](references/visual-diff-and-assets.md).

## Core Universal Invariants
1. **Extraction Before Code:** Always compile the 7-layer Extraction Sheet before writing HTML/CSS.
2. **Translation, Not Interpretation:** Treat the reference screenshot as an absolute specification. Do not improvise unrequested stylistic changes.
3. **Visual Diff Gate:** Compare rendered browser screenshots against the target reference to confirm exact alignment.
