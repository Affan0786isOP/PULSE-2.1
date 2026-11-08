# Uniform 720p Baseline Aspect Ratio Scaling for Fixed-Viewport Stages & Desktop Pages

## Scope & Intent
This rule governs responsive scaling across desktop views ($W \ge 768\text{px}$) in the PULSE application, guaranteeing geometric proportions, eliminating vertical clipping, and maintaining a canonical 1280×720 baseline.

---

## 1. The Core Invariant: 1280×720 Canonical Baseline
When authoring or styling desktop views intended to fit within a single screen (`100dvh` / `h-screen`), layouts must be designed against a canonical **1280×720 (16:9)** baseline.

### Scaling Equation
For desktop viewports ($W \ge 768\text{px}$):
$$\text{scale} = \min\left(\frac{W}{1280}, \frac{H}{720}\right)$$

This guarantees:
1. **Zero Vertical Clipping:** On compact laptops (e.g. 1366×768 or 1280×720), the stage scales down so buttons, pagination dots, and headers never fall below the fold.
2. **Zero Carousel / Perspective Misalignment:** Proportions, margins, and card perspectives authored for 720p stay 100% geometrically identical on 1080p, 1440p, 4K, and ultrawide screens.
3. **No Brittle Breakpoint Hacks:** Eliminates complex, fragile `clamp()` equations and media-query overrides.

---

## 2. Container Styling Equation
When `scale !== 1`, apply CSS `zoom` and an inversely compensated `minHeight`:
```tsx
style={scale !== 1 ? {
  zoom: scale,
  minHeight: `calc(100dvh / ${scale})`
} : undefined}
```
*Note on `minHeight`: Dividing `100dvh` by `scale` correctly maps the full physical viewport height into the scaled coordinate space.*

---

## 2b. First-Fold Stage Inside Scrollable Pages (Hybrid Layout Invariant)
When a fixed-viewport first stage (such as the Hero) is followed by below-the-fold scrollable content inside a zoom-scaled `PageShell`:
1. **CSS Viewport Unit Limitation:** Raw CSS units like `100dvh` or `calc(100dvh - 5rem)` evaluate against the unscaled physical window height, creating large vertical offsets inside elements transformed by CSS `zoom`.
2. **Exact Stage Height Formula:** To ensure the first-fold stage centers its content identically to `origin/main`'s fixed viewport baseline across all screen resolutions, the desktop stage height must be dynamically computed:
   $\text{stageHeight} = \frac{\text{viewportHeight}}{\text{scale}} - \text{navbarHeight} - \text{paddingBottom}$
3. **Implementation Pattern:**
   ```tsx
   const { scale } = useBaselineScale();
   const [viewportHeight, setViewportHeight] = React.useState<number>(() =>
     typeof window !== 'undefined' ? window.innerHeight : 900
   );
   const heroStyle: React.CSSProperties = typeof window !== 'undefined' && window.innerWidth >= 768
     ? {
         minHeight: `${(viewportHeight / scale) - 88}px`,
         height: `${(viewportHeight / scale) - 88}px`,
       }
     : {};
   ```
4. **Visual Measurement Verification Gate:** When restoring or modifying stage positioning, do not guess with arbitrary margins or paddings. Run automated headless measurements against the baseline reference (`getBoundingClientRect()`) across viewports (1440x900, 1920x1080, 1366x768, 1280x800) to confirm a $\le 0.05\text{px}$ delta before committing.

---

## 3. Strict Mobile Breakpoint Fallback ($W < 768\text{px}$)
For screen widths under `768px`:
- `scale` MUST strictly be `1`.
- Do NOT apply CSS `zoom` on mobile viewports.
- Allow natural vertical document scrolling (`overflow-y-auto`) and stacked vertical flow suited for touch and mobile browser chrome.

---

## 4. Application Scope & Safeguards

- **APPLIED BY DEFAULT TO ALL DESKTOP PAGES VIA `PageShell`:**
  - Homepage (`src/components/Home.tsx`): Hero section, 3D assessment carousel, narrative sections.
  - Cognitive Assessments (`ReactionTest`, `DirectionTest`, `BlockMemoryTest`, `NumberMemoryTest`, `ColorTest`): Ready screens, active apparatus stimulus wells (`#12161B`), and performance report cards.
  - Platform Views (`Assessments.tsx`, `Leaderboard.tsx`, `Dataset.tsx`, `About.tsx`, `Improve.tsx`, `ResearchPrivacyPolicy.tsx`, `NotFound.tsx`, etc.).

- **SAFEGUARDS WHEN SCALING DATA TABLES, LONG TEXT & OVERLAYS:**
  1. **Floating Modals & Dialogs (`SettingsModal`, `WelcomeModal`, `AddToHomeScreenModal`):**
     Must use React Portals (`createPortal(..., document.body)`) to mount outside the scaled `PageShell` container, or apply internal viewport containment (`max-h-[85vh]`, `overflow-y-auto`) so CSS zoom does not distort modal backdrop or centering.
  2. **Data Tables & Dense Data Boards (`Leaderboard.tsx`, `Dataset.tsx`):**
     Ensure tables wrap columns with fluid truncation (`truncate`, `min-w-0`), horizontal overflow containers (`overflow-x-auto`), and avoid hardcoded fixed pixel widths that could exceed the scaled coordinate boundary.
  3. **Escape Hatch (`disableScaling={true}`):**
     If a view explicitly requires unscaled 1:1 browser rendering, pass `disableScaling={true}` to `PageShell`:
     ```tsx
     <PageShell currentView="custom" disableScaling={true}>
       ...
     </PageShell>
     ```

---

## 5. Standard Implementation Pattern
The scaling hook is located at [`src/lib/useBaselineScale.ts`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/useBaselineScale.ts):
```tsx
import { useBaselineScale } from '../lib/useBaselineScale';

export function MyFixedStage() {
  const { scale, isScaled, style } = useBaselineScale({
    baseWidth: 1280,
    baseHeight: 720,
    minBreakpoint: 768,
  });

  return (
    <div style={style} className="h-[100dvh] overflow-x-hidden ...">
      {/* 1280x720 baseline stage content */}
    </div>
  );
}
```
*Note: Any view wrapped in `PageShell` automatically receives this scaling on desktop ($W \ge 768\text{px}$) unless `disableScaling={true}` is set.*
