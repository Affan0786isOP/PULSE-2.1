# Direct Protocol Brand PNGs (Transparent Background) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the black backgrounds from the 5 newly provided protocol PNGs in `public/brand/assessments/`, rename them to standard kebab-case names, sync them to `mobile/public/brand/assessments/`, remove all converted React SVG components (`AssessmentIcon.tsx`), and wire direct `<img>` usage across desktop and mobile components.

**Architecture:**
1. Process the 5 new PNGs in `public/brand/assessments/` using Python PIL to convert black backgrounds to transparent alpha (RGBA) with smooth edge transitions, and save them directly as:
   - `visual-reaction.png` (from `VISUAL TEST FINAL LOGO.png`)
   - `directional-choice.png` (from `DIRECTION TEST FINAL LOGO.png`)
   - `colour-recognition.png` (from `COLOR TEST FINAL LOGO.png`)
   - `block-memory.png` (from `BLOCK MEMORY FINAL LOGO.png`)
   - `number-memory.png` (from `NUMBER FINAL LOGO.png`)
2. Synchronize these 5 transparent PNGs to `mobile/public/brand/assessments/` and delete old SVGs.
3. Delete `src/components/brand/AssessmentIcon.tsx` and `mobile/src/components/brand/AssessmentIcon.tsx`.
4. Update `About`, `Dataset`, `Leaderboard`, `Assessments`, `Home`, and `assessmentsHero.ts` to directly reference `/brand/assessments/*.png` via standard `<img>` tags.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, TypeScript, Python 3 / PIL (for background removal)

**Spec:** User mandate: "remove their backgrounds when using,, and kebab case copies work, rename these only, update the plan".

## Asset Mapping
| Original Upload Name | Kebab-Case Target Name | Protocol | Route |
| :--- | :--- | :--- | :--- |
| `VISUAL TEST FINAL LOGO.png` | `visual-reaction.png` | Protocol 01 | `/reaction-test` |
| `DIRECTION TEST FINAL LOGO.png` | `directional-choice.png` | Protocol 02 | `/direction-test` |
| `COLOR TEST FINAL LOGO.png` | `colour-recognition.png` | Protocol 03 | `/colour-recognition` |
| `BLOCK MEMORY FINAL LOGO.png` | `block-memory.png` | Protocol 04 | `/block-memory` |
| `NUMBER FINAL LOGO.png` | `number-memory.png` | Protocol 05 | `/number-memory` |

## Global Constraints
- Remove solid black background completely from the PNGs so all corners and background areas are transparent (`alpha = 0`).
- Use kebab-case names (`visual-reaction.png`, etc.) and delete the raw spaced upload files after processing.
- Delete converted JSX SVGs (`AssessmentIcon.tsx`).
- Keep `PulseLogo.tsx` intact for the main PULSE brand symbol.
- Both desktop and mobile projects must typecheck cleanly (`npm run check`) and build cleanly (`npm run build`).

---

### Task 1: Background Removal and Kebab-Case Renaming of Protocol PNGs

**Files:**
- Modify/Create in: `public/brand/assessments/`
- Sync to: `mobile/public/brand/assessments/`

**Interfaces:**
- Consumes: Raw uploaded PNGs in `public/brand/assessments/`
- Produces: Transparent RGBA PNGs (`visual-reaction.png`, `directional-choice.png`, `colour-recognition.png`, `block-memory.png`, `number-memory.png`) in both desktop and mobile public directories.

- [ ] **Step 1: Process images and remove black backgrounds**
Run a Python PIL script to process the 5 PNGs:
- Convert to RGBA.
- For pixels with RGB <= background threshold (pure black/near-black), set `alpha = 0`.
- For anti-aliased edge pixels, smoothly scale alpha and unmultiply RGB to prevent dark fringe.
- Save as `visual-reaction.png`, `directional-choice.png`, `colour-recognition.png`, `block-memory.png`, `number-memory.png`.
- Remove the spaced raw files (`VISUAL TEST FINAL LOGO.png`, etc.).

- [ ] **Step 2: Sync to mobile/public/brand/assessments/**
Copy the 5 transparent PNGs to `mobile/public/brand/assessments/` and remove old SVG files from that directory.

- [ ] **Step 3: Verify image transparency**
Run PIL verification script to confirm all 5 images in both folders have RGBA mode and `alpha = 0` at all 4 corners.

---

### Task 2: Remove Converted AssessmentIcon Components

**Files:**
- Delete: `src/components/brand/AssessmentIcon.tsx`
- Delete: `mobile/src/components/brand/AssessmentIcon.tsx`
- Modify: `src/components/brand/index.ts`
- Modify: `mobile/src/components/brand/index.ts`

- [ ] **Step 1: Delete AssessmentIcon.tsx files**
Delete `src/components/brand/AssessmentIcon.tsx` and `mobile/src/components/brand/AssessmentIcon.tsx`.

- [ ] **Step 2: Update barrel index exports**
Remove `export * from './AssessmentIcon';` from `src/components/brand/index.ts` and `mobile/src/components/brand/index.ts`.

---

### Task 3: Update Desktop Components to Use Transparent PNGs

**Files:**
- Modify: `src/data/assessmentsHero.ts`
- Modify: `src/components/Assessments.tsx`
- Modify: `src/components/About.tsx`
- Modify: `src/components/Dataset.tsx`
- Modify: `src/components/Leaderboard.tsx`

- [ ] **Step 1: Update src/data/assessmentsHero.ts**
Change all `logo: '/brand/assessments/*.svg'` paths to `/brand/assessments/*.png`.

- [ ] **Step 2: Update src/components/Assessments.tsx**
Change all `logo: '/brand/assessments/*.svg'` paths to `/brand/assessments/*.png`.

- [ ] **Step 3: Update src/components/About.tsx**
Remove `AssessmentIcon` import.
Add `logo: '/brand/assessments/*.png'` to `PROTOCOLS` definitions.
Replace `<AssessmentIcon protocol={proto.id} size={20} />` with:
```tsx
<img src={proto.logo} alt={proto.title} className="w-5 h-5 object-contain" />
```

- [ ] **Step 4: Update src/components/Dataset.tsx**
Remove `AssessmentIcon` import.
Add `logo: '/brand/assessments/*.png'` to `PROTOCOLS` definitions.
Replace `<AssessmentIcon ... />` with:
```tsx
<img src={p.logo} alt={p.name} className="w-3.5 h-3.5 object-contain" />
```

- [ ] **Step 5: Update src/components/Leaderboard.tsx**
Remove `AssessmentIcon` import.
Add `logo: '/brand/assessments/*.png'` to `PROTOCOLS` definitions.
Replace `<AssessmentIcon ... />` with:
```tsx
<img src={currentProto.logo} alt={currentProto.name} className="w-5 h-5 object-contain shrink-0" />
```

---

### Task 4: Update Mobile Components to Use Transparent PNGs

**Files:**
- Modify: `mobile/src/components/Home.tsx`
- Modify: `mobile/src/components/Assessments.tsx`
- Modify: `mobile/src/components/Dataset.tsx`
- Modify: `mobile/src/components/Leaderboard.tsx`

- [ ] **Step 1: Update mobile/src/components/Home.tsx**
Change `HERO_ASSESSMENTS` logo paths from `.svg` to `.png`.

- [ ] **Step 2: Update mobile/src/components/Assessments.tsx**
Change `assessments` logo paths from `.svg` to `.png`.

- [ ] **Step 3: Update mobile/src/components/Dataset.tsx**
Remove `AssessmentIcon` import.
Add `logo: '/brand/assessments/*.png'` to `PROTOCOLS`.
Replace `<AssessmentIcon ... />` with:
```tsx
<img src={p.logo} alt={p.name} className="w-3 h-3 object-contain" />
```

- [ ] **Step 4: Update mobile/src/components/Leaderboard.tsx**
Remove `AssessmentIcon` import.
Add `logo: '/brand/assessments/*.png'` to `PROTOCOLS`.
Replace `<AssessmentIcon ... />` with:
```tsx
<img src={currentProto.logo} alt={currentProto.name} className="w-4 h-4 object-contain shrink-0" />
```

---

### Task 5: Verification & Full Build Validation

- [ ] **Step 1: Scan for residual AssessmentIcon imports**
Run: `git grep "AssessmentIcon"`
Expected: 0 matches.

- [ ] **Step 2: TypeScript typecheck**
Run: `npm run check`
Expected: 0 errors across root and mobile.

- [ ] **Step 3: Production build**
Run: `npm run build`
Expected: Clean exit code 0 across desktop bundle, mobile bundle, SEO static shells, and server build.
