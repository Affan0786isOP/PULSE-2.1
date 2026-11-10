# Cycle 3: Bug Referee Report

**Date:** 2026-11-10  
**Agent Role:** Bug Referee (Final Arbiter)  
**Subagent ID:** `8164b5d9-2a44-4fee-8ce2-e0dfdb7cb175`  
**Evaluation Scope:** Authoritative verification and risk scoring of Cycle 3 findings BUG-1 through BUG-4.

---

### Verified Bug Judgments

#### BUG-1
- **Hunter's claim:** When a participant responds under 80ms (anticipatory physiological false start) in `mobile/src/components/DirectionTest.tsx`, `rawObservationsRef.current.push` omits the mandatory `targetDirection` property, causing the authoritative server calculator (`server/engines/flankerCalculator.ts`) to reject the entire research submission with a 400 error.
- **Skeptic's response:** ACCEPT. Confirmed real and severe. In `DirectionTest.tsx`, responding under 80ms omits `targetDirection`, causing `/api/research/submit` validation in `flankerCalculator.ts` to strictly fail.
- **Your analysis:** The Hunter and Skeptic are both correct. Independent verification of `mobile/src/components/DirectionTest.tsx` (lines 423–445) shows that while premature false starts before stimulus (line 379), timeouts (line 255), and normal responses (line 484) all include `targetDirection`, the `< 80ms` physiological RT branch (`captureResponse`) omits `targetDirection`. When `attemptSubmission` runs, `rawObservationsRef.current` is submitted to `/api/research/submit`, where `server/engines/flankerCalculator.ts` (lines 10–12) strictly validates:
  ```ts
  if (typeof t.targetDirection !== 'string' || !t.targetDirection.trim()) {
    return { success: false, error: `Trial ${index + 1} is missing required 'targetDirection' field.` };
  }
  ```
  Consequently, any participant session containing an anticipatory response under 80ms is completely rejected by the server, resulting in total data loss for that session.
- **Frequency (1-10):** 6 (anticipatory responses under 80ms occur routinely in rapid directional reaction testing).
- **Impact (1-10):** 8 (complete submission failure and rejection of validly completed participant sessions).
- **Risk Score:** 48
- **VERDICT:** ACTIONABLE BUG (Score ≥ 5)
- **Confidence:** High
- **True severity:** Critical
- **Suggested fix:** In `mobile/src/components/DirectionTest.tsx` inside the `if (rawLatency < 80)` block, add `targetDirection: currentDirection.toLowerCase()` to the observation object pushed to `rawObservationsRef.current`.

---

#### BUG-2
- **Hunter's claim:** In `scripts/migrateLeaderboardPrivacyAndAudit.ts`, invalid or missing metadata fields (`ownerUid`, `sessionId`, `scoreMetric`, `idempotencyKey`, `qualityFlags`) cannot be removed using JavaScript `delete` when written via `tx.set(metaRef, meta, { merge: true })`, permanently retaining incorrect owner UIDs and invalid metadata on private records.
- **Skeptic's response:** ACCEPT. In the Firestore Admin SDK, `set(metaRef, meta, { merge: true })` does not delete fields omitted from `meta`; `FieldValue.delete()` is required. Invalid fields are retained during migration reruns.
- **Your analysis:** The Hunter and Skeptic are both correct. In `scripts/migrateLeaderboardPrivacyAndAudit.ts` (lines 65–98), `meta` is constructed by spreading `...existingMeta`. When `ownerUid` mismatches the session owner (`ownerUid !== session.uid`) or when `scoreMetric`/`sessionId`/`idempotencyKey`/`qualityFlags` are missing or invalid, the script invokes `delete meta[key]`. However, line 98 writes with `tx.set(metaRef, meta, { merge: true })`. Under Firestore semantics, `{ merge: true }` ignores omitted properties and only mutates fields explicitly defined in the payload. To delete an existing field in a merge set, `FieldValue.delete()` must be passed. Because `delete` only strips the property from the in-memory JavaScript object, the existing Firestore document field remains untouched.
- **Frequency (1-10):** 3 (rerunnable administrative migration script executed for leaderboard reconciliation and legacy privacy scrubbing).
- **Impact (1-10):** 7 (data integrity and privacy/authorization failure: mismatched or invalid owner UIDs remain associated with private metadata records).
- **Risk Score:** 21
- **VERDICT:** ACTIONABLE BUG (Score ≥ 5)
- **Confidence:** High
- **True severity:** Medium
- **Suggested fix:** Assign `FieldValue.delete()` instead of using JavaScript `delete` (e.g. `meta.ownerUid = FieldValue.delete()`), or execute a full overwrite `tx.set(metaRef, meta)` without `{ merge: true }` since `meta` already contains the full merged document representation.

---

#### BUG-3
- **Hunter's claim:** The mobile `pulse_settings_open` event listener in `mobile/src/components/BlockMemoryTest.tsx` (lines 580–594) and `mobile/src/components/NumberMemoryTest.tsx` (lines 575–589) clears only `transitionTimeoutRef.current` instead of invoking `clearAllTimers()`, leaving active sequence playback timeouts and 3-2-1 countdown intervals running in the background while the settings modal is open.
- **Skeptic's response:** ACCEPT. Confirmed concurrency bug. Active timers in `sequenceTimeout.current` and `intervalRef.current` continue executing behind the open modal.
- **Your analysis:** The Hunter and Skeptic are both correct. Both `mobile/src/components/BlockMemoryTest.tsx` and `mobile/src/components/NumberMemoryTest.tsx` define a helper `clearAllTimers()` that clears `sequenceTimeout.current`, `transitionTimeoutRef.current`, and `intervalRef.current`. However, when handling `pulse_settings_open`, both mobile components only execute `if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)`. In contrast, their desktop counterparts call `clearAllTimers()`. As a result, active countdown intervals (`intervalRef.current`) and cancellable sequence timeouts (`sequenceTimeout.current`) continue running while the settings modal is open, causing tiles to flash, audio cues to play, and engine states to transition unexpectedly out of `READY`.
- **Frequency (1-10):** 5 (mobile users opening settings/volume/theme while starting or playing an assessment).
- **Impact (1-10):** 6 (background execution corrupts assessment state, wastes lives, or leaves tests in an invalid running state).
- **Risk Score:** 30
- **VERDICT:** ACTIONABLE BUG (Score ≥ 5)
- **Confidence:** High
- **True severity:** Medium
- **Suggested fix:** In both `mobile/src/components/BlockMemoryTest.tsx` and `mobile/src/components/NumberMemoryTest.tsx`, invoke `clearAllTimers()` inside `handleSettingsOpen`.

---

#### BUG-4
- **Hunter's claim:** The mobile Leaderboard component strictly matches `assessmentType` against internal protocol IDs rather than normalizing URL aliases or route names, causing valid query parameters like `?assessmentType=colour-recognition`, `reaction-test`, and `direction-test` to fail matching and be forcibly rewritten to `visual-reaction`.
- **Skeptic's response:** DISPROVE. The claim is based on a false premise. The `route` property in `PROTOCOLS` is strictly the destination view path for the test launch button, not a query parameter contract. Across the mobile codebase, every component exclusively passes canonical protocol IDs (`p.id`). Falling back to `visual-reaction` on unknown query parameter is safe graceful degradation. Frequency (1) × Impact (2) = 2 (< 5).
- **Your analysis:** The Skeptic is correct. The parameter contract across the entire codebase is `assessmentType`, which accepts canonical protocol IDs (`visual-reaction`, `direction`, `color-recognition`, `block-memory`, `number-memory`). Inspection of the codebase reveals that all navigation calls in `ReactionTest.tsx`, `DirectionTest.tsx`, `ColorTest.tsx`, `BlockMemoryTest.tsx`, and `NumberMemoryTest.tsx` pass canonical protocol IDs (e.g. `/leaderboard?assessmentType=color-recognition`). The `route` property on `PROTOCOLS` is solely used for the launch button (`onClick={() => onNavigate(currentProto.route)}`). Route names were never intended or contracted as `assessmentType` query parameter values. Defaulting unknown query parameters to `'visual-reaction'` is safe fallback behavior. Even under the hypothetical assumption of a user hand-crafting a URL with a route name, Frequency is 1 and Impact is 2 (Risk Score = 2 < 5).
- **Frequency (1-10):** 1 (no application code produces route query parameters; requires manual URL tampering)
- **Impact (1-10):** 2 (gracefully defaults to the first leaderboard tab; user can tap another tab)
- **Risk Score:** 2
- **VERDICT:** NOT A BUG
- **Confidence:** High
- **True severity:** N/A
- **Suggested fix:** N/A

---

## VERIFIED BUG REPORT

### Stats:
- Total reported by Hunter: 4
- Dismissed as false positives (Not a bug): 1
- Dismissed below threshold (Frequency × Impact < 5 or rare/future cases): 0
- Confirmed actionable bugs (Risk Score ≥ 5): 3
- Critical: 1 | Medium: 2 | Low: 0

### Confirmed Actionable Bugs (ordered by Risk Score descending):

| # | Severity | Frequency (1-10) | Impact (1-10) | Risk Score | File | Line(s) | Description | Suggested Fix |
|---|----------|------------------|---------------|------------|------|---------|-------------|---------------|
| **BUG-1** | Critical | 6 | 8 | 48 | `mobile/src/components/DirectionTest.tsx` | 423–445 | `<80ms` physiological RT observations omit mandatory `targetDirection`, causing server calculator to reject submission with 400. | Add `targetDirection: currentDirection.toLowerCase()` to the observation payload in `captureResponse`. |
| **BUG-3** | Medium | 5 | 6 | 30 | `mobile/src/components/BlockMemoryTest.tsx`<br>`mobile/src/components/NumberMemoryTest.tsx` | 580–594<br>575–589 | `pulse_settings_open` listener clears only `transitionTimeoutRef` instead of calling `clearAllTimers()`, leaving active sequences/countdowns running behind modal. | Replace `clearTimeout(transitionTimeoutRef.current)` with `clearAllTimers()` in `handleSettingsOpen`. |
| **BUG-2** | Medium | 3 | 7 | 21 | `scripts/migrateLeaderboardPrivacyAndAudit.ts` | 77–83, 98 | Using JavaScript `delete` with Firestore `tx.set(metaRef, meta, { merge: true })` does not remove fields, permanently retaining invalid owner UIDs. | Assign `FieldValue.delete()` instead of `delete meta[key]`, or write using `tx.set(metaRef, meta)` without `{ merge: true }`. |

### Dismissed as False Positives:
- **BUG-4 (`mobile/src/components/Leaderboard.tsx`):** Route name query parameter mismatch. Disproved: `route` is only used for launching the assessment, canonical protocol IDs are exclusively used across the codebase for query params, and defaulting to visual-reaction on unknown input is safe graceful fallback.

### Low-Confidence Items (Flagged for Manual Review):
- None. High confidence across all 4 items based on direct codebase inspection.
