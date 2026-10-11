# PULSE Design System & Token Specification

**Precision User Latency & Stimulus Evaluator**  
*Visual Identity & Interface Design Specification — Version 2.2*

---

## 1. Design Philosophy & Aesthetic Core
PULSE's visual language is that of a **precision scientific telemetry platform**. It rejects generic SaaS tropes, blurry drop shadows, and arbitrary purple gradients in favor of high-contrast observatory dark grounds, crisp tabular typography, and tactical stimulus feedback signals.

---

## 2. Surfaces & Elevation Tokens

| Token | Effective Dark Mode Value (desktop and mobile) | Light Mode Status | Usage |
| :--- | :--- | :--- | :--- |
| `--surface-0` (Base) | `#08080A` | Inactive — global settings force dark mode | Global viewport ground |
| `--surface-1` (Panels) | `#12171F` | Inactive — global settings force dark mode | Cards, test apparatus, navigation bars |
| `--surface-2` (Inputs) | `#1A212B` | Inactive — global settings force dark mode | Secondary controls, metric trays, active cards |
| `--surface-3` (Elevated)| `#222B38` | Inactive — global settings force dark mode | Popovers, tooltips, modal dialogs |

### Border Strategy
- Effective dark-mode borders: `--border-subtle` is `rgba(255, 255, 255, 0.08)`, `--border-default` is `#1F2732`, and `--border-strong` is `#2A3442`. These values are set by `src/styles/pulse-aesthetic.css`, loaded after `src/index.css`.
- Contrast is created through stepped tonal backgrounds rather than heavy drop shadows.

---

## 3. Palette & Semantic Color Signals

| Signal Role | Dark Mode Value | Light Mode Value | Semantic Meaning |
| :--- | :--- | :--- | :--- |
| **Signal Cyan (Primary Accent)** | `#00F0FF` | Inactive — theme is dark-only | Primary instrument indicators, interactive highlights |
| **Accent Hover** | `#33F3FF` | Inactive — theme is dark-only | Hover feedback |
| **Accent Subtle** | `rgba(0, 240, 255, 0.12)` | Inactive — theme is dark-only | Tag fills and telemetry backgrounds |
| **Provenance Green (Validated)**| `#10B981` | Inactive — theme is dark-only | Validated response; HMAC-signed record; pass |
| **Awaiting / Standby** | `#F59E0B` | Inactive — theme is dark-only | Test preparation; countdown; waiting state |
| **Stimulus Active** | `#FFFFFF` against a dark surrounding surface | Inactive — theme is dark-only | Active stimulus onset requiring instantaneous response |
| **Fault / False Start** | `#EF4444` | Inactive — theme is dark-only | Anticipatory trigger ($<80\text{ms}$); premature click |

---

## 4. Typography Hierarchy

| Role | Font Family | Tracking | Purpose |
| :--- | :--- | :--- | :--- |
| **Display / Headlines** | `Space Grotesk, sans-serif` | `-0.015em` to `0` | Section headings, modal titles, instrument labels |
| **Body & UI** | `system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif` | `normal` | Global body and UI text in the current stylesheet |
| **Numeric & Telemetry** | `JetBrains Mono, monospace` | `tabular-nums` | All latencies, sample counts, percentiles, timestamps |

---

## 5. Official Brand Mark (The P-Symbol)

The PULSE brand symbol consists of two synchronized geometric vector primitives:
1. **Upper Arch / Loop (S1):** A horizontal flat bar extending into a rounded outer shoulder and circular inner counter.
2. **Lower Stem (S2):** An angled vertical parallelogram with parallel $35.3^\circ$ diagonal cuts framing a negative space velocity channel.

```tsx
import { PulseLogo, StimulusReticle } from '@/components/brand';

// Standalone Vector Mark
<PulseLogo variant="mark" size={24} color="#00F0FF" />

// Horizontal Lockup
<PulseLogo variant="horizontal" size={28} />

// State-Aware Interactive Reticle
<StimulusReticle state="idle" size={32} />
```

---

## 6. Interaction & Motion Rules
1. **Zero Animation During Stimuli:** No transitions or layout reflows may occur between stimulus presentation and response capture.
2. **Tactile Feedback:** Custom interactive controls must provide visible pressed feedback (`:active`, such as `active:scale-[0.98]`, or a color/border change) and a visible `:focus-visible` indicator. Prefer semantic buttons/links; do not assume every existing control already complies.
3. **Reduced Motion Compliance:** Use `<MotionConfig reducedMotion={settings.reducedMotionEnabled ? 'always' : 'user'}>` for Motion components. The global CSS also disables CSS animations and transitions when `prefers-reduced-motion` or the app setting is active. New animation systems must preserve these rules.


## 7. Canonical Token Source and Measurement Exception

- Runtime token precedence is determined by the actual stylesheet import order: `src/main.tsx` imports `src/index.css` and then `src/styles/pulse-aesthetic.css`; the latter bridges semantic tokens to `src/brand/tokens.css`. Treat the effective values in this document as current runtime values, and verify both desktop and mobile imports before changing them.
- `src/lib/settingsStore.ts` currently forces `themeMode` to `dark`. Light-mode CSS declarations remain in the stylesheets but are not an active global user-selectable theme; do not build theme-switching behavior based solely on those declarations.
- During an active reaction stimulus, transitions/animations on the stimulus apparatus and changing stimulus/timer/status text are forbidden because they can delay the visible stimulus. Preserve `transition-none` in `STIMULUS_ACTIVE` state in both reaction-test implementations. Browser frame timestamps estimate onset; they are not direct physical display measurements.
