# Section-Specific Prompt Blueprints (Phases 3 & 4)

## Phase 3: Prompt Engineering

Each section gets its own structured prompt built from the Phase 2 picks. This is where art direction becomes generation-ready instructions.

### → The Prompt Blueprint

Every section prompt follows this structure. Fill in every field - skipping fields produces generic output.

```
PROMPT BLUEPRINT - Section [N] of [Total]: [Section Name]
─────────────────────────────────────────────────────────

FRAME:
  Format: horizontal website section, 16:9 aspect ratio
  Viewport: 1440×900 desktop browser frame
  Render style: [photorealistic UI mockup / flat design comp / editorial layout]

COMPOSITION:
  Anchor: [from Phase 2 - e.g., "centered statement" or "bottom-left over background"]
  Visual weight: [where the eye lands first - e.g., "center-left, massive heading"]
  Reading flow: [how the eye moves - e.g., "heading → subtext → CTA → background visual"]

TYPOGRAPHY:
  Heading: [exact description - e.g., "massive compressed sans-serif, all-caps,
            approximately 80pt equivalent, tight letter-spacing, 2 lines max"]
  Subtext: [e.g., "16pt equivalent, regular weight, muted color, max 20 words,
            1.5 line-height"]
  Eyebrow: [e.g., "11pt monospace, uppercase, wide letter-spacing, muted opacity"]
  CTA text: [e.g., "14pt, medium weight, uppercase, inside pill button"]

PALETTE:
  Background: [exact description - e.g., "#0a0a0a deep charcoal with subtle
               radial glow from center"]
  Text primary: [e.g., "#f5f5f5 warm off-white"]
  Text secondary: [e.g., "rgba(255,255,255,0.5) muted"]
  Accent: [e.g., "#E8A04A warm amber - used on CTA only"]

BACKGROUND MODE:
  [from Phase 2 - e.g., "full-bleed cinematic photograph of server rack room,
   cool blue-teal color grade, 40% dark overlay for text readability"]

CTA:
  Style: [from Phase 2 - e.g., "solid pill, amber background, dark text"]
  Placement: [e.g., "centered below subtext, 32px gap"]
  Count: [1 - never more in a hero]

ATMOSPHERE:
  [e.g., "subtle film grain overlay at 3% opacity, soft radial ambient glow
   from top-center, no hard shadows"]

CONTENT (placeholder text):
  Eyebrow: [e.g., "INFRASTRUCTURE"]
  Heading: [e.g., "Build without limits."]
  Subtext: [e.g., "The platform for teams who ship fast."]
  CTA: [e.g., "Get Started →"]

WHAT THIS IS NOT:
  [Explicit anti-patterns - e.g., "NOT a generic dark hero with purple AI glow.
   NOT a dashboard screenshot. NOT centered text over a gradient blob."]

MOTION IMPLIED:
  [from Phase 2 - e.g., "staggered float-up energy: the heading, subtext, and
   CTA appear at slightly different vertical offsets as if mid-cascade"]
```

### → Prompt Anti-Patterns (The Banned Defaults)

These are the patterns AI image generation collapses into. Every prompt must explicitly state what the image is NOT to counteract model defaults.

| Banned Pattern | Why it's banned | What to say instead |
|---|---|---|
| **Purple/blue AI gradient hero** | Every AI-generated "tech" image defaults to this. It screams "generated." | Specify the exact palette from Phase 2. Add "no purple, no blue gradient backgrounds." |
| **Floating translucent blobs** | The AI's version of "atmosphere" - meaningless glass orbs floating in space | Specify concrete atmosphere: grain, radial glow, tonal gradient, or photographic background |
| **Generic dashboard card grid** | AI loves generating 6-8 identical cards with line charts | Specify the exact component from Phase 2's signature set. Describe its unique geometry |
| **Centered text over gradient** | Safe, generic, says nothing about the brand | Specify the exact composition anchor from Phase 2. Force an asymmetric or editorial layout |
| **"Luxury" = beige serif on cream** | The AI's entire luxury vocabulary | Specify the actual luxury signals: restrained spacing, tactile texture, considered typography weight |
| **"Creative" = messy and unreadable** | Chaos ≠ creativity | Specify structured asymmetry: deliberate off-grid placement with clear reading order |
| **Tiny illegible text** | AI generates decorative text that no one can read | Specify minimum type scale: "heading must be legible and dominant, minimum 60pt equivalent" |
| **Identical section layouts** | Every section looks the same - same split, same proportion | Use the composition anchor assignments from Phase 2 - each section has a different anchor |
| **Stock photo energy** | Generic business people shaking hands, laptop on desk | Specify the exact photographic direction: subject, color grade, mood, crop style |

⚠ **Drift Warning:** The single most impactful thing you can add to any prompt is the "WHAT THIS IS NOT" section. AI models are as responsive to negative constraints as positive ones. Telling the model "NOT a purple gradient hero, NOT floating blobs, NOT a generic dashboard" eliminates 80% of default AI output.

### → Section-Specific Prompt Guidance

Different sections have different jobs. Use these section blueprints to ensure each section serves its purpose in the conversion flow.

**Section: Hero**
```
PURPOSE: Hook - the first thing the user sees. Must create an instant
         emotional response and communicate the brand's energy in < 3 seconds.

MUST HAVE:
  - ONE dominant focal point (massive heading OR cinematic image, not both competing)
  - Brand name or product name visible
  - Single CTA (never two)
  - Breathing room - the hero must NOT feel packed

MUST NOT HAVE:
  - Trust logos / "used by" badges (save for trust bar)
  - Feature lists or bullet points
  - Multiple competing CTAs
  - Scroll indicators / bouncing chevrons
  - Version labels (v2.0, BETA) unless the brief is literally a product launch

PROMPT ADDITION:
  "This is a website hero section - the first viewport a user sees.
   It must feel premium, confident, and immediately communicate the brand.
   One focal point dominates. Generous whitespace. No clutter."
```

**Section: Trust Bar**
```
PURPOSE: Proof - immediately after the hero, establish credibility.

MUST HAVE:
  - Logo strip OR metric strip OR testimonial quote
  - Muted, understated styling (this section supports, not competes with hero)
  - Visually lighter than surrounding sections

PROMPT ADDITION:
  "This is a trust/social-proof bar. It should be visually quiet and
   supportive - a thin horizontal strip of logos or a single powerful
   metric. Not a full section, more like a divider with authority."
```

**Section: Features / Benefits**
```
PURPOSE: Interest - show what the product does and why it matters.

MUST HAVE:
  - Clear visual hierarchy (section heading → feature items)
  - Distinct feature blocks (cards, columns, or bento cells)
  - Icons or micro-illustrations per feature (not just text)

MUST NOT HAVE:
  - More than 6 feature items visible (3-4 is stronger)
  - Identical card layouts without visual variation
  - "FEATURE 01", "FEATURE 02" meta-labels

PROMPT ADDITION:
  "This is a features/benefits section. Each feature should be
   visually distinct with an icon or illustration. Cards should
   NOT all look identical. Hierarchy: section heading first, then
   feature grid below."
```

**Section: Social Proof / Testimonials**
```
PURPOSE: Desire - make the user want what others already have.

MUST HAVE:
  - Real-looking names and avatar-style photos
  - Quote text that feels authentic (not marketing copy)
  - Company/role attribution

PROMPT ADDITION:
  "This is a testimonial section. Show 1-3 quotes with avatar photos,
   names, and company roles. The quotes should feel human and authentic.
   Layout should feel editorial, not like a review aggregator."
```

**Section: CTA / Conversion**
```
PURPOSE: Action - the final push. High contrast, unmistakable action.

MUST HAVE:
  - High-contrast background (inverted from the page's dominant mode)
  - Single, dominant CTA button
  - Short, punchy heading (3-7 words)
  - Minimal supporting text

PROMPT ADDITION:
  "This is the final conversion section. It should feel like a
   decisive endpoint - high contrast, bold heading, unmistakable
   CTA button. If the page is light, this section goes dark (or
   uses the accent color as background). Maximum confidence."
```

**Section: Footer**
```
PURPOSE: Navigation + trust - the page's foundation.

MUST HAVE:
  - Logo
  - Link columns (Product, Company, Resources, Legal)
  - Muted, structured, visually quiet
  - Copyright line

PROMPT ADDITION:
  "This is a website footer. Clean, organized link columns with
   a logo. Visually understated - it anchors the page without
   competing for attention. Dark or muted background."
```

### ✓ Quality Gate: Prompts

Before moving to Phase 4, confirm:
- Every section has a complete prompt following the blueprint structure
- Every prompt includes a WHAT THIS IS NOT section
- Palette is consistent across all section prompts
- Typography direction is consistent across all section prompts
- Composition anchors vary across sections (cross-reference Phase 2 assignments)
- Background modes vary across sections
- CTA styles vary at least once
- No prompt defaults to left-text / right-image without deliberate justification
- Placeholder content uses realistic text (no "Lorem ipsum", no "Company Name")

---

## Phase 4: Generate

Execute the prompts sequentially. One image per section.

### → Generation Rules

| Rule | Why |
|---|---|
| **Announce each section** before generating | *"Section 3 of 7: Features - Pristine Gapless Bento Grid with staggered float-up energy"* |
| **Horizontal format, 16:9** | Website sections are landscape, not portrait |
| **One section per image** | The Hard Output Rule - no exceptions |
| **Include the full prompt blueprint** in the generation call | Do not summarize - the model needs every field |
| **Verify palette consistency** before each generation | The accent color from section 1 must appear in section 5 |
| **Adjust prompt if a generation drifts** | If image 3 comes back with a purple gradient, re-generate with stronger anti-pattern language |

### → Section Sequencing

For a default landing page (6 sections), generate in this order:

```
Section 1: Hero          - [Hook]
Section 2: Trust Bar     - [Proof]
Section 3: Features      - [Interest]
Section 4: How It Works  - [Education]
Section 5: Testimonials  - [Desire]
Section 6: CTA + Footer  - [Action]
```

For a full website template (8 sections):

```
Section 1: Hero          - [Hook]
Section 2: Trust Bar     - [Proof]
Section 3: Features      - [Interest]
Section 4: How It Works  - [Education]
Section 5: Showcase/Demo - [Demonstration]
Section 6: Testimonials  - [Desire]
Section 7: Pricing       - [Decision]
Section 8: CTA + Footer  - [Action]
```

Each section maps to a conversion stage. This is not arbitrary - the sequence follows AIDA (Attention → Interest → Desire → Action) with proof and education layers inserted for credibility.

### ✓ Quality Gate: Generation

After generating all images, confirm:
- Total image count matches section count (no missing sections)
- Each image is a separate horizontal image (no combined frames)
- Palette is visually consistent across all images (same accent, same base tones)
- No two adjacent sections use the same composition anchor
- At least 3 different composition anchors appear across all sections
- The hero is NOT a default left-text / right-image split (unless deliberately chosen)
- No purple/blue AI gradient backgrounds appear (unless the palette specifically calls for it)
- Typography scale is consistent (headings feel the same weight/family across sections)

---
