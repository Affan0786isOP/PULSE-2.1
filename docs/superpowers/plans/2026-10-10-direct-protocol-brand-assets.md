# Direct Protocol Brand Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate converted React JSX inline SVGs for the protocol assessment logos, delete `<AssessmentIcon />`, and use the canonical SVG assets in `public/brand/assessments/` directly across desktop and mobile components via standard `<img>` tags.

**Architecture:** Remove `AssessmentIcon.tsx` and its export references. Directly reference `/brand/assessments/*.svg` in `About.tsx`, `Dataset.tsx`, `Leaderboard.tsx`, and their mobile counterparts, matching the direct `<img>` pattern already used in `Assessments.tsx` and `Home.tsx`. Keep `PulseLogo.tsx` intact for the main PULSE brand symbol.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, TypeScript

**Spec:** Direct user requirement: "remove only the svgs of the protocol logos, use the ones in the C:\Users\affan\OneDrive\Documents\PULSE\v2.1 GIT\public\brand directly, dont convert them".

## Global Constraints
- Do NOT convert protocol SVGs into React components or inline JSX paths.
- Remove converted SVG implementations (`AssessmentIcon.tsx` in desktop and mobile).
- Retain `PulseLogo.tsx` (the main PULSE brand P-symbol mark).
- Use the 5 canonical SVGs directly via static URL paths (`/brand/assessments/*.svg`):
  - Protocol 01: `/brand/assessments/visual-reaction.svg`
  - Protocol 02: `/brand/assessments/directional-choice.svg`
  - Protocol 03: `/brand/assessments/colour-recognition.svg`
  - Protocol 04: `/brand/assessments/block-memory.svg`
  - Protocol 05: `/brand/assessments/number-memory.svg`
- Ensure zero TypeScript compiler errors (`npm run check`) and verified build (`npm run build`).

## Review Focus
1. Desktop `About.tsx`: Protocol cards render `<img src="/brand/assessments/*.svg">` without broken images or layout shift.
2. Desktop `Dataset.tsx`: Protocol tab buttons display the respective direct SVG mark inside each button.
3. Desktop `Leaderboard.tsx`: Active protocol header displays the protocol SVG mark next to the protocol name.
4. Mobile `Dataset.tsx` & `Leaderboard.tsx`: Protocol selector tabs and header titles load direct SVG marks correctly.
5. Removal of `AssessmentIcon`: No dangling imports or exports in `src/components/brand/` or `mobile/src/components/brand/`.

---

### Task 1: Delete Converted AssessmentIcon Components and Update Brand Barrels

**Files:**
- Delete: `src/components/brand/AssessmentIcon.tsx`
- Delete: `mobile/src/components/brand/AssessmentIcon.tsx`
- Modify: `src/components/brand/index.ts`
- Modify: `mobile/src/components/brand/index.ts`

**Interfaces:**
- Consumes: None
- Produces: Clean brand module exports exporting only `PulseLogo` and `StimulusReticle` (desktop).

- [ ] **Step 1: Remove AssessmentIcon.tsx from src and mobile**
Delete `src/components/brand/AssessmentIcon.tsx` and `mobile/src/components/brand/AssessmentIcon.tsx`.

- [ ] **Step 2: Update brand index barrels**
In `src/components/brand/index.ts`:
Remove `export * from './AssessmentIcon';`.
In `mobile/src/components/brand/index.ts`:
Remove `export * from './AssessmentIcon';`.

- [ ] **Step 3: Verify deletion**
Run: `git status` to verify `AssessmentIcon.tsx` files are removed and `index.ts` files updated.

---

### Task 2: Implement Direct SVGs in Desktop Components (About, Dataset, Leaderboard)

**Files:**
- Modify: `src/components/About.tsx`
- Modify: `src/components/Dataset.tsx`
- Modify: `src/components/Leaderboard.tsx`

**Interfaces:**
- Consumes: `/brand/assessments/*.svg` static assets served from `public/brand/assessments/`
- Produces: Direct `<img>` rendering for protocol marks

- [ ] **Step 1: Update src/components/About.tsx**
Remove `AssessmentIcon` import.
Add `logo` to `PROTOCOLS`:
```ts
const PROTOCOLS = [
  {
    id: 'reaction-test',
    title: 'Visual Reaction',
    description: 'Measures simple visual reaction time with high-resolution frame-aligned timestamps and display latency offset calibration.',
    metric: 'Latency (ms)',
    logo: '/brand/assessments/visual-reaction.svg'
  },
  {
    id: 'direction-test',
    title: 'Directional Choice',
    description: 'Evaluates choice reaction time and directional discrimination under rapid stimulus presentation.',
    metric: 'Choice Speed (ms)',
    logo: '/brand/assessments/directional-choice.svg'
  },
  {
    id: 'colour-recognition',
    title: 'Colour Recognition',
    description: 'Tests selective attention, cognitive flexibility, and conflict processing using chromatic stimulus tasks.',
    metric: 'Latency (ms)',
    logo: '/brand/assessments/colour-recognition.svg'
  },
  {
    id: 'block-memory',
    title: 'Block Memory',
    description: 'Assesses visuospatial working memory sequence capacity using calibrated sequential block intervals.',
    metric: 'Spatial Span',
    logo: '/brand/assessments/block-memory.svg'
  },
  {
    id: 'number-memory',
    title: 'Number Memory',
    description: 'Evaluates short-term working memory capacity with adaptive forward digit sequences.',
    metric: 'Digit Span',
    logo: '/brand/assessments/number-memory.svg'
  }
];
```
In line 132, replace `<AssessmentIcon protocol={proto.id} size={20} />` with:
```tsx
<img src={proto.logo} alt={proto.title} className="w-5 h-5 object-contain" />
```

- [ ] **Step 2: Update src/components/Dataset.tsx**
Remove `AssessmentIcon` import.
Add `logo` to `PROTOCOLS`:
```ts
const PROTOCOLS: { id: AssessmentId; name: string; unit: string; logo: string }[] = [
  { id: 'visual-reaction', name: 'VISUAL REACTION', unit: 'ms', logo: '/brand/assessments/visual-reaction.svg' },
  { id: 'direction', name: 'DIRECTION', unit: 'ms', logo: '/brand/assessments/directional-choice.svg' },
  { id: 'colour-recognition', name: 'COLOUR RECOGNITION', unit: 'ms', logo: '/brand/assessments/colour-recognition.svg' },
  { id: 'block-memory', name: 'BLOCK MEMORY', unit: 'Blocks', logo: '/brand/assessments/block-memory.svg' },
  { id: 'number-memory', name: 'NUMBER MEMORY', unit: 'Digits', logo: '/brand/assessments/number-memory.svg' },
];
```
In line 160, replace `<AssessmentIcon ... />` with:
```tsx
<img src={p.logo} alt={p.name} className="w-3.5 h-3.5 object-contain" />
```

- [ ] **Step 3: Update src/components/Leaderboard.tsx**
Remove `AssessmentIcon` import.
Add `logo` to `PROTOCOLS`:
```ts
const PROTOCOLS: { id: AssessmentType; route: string; name: string; unit: string; logo: string }[] = [
  { id: 'visual-reaction', route: 'reaction-test', name: 'VISUAL REACTION', unit: 'ms', logo: '/brand/assessments/visual-reaction.svg' },
  { id: 'direction', route: 'direction-test', name: 'DIRECTION', unit: 'ms', logo: '/brand/assessments/directional-choice.svg' },
  { id: 'color-recognition', route: 'colour-recognition', name: 'COLOUR RECOGNITION', unit: 'ms', logo: '/brand/assessments/colour-recognition.svg' },
  { id: 'block-memory', route: 'block-memory', name: 'BLOCK MEMORY', unit: 'Blocks', logo: '/brand/assessments/block-memory.svg' },
  { id: 'number-memory', route: 'number-memory', name: 'NUMBER MEMORY', unit: 'Digits', logo: '/brand/assessments/number-memory.svg' },
];
```
In line 148, replace `<AssessmentIcon protocol={currentProto.id} size={20} className="shrink-0" />` with:
```tsx
<img src={currentProto.logo} alt={currentProto.name} className="w-5 h-5 object-contain shrink-0" />
```

---

### Task 3: Implement Direct SVGs in Mobile Components (Dataset, Leaderboard)

**Files:**
- Modify: `mobile/src/components/Dataset.tsx`
- Modify: `mobile/src/components/Leaderboard.tsx`

**Interfaces:**
- Consumes: `/brand/assessments/*.svg` static assets served from `mobile/public/brand/assessments/`
- Produces: Direct `<img>` rendering for protocol marks in mobile views

- [ ] **Step 1: Update mobile/src/components/Dataset.tsx**
Remove `AssessmentIcon` import.
Add `logo` to `PROTOCOLS`:
```ts
const PROTOCOLS: { id: AssessmentId; name: string; unit: string; logo: string }[] = [
  { id: 'visual-reaction', name: 'VISUAL REACTION', unit: 'ms', logo: '/brand/assessments/visual-reaction.svg' },
  { id: 'direction', name: 'DIRECTION', unit: 'ms', logo: '/brand/assessments/directional-choice.svg' },
  { id: 'colour-recognition', name: 'COLOUR RECOGNITION', unit: 'ms', logo: '/brand/assessments/colour-recognition.svg' },
  { id: 'block-memory', name: 'BLOCK MEMORY', unit: 'Blocks', logo: '/brand/assessments/block-memory.svg' },
  { id: 'number-memory', name: 'NUMBER MEMORY', unit: 'Digits', logo: '/brand/assessments/number-memory.svg' },
];
```
In line 176, replace `<AssessmentIcon ... />` with:
```tsx
<img src={p.logo} alt={p.name} className="w-3 h-3 object-contain" />
```

- [ ] **Step 2: Update mobile/src/components/Leaderboard.tsx**
Remove `AssessmentIcon` import.
Add `logo` to `PROTOCOLS`:
```ts
const PROTOCOLS: { id: AssessmentType; route: string; name: string; shortName: string; unit: string; logo: string }[] = [
  { id: 'visual-reaction', route: 'reaction-test', name: 'VISUAL REACTION', shortName: 'Reaction', unit: 'ms', logo: '/brand/assessments/visual-reaction.svg' },
  { id: 'direction', route: 'direction-test', name: 'DIRECTION', shortName: 'Direction', unit: 'ms', logo: '/brand/assessments/directional-choice.svg' },
  { id: 'color-recognition', route: 'colour-recognition', name: 'COLOUR RECOGNITION', shortName: 'Colour', unit: 'ms', logo: '/brand/assessments/colour-recognition.svg' },
  { id: 'block-memory', route: 'block-memory', name: 'BLOCK MEMORY', shortName: 'Block Mem', unit: 'Blocks', logo: '/brand/assessments/block-memory.svg' },
  { id: 'number-memory', route: 'number-memory', name: 'NUMBER MEMORY', shortName: 'Number Mem', unit: 'Digits', logo: '/brand/assessments/number-memory.svg' },
];
```
In line 141, replace `<AssessmentIcon protocol={currentProto.id} size={16} className="shrink-0" />` with:
```tsx
<img src={currentProto.logo} alt={currentProto.name} className="w-4 h-4 object-contain shrink-0" />
```

---

### Task 4: Verification and Build Validation

**Files:**
- None (verification across entire workspace)

- [ ] **Step 1: Verify no lingering references to AssessmentIcon**
Run: `git grep "AssessmentIcon"`
Expected: No occurrences in code.

- [ ] **Step 2: Run typechecks**
Run: `npm run check`
Expected: 0 errors across root and mobile TypeScript projects.

- [ ] **Step 3: Run full build**
Run: `npm run build`
Expected: 0 errors across desktop Vite bundle, mobile Vite bundle, SEO page pre-renderer, and server bundle.
