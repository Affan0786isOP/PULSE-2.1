# Panel Surgery & Logo Originality Gates (Phase 6 & 7)

## Phase 6: Panel Surgery

After the Visual Diff, some boards will have 4-5 excellent panels and 1-2 weak ones. Instead of regenerating the entire board (which risks losing the good panels), use **Panel Surgery** - regenerate individual panels as standalone cards and composite them into the final board.

### → When to trigger Panel Surgery

Panel Surgery activates when:
- The Visual Diff identifies 1-2 specific panel failures while the majority of panels pass
- A panel's content clashes with the overall aesthetic (e.g., a random oil painting in a digital-modern board)
- A panel's visual weight or density is significantly off from its neighbors
- The user explicitly identifies specific panels they dislike while approving the rest

Do NOT use Panel Surgery when:
- More than 3 panels fail the Visual Diff (regenerate the entire board instead)
- The logo mark is the problem (that's Phase 7's job)
- The overall aesthetic direction is wrong (go back to Phase 0 or Phase 2)

### → Step 1: Diagnose the Weak Panel

For each weak panel, identify the specific failure:

| Failure Type | Example | Fix Strategy |
|---|---|---|
| **Medium Clash** | An oil painting of clouds in a digital-modern board | Replace with content that matches the board's medium (e.g., typography specimen, architectural diagram, software UI) |
| **Color Clash** | A panel introduces earthy beige tones in an electric chromatic board | Regenerate with the board's exact palette hex values |
| **Visual Weight Mismatch** | A nearly empty panel next to dense, saturated panels | Add structured content (swatches, type specimen, UI elements) to balance density |
| **Content Irrelevance** | A panel shows generic stock-energy imagery unconnected to the brand | Replace with brand-specific content (product UI, construction grid, application mockup) |
| **Filler Energy** | A panel exists to fill the grid but adds no new information | Either remove the panel (reduce grid size) or assign it a specific functional role |

### → Step 2: Write the Single-Panel Prompt

Generate the replacement panel as a **standalone card image** using a prompt that:

1. **References the existing board** - attach the current board as context so the AI matches the aesthetic
2. **Specifies the exact panel role** - what this card should show (e.g., "Typography & Color Token Specimen")
3. **Locks the palette** - include exact hex values from the board's color system
4. **Matches the surface treatment** - specify the same texture, grain, and card structure as the rest of the board
5. **Sets the aspect ratio** - match the panel's proportions in the grid (usually 4:3 for a single panel)

### → Single-Panel Prompt Template

```
REFERENCE INSTRUCTION - PANEL REPLACEMENT:
Use the attached brand board image as a reference for the exact surface treatment, color palette, typography style, and card structure. This replacement panel must look like it was always part of the board.

Create a single high-resolution [PANEL ROLE] card on [SURFACE DESCRIPTION - e.g., "crisp off-white paper (#F4F4F6) with subtle print registration marks"].

Include:
- [SPECIFIC CONTENT 1 - e.g., "Large editorial serif specimen showing 'Aa Bb Cc' and the brand wordmark"]
- [SPECIFIC CONTENT 2 - e.g., "Four rectangular color swatches: Tangerine (#FF521B), Cobalt (#3D4AE0), Fuchsia (#E8206A), Obsidian (#111111)"]

Visual style: [MATCH THE BOARD'S STYLE - e.g., "Swiss-modernist editorial layout, zero 3D elements, pure typographic precision"]. Aspect ratio: [PANEL ASPECT RATIO].
```

### → Step 3: Composite in Figma (or equivalent)

After generating the replacement panel:

1. Import the original board into Figma (or Photoshop, Sketch, etc.)
2. Place the replacement panel over the weak panel, aligning edges to the grid
3. Adjust sizing if needed to match the grid cell dimensions
4. Export the final composite at full resolution

This manual compositing step is expected and normal - even professional studios composite final presentation decks from separately generated assets.

### ✓ Quality Gate: Panel Surgery

Before finalizing:
- Replacement panel matches the board's surface treatment and texture
- Replacement panel's color palette is identical to the board's palette (no rogue colors)
- Replacement panel's typography style matches the board's type hierarchy
- Replacement panel adds functional value (not filler)
- The composite reads as a single cohesive board with no visible seams

---

## Phase 7: Logo Originality Gate

When a reference image was provided in Phase 0, the generated logo mark will default to cloning the reference's symbol. This is the hardest problem in reference-based brand kit generation. Phase 7 is a mandatory post-generation audit that catches clones.

### → When to trigger the Logo Originality Gate

This phase is MANDATORY when:
- A reference image was provided in Phase 0
- The reference image contained a visible logo mark or symbol

Skip this phase when:
- No reference image was used
- The user is in Asset mode (they provided their OWN logo to preserve)

### → Step 1: Geometry-Difference Audit

Describe both marks in one sentence each:

| Mark | One-Sentence Geometry Description |
|---|---|
| **Reference mark** | e.g., "Eight overlapping diamond petals arranged radially to form a symmetrical flower blossom with a hollow center" |
| **Generated mark** | e.g., "???" |

Now run the **vocabulary overlap test:**

1. List the primary shape words from the reference description (e.g., "petals", "flower", "radial", "blossom", "hollow center")
2. List the primary shape words from the generated description
3. If **3 or more shape words match**, the generated mark is a clone → **FAIL**
4. If **2 or fewer shape words match**, the generated mark is sufficiently distinct → **PASS**

### → Step 2: Visual Similarity Check

Beyond geometry, check for these cloning signals:

| Signal | Clone Indicator |
|---|---|
| **Symmetry type** | Same symmetry (e.g., both 8-fold radial) → likely clone |
| **Shape count** | Same number of sub-shapes (e.g., both have 8 petals) → likely clone |
| **Negative space** | Same negative-space structure (e.g., both have a hollow center eye) → likely clone |
| **Rendering style** | Mark shown in the same style as reference (e.g., both use halftone stencil, both use chromatic gradient fill) → acceptable if geometry differs |

### → Step 3: Force Divergence (if clone detected)

If the generated mark fails the audit, do NOT try to "tweak" the mark - the AI will produce a minor variant that is still recognizably the same symbol. Instead:

1. **Choose a completely different logo method** from Phase 2 (e.g., if reference used Construction Geometry, switch to Negative Space Letterform or Monogram + Meaning)
2. **Choose a different primary shape vocabulary** (e.g., if reference used radial petals, use angular prisms or stacked bars)
3. **Explicitly ban the reference geometry in the prompt** - add to the REFERENCE INSTRUCTION block: `"The logo mark must NOT use [reference shape vocabulary]. Use [your chosen alternative] instead."`
4. **Regenerate the entire board** with the new logo (do not try to swap just the logo - it must thread through all panels consistently)

### → The Nuclear Option: User-Designed Logo

If after 2 regeneration attempts the logo still clones the reference, recommend the user:
1. Design their own logo mark externally (in Figma, Illustrator, or by hand)
2. Export as PNG at 1024px+
3. Switch to **Asset mode** (§ Reference Usage Protocol → Mode: Asset) and rebuild the board around their custom mark

This is not a failure of the skill - it is an honest acknowledgment that generating a truly original, memorable logo mark that rivals a reference image's symbol is the hardest unsolved problem in AI image generation.

### ✓ Quality Gate: Logo Originality

Before finalizing the board:
- Geometry-difference audit has been run (if reference provided)
- Generated mark uses different primary shape vocabulary than the reference
- Generated mark uses a different logo method than the reference
- If the mark failed the audit, the prompt was corrected and the board was regenerated
- The final mark is sufficiently distinct that a designer familiar with the reference would NOT identify it as a derivative

---
