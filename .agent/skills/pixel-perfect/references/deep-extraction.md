# 7-Layer Deep Extraction Sheet

## Phase 2: Deep Extraction

Run all seven extraction layers on the reference image. Each layer focuses on one dimension of the design. Fill in the Extraction Sheet for each. Skipping a layer causes drift - small errors here compound into "it looks off" in the final build.

---

### Layer 1: Layout Grid

Extract the spatial skeleton.

**Extraction Sheet:**

| Property | Measured value |
|---|---|
| Container max-width | e.g. `1280px`, `1440px` - measure by proportion against viewport edges |
| Column system | e.g. `grid-cols-[1.15fr_1fr]`, `grid-cols-3`, `single column centered` |
| Horizontal padding | e.g. `px-6 md:px-12 lg:px-20` - measure the gap between content edge and viewport edge |
| Section heights | `min-h-[100dvh]` for full-viewport, `auto` for content-driven |
| Section spacing | Vertical gap between sections, e.g. `py-24 lg:py-32` |
| Alignment | Per-section: left / center / right / mixed |
| Z-axis layering | Any overlaps? Elements stacked on top of others? |

**How to measure proportions from images:**
- If the hero heading occupies ~60% of viewport width, on a 1440px target that is roughly `max-w-[54rem]`
- If one column is visually 1.5x wider than the adjacent column, use `grid-cols-[1.5fr_1fr]`
- If empty space above a heading is roughly 2x the heading font size, the padding is approximately `2em` relative to the heading

⚠ **Drift Warning:** The most common layout error is getting the container max-width wrong. A design with `max-w-[1200px]` looks noticeably different from one with `max-w-[1440px]` - the whitespace proportions change completely. Measure carefully.

---

### Layer 2: Typography

This is the most critical extraction. Wrong typography is the #1 reason a replication "looks off."

**Extraction Sheet (fill for EVERY visible text element):**

| Element | Font family | Weight | Size | Line-height | Letter-spacing | Transform | Color |
|---|---|---|---|---|---|---|---|
| Nav links | | | | | | | |
| Eyebrow/label | | | | | | | |
| H1 (hero) | | | | | | | |
| H2 (section) | | | | | | | |
| H3 (card title) | | | | | | | |
| Body text | | | | | | | |
| Caption/meta | | | | | | | |
| CTA text | | | | | | | |
| Footer links | | | | | | | |

**Font identification - what to look for:**

Fonts reveal themselves through specific characters. Study these before guessing:

| Check this character | What it tells you |
|---|---|
| Lowercase `a` | Single-story (Geist, Helvetica) vs double-story (Outfit, Satoshi, DM Sans) |
| Lowercase `g` | Open-tail (most sans-serifs) vs closed-tail (Futura, some geometric) |
| Lowercase `t` | Curved crossbar (humanist: Manrope, Jakarta) vs straight (geometric: Outfit, Satoshi) |
| Capital `R` | Straight leg (Geist, Helvetica) vs curved leg (Outfit, Satoshi) |
| Capital `Q` | Tail style varies dramatically between fonts - strong identifier |
| Lowercase `e` | High crossbar (geometric) vs centered (humanist) |
| Numbers `1, 4, 6, 9` | Highly distinctive shapes across fonts |

**Common web font quick-reference:**

| Visual character | Strong candidates |
|---|---|
| Geometric, double-story `a`, round counters | Outfit, Satoshi, DM Sans, Plus Jakarta Sans |
| Grotesque, single-story `a`, flat terminals | Geist, Suisse Intl, Helvetica Neue |
| Humanist, open counters, calligraphic stress | Manrope, Plus Jakarta Sans, Nunito Sans |
| Condensed, tall x-height | Barlow Condensed, Oswald, Archivo Narrow |
| Modern serif, high contrast, sharp serifs | Playfair Display, Bodoni Moda |
| Transitional serif, moderate contrast | Lora, Merriweather, Source Serif Pro |
| Display sans, wide, heavy | Cabinet Grotesk, Clash Display, Monument Extended |
| Monospace | JetBrains Mono, Fira Code, IBM Plex Mono, Geist Mono, Space Mono |

If you cannot confidently identify the font, state your top 2-3 candidates with the distinguishing character that makes you lean one way. Example: *"The double-story 'a' and round 'o' suggest Outfit, but the slightly squared terminals could indicate Satoshi. Defaulting to Outfit - swap by changing `--font-display` if incorrect."*

⚠ **Drift Warning:** Never assume a heading is `font-weight: 700` because "headings are bold." Many premium designs use `500` or `600` for headings with a heavier font face. Look at stem thickness relative to the counter space.

---

### Layer 3: Color Palette

Extract every distinct color. Not "it uses blue" - extract the hex.

**Extraction Sheet:**

| Role | Hex value | Notes |
|---|---|---|
| Background (primary) | | e.g. `#F5F0EB` warm cream, not plain `#FFFFFF` |
| Background (secondary) | | Alternate section BG, card BG |
| Background (dark section) | | If any sections flip to dark |
| Text (primary) | | Heading + body text on primary BG |
| Text (secondary) | | Muted descriptions, metadata |
| Text (tertiary) | | Placeholders, disabled states |
| Accent | | CTAs, active indicators, links |
| Accent (hover) | | Darker/lighter variant on interaction |
| Border | | Card borders, dividers, input borders |
| Shadow | | If tinted, note the hue |

**Extracting colors from compressed screenshots:**

Screenshots compress colors. To get accurate values:
- Sample from the **largest flat area** of the color, not from edges or JPEG artifacts
- Cross-reference with common web values - if you measure `#0b0b0b`, it is almost certainly `#0a0a0a` (standard off-black). If you measure `#f4f3f1`, it is likely `#f5f4f2` (common warm cream)
- After extracting, verify WCAG AA contrast between text and background colors to confirm the values are reasonable

⚠ **Drift Warning:** The difference between `#FFFFFF` (pure white) and `#F5F0EB` (warm cream) completely changes the feel of a page. Do not default to `#FFFFFF` or `#000000` unless the reference genuinely shows pure values - most premium designs use off-white and off-black.

---

### Layer 4: Spacing System

Spacing is what separates "looks close" from "looks identical."

**Extraction Sheet:**

| Measurement | Value | How to verify |
|---|---|---|
| Base unit | `4px` or `8px` | Measure the smallest repeated gap |
| Button padding (H) | e.g. `24px` / `px-6` | Horizontal space between text edge and button edge |
| Button padding (V) | e.g. `12px` / `py-3` | Vertical space |
| Card internal padding | e.g. `32px` / `p-8` | Space from card edge to card content |
| Grid gap | e.g. `24px` / `gap-6` | Space between cards/columns |
| Heading → subtext | e.g. `16px` / `mt-4` | Gap between heading baseline and subtext top |
| Subtext → CTA | e.g. `32px` / `mt-8` | Gap between subtext and button |
| Section padding (top) | e.g. `96px` / `pt-24` | Space from section top to first element |
| Section padding (bottom) | e.g. `128px` / `pb-32` | Space from last element to section bottom |
| Nav height | e.g. `64px` / `h-16` | Total nav bar height |
| Nav link gap | e.g. `32px` / `gap-8` | Space between nav links |

⚠ **Drift Warning:** Top and bottom section padding are often **not** equal. Many designs use more bottom padding than top (or vice versa) for optical balance. Do not assume `py-24` when the reference shows `pt-20 pb-28`. Measure each side independently.

---

### Layer 5: Component Inventory

Catalog every distinct UI component visible in the image.

**For each component, fill in:**

| Component | Shape (radius) | Border | Shadow | Background | States visible | Icon style |
|---|---|---|---|---|---|---|
| Primary button | | | | | | |
| Secondary button | | | | | | |
| Card | | | | | | |
| Input field | | | | | | |
| Badge/pill | | | | | | |
| Avatar | | | | | | |
| Navigation | | | | | | |
| Divider | | | | | | |

**Border-radius consistency check:** Most designs commit to one radius language. Check whether the design uses:
- **Sharp** - `0px` everywhere (brutalist, editorial)
- **Subtle** - `4-8px` everywhere (SaaS, product)
- **Rounded** - `12-16px` everywhere (modern, friendly)
- **Pill** - `9999px` on buttons, rounded on cards (premium, polished)
- **Mixed** - different radii for different components (verify each one)

⚠ **Drift Warning:** If buttons are pill-shaped (`rounded-full`) in the reference, they cannot be `rounded-lg` in the code. Radius mismatches are immediately visible - the eye detects them faster than color or spacing errors.

---

### Layer 6: Atmosphere and Texture

Extract the subtle details that make a design feel alive vs flat.

**Extraction Sheet:**

| Property | Present? | Details |
|---|---|---|
| Noise/grain overlay | yes/no | Opacity level (typically `0.03-0.06`) |
| Radial ambient glow | yes/no | Position, color, spread |
| Frosted glass (backdrop-blur) | yes/no | On what elements, blur amount |
| Gradient backgrounds | yes/no | Direction, stops, colors |
| Tinted shadows | yes/no | Shadow hue, not just black |
| Image overlays/scrims | yes/no | Gradient direction, opacity |
| Background images/patterns | yes/no | Subtle texture, dots, lines |
| Depth/layering feel | flat / subtle / heavy | Overall shadow usage |

---

### Layer 7: Responsive Cues and Interaction Inference

Even from a static image, extract clues about behavior.

**Extraction Sheet:**

| Signal | Inference |
|---|---|
| Multi-column layout | Will collapse to single column below 768px |
| Horizontal nav bar | Will need mobile menu below 768px |
| Sticky-looking nav | `position: fixed; top: 0` with backdrop-blur likely |
| Elements positioned as if "just landed" | Entry animation implied (fade-up with stagger) |
| Buttons with visual depth | Lift on hover (`translateY(-1px)`, shadow increase) |
| Cards with borders | Border color change or subtle background shift on hover |
| Dot indicators near images | Carousel/slider component |
| Active/selected tab styling | Tab component with state management |
| Form inputs visible | Focus ring, validation states needed |

---

### ✓ Quality Gate: Extraction

Before moving to Phase 3, confirm:
- All seven Extraction Sheets are filled in
- Font candidates are identified with reasoning
- Every distinct color has a hex value
- Spacing values are measured, not assumed
- Component inventory is complete with radius, border, shadow noted per component
- Anything unclear has been flagged to the user

---
