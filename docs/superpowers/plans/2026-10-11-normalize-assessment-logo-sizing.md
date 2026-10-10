# Normalize & Upscale Assessment Logo Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure all 5 assessment protocol logos have mathematically uniform visual weight and appear noticeably larger and bolder across desktop and mobile components.

**Architecture:**
1. **Asset Normalization (Root Cause)**: The 5 PNGs currently have vastly different amounts of transparent padding (artwork sizes range from 685px to 954px). We will crop each image to its exact non-transparent bounding box and center-scale it on a 1024x1024 canvas so that the maximum dimension of every mark is exactly 920px (90% fill factor). This guarantees 1:1 visual uniformity and eliminates dead space.
2. **UI Component Sizing Adjustments**: Increase CSS sizing classes across desktop and mobile layouts:
   - `src/components/Assessments.tsx`: Increase card mark from `w-20 h-20` (80px) to `w-26 h-26` (104px) for prominent visual impact.
   - `mobile/src/components/Assessments.tsx`: Reduce icon container padding from `p-2` to `p-1` and enlarge mark container from `w-12 h-12` to `w-13 h-13`.
   - `src/components/About.tsx`: Increase protocol card mark from `w-5 h-5` (20px) to `w-6 h-6` (24px).
   - `src/components/Dataset.tsx`: Increase protocol tab mark from `w-3.5 h-3.5` (14px) to `w-4 h-4` (16px).
   - `mobile/src/components/Dataset.tsx`: Increase protocol tab mark from `w-3 h-3` (12px) to `w-3.5 h-3.5` (14px).
   - `src/components/Leaderboard.tsx`: Increase active protocol header mark from `w-5 h-5` (20px) to `w-6 h-6` (24px).
   - `mobile/src/components/Leaderboard.tsx`: Increase active protocol header mark from `w-4 h-4` (16px) to `w-5 h-5` (20px).

**Tech Stack:** React 19, Vite, Tailwind CSS v4, TypeScript, Python 3 / PIL (Lanczos resampling)

**Spec:** User mandate: "Make the assessment logos a bit bigger and uniform sized".

## Global Constraints
- High-quality Lanczos resampling during scaling to preserve crisp edges and neon glow detail.
- Zero transparent haloing or clipping: center each mark with 5% safety margin on all sides (90% bounding box fill).
- Both `public/brand/assessments/` and `mobile/public/brand/assessments/` must remain in sync.
- Both desktop and mobile projects must pass `npm run check` and `npm run build`.

---

### Task 1: Normalize PNG Assets in Desktop and Mobile Public Folders

**Files:**
- Modify: `public/brand/assessments/*.png`
- Sync: `mobile/public/brand/assessments/*.png`

**Interfaces:**
- Consumes: Existing transparent PNGs in `public/brand/assessments/`
- Produces: Normalized 1024x1024 RGBA PNGs with uniform 920px (90%) maximum artwork dimension.

- [ ] **Step 1: Execute normalization script**
Run a Python PIL script using `Image.Resampling.LANCZOS`:
- Open each of the 5 PNGs (`visual-reaction.png`, `directional-choice.png`, `colour-recognition.png`, `block-memory.png`, `number-memory.png`).
- Crop tightly to `img.getbbox()`.
- Scale proportionally such that `max(width, height) == 920` px.
- Paste centered onto a transparent 1024x1024 RGBA canvas.
- Save to `public/brand/assessments/` and copy to `mobile/public/brand/assessments/`.

- [ ] **Step 2: Verify asset dimensions and visual uniformity**
Run verification script checking all 5 files in both directories:
Confirm canvas is 1024x1024 and max artwork dimension is exactly 920-921px.

---

### Task 2: Adjust Desktop UI Component Sizing

**Files:**
- Modify: `src/components/Assessments.tsx`
- Modify: `src/components/About.tsx`
- Modify: `src/components/Dataset.tsx`
- Modify: `src/components/Leaderboard.tsx`

**Interfaces:**
- Consumes: Normalized `/brand/assessments/*.png` assets
- Produces: Proportionately larger and crisper rendered images

- [ ] **Step 1: Update src/components/Assessments.tsx**
In line 145, change `w-20 h-20` to `w-26 h-26`:
```tsx
<img 
  src={assessment.logo} 
  alt={assessment.title}
  className="w-26 h-26 object-contain relative z-10 group-hover:scale-105 transition-transform duration-300"
/>
```

- [ ] **Step 2: Update src/components/About.tsx**
In line 136, update icon size from `w-5 h-5` to `w-6 h-6`:
```tsx
<div className="w-9 h-9 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center p-1">
  <img src={proto.logo} alt={proto.title} className="w-6 h-6 object-contain" />
</div>
```

- [ ] **Step 3: Update src/components/Dataset.tsx**
In line 159, update tab mark size from `w-3.5 h-3.5` to `w-4 h-4`:
```tsx
<img src={p.logo} alt={p.name} className="w-4 h-4 object-contain" />
```

- [ ] **Step 4: Update src/components/Leaderboard.tsx**
In line 146, update active protocol mark from `w-5 h-5` to `w-6 h-6`:
```tsx
<img src={currentProto.logo} alt={currentProto.name} className="w-6 h-6 object-contain shrink-0" />
```

---

### Task 3: Adjust Mobile UI Component Sizing

**Files:**
- Modify: `mobile/src/components/Assessments.tsx`
- Modify: `mobile/src/components/Dataset.tsx`
- Modify: `mobile/src/components/Leaderboard.tsx`

- [ ] **Step 1: Update mobile/src/components/Assessments.tsx**
In line 118, change container from `w-12 h-12` with `p-2` to `w-13 h-13` with `p-1`:
```tsx
<div className="w-13 h-13 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 p-1">
  <img 
    src={assessment.logo} 
    alt={assessment.title}
    className="w-full h-full object-contain"
  />
</div>
```

- [ ] **Step 2: Update mobile/src/components/Dataset.tsx**
In line 174, update tab mark from `w-3 h-3` to `w-3.5 h-3.5`:
```tsx
<img src={p.logo} alt={p.name} className="w-3.5 h-3.5 object-contain" />
```

- [ ] **Step 3: Update mobile/src/components/Leaderboard.tsx**
In line 139, update header mark from `w-4 h-4` to `w-5 h-5`:
```tsx
<img src={currentProto.logo} alt={currentProto.name} className="w-5 h-5 object-contain shrink-0" />
```

---

### Task 4: Verification and Build Validation

- [ ] **Step 1: Run TypeScript typecheck**
Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 2: Run production build**
Run: `npm run build`
Expected: 0 errors across Vite desktop, Vite mobile, SEO static generation, and server build.
