# Cycle 6: Bug Hunter Report (Ponytail Senior Dev Lens)

**Date:** 2026-11-10  
**Agent Role:** Bug Hunter (Cycle 6)  
**Subagent ID:** `b3281fb7-2d98-4972-8016-cab6a552f3f7`  
**Evaluation Scope:** Uninspected UI components, mobile interfaces, shared analytics/dataset transformation layers, and backend repositories/middleware.

---

### Findings

#### BUG-1 | Severity: Medium | Points: 5
- **File:** `shared/dataset/transform.ts`
- **Line(s):** 40-42
- **Category:** logic
- **Estimated Frequency (1-10):** 7
- **Estimated Impact (1-10):** 7
- **Risk Score:** 49
- **Claim:** Un-normalized assessment type comparison drops all canonical alias records during client trial unrolling.
- **Evidence:**
```ts
if (selectedGameId && doc.assessmentType && doc.assessmentType !== selectedGameId) return;
```
When a client selects an assessment (such as `color-recognition`, `visual-reaction`, or `direction`), the backend dataset endpoint (`/api/research/dataset`) queries documents across canonical aliases (e.g. `colour-recognition`, `color-test`, `reaction-test`, `direction-test`). However, `unrollTrialsFromDatasetDocs` performs a raw equality check `doc.assessmentType !== selectedGameId` without calling `normalizeLeaderboardAssessmentType`. All trials belonging to documents stored under aliases are dropped during unrolling, corrupting trial-level distribution curves, percentile rankings, and demographic histograms.

---

#### BUG-2 | Severity: Medium | Points: 5
- **File:** `src/components/DirectionDataset.tsx` (Line 48) & `mobile/src/components/DirectionDataset.tsx` (Line 47)
- **Line(s):** 48 (desktop) / 47 (mobile)
- **Category:** data-integrity
- **Estimated Frequency (1-10):** 6
- **Estimated Impact (1-10):** 6
- **Risk Score:** 36
- **Claim:** Strict non-canonical string filtering drops `direction-test` sessions from demographic analysis.
- **Evidence:**
```ts
return datasetDocs.filter(
  (doc) => (doc.assessmentType ?? '').toLowerCase() === 'direction' || doc.assessmentType === undefined
) as DirectionSessionRecord[];
```
When retrieving dataset documents for the direction test battery, the backend queries `['direction', 'direction-test', 'direction-reflex']`. Both desktop and mobile `DirectionDataset` explicitly filter for `(doc.assessmentType ?? '').toLowerCase() === 'direction' || doc.assessmentType === undefined`. Any sessions saved with `doc.assessmentType === 'direction-test'` or `'direction-reflex'` are silently discarded, omitting legitimate user sessions from demographic cohort analysis, median RT metrics, and accuracy heatmaps.

---

#### BUG-3 | Severity: Medium | Points: 5
- **File:** `shared/dataset/analytics.ts`
- **Line(s):** 240, 316
- **Category:** logic
- **Estimated Frequency (1-10):** 6
- **Estimated Impact (1-10):** 5
- **Risk Score:** 30
- **Claim:** Inverted disjunctive fallback guard re-validates explicitly invalidated trials (`valid === false`), polluting foreperiod aggregation and trial progression metrics.
- **Evidence:**
```ts
// Line 240 (calculateForeperiodAggregation):
const isValid = t.valid === true || (!falseStart && !timedOut && rt !== null && rt >= 80 && rt < 3000);

// Line 316 (calculatePopulationTrialProgression):
const isValid = t.valid === true || (!falseStart && !timedOut && rt !== null && rt >= 80 && rt < 3000);
```
In both `calculateForeperiodAggregation` and `calculatePopulationTrialProgression`, `t.valid === true || (!falseStart && !timedOut && rt !== null && rt >= 80 && rt < 3000)` was intended as a fallback for legacy records lacking the `valid` field. However, because of the disjunction `||`, whenever an authoritative server assessment marks a trial explicitly invalid (`t.valid === false`, such as anticipatory clicks or rule violations), if `falseStart` is not set and `80 <= rt < 3000`, the second clause evaluates to `true` and overrides `t.valid === false`. This re-introduces invalid trials into population progression curves and foreperiod analysis. The check must require `t.valid !== false && (!falseStart && !timedOut && rt !== null && rt >= 80 && rt < 3000)`.

---

**TOTAL FINDINGS:** 3  
**TOTAL SCORE:** 15  
