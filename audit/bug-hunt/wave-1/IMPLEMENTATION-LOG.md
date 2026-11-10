# Wave 1 Implementation Log

**Repository:** `Affan0786isOP/PULSE-2.1`  
**Branch:** `fix/wave-1`  
**Starting code baseline:** `843f657e13b3fb535cd58d5f752648827e51e102`  
**Implementation state:** Initial implementation committed; the two Direction under-80ms payload omissions have now been corrected on `fix/wave-1`, with a source-contract regression guard added. Test execution and independent audit remain pending.  
**Merge state:** Not approved; do not merge.

## Scope

Wave 1 contains Master findings #1, #2, #4, #6, #7, #13, #15, #20, #50, and #57. No later-wave findings were intentionally included.

## Changes made on this branch

| Finding | Change / current disposition | Evidence still required |
|---|---|---|
| #1 — Number Memory epoch timestamps | Split stimulus and response wall-clock timestamps (`Date.now()`) from the monotonic performance timestamps. Persist both session timestamps as epoch values; calculate elapsed time only from `performance.now()`. | Run component/server session-window regression tests; inspect all submission paths. |
| #2 — Block Memory epoch timestamps | Applied the same stimulus/response wall-clock and monotonic split to both success and failure observation paths. | Run component/server session-window regression tests; inspect both paths. |
| #4 — Admin credential fallback | Removed the hardcoded passcode and fallback signing secret. Admin auth now returns an unavailable credential when env values are absent or below the configured minimums (16-character passcode, 32-character signing secret). Passcode validation has no master-code bypass. Updated unit tests for fail-closed behavior, including missing `NODE_ENV`. | Run admin-auth tests; inspect all environment/deployment configurations; rotate credentials and invalidate existing sessions if exposure is confirmed. |
| #6 — Mobile About bundle contamination | Existing branch implementation imports the mobile-local About component. Added a source-boundary regression assertion to `sharedLibraryParity.test.ts`. | Run test and build; inspect generated mobile chunks to confirm desktop About dependency chain is absent. |
| #7 — Desktop Direction false-start payload | Added canonical `targetDirection` to both pre-stimulus and under-80ms anticipatory observations using `currentDirection.toLowerCase()`. | Run desktop Direction component/protocol tests and the new desktop/mobile under-80ms source-contract regression. |
| #13 — Stroop retry contract | Server calculator now accepts up to 40 total observations while requiring exactly 15 scored logical trials. It maps retries to the logical trial's seeded stimulus and rejects duplicate scored attempts for a logical trial. | Run new retry regression test plus Stroop engine and end-to-end submission tests. |
| #15 — Desktop ColorTest false-start observations | False-start attempts now retain their logical trial number and incremented attempt number; scored and timeout observations use the logical trial number while chronological trialIndex/sequenceNumber remain sequential. | Run new retry regression test and desktop ColorTest submission flow; verify false-start evidence is retained in the submitted raw observations. |
| #20 — Mobile Direction false-start payload | Added canonical `targetDirection` to the under-80ms anticipatory observation using `currentDirection.toLowerCase()`; pre-stimulus path already included it. | Run mobile Direction component/protocol tests and the new desktop/mobile under-80ms source-contract regression. |
| #50 — Privacy migration field deletion | Existing branch code already uses Firestore `FieldValue.delete()` for each private public-row field. No source change required. | Run migration emulator tests proving private fields are absent, valid fields preserved, and reruns idempotent. |
| #57 — Negative raw latency | Gateway now validates the effective raw-latency fallback before classifying the observation, rejecting negative values even when `reactionTime` is otherwise positive or omitted. | Run new server-engine regression test and the complete assessment-engine suite. |

## Regression tests added or updated

- `tests/unit/adminAuth.test.ts`: changed expectations from permissive development fallbacks to fail-closed behavior, and verifies the legacy passcode is rejected.
- `tests/unit/sharedLibraryParity.test.ts`: asserts the mobile About route stays within the mobile component boundary and verifies both desktop and mobile under-80ms Direction observations include the required `targetDirection` field.
- `tests/unit/serverEngines.test.ts`: adds a negative raw-latency gateway regression and a Stroop false-start retry scenario that must still produce exactly 15 scored logical trials.

## Verification state

**Not run in this execution.** The GitHub file-edit interface used to commit these changes does not provide a shell in which to run the repository's Vitest, TypeScript, production build, Firestore emulator, or browser tests. A prior Vercel status check existed for the earlier About-boundary commit `400f5d28d550b1ee08ac00f3a9992f88830993a4`; it does not validate the subsequent Direction fixes. No test execution is claimed for the current branch head.

Required next actions:

1. Run targeted tests: `tests/unit/adminAuth.test.ts`, `tests/unit/sharedLibraryParity.test.ts`, and `tests/unit/serverEngines.test.ts`.
2. Run all relevant assessment component, server engine, route, and Firestore migration emulator tests.
3. Run type-checks and production builds for desktop and mobile.
4. Inspect mobile build artifacts for desktop About contamination.
5. Independently audit only Wave 1 findings and this wave's diff.
6. Remediate all audit findings and repeat the Wave 1 audit until the Referee returns `APPROVE TO MERGE`.

**Current verdict: NOT YET APPROVED.** Direction findings #7 and #20 have source fixes and a regression guard, but test execution, the remaining Wave 1 verification gates, and the independent wave audit must pass before merge.
