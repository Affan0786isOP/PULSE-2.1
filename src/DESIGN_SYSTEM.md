# PULSE Design Decision Sheet & Design System

**Precision User Latency and Stimulus Evaluator**
Visual Identity: A deliberately designed scientific human-performance evaluation platform communicating precision, scientific credibility, and measurement integrity.

---

## 1. Ground & Surfaces

| Token | Dark Mode (Observatory Slate) | Light Mode (Laboratory Crisp) | Purpose |
| :--- | :--- | :--- | :--- |
| `--surface-0` (Base) | `#090C10` (Cool deep slate) | `#F8FAFC` (Architectural slate white) | Global viewport ground |
| `--surface-1` (Panels) | `#12171F` (Subtle elevation) | `#FFFFFF` (Clean crisp surface) | Cards, test apparatus, navigation |
| `--surface-2` (Inputs/Active) | `#1A212B` (Tactile depth) | `#F1F5F9` (Recessed slate) | Secondary controls, metric trays |
| `--surface-3` (Elevated) | `#242E3B` | `#E2E8F0` | Popovers, tooltips, dialogs |

### Border Strategy
- Flat, defined 1px borders using `--border-subtle` (`#1F2732` dark / `#E2E8F0` light) and `--border-default` (`#2A3442` dark / `#CBD5E1` light).
- Strict rejection of the "border + wide blur drop shadow" cliché. Hierarchy is established through tonal surface steps, not blurry dropshadow halos.

---

## 2. Palette & Semantic Signals

| Role | Color Value (Dark / Light) | Semantic Meaning |
| :--- | :--- | :--- |
| **Accent / Telemetry** | `#22C7D6` / `#0284C7` | Primary instrument indicators, reticles, interactive highlights |
| **Accent Hover** | `#35D4E1` / `#0369A1` | Hover state transition |
| **Accent Subtle** | `rgba(34, 199, 214, 0.10)` | Low-contrast tag fills, telemetry backgrounds |
| **Awaiting / Idle** | `#F59E0B` / `#D97706` | Standby state; preparing test stimulus; countdown |
| **Stimulus Active** | `#FFFFFF` / `#0F172A` (or `#38BDF8`) | Active stimulus presentation requiring instantaneous reflex |
| **Success / Validated** | `#10B981` / `#16A34A` | Validated response recorded; streak maintained; pass |
| **Fault / False Start** | `#EF4444` / `#DC2626` | Anticipatory trigger; premature click; invalidated trial |

*Rule:* Zero arbitrary indigo/purple gradient pairs (`#667eea` to `#764ba2`, `#6366f1`).

---

## 3. Typography & Hierarchy

| Role | Font Family | Optical Characteristics |
| :--- | :--- | :--- |
| **Body & UI** | `Inter, system-ui, sans-serif` | Clean, neutral legibility. Line height 1.5–1.6. |
| **Display / Instrument** | `Space Grotesk, sans-serif` | Technical instrument character. Tracking `-0.015em` to `0` (never crushed past -0.05em). |
| **Numeric & Telemetry** | `JetBrains Mono, monospace` | Strictly tabular (`tabular-nums`). For all latencies, percentiles, sample sizes, and timestamps. |

### Scale Steps
- Micro telemetry: `text-[11px]` font-mono (caps, tracking `0.05em`)
- Body secondary: `text-xs` (12px) / `text-sm` (14px)
- Standard body: `text-base` (16px)
- Instrument readout: `text-xl` (20px) / `text-2xl` (24px)
- Hero / Primary metric: `text-4xl` (36px) / `text-5xl` (48px)
- Contrast ratio between smallest and largest active type step is > 2.5x to eliminate flat type scale warnings.

---

## 4. Space & Geometry

- Base 4px module (4, 8, 12, 16, 24, 32, 48, 64px).
- Container outer padding $\ge$ inner child padding (no padding conflicts).
- Corner Radii: Cards `rounded-md` (6px) or `rounded-lg` (8px). Pills and telemetry tags `rounded-md` (6px).
- Mathematical corner radius nesting: $\text{Inner} = \text{Outer} - \text{Padding}$.

---

## 5. Interaction States & Tactility

- **Active State Rule:** Every interactive control (button, option card, clickable tab) MUST implement `:active` (e.g., `active:scale-[0.98]` or `active:translate-y-[1px]`) for immediate tactile receipt on pointer-down.
- **Focus Rule:** Focus-visible outline with 2px ring at 3:1 contrast (`--focus-ring`). No `outline-none` without `:focus-visible`.
- **Semantic HTML:** `<button>` for actions, `<a>` for navigation. No plain `div` onClick without complete ARIA and keyboard handling.

---

## 6. Motion & Scientific Integrity

- **Zero Timing Interference:** No animations during active stimulus presentation or measurement intervals. Stimulus onset is instantaneous (hardware-timed).
- **No Decorative Motion:** No ambient `animate-pulse` or bouncing purely for "liveliness". Motion occurs solely when state changes.
- **Layout Safety:** Progress bars and dynamic widths animate via `scaleX(...)` or `opacity` transforms to avoid forcing browser layout reflows on every frame.
- **Easing:** Swift deceleration (`ease-out` or `cubic-bezier(0.16, 1, 0.3, 1)`). Never `ease-in` on arriving elements.
- **Reduced Motion:** Fully suppressed when `prefers-reduced-motion` is active or `data-reduced-motion="true"` is set.

---

## 7. Signatures

- **Hardware Calibrator Tag:** Displays confirmed refresh rate (`144 Hz`) and display frame onset latency offset (`6.94 ms`).
- **Precision Reticle Crosshairs:** Subtle laboratory grid alignment markers in the canvas background.
- **Millisecond Tabular Logs:** Real-time trial breakdown with mean, median, IQR, and standard deviation.
