# Assessment SEO & UX Content System Implementation Plan (Revision 5.1)

## Goal
Add an SEO and informational content system to all five public PULSE assessment pages (`/reaction-test`, `/direction-test`, `/colour-recognition`, `/block-memory`, `/number-memory`). The system provides search crawlers with complete, crawlable semantic articles on initial load and gives visitors an accessible on-demand information dialog `[ⓘ]`, without contaminating active assessment timers, duplicating content in the client DOM, or making unsupported scientific claims.

## Key Invariants & Architectural Rules

1. **Accessible Dialog Semantic Structure**:
   - `AssessmentInfoPanel.tsx` uses a semantic modal dialog:
     ```html
     <div
       id="assessment-info-panel"
       role="dialog"
       aria-modal="true"
       aria-labelledby="assessment-info-title"
     >
     ```
   - While closed, the dialog preserves focus and accessibility safety using:
     `inert aria-hidden="true" pointer-events-none translate-x-full`
   - When opened, `inert` is removed, `aria-hidden` becomes `"false"`, focus shifts to the close button, and `Escape` closes the dialog, returning focus to the trigger button.

2. **Build-Generated Static HTML Delivery & User-Facing Value**:
   - Build-generated static HTML shells (`scripts/generate-seo-pages.mjs`) inject the complete semantic article inside `<main id="pulse-seo-shell"> <article id="assessment-seo-article">...</article> </main>` before client bootstrap.
   - The static HTML article uses the heading sequence `<h1>` (page title) -> `<h2>` (sections) -> `<h3>` (FAQs).
   - Invariant: The article is genuine, helpful user-facing documentation accessible to visitors via the `[ⓘ]` trigger. The drawer accessibility state (`inert`, `aria-hidden`) is an interactive UI mechanism, not an SEO cloaking or rank-manipulation trick.

3. **Universal Active Assessment State Invariant**:
   - Do not assume an `AssessmentHeaderBar` exists. Inspect each assessment layout and either extend its existing header structure or introduce a cleanly reusable header component without forcing breaking abstractions.
   - The information trigger `[ⓘ]` is available only when the assessment is NOT active:
     ```typescript
     const isAssessmentActive = engineState !== 'READY' && engineState !== 'REPORT' && engineState !== 'UNMOUNTED';
     ```
     This invariant handles all PULSE engine states:
     - Reaction: `STARTING`, `AWAITING_STIMULUS`, `STIMULUS_ACTIVE`, `TRIAL_COMPLETE`
     - Direction: `STARTING`, `AWAITING_STIMULUS`, `STIMULUS_ACTIVE`, `TRIAL_COMPLETE`
     - Colour: `STARTING`, `STIMULUS_ACTIVE`, `FEEDBACK`
     - Block Memory: `STARTING`, `SHOWING`, `INPUT`, `SUCCESS`, `FAILED`
     - Number Memory: `STARTING`, `SHOWING`, `INPUT`, `SUCCESS`, `FAILED`
   - In active states (`isAssessmentActive === true`), the trigger is disabled (`disabled={true}`) with an explanatory tooltip/title ("Complete current trial before viewing details"). No event handler pauses, alters, or touches test timers or trial records.

4. **Pre-Test Access for Block Memory and Number Memory**:
   - In `BlockMemoryTest` and `NumberMemoryTest`, autostart countdown triggers immediately once demographic selection completes.
   - Do not alter `startCountdown()` or the session timing lifecycle.
   - Instead, allow `AgeSelection` to optionally render the assessment info trigger when provided with an `assessmentId`:
     ```tsx
     <AgeSelection assessmentId="block-memory" onSelect={...} />
     ```
     This allows visitors to inspect test rules and methodology before countdown begins, keeping the timing engine untouched.

5. **Retire Legacy Guide in `ColorTest.tsx`**:
   - `ColorTest.tsx` currently has `showGuide`, `openGuide()`, and an existing modal that interrupts tests.
   - Retire and remove this legacy modal and its triggers in favor of the unified `AssessmentInfoPanel`. Colour Recognition ends up with a single information system.

6. **Heading Hierarchy Separation (No Duplicate H1)**:
   - Static Shell: `<h1>` (article/page title) -> `<h2>` (sections) -> `<h3>` (FAQs).
   - Interactive Client Dialog: `<h2>` (panel title `id="assessment-info-title"`) -> `<h3>` (sections) -> `<h4>` (FAQs) to preserve the page's existing test `<h1 className="sr-only">`.

7. **Scoped Single Source of Truth**:
   - `shared/content/assessmentContent.json` is the sole source of truth for assessment SEO/informational article copy, FAQ copy, and related-resource copy (not global UI copy).
   - Keyed directly by canonical route (e.g. `"/reaction-test"`), without redundant inner `route` keys.
   - Both `scripts/generate-seo-pages.mjs` and `src/components/AssessmentInfoPanel.tsx` consume this exact file.

8. **Grounded Scientific Claims & Hardware Nuance**:
   - Metadata title for `/reaction-test`: `Reaction Time Test | Visual Reaction Test | PULSE` (targeting the primary organic search intent around reaction time testing).
   - Avoid keyword-stuffing justifications; treat titles as strong search signals.
   - Hardware discussion explains that input-device polling, display refresh intervals, browser rendering, wireless transmission, and operating system scheduling contribute to latency variance, without citing specific peripheral polling examples (such as 125Hz vs 1000Hz).
   - The display refresh adjustment ($frameTimeMs / 2$) is described specifically as an estimated mathematical model, not a hardware measurement.
   - No clinical, ADHD, diagnostic, or medical claims.

9. **Repository Privacy & Clean JSON-LD**:
   - All references to public GitHub repositories and "open-source" claims are removed from metadata and static templates.
   - In JSON-LD structured data, the `sameAs` property is removed completely (not emitted as `sameAs: []`).

10. **Tested Link Invariant**:
    - Every canonical assessment article must contain at least one real same-site `<a href="...">` link to another valid PULSE route.
    - Verified by automated unit tests.

## Architecture

```
Initial Response (Build-Generated Static HTML)
└── <main id="pulse-seo-shell">
      <article id="assessment-seo-article">
        <h1>...title...</h1>
        <h2>...sections...</h2>
        <h3>...faqs...</h3>
        <a href="...">...real crawlable same-site links...</a>
      </article>
    </main>

Client Bootstrap (React mounts via createRoot)
└── document.getElementById('pulse-seo-shell')?.remove()
└── <div id="root">
      <h1 className="sr-only">Assessment Name</h1>
      <!-- Header with [ⓘ] trigger disabled when isAssessmentActive -->
      <div
        id="assessment-info-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assessment-info-title"
        inert
        aria-hidden="true"
      >
        <article id="assessment-seo-article">
          <h2 id="assessment-info-title">...panel title...</h2>
          <h3>...sections...</h3>
          <h4>...faqs...</h4>
          <a href="...">...real crawlable same-site links...</a>
        </article>
      </div>
    </div>
```

## Shared Content Data Model

Defined in `shared/types/assessmentContent.ts`:
```typescript
export interface AssessmentSection {
  id: string;
  heading: string;
  paragraphs: string[];
  listItems?: string[];
}

export interface AssessmentFaq {
  question: string;
  answer: string;
}

export interface AssessmentRelatedLink {
  path: string;
  label: string;
  description: string;
}

export interface AssessmentArticle {
  assessmentId: string;
  title: string;
  subtitle: string;
  sections: AssessmentSection[];
  faq: AssessmentFaq[];
  relatedLinks: AssessmentRelatedLink[];
}

export type AssessmentContentMap = Record<string, AssessmentArticle>;
```

Structure of `shared/content/assessmentContent.json`:
```json
{
  "/reaction-test": {
    "assessmentId": "visual-reaction",
    "title": "Visual Reaction Time Test",
    "subtitle": "Benchmark visual response latency with sub-millisecond precision",
    "sections": [...],
    "faq": [...],
    "relatedLinks": [...]
  },
  "/direction-test": {
    "assessmentId": "direction",
    "title": "Directional Choice Reaction Test",
    "subtitle": "Measure visual discrimination and motor response speed",
    "sections": [...],
    "faq": [...],
    "relatedLinks": [...]
  },
  "/colour-recognition": {
    "assessmentId": "color-recognition",
    "title": "Colour Recognition & Interference Test",
    "subtitle": "Evaluate selective attention with an interactive Stroop-style conflict task",
    "sections": [...],
    "faq": [...],
    "relatedLinks": [...]
  },
  "/block-memory": {
    "assessmentId": "block-memory",
    "title": "Block Memory Test",
    "subtitle": "Assess spatial sequence memory through progressive 9-block tapping patterns",
    "sections": [...],
    "faq": [...],
    "relatedLinks": [...]
  },
  "/number-memory": {
    "assessmentId": "number-memory",
    "title": "Number Memory Test",
    "subtitle": "Benchmark short-term digit recall capacity across increasing numerical sequences",
    "sections": [...],
    "faq": [...],
    "relatedLinks": [...]
  }
}
```

## SEO Metadata
Update `shared/seoMetadata.json` with grounded claims:
- `/`: `PULSE: Precision User Latency & Stimulus Evaluator` (Description: "A browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond-resolution timing.")
- `/reaction-test`: `Reaction Time Test | Visual Reaction Test | PULSE` (Description: "Benchmark visual reaction time using PULSE's browser-based reaction test, featuring randomized stimulus delays and an estimated display refresh adjustment.")
- `/direction-test`: `Directional Choice Test: Response Speed | PULSE` (Description: "Measure directional choice reaction time and accuracy with PULSE's directional arrow assessment.")
- `/colour-recognition`: `Colour Recognition Test: Stroop Task | PULSE` (Description: "Evaluate selective attention and cognitive conflict with PULSE's interactive colour recognition assessment.")
- `/block-memory`: `Block Memory Test: Spatial Sequence Recall | PULSE` (Description: "Test spatial sequence recall with PULSE's 9-block tapping assessment.")
- `/number-memory`: `Number Memory Test: Forward Digit Recall | PULSE` (Description: "Measure working memory capacity with PULSE's forward digit span assessment.")

## Static Prerendering
`scripts/generate-seo-pages.mjs` updates:
1. Remove `sameAs` completely from JSON-LD schema objects.
2. Render assessment articles into `<main id="pulse-seo-shell">`:
   - Header with `<h1>` and description.
   - `<article id="assessment-seo-article">` containing `<h2>` sections and bullet points.
   - FAQ block with `<h3>` questions and paragraph answers.
   - Related resources with real `<a href="...">` links.
3. Emit output to `dist/seo/*.html` and `dist/seo/mobile/*.html`.

## Accessibility & Dialog Behavior
- **Trigger**: `aria-label="About this assessment and methodology"`, `aria-expanded={isOpen}`, `aria-controls="assessment-info-panel"`.
- **Closed Dialog**:
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby="assessment-info-title"`.
  - `inert`, `aria-hidden="true"`, `pointer-events-none`, `translate-x-full`.
  - Active focus guard prevents keyboard traversal into the closed dialog.
- **Open Dialog**:
  - `inert` removed, `aria-hidden="false"`.
  - Focus moves to the close button.
  - Backdrop blocks interaction with underlying assessment apparatus.
  - `Escape` key closes the dialog and restores focus to `[ⓘ]`.
- **Headings**:
  - Static Shell: `<h1>` -> `<h2>` -> `<h3>`.
  - Dialog: `<h2>` (`id="assessment-info-title"`) -> `<h3>` -> `<h4>`.

## Timing & Measurement Protection
- Central invariant:
  ```typescript
  const isAssessmentActive = engineState !== 'READY' && engineState !== 'REPORT' && engineState !== 'UNMOUNTED';
  ```
- When `isAssessmentActive === true`:
  - `[ⓘ]` trigger is disabled (`disabled={true}`) with informative title attribute.
  - Click/keyboard triggers are rejected.
  - No timer pause, trial reset, or dataset modification can occur.

## Assessment Content Details

### 1. Reaction Time (`/reaction-test`)
- Search intent: Primary organic search intent around reaction time testing (`reaction time test`, `visual reaction test`).
- Sections:
  1. *What is Reaction Time?*: Sensory stimulus perception, cognitive processing, and motor response.
  2. *How the PULSE Test Works*: 10 trials, randomized foreperiod delay between 100ms and 3000ms (`generateVrtForeperiod`) split into short and long intervals to prevent anticipation, spacebar/touch response.
  3. *How Results Are Measured*: Monotonic millisecond timestamps from stimulus onset to input event, adjusted by an estimated display refresh midpoint offset ($frameTimeMs / 2$). Explains that this offset is a model-derived estimate, not a physical hardware sensor measurement.
  4. *Factors That Influence Results*: Sleep, caffeine, fatigue, time of day, posture, and focus.
  5. *Hardware Latency Variance*: Explains that input-device polling, display refresh intervals, browser rendering passes, wireless transmission, and operating system scheduling introduce variable latency, and clarifies that PULSE accounts for display frame intervals but cannot eliminate local hardware transmission delays.
  6. *Consistent Testing Habits*: Using wired peripherals, testing under consistent conditions, and closing resource-heavy background apps.
  7. *Interpreting Your Score*: Median vs average latency, consistency score, and false-start penalties (responses under 80ms).
  8. *Browser Testing Limitations*: Notes high-resolution browser timing precision versus laboratory physiological accuracy; explicitly states this is not a medical or neurological diagnostic tool.
  9. *Frequently Asked Questions*: Answers common questions on device differences, training effects, and false start rules.

### 2. Directional Choice (`/direction-test`)
- Sections:
  1. *What is Choice Reaction Time?*: Directional discrimination combined with motor decision speed.
  2. *How the Test Works*: 10 trials with random arrows (UP, DOWN, LEFT, RIGHT), 1000ms–3000ms randomized foreperiod, response via arrow keys or touch buttons.
  3. *Scoring & Speed-Accuracy Tradeoff*: Average response time on correct choices, overall accuracy percentage, and trial count.
  4. *Performance Factors & Limitations*: Spatial compatibility effects, keyboard ergonomics, input switch travel, and display latency.
  5. *Frequently Asked Questions*: Explaining simple vs choice reaction differences.

### 3. Colour Recognition (`/colour-recognition`)
- Sections:
  1. *What the Task Measures*: Cognitive conflict when reading an automatic word versus naming its ink color (Stroop effect).
  2. *How the Test Works*: 15 rounds alternating between matching word meaning and font ink color, using five shuffled color buttons.
  3. *Scoring & Interference*: Average latency, accuracy, and interference cost (latency gap between conflicting and congruent rounds).
  4. *Viewing Factors & Limitations*: Display brightness, color calibration, visual search time; clarifies that this is not a clinical color blindness test.
  5. *Frequently Asked Questions*: Explaining why button positions shuffle between trials.

### 4. Block Memory (`/block-memory`)
- Sections:
  1. *What is Spatial Working Memory?*: Short-term retention and recall of visual locations in sequence.
  2. *How the Test Works*: 3x3 block grid displaying random sequences starting at length 2 (`lvl + 1`), flashing blocks for 400ms with a 200ms pause, 3 lives.
  3. *Progression & Scoring*: Advances on correct sequence; errors consume lives; highest completed level recorded.
  4. *Factors & Limitations*: Visual chunking, touch accuracy; clarifies educational benchmark status, not clinical memory assessment.
  5. *Frequently Asked Questions*: Sequence growth rules.

### 5. Number Memory (`/number-memory`)
- Sections:
  1. *What is Digit Span Memory?*: Short-term numerical sequence recall without long-term storage.
  2. *How the Test Works*: Digits displayed for duration scaled to sequence length (`Math.max(1000, length * 500)` ms, starting at 3 digits), keypad/keyboard input, 3 lives.
  3. *Progression & Scoring*: Success increments digit count; errors deplete lives; highest level recorded.
  4. *Strategies & Limitations*: Number chunking, subvocalization rehearsal, typing latency; clarifies this is not an IQ or clinical diagnostic test.
  5. *Frequently Asked Questions*: Sequence exposure time scaling.

## Internal Linking Invariant
- Every assessment article contains at least one real same-site `<a href="...">` link to another valid PULSE route.
- Validated routes: `/reaction-test`, `/direction-test`, `/colour-recognition`, `/block-memory`, `/number-memory`, `/improve`, `/assessments`, `/leaderboard`.

## Testing Suites

1. **Content and Schema Verification (`tests/unit/assessmentContent.test.ts`)**:
   - Asserts all 5 routes exist in `assessmentContent.json`.
   - Asserts `/reaction-test` targets primary search intent and contains code-verified parameters.
   - Asserts absence of medical, ADHD, diagnostic, and repository claims.
   - Invariant: Asserts every assessment article contains at least one real same-site `<a href="...">` pointing to a registered route.

2. **UI & Accessibility (`tests/unit/AssessmentInfoPanel.test.tsx`)**:
   - Asserts dialog semantics: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="assessment-info-title"`.
   - Asserts closed panel has `inert`, `aria-hidden="true"`, pointer containment.
   - Asserts open panel removes `inert`, sets `aria-hidden="false"`, moves focus to close button.
   - Asserts `Escape` closes dialog and restores focus.
   - Asserts headings use `<h2>` -> `<h3>` -> `<h4>`.
   - Asserts related links render as `<a href="...">`.

3. **Client Bootstrap & Single Article DOM Discipline (`tests/unit/assessmentSeoBootstrap.test.tsx`)**:
   - Simulates initial static shell removal and client mount.
   - Asserts that after client bootstrap, exactly one `<article id="assessment-seo-article">` exists in the live DOM (`document.querySelectorAll('article#assessment-seo-article').length === 1`).
   - Asserts full user-facing article content and crawlable anchor links exist in rendered DOM.

4. **Assessment Timing & Lifecycle Integrity (`tests/unit/assessmentTimingIntegrity.test.tsx`)**:
   - Tests `isAssessmentActive` invariant across all engine states.
   - Asserts info button is disabled during active states and clicking it does not pause or alter timers.
   - Asserts info button re-enables in `REPORT` state.
   - Asserts pre-test setup screen in Block and Number memory provides `[ⓘ]` without triggering autostart countdown.

5. **Static Generator Verification (`tests/unit/seoGenerator.test.ts`)**:
   - Asserts generated files in `dist/seo/*.html` and `dist/seo/mobile/*.html` contain semantic `<article id="assessment-seo-article">` tags with `<h1>` -> `<h2>` -> `<h3>`.
   - Asserts route-specific uniqueness.
   - Asserts canonical URL points to apex `https://pulse-lab.in/<route>`.
   - Asserts `/reaction-test` title matches `Reaction Time Test | Visual Reaction Test | PULSE`.
   - Asserts `sameAs` property is completely omitted from JSON-LD.

6. **Metadata Consistency (`tests/unit/seoMetadata.test.ts`)**:
   - Asserts `site.repository` is absent.
   - Asserts clean descriptions without "open-source".
   - Asserts grounded wording ("millisecond-resolution timing", "estimated display refresh adjustment").

## Execution Steps

- **Task 1: Privacy Metadata & Shared Content Foundation**
  - Clean `shared/seoMetadata.json`, `index.html`, and `mobile/index.html`.
  - Create `shared/types/assessmentContent.ts` and `shared/content/assessmentContent.json` (keyed by route, verified parameters, no hardware polling figures, internal links to valid routes).
  - Add `tests/unit/assessmentContent.test.ts` and `tests/unit/seoMetadata.test.ts`.

- **Task 2: Build-Generated Static SEO Generator**
  - Update `scripts/generate-seo-pages.mjs` to inject `<main id="pulse-seo-shell"> <article id="assessment-seo-article">` with `<h1>` -> `<h2>` -> `<h3>` hierarchy and omit `sameAs` from JSON-LD.
  - Update `tests/unit/seoGenerator.test.ts`.

- **Task 3: Shared Assessment Info Dialog Component**
  - Create `src/components/AssessmentInfoPanel.tsx` with `role="dialog"`, `aria-modal="true"`, `aria-labelledby="assessment-info-title"`, `inert`, `aria-hidden="true"`, focus containment, `<h2>` -> `<h3>` -> `<h4>` hierarchy, and real `<a href="...">` links.
  - Add `tests/unit/AssessmentInfoPanel.test.tsx`.

- **Task 4: Desktop Assessment Integration & Retirement of Legacy Guide**
  - Update desktop assessment pages (`ReactionTest.tsx`, `DirectionTest.tsx`, `ColorTest.tsx`, `BlockMemoryTest.tsx`, `NumberMemoryTest.tsx`).
  - In `ColorTest.tsx`, retire legacy `showGuide` / `openGuide()` modal.
  - In `AgeSelection.tsx`, add optional `assessmentId` support to render `[ⓘ]` before age selection triggers test autostart.
  - Apply `isAssessmentActive = engineState !== 'READY' && engineState !== 'REPORT' && engineState !== 'UNMOUNTED'`.
  - Add `tests/unit/assessmentSeoBootstrap.test.tsx` and `tests/unit/assessmentTimingIntegrity.test.tsx`.

- **Task 5: Mobile Assessment Integration**
  - Integrate `AssessmentInfoPanel` and state invariant into `mobile/src/components/` assessment views and mobile `AgeSelection`.

- **Task 6: Verification & Build Validation**
  - Run `npm run check`.
  - Run `npx vitest run`.
  - Run `npm run build`.
  - Inspect generated static HTML outputs.
