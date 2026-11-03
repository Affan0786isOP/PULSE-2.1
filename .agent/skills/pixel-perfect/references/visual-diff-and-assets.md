# Visual Diff & Artistic Asset Classification

## Phase 4: Visual Diff

Compare your implementation against the reference image. This is the final verification. Walk through every category below. Mark each item PASS or FAIL. Any FAIL blocks delivery.

### Layout Diff

| Check | PASS/FAIL |
|---|---|
| Section count and order match | |
| Container max-width proportions match | |
| Horizontal padding matches | |
| Grid column counts and ratios match | |
| Section heights feel proportionally correct | |
| Vertical spacing between sections matches | |
| Element alignment (left/center/right) matches per section | |
| Z-axis layering matches (if present) | |

### Typography Diff

| Check | PASS/FAIL |
|---|---|
| Font family loaded and rendering correctly | |
| Heading size proportionally correct against viewport | |
| Heading weight matches (not too thin, not too heavy) | |
| Heading line-height matches (tight vs relaxed) | |
| Heading letter-spacing matches (tight vs wide) | |
| Body text size matches | |
| Body line-height and max-width match | |
| Eyebrow/label styling matches (size, case, tracking, font) | |
| Text colors match per element type | |

### Color Diff

| Check | PASS/FAIL |
|---|---|
| Primary background color matches (not #FFF when it should be #F5F0EB) | |
| Text colors match (primary and secondary) | |
| Accent color matches | |
| Border/divider colors match | |
| No unexpected color shifts between sections | |

### Component Diff

| Check | PASS/FAIL |
|---|---|
| Button radius matches (pill vs rounded vs sharp) | |
| Button padding matches | |
| Button text styling matches (size, weight, case, tracking) | |
| Card styling matches (radius, padding, border, shadow) | |
| Navigation matches (height, background treatment, link styling) | |
| Image treatment matches (radius, aspect ratio, object-fit) | |

### Spacing Diff

| Check | PASS/FAIL |
|---|---|
| Heading → subtext gap matches | |
| Subtext → CTA gap matches | |
| Card internal padding matches | |
| Grid gap between elements matches | |
| Section padding (top AND bottom independently) matches | |
| Overall breathing room / negative space feels correct | |

### Atmosphere Diff

| Check | PASS/FAIL |
|---|---|
| Background atmosphere matches (flat/grain/gradient/glow) | |
| Shadow presence and intensity match | |
| Frosted glass / blur effects present where reference shows them | |
| No atmosphere effects added that the reference does NOT show | |

### Technical Checks

| Check | PASS/FAIL |
|---|---|
| Zero console errors | |
| All fonts loaded (no FOUT/FOIT) | |
| All images loaded (no broken placeholders) | |
| No horizontal overflow at any viewport | |
| Hover states on all interactive elements | |
| Focus-visible states for keyboard navigation | |
| `min-h-[100dvh]` used, not `h-screen` | |
| `prefers-reduced-motion` respected | |

---

## Handling Artistic Assets (Photographs, Illustrations, Textures)

CSS can reproduce layout, typography, colors, and geometric shapes. It CANNOT reproduce photographs, hand-drawn illustrations, organic brush strokes, marble textures, or painterly effects. This is the #1 source of drift between reference and output.

### → Classify every visual element in the reference

Walk through the reference and tag each visual element:

| Element type | Can CSS reproduce it? | What to do instead |
|---|---|---|
| **Solid color blocks** | ✅ Yes | Use exact hex from extraction |
| **Linear/radial gradients** | ✅ Yes | Match direction, stops, and colors |
| **Geometric shapes** (circles, rectangles, lines) | ✅ Yes | Use CSS shapes or simple SVG |
| **Icons** (outlined/filled) | ✅ Yes | Use an icon library or inline SVG |
| **Photographs** | ❌ No | Generate a mood-matched image or use `picsum.photos/seed/{keyword}/{w}/{h}` |
| **Hand-drawn illustrations** | ❌ No | Generate a matching illustration with `generate_image` tool |
| **Organic brush strokes / paint textures** | ❌ No | Generate as an image asset - do NOT approximate with CSS gradients |
| **Marble / fluid / organic textures** | ❌ No | Generate as an image asset or use a high-quality stock match |
| **3D renders** | ❌ No | Generate a matching render or use a placeholder with similar lighting/angle |
| **Abstract art / mixed media** | ❌ No | Generate with `generate_image` describing the exact style, colors, and composition |

### → When the reference contains photographs

1. **First choice:** Use `generate_image` to create a photograph that matches the mood, color palette, subject, and composition of the reference
2. **Second choice:** Use `picsum.photos/seed/{descriptive-keyword}/{w}/{h}` with a keyword that matches the content (e.g., `picsum.photos/seed/ocean-waves/800/600` for ocean imagery)
3. **Never:** Use a CSS gradient, striped pattern, or solid color block as a stand-in for a photograph. This is the most visible form of drift

### → When the reference contains illustrations or brush strokes

1. **First choice:** Use `generate_image` with a detailed prompt describing the illustration style, colors, stroke quality, and composition. Include the mood: "organic hand-painted pink brush stroke with visible texture, diagonal across white background, coral/hot-pink color, similar to expressive abstract art"
2. **Second choice:** If `generate_image` is not available, find a stock illustration with matching style and color
3. **Never:** Approximate organic, hand-drawn artwork with CSS gradients or geometric shapes. A diagonal CSS gradient is NOT a brush stroke. A CSS `border-radius` blob is NOT an organic shape. The eye detects the difference instantly

### → When the reference contains textured surfaces

Marble, wood grain, concrete, fabric, water, clouds - these need real image assets:

1. Generate the texture with `generate_image` describing the specific surface
2. Apply as a `background-image` with appropriate `background-size`, `object-fit`, and positioning
3. Match the scale - a zoomed-in marble texture looks different from a zoomed-out one

### → Asset sizing and positioning

When placing generated image assets into the layout:

```css
/* BLUEPRINT: Image asset inside a card or container
   WHY: object-fit:cover ensures the image fills the space 
   without distortion. object-position lets you align the 
   focal point of the image to match the reference. */
.asset-container {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-card); /* match card radius */
}
.asset-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center; /* adjust to match reference focal point */
}
```

⚠ **Drift Warning:** This is the most common replication failure. When the AI cannot reproduce an artistic element, it substitutes a CSS pattern (stripes, gradients, solid blocks). This ALWAYS looks wrong because geometric CSS patterns have a fundamentally different visual quality than photographs or hand-drawn art. Always generate an image asset instead - even an imperfect generated image is closer to the reference than a CSS approximation.

---

## Edge Cases

### When you cannot identify the font

1. State your top 2-3 candidates with the distinguishing character that makes you lean one way
2. Suggest the user inspect the live site via DevTools → Computed Styles → `font-family`
3. Default to the closest Google Font match
4. Structure your CSS so the font can be swapped by changing a single `--font-display` variable

### When the reference is low resolution

1. Extract what you can confidently determine (layout, palette, general typography)
2. Flag uncertain measurements explicitly
3. Ask for a higher-res image or a URL to the live site
4. Do not invent sub-pixel details from a blurry screenshot

### When the reference shows content you cannot reproduce

Some references show dynamic content (live chat, real user avatars, real-time data):
1. Reproduce the visual appearance with static placeholder data
2. Use realistic content - real-sounding names, organic numbers (not "John Doe" or "99.99%")
3. Note which elements are placeholder in your delivery

For artistic content (photographs, illustrations, textures), see the "Handling Artistic Assets" section above. Never approximate with CSS - always generate or source a real image.

### When multiple reference images are provided

1. Run the full extraction on each image independently
2. Confirm the design system is consistent across images (same fonts, colors, components)
3. If inconsistencies exist, ask the user which image is authoritative
4. Desktop + mobile pairs: use desktop for the design system, mobile for responsive breakpoints

### When the reference uses a recognizable component library

If you spot shadcn/ui, Radix, Material, or another library:
1. State which library you believe is in use
2. Ask if the user wants the library or manual reproduction
3. If using the library: install properly and theme to match
4. If reproducing manually: match the visual output without the dependency

---

## The Core Principle

> The reference image is the specification. The code is a translation. You are a translator, not a designer. Match the image, not your preferences. If the reference contradicts your aesthetic instincts, the reference wins. The only technical override allowed is `min-h-[100dvh]` over `h-screen`, because `h-screen` is a browser bug, not a design choice.
