# Surgical CSS Rules & Override Strategies

## Phase 4: Surgery

Execute the prescriptions. This is the operating room. Follow the exact order below - each layer builds on the previous one.

### → Surgical Order

```
Layer 1: Tokens     (CSS custom properties - the foundation)
Layer 2: Typography (font imports + heading/body styles)
Layer 3: Color      (replace all Bootstrap/generic color values)
Layer 4: Spacing    (padding, margins, gaps - breathing room)
Layer 5: Components (buttons, cards, inputs, nav, tables)
Layer 6: Atmosphere (grain, glow, section alternation)
Layer 7: Motion     (entry animations, hover states, scroll reveals)
```

### → Surgical Rules

| Rule | Why |
|---|---|
| **One layer at a time** | If you change tokens, typography, AND components simultaneously and something breaks, you cannot isolate the cause |
| **Test after each layer** | Run the app. Does it still work? Do all routes load? Do forms submit? Do API calls return? If yes, proceed to the next layer |
| **CSS overrides, not replacements** | Add a new stylesheet (e.g., `gold.css`) that overrides the existing styles. Do NOT delete the existing CSS files until the override is confirmed working |
| **className changes are surgical** | If replacing Bootstrap classes with custom ones, search the entire codebase for each class before removing it. A class used in JS logic (`document.querySelector('.btn-primary')`) is sacred |
| **Never rewrite JSX structure** | You may add/change `className` props and `style` props. You may NOT reorder children, remove wrapper divs, change component hierarchy, or modify props that aren't purely visual |
| **New files > modified files** | Prefer creating `gold.css` and importing it AFTER existing stylesheets (for override priority) over editing the existing stylesheets directly. This makes rollback trivial |

### → The Override Strategy

The safest approach is a single new stylesheet loaded AFTER all existing stylesheets:

```css
/* gold.css - loaded LAST in the cascade
   WHY: By loading after Bootstrap/existing CSS, our rules
   override the defaults without deleting any existing code.
   If something breaks, the user can remove this one import
   to revert entirely. This is the safest surgery method.

   Import in main entry file:
   import './gold.css'  // AFTER all other CSS imports */
```

This file contains ALL prescriptions from Phase 3 - tokens, typography, components, atmosphere, motion - in one file that can be added or removed as a single unit.

⚠ **Drift Warning:** The temptation is to "clean up" the existing CSS by deleting Bootstrap imports or removing old stylesheets. Do NOT do this until the user has confirmed the gold override is working. The old CSS is a safety net. Remove it only after the patient is confirmed stable.

### → High-Risk File Surgery (Dashboard, Forms, Complex Components)

For files marked **High** risk in the Audit Table:

1. **Read the entire file first** - understand every state variable, effect, and handler
2. **Map every className and style prop** - note which ones are referenced in JS logic
3. **Change ONLY className string values** - the attribute stays, only the value changes
4. **Never touch inline styles that reference state** - `style={{ display: isOpen ? 'block' : 'none' }}` is sacred
5. **Test immediately after changes** - run the app, trigger every state change, submit every form, verify every API call

```tsx
/* EXAMPLE: Safe className surgery on a complex component

   BEFORE (Bootstrap):
   <div className={`card ${isSelected ? 'border-primary' : ''}`}>

   AFTER (Gold):
   <div className={`card ${isSelected ? 'card--selected' : ''}`}>

   The ternary logic is IDENTICAL. Only the class name value changed.
   Then in gold.css:
   .card--selected {
     border-color: var(--color-accent);
     box-shadow: 0 0 0 2px rgba(var(--color-accent-rgb), 0.2);
   }
*/
```

### → Adding data-reveal Attributes (Non-Destructive)

To add scroll reveal animations, add `data-reveal` attributes to existing JSX elements. This is safe because `data-*` attributes do not affect React's rendering logic:

```tsx
/* BEFORE: */
<section className="features">
  <h2>Features</h2>
  {features.map(f => <FeatureCard key={f.id} {...f} />)}
</section>

/* AFTER - added data-reveal, nothing else changed: */
<section className="features" data-reveal>
  <h2>Features</h2>
  {features.map(f => <FeatureCard key={f.id} {...f} />)}
</section>

/* The data-reveal attribute is inert until the ScrollReveal
   script observes it. It does not interfere with React's
   reconciliation, event handling, or state management. */
```

### → Adding Entry Animation Classes (Non-Destructive)

```tsx
/* BEFORE: */
<h1 className="hero-heading">Build faster.</h1>
<p className="hero-subtext">The platform for modern teams.</p>
<button className="btn btn-primary" onClick={handleSignup}>Get Started</button>

/* AFTER - added enter-up class and stagger variable: */
<h1 className="hero-heading enter-up" style={{ '--stagger': '0ms' } as React.CSSProperties}>Build faster.</h1>
<p className="hero-subtext enter-up" style={{ '--stagger': '120ms' } as React.CSSProperties}>The platform for modern teams.</p>
<button className="btn btn-primary enter-up" style={{ '--stagger': '240ms' } as React.CSSProperties} onClick={handleSignup}>Get Started</button>

/* onClick handler is UNTOUCHED. Only className and style were added.
   The style prop uses a CSS custom property for stagger delay.
   In TypeScript, cast as React.CSSProperties to avoid type errors. */
```

### ✓ Quality Gate: Surgery

After all 7 layers are applied, confirm:
- The app runs without errors (console is clean)
- All routes load correctly
- All forms submit and validate correctly
- All API calls return data and render correctly
- All state changes work (toggles, modals, dropdowns, selections)
- All event handlers fire correctly (clicks, submits, keypresses)
- No ref errors or "cannot read property of undefined" errors
- The new CSS imports load AFTER existing stylesheets
- The gold.css file can be removed to fully revert

---

## Phase 5: Post-Op

Verify the surgery was successful. Walk through every check. Any FAIL requires diagnosis and correction.

### Functionality Check (Sacred Integrity)

| Check | PASS/FAIL |
|---|---|
| All pages/routes load without error | |
| All forms submit correctly | |
| All API calls return and render data | |
| All state toggles work (open/close, show/hide, select/deselect) | |
| All event handlers fire (onClick, onSubmit, onChange, onKeyDown) | |
| Authentication flow works (login, logout, protected routes) | |
| No console errors | |
| No TypeScript errors (if TS project) | |
| No broken refs or undefined property errors | |
| All conditional rendering works (loading states, error states, empty states) | |

⚠ **If ANY functionality check fails, REVERT the last surgery layer and diagnose. Do NOT proceed to visual checks until all functionality passes.**

### Visual Upgrade Check

| Check | PASS/FAIL |
|---|---|
| No Bootstrap blue (#0d6efd) visible anywhere | |
| No pure black (#000) text on pure white (#fff) backgrounds | |
| Heading font is a display font (not Arial/system-ui) | |
| Heading letter-spacing is negative (tight, not loose) | |
| Heading line-height is compressed (< 1.15) | |
| Body text has comfortable max-width (not edge-to-edge) | |
| Cards have generous padding (not cramped 16px) | |
| Buttons are pill-shaped or use the prescribed radius | |
| Buttons have hover lift + shadow expansion | |
| Buttons have active press feedback | |
| Nav has frosted glass treatment | |
| Color palette is warm and consistent (no cold grays mixed with warm tones) | |
| Shadows are subtle and warm (not default Bootstrap) | |
| Border-radius is consistent across same component types | |

### Atmosphere Check

| Check | PASS/FAIL |
|---|---|
| Background has subtle warmth (not flat white/gray) | |
| Grain overlay is present and subtle (felt, not seen) | |
| Section alternation creates rhythm (not all same background) | |
| No flat, dead-feeling sections remain | |

### Motion Check

| Check | PASS/FAIL |
|---|---|
| Hero elements animate in on page load (staggered fade-up-deblur) | |
| Scroll reveals trigger on below-fold sections | |
| All buttons have hover transitions (not instant state change) | |
| All cards have hover lift | |
| Nav links have animated underlines | |
| Input focus has border glow transition | |
| No animation uses CSS keyword easing (ease, ease-in, ease-out, ease-in-out) | |
| `prefers-reduced-motion` is respected (no motion on reduce) | |

### Responsive Check

| Check | PASS/FAIL |
|---|---|
| Layout works at 1440px (desktop) | |
| Layout works at 768px (tablet) | |
| Layout works at 375px (mobile) | |
| No horizontal overflow at any viewport | |
| Touch targets minimum 44px on mobile | |
| Heading doesn't wrap beyond 3 lines at any viewport | |
| Cards stack properly on mobile (single column) | |

### Rollback Check

| Check | PASS/FAIL |
|---|---|
| Removing gold.css import reverts ALL visual changes cleanly | |
| No existing CSS files were deleted (they're intact as fallback) | |
| No JSX structural changes were made (only className and data-* additions) | |
| The user can accept or reject the entire upgrade as one unit | |

---

## The Slop Catalog - Common Patterns and Their Cures

Quick-reference for the most common aesthetic crimes. Look up the pattern, apply the cure.

| Slop Pattern | The Crime | The Cure |
|---|---|---|
| `font-family: Arial, Helvetica, sans-serif` | Body font as display font | Import Outfit/Satoshi/Cabinet Grotesk for headings |
| `color: #000; background: #fff` | Pure black-on-white | `color: #1a1a1a; background: #FAFAF9` |
| `background: #0d6efd` | Bootstrap primary blue | Choose a brand-appropriate accent color |
| `box-shadow: 0 2px 4px rgba(0,0,0,0.1)` | Generic default shadow | `box-shadow: 0 1px 3px rgba(0,0,0,0.04)` at rest, expand on hover |
| `border-radius: 4px` | Bootstrap default radius | Commit to a radius language: 8/12/16/9999 |
| `border: 1px solid #dee2e6` | Cool gray border | `border: 1px solid rgba(0,0,0,0.08)` - warm, subtle |
| `transition: all 0.15s ease-in-out` | Bootstrap default transition | `transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1)` |
| `padding: 1rem` on a card | Cramped card padding | `padding: 2rem` minimum - cards need to breathe |
| `margin-bottom: 0.5rem` heading→body | Cramped heading gap | `margin-bottom: 1.5rem` - let the heading land |
| `gap: 1rem` in a card grid | Tight grid gap | `gap: 1.5rem` minimum - cards need separation |
| No `:hover` on buttons | Dead, unresponsive buttons | `translateY(-2px) + shadow expansion + custom easing` |
| No `:hover` on cards | Static, lifeless cards | `translateY(-4px) + shadow expansion + border glow` |
| No entry animation | Instant static mount | Staggered fade-up-deblur on above-fold elements |
| `h1 { font-size: 2rem }` | Undersized heading | `font-size: clamp(2.25rem, 5vw, 3.75rem)` |
| `line-height: 1.2` on headings | Too loose for display | `line-height: 1.05` - tight, architectural |
| No letter-spacing on headings | Loose, amateur tracking | `letter-spacing: -0.03em` - tighten |
| `py-3` section padding | Cramped sections | `py-20 md:py-32` - sections are chapters, not paragraphs |
| Zebra-striped tables | 2010 Bootstrap energy | Kill stripes, add subtle hover row highlight |
| `.badge { font-size: 0.75em }` | Tiny, cramped badges | `padding: 0.25rem 0.75rem; font-size: 0.75rem; border-radius: 9999px` |
| No `::placeholder` styling on inputs | Default gray placeholder | `color: var(--color-text-3); opacity: 0.7` |

---

## Edge Cases

### When the code uses CSS-in-JS (styled-components, Emotion)

1. Apply token prescriptions as a CSS custom property layer (`:root` variables)
2. Override styled-component styles via a global `createGlobalStyle` that references the tokens
3. For component-level overrides, add a `gold-overrides.ts` file with styled-component overrides
4. Never modify the existing styled-component definitions inline - create override wrappers

### When the code uses Tailwind CSS

1. Override Tailwind's `theme` in `tailwind.config.js` with the gold tokens (colors, fonts, radii, shadows)
2. Use `@layer utilities` for atmosphere and motion additions
3. Replace Tailwind color classes systematically: `text-gray-900` → `text-[#1a1a1a]` or define custom colors in config
4. Replace `shadow-sm` / `shadow-md` → custom shadow values in config
5. Replace `rounded` / `rounded-md` → custom radii in config
6. This is the safest approach for Tailwind because it changes the design system at the config level, not in every component file

### When the code uses Material UI / Chakra / Ant Design

1. Override the theme provider configuration - these libraries are designed for theme customization
2. Focus on the theme object: colors, typography, spacing, radii, shadows
3. Add component-level `sx` overrides or `styled()` wrappers for atmosphere and motion
4. Never fight the component library's structure - work within its theming system

### When the code is vanilla HTML/CSS (no framework)

1. Add `gold.css` as the LAST stylesheet in the `<head>`
2. Use CSS specificity to override existing styles without editing them
3. If existing styles use `!important`, your overrides may need `!important` too (unfortunate but necessary)
4. Add the ScrollReveal script as a `<script>` before `</body>`

### When the user says "just make the hero look good"

Do NOT upgrade the entire site. Apply the pipeline to the hero section only:
1. Audit the hero component
2. Extract its current design decisions
3. Prescribe the gold replacements for that section
4. Execute surgery on that section's CSS
5. Verify nothing else broke

Respect the user's scope. Upgrading more than asked wastes time and introduces risk.

---

## The Core Principles

> **The patient must survive.** A beautiful app that no longer functions is worse than an ugly app that works. Test after every surgery layer. Functionality always trumps aesthetics.

> **CSS overrides, never JS rewrites.** Your tools are className changes, new CSS files, and data-attributes. You do not rewrite component logic, refactor state management, or restructure JSX hierarchies. If a visual upgrade requires changing JS logic, find a CSS-only alternative.

> **The gold.css is a single unit.** One file, loaded last, that contains the entire visual upgrade. The user can add it (upgrade) or remove it (revert) with a single import. This is the surgical philosophy: clean entry, clean exit.

> **Warmth over neutrality.** Every premium design uses warm tones - off-white backgrounds, warm near-black text, warm gray borders. Cold neutrals (pure gray, pure white, pure black) feel clinical and undesigned. The fastest single upgrade is replacing the color temperature.

> **Spacing is the secret.** The single change that has the most dramatic impact is increasing spacing - section padding, card padding, heading gaps, grid gaps. Cramped spacing is the hallmark of amateur design. Generous spacing is the hallmark of premium design. When in doubt, add more space.

> **Display fonts separate amateurs from professionals.** Swapping the heading font from Arial/system-ui to a proper display font (Outfit, Satoshi, Cabinet Grotesk, Clash Display) is the highest-impact single change. Everything else builds on this foundation.

---
