# PULSE Identity System & Export-Ready Asset Guide

**Precision User Latency & Stimulus Evaluator**  
*Master Brand Specification — Version 2.2 (Official Logo Integration)*

---

## 1. Executive Direction & The Official P-Symbol

PULSE is a high-precision cognitive assessment platform, research data engine, and cryptographic latency benchmark suite.

- **The Official Logo Mark:** The geometric **P-Symbol** — composed of two synchronized vector primitives:
  1. **Upper Arch / Loop (S1)**: A flat top horizontal bar with a smooth rounded outer shoulder and inner counter.
  2. **Lower Stem (S2)**: An angled vertical parallelogram/chevron with parallel $35.3^\circ$ diagonal cuts framing a high-velocity negative space channel.
- **The Core Metaphor:** Precision cognitive stimulus transmission, directional velocity, and neural latency assessment.
- **Tonal Universe:** High-precision scientific telemetry, observatory dark grounds (`#08080A`, `#12171F`), Signal Cyan (`#00F0FF`), Provenance Green (`#10B981`), Titanium White (`#F8FAFC`), and Muted Slate (`#7E808C`).

---

## 2. Export-Ready Brand Assets Catalog

| Asset | Path | Format | Usage & Resolution |
| :--- | :--- | :--- | :--- |
| **Primary Logo** | [`/public/brand/pulse-reticle-logo.svg`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/public/brand/pulse-reticle-logo.svg) | Vector SVG | Official standalone P-symbol mark |
| **Favicon (Desktop)** | [`/public/favicon.svg`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/public/favicon.svg) | Vector SVG | Browser tab icon on obsidian squircle |
| **Favicon (Mobile)** | [`/mobile/public/favicon.svg`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/public/favicon.svg) | Vector SVG | Mobile web browser tab icon |
| **App Icon (Squircle)** | [`/public/brand/app-icon.svg`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/public/brand/app-icon.svg) | Vector SVG | 512×512 PWA & mobile app icon with squircle |
| **Horizontal Lockup** | [`/public/brand/pulse-lockup-horizontal.svg`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/public/brand/pulse-lockup-horizontal.svg) | Vector SVG | P-symbol + wide geometric wordmark `PULSE` |
| **Stacked Master Lockup** | [`/public/brand/pulse-lockup-stacked.svg`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/public/brand/pulse-lockup-stacked.svg) | Vector SVG | Centered P-symbol on dark base + wordmark + telemetry label |

---

## 3. Geometric Specification of the P-Symbol

In normalized $100 \times 100$ coordinate space:

```svg
<!-- S1: Upper Loop / Arch -->
<path d="M 12 8 L 61 8 C 75.9 8 88 20.1 88 35 C 88 49.9 75.9 62 61 62 L 46 62 L 46 45 L 61 45 C 66.5 45 71 40.5 71 35 C 71 29.5 66.5 25 61 25 L 12 25 Z" fill="#00F0FF" />

<!-- S2: Lower Slanted Stem Parallelogram -->
<path d="M 12 55 L 36 38 L 36 75 L 12 92 Z" fill="#00F0FF" />
```

- **Top Bar**: Thickness = $17$ units, starts horizontally at $y = 8$, extends to $x = 61$.
- **Outer Curve**: Symmetrical semi-ellipse/arc from $(61, 8)$ to $(88, 35)$ to $(61, 62)$ (height = $54$).
- **Inner Counter**: Semi-circle from $(61, 25)$ to $(71, 35)$ to $(61, 45)$ (height = $20$).
- **Lower Stem**: Width = $24$ units ($x \in [12, 36]$). Both top and bottom cuts slope upward to the right with slope $\approx -0.708$ ($35.3^\circ$).
- **Vertical Slot**: Clean $10$-unit horizontal gap between the stem ($x = 36$) and the bottom return ($x = 46$).

---

## 4. Color Token System

Preserved laboratory color tokens:
- **Obsidian Ground**: `#08080A`
- **Graphite Surface**: `#12171F`
- **Signal Cyan (Primary Accent)**: `#00F0FF`
- **Provenance Green (HMAC Validated)**: `#10B981`
- **Titanium White (Display/Text)**: `#F8FAFC`
- **Muted Slate (Telemetry Labels)**: `#7E808C`

---

## 5. React Components Usage

```tsx
import { PulseLogo, StimulusReticle } from '@/components/brand';

// Standalone Mark
<PulseLogo variant="mark" size={24} color="#00F0FF" />

// Horizontal Lockup
<PulseLogo variant="horizontal" size={28} />

// Stacked Lockup
<PulseLogo variant="stacked" size={54} />

// State-Aware Reactive Stimulus Component
<StimulusReticle state="idle" size={32} />
```

All navigation bars (`Navbar.tsx`, `mobile/src/components/Navbar.tsx`, `mobile/src/components/Home.tsx`, `WelcomeModal.tsx`, `AdminLayout.tsx`) now use the unified `PulseLogo` component.
