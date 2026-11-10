# Cycle 6: Bug Referee Report

**Date:** 2026-11-10  
**Agent Role:** Bug Referee (Final Arbiter)  
**Subagent ID:** `4ad9a0a5-13f0-4070-8d60-62179909405c`  
**Evaluation Scope:** Authoritative verification and risk scoring of Cycle 6 findings BUG-1 through BUG-3.

---

### Verified Bug Judgments

#### BUG-1
- **Hunter's claim:** Un-normalized assessment type comparison in `shared/dataset/transform.ts` (lines 40–42) drops canonical alias records (e.g. `reaction-test`, `direction-test`, `colour-recognition`) during client trial unrolling.
- **Skeptic's response:** DISPROVE. The server `/api/research/dataset` endpoint in `server/services/researchService.ts` lines 554–574 passes all queried documents through `normalizeLeaderboardAssessmentType` before returning them to the client. All documents have their `assessmentType` normalized to canonical keys. Both sides of the client equality check compare canonical strings, so zero records are dropped.
- **Your analysis:** Independent code inspection confirms the Skeptic's counter-argument:
  1. In `server/routes/researchRoutes.ts` (lines 278–284), incoming query parameters are validated and mapped to canonical assessment types via `normalizeLeaderboardAssessmentType`.
  2. In `server/repositories/firestore/firestoreResearchDatasetRepository.ts` (lines 56–61), the repository expands the canonical type into its storage aliases using `getAssessmentTypeAliases` to query Firestore.
  3. Crucially, in `server/services/researchService.ts` (lines 554–574), every raw record fetched from Firestore is mapped through `normalizeLeaderboardAssessmentType(rawAssessmentType)`, assigning `assessmentType: canonicalType || rawAssessmentType` to the outgoing `PublicDatasetRecord`.
  4. On the client (`src/components/Dataset.tsx` lines 48–54 and `mobile/src/components/Dataset.tsx`), `selectedGameId` values (`'visual-reaction'`, `'direction'`, etc.) are already canonical.
  5. As a result, when `unrollTrialsFromDatasetDocs` executes `if (selectedGameId && doc.assessmentType && doc.assessmentType !== selectedGameId) return;` at `shared/dataset/transform.ts:40`, `doc.assessmentType` and `selectedGameId` are already matching canonical strings. Zero records or trials are dropped. Hunter failed to trace the backend transformation and serialization pipeline.
- **Frequency (1-10):** 1
- **Impact (1-10):** 1
- **Risk Score:** 1
- **VERDICT:** NOT A BUG
- **Confidence:** High

---

#### BUG-2
- **Hunter's claim:** Strict non-canonical string filtering in `src/components/DirectionDataset.tsx` (line 48) and `mobile/src/components/DirectionDataset.tsx` (line 47) drops `direction-test` and `direction-reflex` sessions from demographic analysis.
- **Skeptic's response:** DISPROVE. Same root reason as BUG-1: when `/api/research/dataset` queries the database, `ResearchService.getDataset` normalizes `direction-test` and `direction-reflex` to `'direction'` via `normalizeLeaderboardAssessmentType` (`leaderboardEligibility.ts:13`). All records arriving at `DirectionDataset` have `assessmentType === 'direction'`, matching the filter. Zero sessions are discarded.
- **Your analysis:** Independent code inspection confirms the Skeptic's counter-argument:
  1. `DirectionDataset` is mounted exclusively when `selectedGameId === 'direction'` in `Dataset.tsx` (desktop line 542, mobile line 545).
  2. The documents supplied to `DirectionDataset` come from `/api/research/dataset?assessmentType=direction`.
  3. In `shared/domain/leaderboardEligibility.ts` (lines 11–13), `normalizeLeaderboardAssessmentType` maps `direction-test`, `direction`, and `direction-reflex` to canonical `'direction'`.
  4. In `server/services/researchService.ts` (lines 555, 574), every queried record has its `assessmentType` set to canonical `'direction'` before being sent to the client.
  5. Consequently, 100% of records in `datasetDocs` have `doc.assessmentType === 'direction'`. The predicate `(doc.assessmentType ?? '').toLowerCase() === 'direction' || doc.assessmentType === undefined` evaluates to `true` for all incoming sessions. Zero sessions are dropped.
- **Frequency (1-10):** 1
- **Impact (1-10):** 1
- **Risk Score:** 1
- **VERDICT:** NOT A BUG
- **Confidence:** High

---

#### BUG-3
- **Hunter's claim:** Inverted disjunctive fallback guard in `shared/dataset/analytics.ts` (lines 240, 316) re-validates explicitly invalidated trials (`valid === false`), polluting foreperiod aggregation and trial progression metrics.
- **Skeptic's response:** DISPROVE. In `server/engines/reactionCalculator.ts` lines 143–172, trials are partitioned into 4 mutually exclusive states. Any trial marked `isValid = false` has `falseStart = true`, `timedOut = true`, or `rt < 80` or `rt >= 3000`. Thus, whenever `t.valid === false`, `(!falseStart && !timedOut && rt !== null && rt >= 80 && rt < 3000)` also evaluates to `false`. The disjunction is purely a fallback for legacy records lacking `t.valid`. Frequency 0, Impact 0.
- **Your analysis:** Independent code inspection confirms the Skeptic's counter-argument:
  1. In `server/engines/reactionCalculator.ts` (lines 143–172), visual reaction trials are derived into a complete, mutually exclusive state partition:
     - **Pre-stimulus trigger:** `isFalseStart = true`, `isTimedOut = false`, `isValid = false`. (Here `!falseStart` is `false`).
     - **Timeout:** `isFalseStart = false`, `isTimedOut = true`, `isValid = false` (or `rt === null` / `rt >= 3000`). (Here `!timedOut` is `false` or `rt < 3000` is `false`).
     - **Anticipatory trigger (< 80ms):** `isFalseStart = true`, `isTimedOut = false`, `isValid = false`, `rawRt < 80`. (Here `!falseStart` is `false` and `rt >= 80` is `false`).
     - **Valid reaction (80ms <= RT < 3000ms):** `isFalseStart = false`, `isTimedOut = false`, `isValid = true`.
  2. Hunter's claim rests on the premise that an authoritative server assessment marks a trial `valid === false` (such as anticipatory clicks) while `falseStart` is not set and `80 <= rt < 3000`. This premise directly contradicts the engine's source code: anticipatory clicks explicitly set `falseStart = true` (`reactionCalculator.ts:159`, `ReactionTest.tsx:514-517`) and require `rt < 80`.
  3. Because `valid === true` is logically and mathematically equivalent to `(!falseStart && !timedOut && rt !== null && rt >= 80 && rt < 3000)`, whenever `t.valid === false`, the fallback clause `(!falseStart && !timedOut && rt !== null && rt >= 80 && rt < 3000)` is guaranteed to evaluate to `false`.
  4. The disjunction `t.valid === true || (!falseStart && !timedOut && ...)` serves strictly as a backward-compatible fallback for legacy database records that predate the schema field `t.valid` (`t.valid === undefined`), without resurrecting any invalid trials.
- **Frequency (1-10):** 1
- **Impact (1-10):** 1
- **Risk Score:** 1
- **VERDICT:** NOT A BUG
- **Confidence:** High

---

## VERIFIED BUG REPORT

### Stats:
- Total reported by Hunter: 3
- Dismissed as false positives (Not a bug): 3
- Dismissed below threshold (Frequency × Impact < 5 or rare/future cases): 0
- Confirmed actionable bugs (Risk Score ≥ 5): 0
- Critical: 0 | Medium: 0 | Low: 0

### Confirmed actionable bugs:
*(None — no actionable defects confirmed)*

### Dismissed below threshold (Frequency × Impact < 5 or rare/future cases - left alone):
*(None)*

### Low-confidence items (flagged for manual review):
*(None — High confidence on all 3 evaluations)*
