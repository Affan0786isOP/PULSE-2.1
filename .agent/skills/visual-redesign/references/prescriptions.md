# Visual Prescriptions (Typography, Tokens, Atmosphere & Motion)

## Phase 3: Prescription

For every slop item extracted in Phase 2, prescribe the gold replacement. This is the transformation map - the surgical plan.

### → Token Prescription

```css
/* PRESCRIPTION: Design tokens - Slop → Gold
   WHY: Tokens are the foundation. Changing these first
   means every component that references them upgrades
   automatically. This is the highest-leverage change. */

:root {
  /* ── Colors ────────────────────────────────────── */

  /* Background: #ffffff → warm off-white
     WHY: Pure white is harsh and clinical. Off-white
     with a warm undertone feels premium and intentional.
     The difference is subtle but the eye registers it
     as "designed" vs "default." */
  --color-bg: #FAFAF9;        /* was: #ffffff */
  --color-surface: #FFFFFF;    /* was: #f8f9fa - cards sit ON the bg */
  --color-surface-2: #F5F4F2;  /* was: none - for alternating sections */

  /* Text: #000000 → warm near-black
     WHY: Pure black on warm off-white creates a jarring
     temperature clash. Near-black (#1a1a1a) matches the
     warmth of the background and reduces eye strain. */
  --color-text: #1A1A1A;       /* was: #000000 or #212529 */
  --color-text-2: #6B7280;     /* was: #6c757d - muted, for secondary */
  --color-text-3: #9CA3AF;     /* was: none - for captions, placeholders */

  /* Accent: #0d6efd → considered, non-Bootstrap hue
     WHY: Bootstrap blue is the single loudest "I didn't
     design this" signal on the web. ANY other considered
     hue immediately elevates the design. Pick based on
     brand context from the user's brief. */
  --color-accent: #____;       /* MUST be chosen based on brand context */
  --color-accent-hover: #____; /* 10-15% darker or more saturated */

  /* Borders and shadows: warm, not gray
     WHY: Cool gray borders (#dee2e6) clash with warm
     backgrounds. Use warm gray or very low-opacity black. */
  --color-border: rgba(0, 0, 0, 0.08);  /* was: #dee2e6 */
  --color-shadow: rgba(0, 0, 0, 0.04);  /* was: rgba(0,0,0,0.1) */

  /* ── Typography ────────────────────────────────── */

  /* Display font: Arial → a real display font
     WHY: Arial/system-ui as a heading font is the
     typographic equivalent of serving fine dining
     on paper plates. Display fonts have optical
     refinements for large sizes that body fonts lack. */
  --font-display: 'Outfit', system-ui, sans-serif;  /* was: Arial/system-ui */
  --font-body: 'Inter', system-ui, sans-serif;       /* was: same as display */
  --font-mono: 'JetBrains Mono', monospace;           /* was: none */

  /* ── Spacing ───────────────────────────────────── */

  /* Section spacing: random values → consistent scale
     WHY: A spacing system creates rhythm. Random spacing
     creates visual noise - the eye detects inconsistency
     even when the brain can't articulate it. */
  --space-section: clamp(5rem, 10vw, 8rem); /* was: random py values */
  --space-element: 1.5rem;                  /* was: 0.75rem–1rem */
  --space-component: 2rem;                  /* was: 1rem–1.5rem */

  /* ── Radius ────────────────────────────────────── */

  /* Radius: 4px everywhere → considered radius language
     WHY: A design system commits to a radius language.
     Pick ONE and apply consistently. */
  --radius-sm: 8px;          /* was: 4px (Bootstrap) - inputs, badges */
  --radius-md: 12px;         /* was: 4px - cards, containers */
  --radius-lg: 16px;         /* was: 4px - modals, large cards */
  --radius-full: 9999px;     /* was: 50% - pills, avatars */

  /* ── Easing ────────────────────────────────────── */

  /* Easing: ease-in-out → custom curves
     WHY: CSS keyword easings are the typographic
     equivalent of Comic Sans. Zero character,
     zero intentionality. Custom curves give
     every animation a deliberate feel. */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-snap: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

### → Typography Prescription

```css
/* PRESCRIPTION: Typography scale - Slop → Gold
   WHY: The heading is the first thing the eye hits.
   A display font with tight tracking and compressed
   line-height immediately signals "designed." The body
   font stays readable with comfortable line-height. */

/* Import the fonts - add to the top of your CSS or <head> */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

h1, h2, h3, h4 {
  font-family: var(--font-display);
  letter-spacing: -0.03em;   /* was: normal (too loose at display size) */
  line-height: 1.1;          /* was: 1.2 (Bootstrap) - tighten */
  text-wrap: balance;        /* prevents ugly orphan lines */
  color: var(--color-text);
}

h1 {
  font-size: clamp(2.25rem, 5vw, 3.75rem);  /* was: 2rem fixed */
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.05;
}

h2 {
  font-size: clamp(1.75rem, 3.5vw, 2.75rem); /* was: 1.5rem fixed */
  font-weight: 600;
}

h3 {
  font-size: clamp(1.25rem, 2vw, 1.5rem);    /* was: 1.25rem fixed */
  font-weight: 600;
}

body, p, span, li {
  font-family: var(--font-body);
  font-size: clamp(0.9375rem, 1.1vw, 1.0625rem); /* was: 1rem fixed */
  line-height: 1.65;     /* was: 1.5 - slightly more generous */
  color: var(--color-text);
}

/* Body text max-width - prevent wall-to-wall text */
p {
  max-width: 65ch;  /* was: none - text ran edge to edge */
}

/* Muted secondary text */
.text-muted, .text-secondary {
  color: var(--color-text-2) !important; /* override Bootstrap's gray */
}

/* Eyebrow / label style - add where appropriate */
.eyebrow {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-3);
}
```

### → Component Prescription

```css
/* PRESCRIPTION: Button - Bootstrap → Premium
   WHY: The button is the most interactive element on the page.
   Its hover feel communicates the entire quality level of the site.
   A snappy cubic-bezier with a physical lift-and-shadow creates
   a tactile impression that Bootstrap's default cannot achieve. */

/* Strip Bootstrap button defaults */
.btn {
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 0.75rem 1.75rem;             /* was: py-2 px-3 - cramped */
  border-radius: var(--radius-full);     /* was: 4px - now pill */
  border: none;
  cursor: pointer;
  transition:
    transform 0.4s var(--ease-snap),
    box-shadow 0.4s var(--ease-snap),
    background-color 0.3s var(--ease-out);
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px var(--color-shadow);
}

.btn:active {
  transform: translateY(0) scale(0.98);
  transition-duration: 0.1s;
}

/* Primary button */
.btn-primary {
  background: var(--color-accent);
  color: #ffffff;
  border: none;
  box-shadow: 0 1px 3px var(--color-shadow);
}

.btn-primary:hover {
  background: var(--color-accent-hover);
}

/* Ghost / outline button */
.btn-outline-primary,
.btn-secondary,
.btn-outline-secondary {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-outline-primary:hover,
.btn-outline-secondary:hover {
  border-color: var(--color-text);
  background: rgba(0, 0, 0, 0.02);
}

/* PRESCRIPTION: Card - Bootstrap → Premium */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);        /* was: 4px */
  padding: var(--space-component);         /* was: 1rem - cramped */
  box-shadow: none;                        /* was: default Bootstrap shadow */
  transition:
    transform 0.4s var(--ease-snap),
    box-shadow 0.4s var(--ease-snap),
    border-color 0.3s var(--ease-snap);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.04),
    0 2px 8px rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.12);
}

/* Reset Bootstrap card internals */
.card-body {
  padding: 0;  /* parent .card already has padding */
}

.card-title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: var(--space-element);
}

/* PRESCRIPTION: Input - Bootstrap → Premium */
.form-control,
input[type="text"],
input[type="email"],
input[type="password"],
textarea,
select {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  padding: 0.75rem 1rem;                  /* was: py-1.5 px-3 - cramped */
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  transition:
    border-color 0.3s var(--ease-snap),
    box-shadow 0.3s var(--ease-snap);
}

.form-control:focus,
input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb), 0.15);
}

/* PRESCRIPTION: Navigation - Bootstrap → Premium */
.navbar, nav {
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  background: rgba(250, 250, 249, 0.85);  /* semi-transparent for frost */
  border-bottom: 1px solid var(--color-border);
  padding: 0 clamp(1.5rem, 5vw, 5rem);
  height: 64px;
  display: flex;
  align-items: center;
}

.nav-link, .navbar-nav .nav-link {
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-2);
  transition: color 0.3s var(--ease-snap);
  position: relative;
}

.nav-link:hover {
  color: var(--color-text);
}

/* Sliding underline on nav links */
.nav-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 1.5px;
  background: var(--color-text);
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.3s var(--ease-snap);
}

.nav-link:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}

/* PRESCRIPTION: Table - Bootstrap → Premium */
.table, table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
}

.table th, table th {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-3);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.table td, table td {
  font-size: 0.9375rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  color: var(--color-text);
}

.table tbody tr:hover, table tbody tr:hover {
  background: rgba(0, 0, 0, 0.015);
}

/* Kill Bootstrap zebra striping - it looks cheap */
.table-striped > tbody > tr:nth-of-type(odd) {
  background-color: transparent;
}
```

### → Atmosphere Prescription

```css
/* PRESCRIPTION: Atmosphere - Flat → Alive
   WHY: Flat backgrounds feel like nothing. A subtle
   radial gradient, grain texture, or warm tint gives
   the background depth without adding visual elements. */

/* Subtle warm radial on the body */
body {
  background:
    radial-gradient(ellipse at 30% 0%, rgba(250, 235, 215, 0.2) 0%, transparent 50%),
    var(--color-bg);
}

/* Noise grain overlay - felt, not seen */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
}

/* Section dividers - subtle border instead of hard lines */
section + section {
  border-top: 1px solid var(--color-border);
}

/* Alternating section backgrounds for rhythm */
section:nth-child(even) {
  background-color: var(--color-surface-2);
}
```

### → Motion Prescription

```css
/* PRESCRIPTION: Motion - Static → Alive
   WHY: Every element that appears without animation
   feels like the page is broken. A staggered fade-up
   with deblur signals that the page loaded intentionally. */

/* Entry animation keyframe */
@keyframes enter-up {
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

/* Apply to major elements - use inline style for stagger:
   <h1 class="enter-up" style="--stagger: 0ms">
   <p class="enter-up" style="--stagger: 120ms">
   <button class="enter-up" style="--stagger: 240ms"> */
.enter-up {
  animation: enter-up 0.7s var(--ease-out) both;
  animation-delay: var(--stagger, 0ms);
}

/* Scroll reveal - elements below the fold */
[data-reveal] {
  opacity: 0;
  transform: translateY(30px);
  transition:
    opacity 0.8s var(--ease-out),
    transform 0.8s var(--ease-out);
}

[data-reveal].is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* Universal interactive transition - replaces Bootstrap's
   transition: all 0.15s ease-in-out on EVERY interactive element */
a, button, [role="button"],
input, select, textarea,
.card, .nav-link, .badge {
  transition: all 0.3s var(--ease-snap);
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .enter-up {
    animation: none;
    opacity: 1;
    transform: none;
    filter: none;
  }

  [data-reveal] {
    opacity: 1;
    transform: none;
    transition: none;
  }

  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### → Scroll Reveal JavaScript (Non-Destructive)

```javascript
/* PRESCRIPTION: Scroll reveal - add as a separate script
   WHY: This script observes [data-reveal] elements and
   adds .is-visible when they enter the viewport. It does
   NOT modify any existing JS - it's a new, separate file
   that runs independently.

   Add to the end of the page or import in main entry. */

class ScrollReveal {
  constructor() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '-50px 0px' }
    );

    document.querySelectorAll('[data-reveal]').forEach((el) => {
      this.observer.observe(el);
    });
  }
}

// Initialize after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ScrollReveal());
} else {
  new ScrollReveal();
}
```

### ✓ Quality Gate: Prescription

Before moving to Phase 4, confirm:
- Every slop item from Phase 2 has a gold replacement prescribed
- Token prescriptions are internally consistent (warm bg + warm text, not mixed temperatures)
- The accent color is chosen based on the user's brand context (not another generic blue)
- Typography prescription uses a display font for headings and a body font for body
- Component prescriptions maintain the same DOM structure (class changes only)
- Atmosphere additions are subtle (opacity < 0.05 for grain, < 0.3 for gradients)
- Motion additions are non-destructive (new CSS classes and a new script, no existing JS modified)
- The accent color `#____` placeholder is filled with an actual hex value

---
