# PULSE Design System & Token Specification

**Precision User Latency & Stimulus Evaluator**  
*Visual Identity & Interface Design Specification — Version 2.2*

---

## 1. Design Philosophy & Aesthetic Core
PULSE's visual language is a **light-first precision scientific telemetry platform**. Use clean white and pale-blue surfaces, deep ink typography, a confident electric-blue primary accent, precise borders, and restrained shadows. Avoid dark panels in ordinary application surfaces, arbitrary purple gradients, and decorative motion that compromises assessment clarity.

---

## 2. Surfaces & Elevation Tokens

| Token | Canonical Light Value | Usage |
| :--- | :--- | :--- |
| `--surface-0` (Base) | `#FFFFFF` | Global viewport ground |
| `--surface-1` (Panels) | `#FFFFFF` | Cards, test apparatus, navigation bars |
| `--surface-2` (Soft) | `#F4F9FF` | Secondary controls, metric trays, soft panels |
| `--surface-3` (Elevated) | `#EAF3FD` | Selected cards, popovers, elevated states |

### Border Strategy
- Use quiet light-mode borders: `--border-subtle` is `#D9E6F5`, `--border-default` is `#CBD5E1`, and `--border-strong` is `#B8CDE6`. Surface contrast should come from subtle tonal differences rather than heavy shadows.
- Contrast is created through stepped tonal backgrounds rather than heavy drop shadows.

---

## 3. Palette & Semantic Color Signals

| Signal Role | Canonical Light Value | Semantic Meaning |
| :--- | :--- | :--- |
| **Primary Accent / Signal Blue** | `#0066FF` | Primary actions, interactive highlights, focus rings |
| **Accent Hover** | `#0052CC` | Hover feedback |
| **Accent Subtle** | `rgba(0, 102, 255, 0.10)` | Soft tag fills, selected-state backgrounds |
| **Provenance Green (Validated)** | `#059669` | Validated response, success and positive status |
| **Awaiting / Standby** | `#D97706` | Test preparation, countdown and waiting state |
| **Stimulus Active** | Protocol-specific high-contrast signal | The active cue must be immediately distinguishable against its apparatus |
| **Fault / False Start** | `#DC2626` | Anticipatory trigger ($<80\text{ms}$), error and failure states |

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
<PulseLogo variant="mark" size={24} color="#0066FF" />

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

- The canonical design is light-first and applied globally. Desktop imports `src/index.css` followed by `src/styles/pulse-aesthetic.css`, which bridges semantic variables to `src/brand/tokens.css`. Mobile uses `mobile/src/index.css` with matching semantic values. Keep those token values synchronized, and do not introduce a dark theme toggle without a new product decision.
- Both settings stores, first-paint HTML bootstrap scripts, logo defaults, status-bar metadata, and PWA manifests must initialize the light palette. The mobile home hero is the visual reference for the palette; other mobile screens and all desktop routes must follow the same system.
- During an active reaction stimulus, transitions/animations on the stimulus apparatus and changing stimulus/timer/status text are forbidden because they can delay the visible stimulus. Preserve `transition-none` in `STIMULUS_ACTIVE` state in both reaction-test implementations. Browser frame timestamps estimate onset; they are not direct physical display measurements.
- High-contrast stimulus states, colored success/error feedback, and dark translucent backdrops may remain when they serve a distinct interaction or protocol purpose. They are not permission to leave whole cards, navigation, admin panels, or ordinary screens in the old dark theme.
