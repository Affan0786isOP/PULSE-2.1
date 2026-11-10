# PULSE v2.1 — Bug Fix Plan

**Repository:** Affan0786isOP/PULSE-2.1  
**Branch:** `audit/bug-hunt-reports`  
**Planning baseline:** `843f657e13b3fb535cd58d5f752648827e51e102`  
**Prepared:** 2026-11-10  
**Scope:** 13 actionable findings from functional Bug Hunt Cycles 1–5, plus the separate conditional security finding SEC-1.

---

## 1. Execution rules

This document is an implementation plan, not a claim that fixes have been applied. A source spot-check on the planning baseline found the cited code patterns still present for the 13 functional findings. No tests, builds, Firestore emulator runs, or live deployment checks were executed while preparing this plan.

Use these rules for every item:

1. Re-check the target code at the implementation commit before changing it. The line numbers in the cycle reports are audit references and may have moved.
2. Add a regression test that fails on the current behavior and passes after the fix. Prefer unit/component tests first, then emulator-backed tests for Firestore behavior.
3. Preserve existing contracts unless the plan explicitly calls for a contract change. Do not "fix" a rejected submission by silently dropping trial events or weakening server validation.
4. Keep scientific timing domains explicit: epoch timestamps for wall-clock/session-window comparisons; monotonic performance timestamps only for durations and paint/latency measurements.
5. Mark a finding complete only when the code fix, regression test, relevant suite, and implementation commit are recorded in the tracking table below.

### Priority definitions

- **P0 — Submission/security integrity:** can reject participant submissions, lose research records, or leave a security boundary conditionally exposed.
- **P1 — Data quality / platform stability:** creates unreliable research telemetry, repeated rejected writes, timer races, or expensive database reads.
- **P2 — Contract and operator correctness:** wrong notification values or incorrect HTTP error classification.
- **P3 — Presentation cleanup:** misleading optional metric output without a demonstrated scoring or data-integrity consequence.

---

## 2. P0 — Submission integrity and security

### P0.1 — Desktop Number Memory timestamps (Cycle 1, BUG-2)

**Target:** `src/components/NumberMemoryTest.tsx`  
**Observed condition:** `stimulusWallTimestamp.current` is assigned from `performance.now()`, while the server compares submitted stimulus/response wall timestamps against session creation/expiry values.

**Implementation:**
- Use `Date.now()` for the stored wall-clock stimulus timestamp and the submitted `stimulusTimestamp` / `responseTimestamp` fields.
- Keep `performance.now()` for local reaction-time and duration calculations only.
- Avoid deriving an epoch timestamp by mixing a monotonic timestamp with a wall-clock value.

**Regression coverage:**
- Component test asserts submitted wall-clock fields are epoch-scale values.
- Integration/unit test feeds the resulting trial payload through the authoritative session-window validator.
- Include a normal trial and a multi-level run to verify timestamps remain monotonic enough for ordering while using wall-clock semantics.

**Acceptance:** a valid Number Memory submission passes session-window validation; latency calculations remain based on monotonic time.

### P0.2 — Desktop Block Memory timestamps (Cycle 1, BUG-3)

**Target:** `src/components/BlockMemoryTest.tsx`

Apply the same clock-domain correction as P0.1. Test both first-level and subsequent-level observations. Do not replace duration calculations with `Date.now()`; change only the persisted wall-clock fields.

**Acceptance:** valid Block Memory payloads no longer fail solely because monotonic timestamps are compared with epoch session boundaries.

### P0.3 — Desktop Direction false-start payloads (Cycle 1, BUG-1)

**Target:** `src/components/DirectionTest.tsx`, both pre-stimulus false-start handling and the under-80ms response branch.

**Implementation:**
- Include the required canonical `targetDirection` on every emitted Direction trial observation, including invalid/false-start observations.
- Use the same normalized direction representation as valid observations and the server validator.
- Centralize observation construction if practical so future branches cannot omit required contract fields.

**Regression coverage:** test pre-stimulus false starts, under-80ms anticipatory responses, valid responses, and missed responses. Submit each generated observation set to the direction validator.

**Acceptance:** a session containing either false-start category is accepted or rejected only according to the intended trial-quality rules, never because a required field is missing.

### P0.4 — Desktop Color Recognition false-start accounting (Cycle 1, BUG-4)

**Target:** `src/components/ColorTest.tsx`, with contract coverage in `server/engines/stroopCalculator.ts`.

**Implementation:**
- Separate attempt/event telemetry from the 15 completed scored trials.
- Preserve false-start evidence and the false-start count, but do not append a retry attempt to the exact-15 scored-trial array.
- Submit exactly the 15 completed trial records required by the current server contract.
- Do not blindly slice the first 15 observations; that could discard completed trials after multiple retries or retain false starts in place of valid attempts.

**Regression coverage:** run the component with zero, one, and multiple false starts; assert the final scored payload has exactly 15 completed trials and that the false-start count/event evidence remains available.

**Acceptance:** false starts no longer cause an otherwise completed Color Recognition assessment to fail the strict 15-trial validator.

### P0.5 — Mobile Direction under-80ms payload (Cycle 3, BUG-1)

**Target:** `mobile/src/components/DirectionTest.tsx`

Add canonical `targetDirection` to the under-80ms observation, matching the field contract used by timeout, pre-stimulus false-start, and valid-response records.

**Regression coverage:** a mobile under-80ms response reaches the direction validator without a missing-field error; retain separate coverage for premature pre-stimulus responses and normal responses.

**Acceptance:** mobile Direction submissions containing an anticipatory response no longer fail because `targetDirection` is absent.

### P0.6 — Private metadata field deletion during migration (Cycle 3, BUG-2)

**Target:** `scripts/migrateLeaderboardPrivacyAndAudit.ts`

**Implementation:**
- Replace JavaScript object-property deletion for Firestore fields that must be removed with `FieldValue.delete()` sent in the merge write, or use a safe full-document replacement only after confirming the object contains every field that must be preserved.
- Keep the public-row scrub and private metadata write atomic in the existing transaction.
- Add a dry-run/report mode before running against production data; record counts without logging raw owner UIDs or other private values.

**Regression coverage:** seed a private metadata document with stale ownerUid/sessionId/scoreMetric/idempotencyKey/qualityFlags fields; run the migration; assert invalid fields are actually absent afterward, valid fields remain, public private fields are deleted, and a second run is idempotent.

**Acceptance:** invalid legacy fields are removed from Firestore rather than merely omitted from a merge payload. Production execution requires backup/restore readiness and a small canary batch.

### P0.7 — Conditional admin authentication fallback (Security Cycle 1, SEC-1)

**Target:** `server/index.ts`, `server/middleware/adminAuth.ts`, deployment environment configuration.

**Status:** **Needs Validation**, not a confirmed deployed vulnerability.

**Required deployment-owner check:**
- Inspect the effective `NODE_ENV` for production, preview, and staging without printing secret values.
- Confirm which deployments are internet-reachable and whether they have the server-side Firebase Admin configuration required by the admin-session revocation check.
- Confirm explicit `ADMIN_PASSCODE` and `PULSE_ADMIN_SESSION_SECRET` configuration exists in every reachable environment.

**Remediation if any reachable non-production environment is exposed:**
- Remove the universal development passcode and built-in HMAC signing secret.
- Require explicit, unique server-side credentials in every network-reachable environment and fail closed when missing.
- Keep test credentials local to test setup; do not use a known repository fallback.
- Do not use an unset `NODE_ENV` as a security signal. Make startup/runtime environment configuration explicit.
- Rotate potentially exposed credentials and invalidate active sessions if exposure is found.

**Regression coverage:** test missing credentials, explicit credentials, production mode, and non-production mode. Verify absent configuration fails closed. Use dummy secrets and an isolated Firestore emulator; do not probe deployed endpoints.

**Acceptance:** no reachable deployment can issue an admin token using repository-known fallback credentials or a built-in signing key.

---

## 3. P1 — Research integrity, concurrency, and Firestore cost

### P1.1 — Remove the blocked client trial-observation write/retry loop (Cycle 2, BUG-4)

**Target:** `src/lib/trialStore.ts`; contract: `firestore.rules` and the authoritative research submission API.

**Implementation:**
- Remove or disable client batch writes to `trialObservations` while Firestore rules intentionally deny client writes.
- Preserve the authoritative server submission path for research observations.
- Do not endlessly requeue permanent permission-denied failures. Classify permanent authorization/schema failures separately from transient network failures.
- If a legacy queue is no longer used, remove the queue/flush lifecycle and associated unload retry hooks rather than retaining a dead retry mechanism.

**Regression coverage:** mock a permission-denied write and prove no 600ms retry loop or unbounded queue growth occurs; verify valid research submission still persists through the server path.

**Acceptance:** clients do not attempt forbidden direct writes and permanent permission failures cannot accumulate indefinitely.

### P1.2 — Restore mobile visual-reaction timing metadata (Cycle 2, BUG-7)

**Target:** `mobile/src/components/ReactionTest.tsx`; compare against desktop implementation and `server/services/researchService.ts`.

**Implementation:**
- Populate the mobile observation with the required timing and interval metadata that the research ingestion path accepts, including scheduled/presented/response timestamps, performance-domain counterparts where defined, ISI/ITI, previous-trial end, validity/quality metadata, and the ISO timestamp.
- Use the same field meanings and units as desktop. Do not label a monotonic performance timestamp as epoch time.
- Preserve graceful nullability for browser/device APIs that cannot provide a measurement.

**Regression coverage:** assert the full mobile payload contract, including units and null behavior; run a server ingestion test to confirm the fields survive normalization and persistence.

**Acceptance:** mobile and desktop records expose the same defined timing dimensions, with no invented or unit-mismatched values.

### P1.3 — Eliminate repeated full-collection reads in admin pagination (Cycle 2, BUG-5)

**Targets:** `server/repositories/firestore/firestoreLeaderboardRepository.ts`, `server/services/adminService.ts`.

**Implementation:**
- Remove the pattern where each filtered page request scans the entire leaderboard collection and sorts it in memory again.
- Prefer a genuinely paginated repository query using stable indexed ordering/cursors and supported server-side filters.
- Account for legacy rows missing optional sort fields before switching to indexed ordering; backfill or introduce a guaranteed sort key rather than silently excluding those rows.
- If a staged migration is required, at minimum ensure one request does not repeat the same full collection scan for each filtered page.
- Add/verify required Firestore indexes and bound read counts.

**Regression coverage:** instrument the repository mock to count document reads for multiple pages and filters; assert read amplification is bounded by the page strategy rather than rescanning the full collection each iteration. Include legacy rows and stable cursor progression.

**Acceptance:** page N does not trigger a fresh full collection read; pagination remains stable and no legacy entry is silently dropped.

### P1.4 — Stop mobile memory timers when settings opens (Cycle 3, BUG-3)

**Targets:** `mobile/src/components/BlockMemoryTest.tsx`, `mobile/src/components/NumberMemoryTest.tsx`.

**Implementation:** invoke each component's complete timer cleanup helper in the settings-open abort path, not just the transition timeout cleanup. Keep run-lock cancellation and service-worker state cleanup in the same abort lifecycle.

**Regression coverage:** with fake timers, open settings during sequence playback and during countdown; advance timers and assert there are no further state transitions, tile playback, haptics, or audio cues.

**Acceptance:** opening settings aborts all in-flight timer-driven assessment work in both mobile memory tests.

---

## 4. P2 — Notification and API contract correctness

### P2.1 — Correct Block/Number Memory notification field mapping (Cycle 2, BUG-1)

**Target:** `server/routes/researchRoutes.ts`, with calculator contract in `server/engines/memoryCalculator.ts`.

The calculator returns `longestSeq` and `highestLevel`, while the notification payload currently looks for `maxSpan` and `highestLevelAchieved`. Map from the actual calculator contract (or define one canonical DTO shared by the calculator and notifier). Avoid changing calculator field names solely to satisfy a single notification.

**Regression coverage:** for both Block Memory and Number Memory, pass real derived-metric shapes through the route-to-notifier mapping and assert span/level are numeric rather than N/A.

**Acceptance:** successful memory assessment notifications show the actual derived values.

### P2.2 — Return 400 for an invalid admin pagination cursor (Cycle 5, BUG-1)

**Target:** `server/routes/adminRoutes.ts`, optionally normalize the error at the service/repository boundary.

**Implementation:** map the specific `INVALID_CURSOR` error to HTTP 400 with a stable client-safe error message. Preserve 500 for unexpected internal errors and existing 503 behavior for infrastructure failures.

**Regression coverage:** test malformed and stale cursor inputs produce 400; test a generic repository exception still produces 500; test a database outage still follows the established infrastructure contract.

**Acceptance:** client-supplied cursor errors are 4xx, unexpected server faults remain 5xx.

---

## 5. P3 — Remove misleading Direction notification metric (Cycle 2, BUG-2)

**Target:** `server/services/telegramNotifierService.ts`; source of the unused metric: `server/engines/flankerCalculator.ts`.

The Direction assessment is a four-choice reaction-time protocol and does not currently calculate flanker conflict cost. Remove the Conflict Cost line from the Direction notification unless a scientifically valid conflict/incongruent protocol is explicitly implemented and validated. Do not synthesize a value from unrelated metrics.

**Regression coverage:** verify Direction notifications omit Conflict Cost while retaining Mean RT and Accuracy.

**Acceptance:** notifications no longer display a permanent N/A metric that the protocol does not produce.

---

## 6. Cycle 4 owner-index migration follow-up — investigate, do not patch speculatively

**Reference:** Cycle 4 BUG-6, `scripts/dedupeLeaderboardBestPerOwner.ts`.

The revised referee disposition is **below threshold**, not an actionable bug. The script repairs missing indexes and updates a pointer when it points to a loser in the current visible group. A pointer to an unrelated stale ID can remain, but the inspected submission path reads the index's deletion lock and computes the best row from private metadata rather than relying on the pointer. The script's console counter can overstate work when a transaction callback returns early.

Before reusing this script as a general index-repair utility:
- Document whether leaderboardDocId is required to point to the best visible row at all times.
- Test missing, winner, current-loser, unrelated-stale, deleted, and hidden pointer targets.
- Count a row as superseded only when the transaction actually performed the deletion/receipt update.
- Do not add unconditional owner-index writes until the intended erasure-lock and owner-bucket invariants are explicit.

This is investigation/hardening only; no implementation ticket is opened from the current evidence.

---

## 7. Recommended implementation order

1. **Security deployment gate:** resolve SEC-1 environment facts before deploying or expanding public access.
2. **P0 submission fixes:** Number Memory, Block Memory, desktop Direction, desktop Color Recognition, and mobile Direction.
3. **P0 migration correctness:** fix metadata field deletion and validate with emulator fixtures before production migration execution.
4. **P1 platform/data fixes:** trialStore retry removal, mobile Reaction telemetry, admin pagination read amplification, and mobile memory timer cleanup.
5. **P2 contract fixes:** memory notification mappings and invalid admin cursor response.
6. **P3 notification cleanup:** remove Direction Conflict Cost unless a real metric is deliberately added.
7. **Cycle 4 follow-up:** add owner-index invariant tests before any future reuse of the deduplication script.

---

## 8. Verification and closure checklist

For each implementation PR/commit:

- [ ] The original failure mode has a regression test.
- [ ] Existing behavior outside the target contract remains unchanged.
- [ ] Relevant unit/component tests pass.
- [ ] TypeScript/check and the full test suite pass.
- [ ] Firestore emulator tests pass for rule, transaction, migration, and pagination changes.
- [ ] A reviewer checks scientific units, trial counts, session ownership, and public/private data boundaries where applicable.
- [ ] The commit SHA and test command/results are added to the status table.
- [ ] The corresponding finding is marked fixed only after the regression test is merged.

| Finding | Priority | Implementation status | Required evidence to close |
|---|---|---|---|
| Cycle 1 BUG-2 — Number Memory timestamps | P0 | Not started | Component + session-window regression |
| Cycle 1 BUG-3 — Block Memory timestamps | P0 | Not started | Component + session-window regression |
| Cycle 1 BUG-1 — Desktop Direction payload | P0 | Not started | Both false-start branches validated |
| Cycle 1 BUG-4 — Color Recognition trial count | P0 | Not started | False-start retries still submit 15 scored trials |
| Cycle 3 BUG-1 — Mobile Direction payload | P0 | Not started | Under-80ms payload validates |
| Cycle 3 BUG-2 — Privacy migration field deletion | P0 | Not started | Emulator migration + rerun/idempotency test |
| Security Cycle 1 SEC-1 — Admin fallback | P0 gate | Needs deployment-owner validation | Effective env audit + fail-closed tests |
| Cycle 2 BUG-4 — trialStore forbidden writes | P1 | Not started | Permission-denied queue regression |
| Cycle 2 BUG-7 — Mobile Reaction telemetry | P1 | Not started | Mobile payload + ingestion test |
| Cycle 2 BUG-5 — Admin read amplification | P1 | Not started | Bounded-read pagination test |
| Cycle 3 BUG-3 — Mobile memory timers | P1 | Not started | Fake-timer abort tests |
| Cycle 2 BUG-1 — Memory notification mapping | P2 | Not started | Route/notifier mapping test |
| Cycle 5 BUG-1 — Invalid admin cursor status | P2 | Not started | 400 vs 500 route tests |
| Cycle 2 BUG-2 — Direction Conflict Cost label | P3 | Not started | Notification output test |
| Cycle 4 BUG-6 — Owner-index migration | Follow-up | Below threshold; investigate only | Invariant tests before extending script behavior |

**Plan outcome:** no application code is changed by this document. The first implementation batch should begin with the P0 submission-integrity fixes, while SEC-1 deployment validation is handled as a separate security gate.
