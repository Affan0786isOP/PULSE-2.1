# Step-by-Step Build Pipeline

## Phase 3: Build

Implementation starts here. Follow this exact build order - each step depends on the one before it.

### → Step 1: Global Foundation

Set the design tokens first. Everything else references these.

```css
/* BLUEPRINT: Global tokens
   WHY: Setting these first means every component inherits 
   the correct base values. Changing a token here updates 
   the entire page. */

@import url('https://fonts.googleapis.com/css2?family=FONT_NAME:wght@300;400;500;600;700&display=swap');

:root {
  /* Colors - from Extraction Sheet Layer 3 */
  --color-bg: #____;
  --color-surface: #____;
  --color-text: #____;
  --color-text-2: #____;
  --color-text-3: #____;
  --color-accent: #____;
  --color-accent-hover: #____;
  --color-border: rgba(_, _, _, _);

  /* Typography - from Extraction Sheet Layer 2 */
  --font-display: 'FONT_NAME', Georgia, serif;
  --font-body: 'FONT_NAME', system-ui, sans-serif;
  --font-mono: 'FONT_NAME', monospace;

  /* Spacing - from Extraction Sheet Layer 4 */
  --space-section: clamp(5rem, 10vw, 8rem);
  --space-component: 2rem;
  --space-element: 1rem;

  /* Radius - from Extraction Sheet Layer 5 */
  --radius-card: __px;
  --radius-button: __px;
  --radius-input: __px;
}

*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-body);
  font-size: 1rem; /* Adjust if reference base is not 16px */
  line-height: 1.6; /* From extraction */
  color: var(--color-text);
  background-color: var(--color-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### → Step 2: Layout Skeleton

Build the section containers with correct dimensions. No content yet - just the boxes.

```css
/* BLUEPRINT: Section containers
   WHY: Getting the spatial structure right first prevents 
   cascading spacing errors when content is added. */

.section {
  width: 100%;
  max-width: ____px; /* From Layer 1 extraction */
  margin: 0 auto;
  padding: var(--space-section) clamp(1.5rem, 5vw, 5rem);
}

/* Full-viewport section */
.section--full {
  min-height: 100dvh;
  /* WHY dvh not vh: vh causes a layout jump on iOS Safari 
     when the address bar collapses. dvh accounts for this. */
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Grid layouts - adjust columns to match reference */
.grid-2-asymmetric {
  display: grid;
  grid-template-columns: 1.15fr 1fr; /* From Layer 1 */
  align-items: center;
  gap: 4rem;
}

.grid-3-equal {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem; /* From Layer 4 */
}

@media (max-width: 768px) {
  .grid-2-asymmetric,
  .grid-3-equal {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
}
```

### → Step 3: Typography Pass

Apply all text styles from the Layer 2 Extraction Sheet.

```css
/* BLUEPRINT: Typography scale
   WHY: Every property is explicitly set from the extraction.
   Never rely on browser defaults - they will drift. */

.heading-display {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 6vw, 5rem); /* From extraction */
  font-weight: 700;   /* Verified from stem thickness, not assumed */
  line-height: 0.95;  /* Tight - measured from baseline gap */
  letter-spacing: -0.03em; /* Negative - measured from character proximity */
  color: var(--color-text);
  text-wrap: balance;
  max-width: 18ch;    /* Prevents 4+ line wraps */
}

.heading-section {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 4vw, 3rem);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.body-text {
  font-family: var(--font-body);
  font-size: clamp(0.9375rem, 1.1vw, 1.125rem);
  font-weight: 400;
  line-height: 1.65;
  color: var(--color-text-2);
  max-width: 55ch; /* Comfortable reading width */
}

.eyebrow {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text-3);
}

.caption {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--color-text-3);
}
```

⚠ **Drift Warning:** Do not round font sizes to convenient values. If the extraction shows `15px` body text, use `0.9375rem`, not `1rem`. If the heading looks like `72px`, use `4.5rem`, not `5rem`. Rounding accumulates across the page.

### → Step 4: Components Pass

Build each component from the Layer 5 Extraction Sheet.

```css
/* BLUEPRINT: Button - primary
   WHY: Padding, radius, and font-size are from the extraction.
   The transition easing (0.16, 1, 0.3, 1) gives a snappy 
   deceleration that feels physical. */

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;           /* From Layer 4 */
  font-family: var(--font-body);
  font-size: 0.875rem;               /* From Layer 2 */
  font-weight: 600;
  letter-spacing: 0.04em;            /* Only if extraction shows tracking */
  text-transform: uppercase;          /* Only if extraction shows uppercase */
  border-radius: var(--radius-button);
  background: var(--color-accent);
  color: #FFFFFF;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-primary:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
.btn-primary:active {
  transform: translateY(0) scale(0.98);
}
.btn-primary:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* BLUEPRINT: Button - ghost/outline */
.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: var(--radius-button);
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-ghost:hover {
  border-color: var(--color-text);
  background: rgba(0, 0, 0, 0.03);
}

/* BLUEPRINT: Card */
.card {
  background: var(--color-surface);
  border-radius: var(--radius-card);
  padding: var(--space-component);
  border: 1px solid var(--color-border);
  /* Shadow: only add if extraction shows shadow */
}

/* BLUEPRINT: Navigation */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 64px; /* From Layer 4 extraction */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(1.5rem, 5vw, 5rem);
  background: rgba(255, 255, 255, 0.85); /* Adjust to match */
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
}

.nav-link {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-2);
  text-decoration: none;
  transition: color 0.2s ease;
}
.nav-link:hover {
  color: var(--color-text);
}
```

### → Step 5: Spacing Adjustments

Walk through every element gap and verify against the Layer 4 Extraction Sheet. This is where implementations most commonly drift.

### → Step 6: Atmosphere Pass

Add texture and depth from the Layer 6 Extraction Sheet. Only add what the reference shows.

```css
/* BLUEPRINT: Noise/grain overlay
   WHY: Breaks digital flatness. Only add if the reference 
   shows subtle texture on the background. 
   Uses position:fixed so the grain doesn't scroll. */
.grain-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.04; /* Adjust to match reference intensity */
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
}

/* BLUEPRINT: Ambient radial glow
   WHY: Adds depth to flat dark backgrounds. Only use if the 
   reference shows a subtle light center. */
.ambient-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 60% 50% at 50% 40%,
    rgba(255, 255, 255, 0.035) 0%,
    transparent 70%
  );
  pointer-events: none;
}

/* BLUEPRINT: Frosted glass surface
   WHY: For navs or overlays that show content blurring through.
   saturate(180%) makes colors pop through the blur layer. */
.surface-frosted {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
}
```

⚠ **Drift Warning:** Do not add grain, glow, or blur if the reference does not show them. These are atmosphere details, not defaults. Adding texture the reference does not have is interpretation, not replication.

### → Step 7: Responsive Pass

If the reference is desktop-only, infer mobile behavior from the layout structure. If both desktop and mobile references are provided, match both exactly.

```css
/* BLUEPRINT: Mobile collapse
   WHY: Every multi-column layout must collapse to single-column.
   Touch targets must be minimum 44px for accessibility. */

@media (max-width: 768px) {
  .grid-2-asymmetric,
  .grid-3-equal {
    grid-template-columns: 1fr;
  }

  .heading-display {
    /* clamp() already handles this, but verify the minimum */
    max-width: 100%;
  }

  .nav {
    /* May need a hamburger menu implementation */
  }

  /* Touch targets */
  .btn-primary,
  .btn-ghost,
  .nav-link {
    min-height: 44px;
  }
}
```

### → Step 8: Interaction Pass

Add hover states and entry animations. Static images cannot show interaction, but every interactive element needs feedback.

```css
/* BLUEPRINT: Staggered entry animation
   WHY: Elements that fade+slide in feel intentional.
   The blur-to-sharp adds perceived quality.
   prefers-reduced-motion disables for accessibility. */

@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(24px);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

.animate-in {
  animation: enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.animate-in:nth-child(1) { animation-delay: 0.05s; }
.animate-in:nth-child(2) { animation-delay: 0.15s; }
.animate-in:nth-child(3) { animation-delay: 0.25s; }
.animate-in:nth-child(4) { animation-delay: 0.35s; }

@media (prefers-reduced-motion: reduce) {
  .animate-in {
    animation: none;
    opacity: 1;
    transform: none;
    filter: none;
  }
}

/* Universal interactive transition */
a, button, [role="button"], input, select, textarea {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
```

### ✓ Quality Gate: Build

Before moving to Phase 4, confirm:
- Global tokens are set from extraction values, not defaults
- Layout skeleton matches the reference section structure
- Typography uses explicit values for every property (no browser defaults)
- Components match extraction sheets for radius, border, shadow, and padding
- Spacing between elements is verified against the reference
- Atmosphere effects are only present if the reference shows them
- Responsive collapse is implemented
- Hover/focus states are present on all interactive elements

---
