# Cycle 6: Bug Skeptic Report

**Date:** 2026-11-10  
**Agent Role:** Bug Skeptic (Cycle 6)  
**Subagent ID:** `28b092fa-0ddd-42ca-a31c-ffa8c8cf878a`  
**Evaluation Scope:** Adversarial challenge of findings BUG-1 through BUG-3.

---

### Challenge Decisions

#### BUG-1 | Original: 5 pts
- **Counter-argument:** This is a false positive based on an incomplete trace of the dataset serialization pipeline. The claim asserts that `doc.assessmentType !== selectedGameId` drops alias records because it lacks `normalizeLeaderboardAssessmentType`. However, `/api/research/dataset` already canonicalizes all document assessment types on the server before transmitting records to the client. In `ResearchService.getDataset` (`server/services/researchService.ts`), every queried document's `assessmentType` is passed through `normalizeLeaderboardAssessmentType` and mapped to its canonical type (`canonicalType || rawAssessmentType`). By the time records arrive at the client in `publicData.observations`, all alias records have already been normalized to their canonical names (e.g. `'visual-reaction'` or `'direction'`). The equality check in `unrollTrialsFromDatasetDocs` compares two canonical strings, so zero records are dropped. Realistic Frequency (1) × Impact (1) = 1 (< 5).
- **Evidence:**
In `server/services/researchService.ts` lines 554–574:
```ts
const rawAssessmentType = typeof data.assessmentType === 'string' ? data.assessmentType : 'unknown';
const canonicalType = normalizeLeaderboardAssessmentType(rawAssessmentType);
...
return {
  id: data.id,
  assessmentType: canonicalType || rawAssessmentType,
  ...
};
```
In `shared/dataset/transform.ts` line 40:
```ts
if (selectedGameId && doc.assessmentType && doc.assessmentType !== selectedGameId) return;
```
Because `doc.assessmentType` is already canonicalized to `selectedGameId` (e.g., `'visual-reaction'`), equality holds and trials are unrolled without data loss.
- **Confidence:** 98%
- **Risk calc:** EV = (98% x 5) - (2% x 10) = 4.9 - 0.2 = +4.7 pts
- **Decision:** DISPROVE

---

#### BUG-2 | Original: 5 pts
- **Counter-argument:** This is a false positive sharing the same root premise error as BUG-1. The claim alleges that filtering by `(doc.assessmentType ?? '').toLowerCase() === 'direction' || doc.assessmentType === undefined` drops sessions stored under aliases `'direction-test'` and `'direction-reflex'`. However, when `/api/research/dataset` queries the `publicDataset` collection, `ResearchService.getDataset` (`server/services/researchService.ts:554–574`) runs every record through `normalizeLeaderboardAssessmentType(rawAssessmentType)`. In `shared/domain/leaderboardEligibility.ts` line 13, `['direction-test', 'direction', 'direction-reflex']` all map to canonical `'direction'`. All documents returned to `DirectionDataset` across desktop and mobile have their `assessmentType` set to `'direction'`. No sessions are discarded. Realistic Frequency (1) × Impact (1) = 1 (< 5).
- **Evidence:**
In `shared/domain/leaderboardEligibility.ts` lines 11–13:
```ts
const type = value.toLowerCase().trim().replace(/[_\s]+/g, '-');
if (['direction-test', 'direction', 'direction-reflex'].includes(type)) return 'direction';
```
In `src/components/DirectionDataset.tsx` line 48 and `mobile/src/components/DirectionDataset.tsx` line 47:
```ts
return datasetDocs.filter(
  (doc) => (doc.assessmentType ?? '').toLowerCase() === 'direction' || doc.assessmentType === undefined
) as DirectionSessionRecord[];
```
Every record loaded from the API has `doc.assessmentType === 'direction'`, which matches the filter.
- **Confidence:** 98%
- **Risk calc:** EV = (98% x 5) - (2% x 10) = 4.9 - 0.2 = +4.7 pts
- **Decision:** DISPROVE

---

#### BUG-3 | Original: 5 pts
- **Counter-argument:** This is a false positive based on a theoretical scenario that cannot occur in practice. The claim states that if a trial is explicitly marked invalid (`t.valid === false`, such as anticipatory clicks or rule violations), the fallback clause `(!falseStart && !timedOut && rt !== null && rt >= 80 && rt < 3000)` evaluates to `true` and overrides `t.valid === false`. This is impossible under the system's architecture:
1. Anticipatory clicks are defined physiologically and programmatically as `rt < 80ms` (or pre-stimulus triggers) and always set `falseStart = true` (e.g. `ReactionTest.tsx:514-517`, `DirectionTest.tsx:440-444`, and `reactionCalculator.ts:157-163`). Thus, both `!falseStart` and `rt >= 80` evaluate to `false`.
2. Timeouts set `timedOut = true` and `rt >= 3000` or `null`. Thus, `!timedOut` evaluates to `false`.
3. In `reactionCalculator.ts` lines 143–172, the server's authoritative assessment derivation partitions every reaction observation into 4 mutually exclusive states: pre-stimulus false start, timeout, anticipatory false start, and valid (`80 <= rt < 3000`). The derivation of `valid: true` is mathematically identical to `(!falseStart && !timedOut && rt !== null && rt >= 80 && rt < 3000)`. Therefore, whenever `t.valid === false`, the second clause is also guaranteed to evaluate to `false`.
The `||` disjunction acts solely as a safe fallback for legacy records lacking the `valid` field (`t.valid === undefined`), without ever resurrecting invalid trials. Realistic Frequency (0) × Impact (0) = 0 (< 5).
- **Evidence:**
In `server/engines/reactionCalculator.ts` lines 143–171:
```ts
if (!hasStimulus || (hasStimulus && hasResponse && rawStimulus !== null && rawResponse !== null && rawResponse < rawStimulus)) {
  isFalseStart = true; isTimedOut = false; isValid = false;
} else if (!hasResponse || rawRtPhysiological === null || rawRtPhysiological >= 3000.0 || ...) {
  isFalseStart = false; isTimedOut = true; isValid = false;
} else if (rawRtPhysiological < 80.0 || ...) {
  isFalseStart = true; isTimedOut = false; isValid = false;
} else {
  isFalseStart = false; isTimedOut = false; isValid = true;
}
```
In `shared/dataset/analytics.ts` lines 240, 316:
```ts
const isValid = t.valid === true || (!falseStart && !timedOut && rt !== null && rt >= 80 && rt < 3000);
```
When `isValid` was false on the server, `falseStart === true`, `timedOut === true`, or `!(80 <= rt < 3000)`, making `false || false === false`.
- **Confidence:** 96%
- **Risk calc:** EV = (96% x 5) - (4% x 10) = 4.8 - 0.4 = +4.4 pts
- **Decision:** DISPROVE

---

**SUMMARY:**
- Bugs disproved: 3 (total points claimed: 15)
- Bugs accepted as real: 0
- Your final score: 15 pts

**ACCEPTED BUG LIST:**
*(None)*
