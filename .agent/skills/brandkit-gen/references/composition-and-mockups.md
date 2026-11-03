# Panel Composition & Mockup Blueprints (Phase 3 & 4)

## Phase 3: Panel Composition

Each panel in the grid gets a specific role, a composition anchor, and an energy level. The board must have rhythm - not every panel can be loud, and not every panel can be quiet.

### → The Argument Structure

A brand board is a visual argument. Each panel plays a role in that argument. The roles are not content types ("color panel," "type panel"). They are rhetorical positions. What matters is what each panel PROVES, not what content category it belongs to.

Five roles. Every board must include all five. Some roles can appear in multiple panels.

| Role | What it proves | Panel count |
|---|---|---|
| **Anchor** | This is the brand. The mark, the name, the core visual identity at rest. Maximum restraint, maximum negative space | Exactly 1 |
| **Proof** | The brand works on real surfaces. Digital screens, physical objects, environmental contexts. Not theoretical - applied | 2-3 panels |
| **System** | The brand is governed by rules. Color relationships, type hierarchy, spacing logic, component vocabulary. The rules are visible | 1-2 panels |
| **World** | The brand has atmosphere. Photography, texture, material, cinematic mood. The brand exists in a place, not just on a screen | Exactly 1 |
| **Signal** | The brand communicates. A tagline, a command, a URL, a statement. One piece of language that captures the brand's voice | Exactly 1 |

### → Default Panel Systems

#### 3 × 3 Board: Full Identity System

```
┌─────────────────┬─────────────────┬─────────────────┐
│                 │                 │                 │
│     ANCHOR      │     SYSTEM      │      PROOF      │
│   (the mark)    │  (how it's      │  (where it      │
│                 │    built)       │    lives)       │
├─────────────────┼─────────────────┼─────────────────┤
│                 │                 │                 │
│     SIGNAL      │      SYSTEM     │      PROOF      │
│  (the voice)    │  (the rules)    │  (another       │
│                 │                 │    surface)     │
├─────────────────┼─────────────────┼─────────────────┤
│                 │                 │                 │
│      PROOF      │      WORLD      │      SYSTEM     │
│  (one more      │  (the mood)     │  (the details)  │
│    surface)     │                 │                 │
└─────────────────┴─────────────────┴─────────────────┘
```

Default panel content mapping:

1. **Logo Cover** - Large logo and wordmark, minimal title, strong negative space
2. **Logo Construction** - Symbol breakdown, grid, geometry, or negative-space logic
3. **Digital Application** - Browser chrome, app header, terminal, dashboard fragment, or app icon
4. **Brand Essence** - One short tagline, large readable typography, sparse composition
5. **Color System** - Swatches, gradient strips, color discs, material chips, or palette cards
6. **Typography** - Large type specimen, alphabet row, or primary/secondary type pairing
7. **Physical Application** - Card, folder, badge, poster, label, seal, packaging, or object mockup
8. **Image Direction** - Cinematic landscape, product crop, halftone poster, editorial scene, material texture
9. **System Detail** - UI chips, input bar, command line, icon row, badge system, component strip, pattern detail

#### 2 × 3 Board: Compressed Argument

```
┌─────────────────┬─────────────────┐
│     ANCHOR      │      PROOF      │
├─────────────────┼─────────────────┤
│     SYSTEM      │      WORLD      │
├─────────────────┼─────────────────┤
│     SIGNAL      │      PROOF      │
└─────────────────┴─────────────────┘
```

Same 5 roles, fewer panels. Each panel carries more weight. The Anchor panel must be even more restrained.

### → Panel Rhythm Rules

- Never place two Quiet panels adjacent to each other
- Never place three Technical panels in a row
- The board must contain at least one Emotional panel and one Functional panel
- The Anchor panel is always position 1 (top-left)
- The most atmospheric panel should not be position 1

### → Panel Composition Anchors

Assign one per panel. Across the board, at least 3 different anchors must appear.

| Anchor | Description |
|---|---|
| **Dead center** | Content centered both axes, maximum symmetry, confident restraint |
| **Top-left gravity** | Content anchored top-left, reading-order natural, editorial |
| **Bottom-right detail** | Small element anchored bottom-right, system-detail energy |
| **Offset bleed** | Content deliberately pushed to one edge, bleeds into gutter |
| **Full-fill** | Content fills the entire panel edge to edge (images, color fields) |
| **Stacked vertical** | Elements stacked top-to-bottom with clear vertical hierarchy |

### → Premium Detail Language

Use details like these sparingly to reward closer inspection:
- Small page numbers in panel corners (e.g., "01" bottom-right)
- Tiny footer labels or section markers (e.g., "COLORS" or "TYPEFACE")
- Precise alignment marks or construction lines at low opacity
- Thin rules separating sub-elements within a panel
- Low-opacity texture overlays (grain, halftone, noise)
- One highlighted word in the tagline using the accent color
- Browser chrome with a realistic URL bar and navigation dots
- Rounded rectangle frames for contained images
- Subtle drop shadows between panel layers
- App icon on a realistic phone homescreen with notification badge
- Social media profile card (X/Twitter style) with avatar, handle, bio, and Follow button
- Color system panel with labeled strips and visible hex values
- Perforated metal or material texture framing an image panel
- Device mockup (laptop, phone) on a dark surface showing the brand's website

Do not overuse them. Three to five details across the entire board. Premium detail is discovered, not announced.

### ✓ Quality Gate: Composition

Before moving to Phase 4, confirm:
- Every panel has a role, anchor, and energy level assigned
- Panel rhythm varies (no adjacent duplicates in energy)
- At least 3 different composition anchors appear across panels
- Anchor panel is position 1
- Board contains at least 1 Emotional and 1 Functional panel
- Premium details are planned (3-5, not more)

---

## Phase 4: Prompt Engineering

Build one structured prompt for the complete board using the blueprint below. Fill in every field. Skipping fields produces generic output.

**If Phase 0 produced a REFERENCE INSTRUCTION block**, prepend it at the very top of the prompt BEFORE the blueprint. The REFERENCE INSTRUCTION block anchors the AI model to the reference image's quality bar and aesthetic DNA. The blueprint then fills in the brand-specific content below it.

### → The Prompt Blueprint

```
PROMPT BLUEPRINT - Brand-Kit Board: [BRAND NAME]
──────────────────────────────────────────────────

BRAND STRATEGY:
  Category: [from Phase 1]
  Audience: [from Phase 1]
  Core metaphor: [from Phase 1]
  Emotional promise: [from Phase 1]
  Logo idea: [how the mark combines symbol + name + metaphor]

BOARD FORMAT:
  Layout: [from Phase 2 - e.g., "3×3 grid"]
  Aspect ratio: [4:3 or 16:10]
  Canvas: [from Phase 2 - e.g., "near-black #0a0a0a charcoal field
           with subtle paper texture, strong 12px gutters
           between panels, rounded-lg panel corners"]

VISUAL MODE:
  [from Phase 2 - e.g., "Dark Developer: near-black panels,
   monospace accents, terminal chrome, cyan #00d4aa accent"]

PANEL ASSIGNMENTS:
  Panel 1: [role] - [what to show] - [anchor] - [energy]
  Panel 2: [role] - [what to show] - [anchor] - [energy]
  ...
  Panel N: [role] - [what to show] - [anchor] - [energy]

LOGO:
  Method: [from Phase 2 - e.g., "Monogram + Meaning: the letter K
           is cut diagonally to reveal a kite shape in the
           negative space"]
  Symbol: [from Phase 1 symbol pool]
  Construction: [how the mark is built - e.g., "constructed on a
                 circular grid with 15-degree increments, single
                 continuous stroke, works at 16px"]
  Frozen description: [EXACT geometric sentence - copy this verbatim
                       into every panel assignment where the logo appears.
                       Include shape count, arrangement, and colors.
                       e.g., "exactly two overlapping rounded rectangles
                       rotated 45°, forming a diamond intersection,
                       in white #FFFFFF on dark backgrounds"]
  Variants shown: [wordmark, icon mark, badge, app icon]
  
  GLOBAL CONSISTENCY RULE: The logo mark must appear IDENTICAL in
  every panel where it is shown. Same number of shapes, same
  proportions, same colors, same spatial arrangement. Do not add,
  remove, rotate, or modify any element of the mark between panels.

TYPOGRAPHY:
  Character: [from Phase 2]
  Heading treatment: [e.g., "compressed all-caps display,
                      tight tracking, used for brand name
                      and tagline only"]
  System labels: [e.g., "small monospace, uppercase, wide
                  tracking, 60% opacity, used for panel
                  labels and page numbers"]

PALETTE:
  Structure: [from Phase 2]
  Base: [e.g., "#0a0a0a near-black"]
  Surface: [e.g., "#1a1a1a dark panel fill"]
  Primary text: [e.g., "#f0ede8 warm off-white"]
  Muted text: [e.g., "rgba(240,237,232,0.5)"]
  Accent: [e.g., "#00d4aa teal - used on logo mark,
           CTA elements, and active states"]

TAGLINE:
  Text: [the actual tagline]
  Energy: [from Phase 2]

ATMOSPHERE:
  [e.g., "subtle film grain at 2% opacity across canvas,
   soft ambient glow behind logo cover panel, halftone
   treatment on the image-direction panel, no hard shadows
   between panels - depth comes from surface color
   difference only"]

PREMIUM DETAILS:
  [list the 3-5 planned details - e.g.,
   "page number '01' bottom-right of panel 1,
    construction grid lines at 15% opacity in panel 2,
    realistic URL 'app.brandname.com' in browser chrome,
    one word of tagline highlighted in accent color"]

WHAT THIS IS NOT:
  [explicit anti-patterns - e.g.,
   "NOT a Canva brand board template.
    NOT random icons floating on a gradient.
    NOT an overdesigned logo with 6 colors.
    NOT a collage of unrelated mockups.
    NOT tiny illegible text pretending to be a system.
    NOT a generic startup pitch deck slide."]
```

### → The Jaw-Dropper Executive Prompt (2026 Sleek Format)

For modern 2026 image generation models that thrive on dense, high-signal, executive-level instructions without verbose boilerplate, use this sleek, jaw-dropping prompt template:

```
Create a premium 3×3 visual identity board for [BRAND NAME].

Brand strategy:
- category: [CATEGORY]
- audience: [AUDIENCE]
- personality: [TRAITS]
- emotional promise: [PROMISE]
- core metaphor: [METAPHOR]
- logo idea: [SYMBOL LOGIC + FROZEN GEOMETRY SENTENCE]

Board format: 3×3, 4:3 aspect ratio
Visual mode: [minimal editorial / digital modernist / pixel modernist / institutional trust / product utility / cultural experimental]

Include: logo cover, construction rationale, wordmark system, brand essence, color system, typography, application, imagery direction, system detail.
```

### ✓ Quality Gate: Prompt

Before generating, confirm:
- Complete prompt follows the blueprint structure (no fields skipped)
- WHAT THIS IS NOT section includes at least 4 specific anti-patterns
- Palette is fully specified with hex values
- Logo construction is described specifically (not "a nice logo")
- **Frozen logo description is written and copy-pasted into EVERY panel assignment where the logo appears** (§ Logo Consistency Protocol)
- **Global consistency rule is included at the top of the prompt**
- Panel assignments match Phase 3 composition plan
- Typography character is consistent across all panel descriptions
- Tagline is under 8 words and free of corporate filler

---

## Phase 5: Visual Diff

After generating the board, audit it against the strategy and architecture picks. Walk through every check. Any FAIL means re-generating with a corrected prompt.

### Logo Diff

| Check | PASS/FAIL |
|---|---|
| Logo is simple enough to work as a 16px favicon | |
| Logo connects to the core metaphor from Phase 1 | |
| **Logo is IDENTICAL across every panel** - same number of shapes, same proportions, same arrangement, same colors. Compare the anchor panel mark to EVERY other appearance (mockups, app icon, card, merch). If any element was added, removed, rotated, or resized, this is a FAIL. | |
| Logo uses the concept method committed in Phase 2 | |
| Logo is not a generic lightning bolt, brain icon, or shield without strategic justification | |
| Logo wordmark is legible and the typeface matches the typography character | |
| **Logo does NOT clone the reference image's mark** - different geometric DNA, different shape vocabulary, different construction method. Run the geometry-difference test (§ Reference Usage Protocol) | |
| Logo passes the 3-primitive cap from § Logo Hard Constraints | |
| Logo passes the one-sentence geometry test from § Logo Hard Constraints | |

### Composition Diff

| Check | PASS/FAIL |
|---|---|
| Grid is clean with consistent gutters between all panels | |
| Panel edges are aligned (no random offsets or overlaps) | |
| At least 3 different composition anchors appear across panels | |
| Panel energy rhythm varies (no three adjacent panels at the same energy) | |
| Anchor panel is position 1 (top-left) and has maximum negative space | |
| The board reads as ONE identity, not a collection of unrelated rectangles | |

### Palette Diff

| Check | PASS/FAIL |
|---|---|
| One dominant palette threads through every panel | |
| Accent color appears in at least 3 panels (not just one) | |
| No rogue colors appear that were not in the palette specification | |
| No AI-default purple-blue gradient glow (unless strategy justifies it) | |
| Dark boards use off-black (#0a0a0a range), not pure black (#000000) | |
| Light boards use warm off-white, not pure white (#FFFFFF) | |

### Typography Diff

| Check | PASS/FAIL |
|---|---|
| Text is sparse: brand name, one tagline, one URL, section labels, UI chips only | |
| No tiny illegible paragraphs or fake body copy | |
| Tagline is large enough to read comfortably | |
| Typography character is consistent across all panels (same family, same hierarchy) | |
| Panel labels and page numbers (if present) use a secondary type style | |

### Identity System Diff

| Check | PASS/FAIL |
|---|---|
| The board answers: what does this brand represent? | |
| The board answers: what is the core metaphor? | |
| The board answers: how does the logo express that? | |
| The board answers: how does the system scale across digital, physical, and atmospheric applications? | |
| The board answers: why does the whole thing feel ownable (not interchangeable with any other brand)? | |

---
