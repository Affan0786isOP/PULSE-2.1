# PULSE Design System & Token Specification

**Precision User Latency & Stimulus Evaluator**  
*Visual Identity & Interface Design Specification — Version 2.2*

---

## 1. Design Philosophy & Aesthetic Core
PULSE's visual language is that of a **precision scientific telemetry platform**. It rejects generic SaaS tropes, blurry drop shadows, and arbitrary purple gradients in favor of high-contrast observatory dark grounds, crisp tabular typography, and tactical stimulus feedback signals.

---

## 2. Surfaces & Elevation Tokens

| Token | Dark Mode (Observatory Slate) | Light Mode (Laboratory Crisp) | Usage |
| :--- | :--- | :--- | :--- |
| `--surface-0` (Base) | `#090C10` | `#F8FAFC` | Global viewport ground |
| `--surface-1` (Panels) | `#12171F` | `#FFFFFF` | Cards, test apparatus, navigation bars |
| `--surface-2` (Inputs) | `#1A212B` | `#F1F5F9` | Secondary controls, metric trays, active cards |
| `--surface-3` (Elevated)| `#242E3B` | `#E2E8F0` | Popovers, tooltips, modal dialogs |

### Border Strategy
- Crisp 1px borders using `--border-subtle` (`#1F2732` dark / `#E2E8F0` light) and `--border-default` (`#2A3442` dark / `#CBD5E1` light).
- Contrast is created through stepped tonal backgrounds rather than heavy drop shadows.

---

## 3. Palette & Semantic Color Signals

| Signal Role | Dark Mode Value | Light Mode Value | Semantic Meaning |
| :--- | :--- | :--- | :--- |
| **Signal Cyan (Primary Accent)** | `#00F0FF` / `#22C7D6` | `#0284C7` | Primary instrument indicators, interactive highlights |
| **Accent Hover** | `#35D4E1` | `#0369A1` | Hover state transitions |
| **Accent Subtle** | `rgba(34, 199, 214, 0.10)` | `rgba(2, 132, 199, 0.10)` | Low-contrast tag fills, telemetry backgrounds |
| **Provenance Green (Validated)**| `#10B981` | `#16A34A` | Validated response; HMAC-signed record; pass |
| **Awaiting / Standby** | `#F59E0B` | `#D97706` | Test preparation; countdown; waiting state |
| **Stimulus Active** | `#FFFFFF` (or `#38BDF8`) | `#0F172A` | Active stimulus onset requiring instantaneous response |
| **Fault / False Start** | `#EF4444` | `#DC2626` | Anticipatory trigger ($<80\text{ms}$); premature click |

---

## 4. Typography Hierarchy

| Role | Font Family | Tracking | Purpose |
| :--- | :--- | :--- | :--- |
| **Display / Headlines** | `Space Grotesk, sans-serif` | `-0.015em` to `0` | Section headings, modal titles, instrument labels |
| **Body & UI** | `Inter, system-ui, sans-serif` | `normal` | Body copy, navigation items, instructions |
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
2. **Tactile Feedback:** All interactive buttons and cards implement immediate `:active` scale reduction (`active:scale-[0.98]`).
3. **Reduced Motion Compliance:** Wrapped in `<MotionConfig reducedMotion={settings.reducedMotionEnabled ? 'always' : 'user'}>`. Ambient motion is fully suppressed when requested.
