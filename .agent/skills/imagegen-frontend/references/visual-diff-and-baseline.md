# Visual Diff & Baseline Configuration (Phase 5)

## Phase 5: Visual Diff

Compare the generated images against the Direction Brief from Phase 1 and the Art Direction picks from Phase 2. Walk through every check. Any FAIL means re-generating that section with a corrected prompt.

### Composition Diff

| Check | PASS/FAIL |
|---|---|
| At least 3 different composition anchors appear across all sections | |
| No two adjacent sections use the same anchor | |
| The hero uses the assigned hero architecture (not a generic split) | |
| No section feels "empty" or "packed" - whitespace is intentional | |
| Each section has a clear visual hierarchy (primary → secondary → tertiary) | |
| Reading flow within each section is intuitive (eye knows where to go) | |

### Palette Diff

| Check | PASS/FAIL |
|---|---|
| All sections share the same base palette | |
| Accent color is consistent (same hue) across all sections | |
| No rogue colors appear that were not in the Direction Brief | |
| No AI-default purple/blue gradients unless explicitly chosen | |
| Dark sections use off-black (#0a0a0a), not pure black (#000000) | |
| Light sections use warm cream/off-white, not pure white (#FFFFFF) | |

### Typography Diff

| Check | PASS/FAIL |
|---|---|
| Heading typography feels consistent across all sections (same weight/family vibe) | |
| Heading scale is viewport-dominant (not "big text" - architectural) | |
| No section has headings wrapping beyond 3 lines | |
| Subtext is visually secondary (smaller, muted, constrained width) | |
| No illegible text (everything is readable at the generated resolution) | |
| Eyebrow/label text is present where assigned and visually consistent | |

### Section Purpose Diff

| Check | PASS/FAIL |
|---|---|
| Hero hooks - creates immediate emotional response | |
| Trust bar proves - quiet authority, not competing with hero | |
| Features inform - clear hierarchy, distinct items | |
| Testimonials persuade - human, authentic, editorial | |
| CTA converts - high contrast, unmistakable action | |
| Footer grounds - structured, quiet, anchoring | |
| The page flows as a persuasion sequence, not random sections | |

### AI Default Drift Diff

| Check | PASS/FAIL |
|---|---|
| No purple/blue AI gradient backgrounds (unless palette specifies) | |
| No floating translucent blobs | |
| No generic dashboard card spam | |
| No "luxury = beige serif" cliché | |
| No "creative = messy chaos" cliché | |
| No identical section layouts repeating | |
| No stock photo energy (generic business imagery) | |
| No meta-labels ("SECTION 01", "FEATURE 03") | |
| No em-dashes in copy | |
| No AI copywriting clichés ("Elevate", "Seamless", "Unleash", "Next-Gen", "Revolutionize") | |

### Implementation Readiness Diff

| Check | PASS/FAIL |
|---|---|
| Each image clearly communicates layout structure (a developer could grid this) | |
| Spacing is visible and measurable (not ambiguous overlap) | |
| Component boundaries are clear (cards have edges, sections have gaps) | |
| CTA buttons are clearly delineated (not text that might be a button) | |
| Image areas are distinguishable from background (clear boundaries) | |
| The image could be handed to the pixel-perfect skill and coded accurately | |

---

## Active Baseline Configuration

These are the global default dials. They calibrate the engine's output toward premium, conversion-aware, implementation-friendly design references.

```
DESIGN_VARIANCE:        8   (1=rigid/symmetrical, 10=artsy/asymmetric)
VISUAL_DENSITY:         4   (1=airy/gallery-like, 10=packed/intense)
ART_DIRECTION:          8   (1=safe commercial, 10=bold creative statement)
IMPLEMENTATION_CLARITY: 9   (1=loose moodboard, 10=very codeable UI reference)
IMAGE_USAGE_PRIORITY:   9   (1=mostly typographic, 10=strongly image-led)
SPACING_GENEROSITY:     8   (1=compact/tight, 10=very spacious/breathable)
LAYOUT_VARIATION:       8   (1=same anchor repeats, 10=bold composition variety)
CONVERSION_DISCIPLINE:  8   (1=pure art moodboard, 10=clear funnel + design balance)
```

These are defaults. Adapt dynamically from the brief:
- "Clean" → reduce density, increase spacing generosity
- "Crazy creative" → increase variance and art direction
- "Premium SaaS" → keep clarity high, art direction controlled
- "Editorial" → allow stronger type and more asymmetry
- The user's brief always overrides defaults

---

## The Core Principles

These are the fundamentals that separate premium design references from generic AI images. They apply regardless of which combinatorial picks you make.

> **One focal point per section.** Every section has ONE dominant visual element. Count elements competing for attention at the same scale. If the count exceeds 2, reduce until one clearly dominates.

> **Viewport-scale typography.** Headings are architectural elements, not "big text." They should feel like they command the section. Minimum 60pt equivalent on desktop. For 1-3 word headings, go massive - 100pt+. Tight tracking. Compressed line-height.

> **Extreme whitespace.** The background is not wasted space - it IS the design. Content lives in considered islands surrounded by intentional breathing room. If a section feels cramped, the spacing is wrong.

> **Tight palette, threaded consistently.** Maximum 3 hues across the entire page. Dark pages: off-black + warm white + one accent. Light pages: warm cream + near-black + one accent. The accent appears in CTAs and active states. Everything else is the base palette. More than one saturated accent across a page destroys visual cohesion.

> **Every section has a job.** Hero hooks. Trust bar proves. Features inform. Testimonials persuade. CTA converts. No section exists for decoration. Every section advances the user toward action.

> **The image is the spec.** The generated image must be clear enough that a developer can look at it and code it using the pixel-perfect skill. If the layout, spacing, typography, or component boundaries are ambiguous in the image, it has failed as a reference.
