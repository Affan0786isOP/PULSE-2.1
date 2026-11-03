---
name: dark-mode-engineering
description: Complete dark mode design and engineering system for web and mobile applications. Combines atmospheric color theory and WCAG accessibility standards (elevation tints, contrast ratios, saturation dampening, dynamic environment theming) with dual-strategy implementation architectures (Tailwind CSS utility classes vs CSS custom property tokens, dark mode flash prevention, cross-surface parity, and bug debugging). Use when designing dark themes, implementing dark mode toggles, auditing theme contrast, or resolving theme synchronization bugs.
---

# Dark Mode Engineering

Unified architecture for designing, implementing, and debugging production-grade dark mode systems.

## When to Use & Routing

Evaluate whether the task is aesthetic/thematic design or code-level implementation:

1. **Aesthetic Theming, Palette Design & WCAG Contrast**
   - **Scope:** Crafting atmospheric dark palettes (slate, deep navy, obsidian vs pure black #000000), surface elevation layering with subtle white opacity overlays, desaturating vibrant accent colors for dark surfaces, and ensuring WCAG AA/AAA contrast ratios.
   - **Reference File:** Read [design.md](references/design.md) for color models, atmospheric palettes, typography weight adjustments, and accessibility matrices.

2. **Code Implementation, Dual-Strategy Token Architectures & Bug Fixes**
   - **Scope:** Implementing dark mode via Tailwind CSS class strategy (dark:...) versus CSS Custom Properties (--bg-surface), preventing Flash of Unstyled Theme (FOUT/SSR theme mismatch), multi-surface synchronization (web, React Native, electron), and fixing hardcoded hex overrides.
   - **Reference File:** Read [implementation.md](references/implementation.md) for theme provider setup, token maps, SSR hydration scripts, and the bug troubleshooting registry.

## Core Universal Invariants
1. **Never Pure Black for Surfaces:** Use off-blacks (#0f172a, #121212, #0b0f19) to preserve depth perception and reduce eye strain. Pure black #000000 is reserved strictly for OLED battery savings when requested.
2. **Elevation via Light, Not Shadow:** Dark surfaces cannot cast dark shadows. Express depth and elevation by lightening surface background colors (1-5% white tints per elevation layer).
3. **Desaturate Brand Colors:** Saturated light-mode colors vibrate jarringly on dark backgrounds. Lower saturation by 10-20% and increase lightness slightly for dark-mode accents.
4. **Prevent SSR Theme Flash:** Always execute an inline synchronous script in <head> to inspect localStorage and prefers-color-scheme before rendering body DOM.
