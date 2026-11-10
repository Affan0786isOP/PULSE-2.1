# Cycle 7: Bug Referee Report & Final Adjudication

**Date:** 2026-11-10  
**Agent Role:** Bug Referee (Cycle 7 Final Arbiter)  
**Target Scope:** Core Backend Services, Routes & Server Bootstrap  
**Report File:** `audit/bug-hunt/cycle-7/03-referee.md`  
**Test Suite Verification Baseline:** 114 test files, 873 unit tests passing cleanly.

---

### Executive Summary & Final Adjudication Matrix

| ID | Candidate Defect Summary | Hunter Score | Skeptic Verdict | Referee Final Ruling | Freq (1–10) | Impact (1–10) | Final Risk Score | Status |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **BUG-C7-01** | Read-only rank lookup `getMyLeaderboardRank` fires unconditional Firestore write transactions on every call via `backfillLegacyOwnership` | 80 | CONFIRMED | **CONFIRMED** | 10 | 8 | **80** | **Actionable** |
| **BUG-C7-02** | Asymmetric alias querying causing 8 parallel unindexed collection scans & 100% discarded results in `getMyLeaderboardRank` | 56 | CONFIRMED | **CONFIRMED** | 8 | 7 | **56** | **Actionable** |
| **BUG-C7-03** | Provenance HMAC digests `temporalDynamics=[object Object]`, bypassing cryptographic verification of dynamic metrics | 42 | CONFIRMED | **CONFIRMED** | 7 | 6 | **42** | **Actionable** |
| **BUG-C7-04** | Corrupted multi-attempt trial sequencing (`derivedAttemptNumber` freezes at attempt 2 on subsequent retries) | 36 | CONFIRMED | **CONFIRMED** | 6 | 6 | **36** | **Actionable** |
| **BUG-C7-05** | `getAndValidateSession` strips `session` object on consumed checks, forcing duplicate database round-trips | 32 | CONFIRMED | **CONFIRMED** | 8 | 4 | **32** | **Actionable** |
| **BUG-C7-06** | Dropped 409 Conflict status in `leaderboardRoutes.ts` masks active participant erasure conflicts as 500 Internal Server Errors | 30 | CONFIRMED | **CONFIRMED** | 5 | 6 | **30** | **Actionable** |
| **BUG-C7-07** | Missing `ABORTED` transaction error handling in `researchRoutes.ts` turns retryable summary lock contention into 500 errors | 30 | CONFIRMED | **CONFIRMED** | 5 | 6 | **30** | **Actionable** |
| **BUG-C7-08** | Unhandled promise rejection on server boot and error status masking converting 400/413 into 500 in `server/index.ts` | 30 | CONFIRMED | **CONFIRMED** | 6 | 5 | **30** | **Actionable** |
| **BUG-C7-09** | `SessionService` leaks internal service account environment variable diagnostics in client error messages | 25 | DISPROVED | **DISPROVED** | 0 | 0 | **0** | **False Positive** |
| **BUG-C7-10** | Dead code unreachable fallback in score derivation for non-speed/non-memory assessment types | 6 | DISMISSED | **DISMISSED** | 0 | 1 | **0** | **Dismissed (YAGNI)** |

---

### Detailed Rulings & Minimal Surgical Fixes

#### BUG-C7-01: Read-Only Rank Lookup `getMyLeaderboardRank` Fires Unconditional Firestore Write Transactions on Every Invocation
- **File Links:** [leaderboardAppService.ts#L88-L136](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/leaderboardAppService.ts#L88-L136), [leaderboardAppService.ts#L152](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/leaderboardAppService.ts#L152), [firestoreLeaderboardRepository.ts#L229-L300](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreLeaderboardRepository.ts#L229-L300)
- **Referee Ruling:** **CONFIRMED** (F: 10 × I: 8 = **80**).
  `getMyLeaderboardRank` calls `backfillLegacyOwnership` unconditionally before checking if the user already has linked records. In `firestoreLeaderboardRepository.ts#L242-L243`, if `priorMeta.ownerUid === ownerUid`, it fails to short-circuit and proceeds with `tx.set(metaRef, ...)` and `tx.update(publicRef, ...)`. Every read-only rank request executes multi-document write transactions across Firestore.
- **Surgical Fix:**
  1. In `server/services/leaderboardAppService.ts`: Query `getEntriesByOwner` first. Only invoke `backfillLegacyOwnership` if `ownedRows.length === 0`.
  2. In `server/repositories/firestore/firestoreLeaderboardRepository.ts#L243`: If `priorMeta.ownerUid === ownerUid`, return `true` immediately without executing write operations.

#### BUG-C7-02: Asymmetric Alias Querying in `getMyLeaderboardRank` Causing 8 Parallel Collection Scans & 100% Discarded Results
- **File Links:** [leaderboardAppService.ts#L191-L217](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/leaderboardAppService.ts#L191-L217), [leaderboardAppService.ts#L636-L644](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/leaderboardAppService.ts#L636-L644), [firestoreLeaderboardRepository.ts#L30-L50](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreLeaderboardRepository.ts#L30-L50)
- **Referee Ruling:** **CONFIRMED** (F: 8 × I: 7 = **56**).
  `loadPublicLeaderboard` queries only canonical assessment types. `getMyLeaderboardRank` fans out across all aliases (e.g. 8 for `color-recognition`), fires 8 parallel queries, and on line 209 filters `if (record.assessmentType === rawType)`. Every record returned by a non-canonical alias query is immediately discarded. Furthermore, line 200 fails the entire request if any single alias scan errors.
- **Surgical Fix:** Remove the alias loop in `getMyLeaderboardRank`; query solely the canonical `rawType` via `getAllEntriesByAlias(rawType, speed ? 'asc' : 'desc')` matching `loadPublicLeaderboard`.

#### BUG-C7-03: Provenance Token HMAC Masks `temporalDynamics` as Literal `"[object Object]"`
- **File Links:** [researchService.ts#L356-L358](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/researchService.ts#L356-L358), [researchRoutes.ts#L261-L265](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L261-L265)
- **Referee Ruling:** **CONFIRMED** (F: 7 × I: 6 = **42**).
  Template string interpolation `${k}=${derivedMetrics[k]}` on nested object `temporalDynamics` yields `"temporalDynamics=[object Object]"`. All dynamic metrics (`foreperiodSensitivity`, `habituationIndex`, etc.) are completely omitted from cryptographic provenance verification, allowing undetectable tampering.
- **Surgical Fix:** In `researchService.ts#L356` and `researchRoutes.ts#L261`, serialize nested objects with `typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)`.

#### BUG-C7-04: Multi-Attempt Trial Sequence Corruption (`derivedAttemptNumber` Freezes at 2)
- **File Links:** [researchService.ts#L233-L241](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/researchService.ts#L233-L241), [researchService.ts#L269](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/researchService.ts#L269)
- **Referee Ruling:** **CONFIRMED** (F: 6 × I: 6 = **36**).
  `derivedAttemptNumber` reads `prev['attemptNumber']` from raw client input. Because raw input objects are never updated, attempts 3, 4, etc. on the same trial continually see `prev['attemptNumber'] === undefined`, defaulting to 1, and freeze at `attemptNumber: 2`.
- **Surgical Fix:** Track attempt numbers across iterations with a running `Map<number, number>` keyed by `trialNumber` outside the `forEach` loop.

#### BUG-C7-05: `SessionService.getAndValidateSession` Drops `session` on Consumed Check, Forcing Redundant Database Read
- **File Links:** [sessionService.ts#L90-L94](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/sessionService.ts#L90-L94), [researchService.ts#L183-L188](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/researchService.ts#L183-L188)
- **Referee Ruling:** **CONFIRMED** (F: 8 × I: 4 = **32**).
  `sessionService.ts` fetched `session` on line 65 but line 91 drops `session` from the return object when `session.consumed` is true. `ResearchService` is forced to re-fetch the exact same document on line 184 (`const consumed = sessionCheck.session || (await this.sessionRepo.findById(sessionId))`).
- **Surgical Fix:** In `sessionService.ts#L91`, return `{ valid: false, session, error: ..., status: 400 }`.

#### BUG-C7-06: Dropped 409 Conflict Errors in `leaderboardRoutes.ts` Misreported as 500 Internal Server Errors
- **File Links:** [leaderboardRoutes.ts#L151-L168](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/leaderboardRoutes.ts#L151-L168), [firestoreLeaderboardSubmissionRepository.ts#L81-L84](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/repositories/firestore/firestoreLeaderboardSubmissionRepository.ts#L81-L84)
- **Referee Ruling:** **CONFIRMED** (F: 5 × I: 6 = **30**).
  `firestoreLeaderboardSubmissionRepository` throws `AppError(..., 409)` when participant erasure is active. `leaderboardRoutes.ts#L151` only checks `400 || 403 || 404`. Status 409 falls through to line 167 as a `500 Internal Server Error`.
- **Surgical Fix:** Add `errStatus === 409` to line 151 in `server/routes/leaderboardRoutes.ts`.

#### BUG-C7-07: Missing Transaction Contention / `ABORTED` Handler in `researchRoutes.ts` Triggering 500 Errors Under Concurrency
- **File Links:** [researchRoutes.ts#L205-L252](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L205-L252), [leaderboardRoutes.ts#L155-L165](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/leaderboardRoutes.ts#L155-L165)
- **Referee Ruling:** **CONFIRMED** (F: 5 × I: 6 = **30**).
  Concurrent submissions updating `publicDatasetMeta/summary` abort with code 10 or 'ABORTED'. `leaderboardRoutes.ts` catches this and returns a 503 retryable response, but `researchRoutes.ts` lacks this check and returns a 500 fatal server error.
- **Surgical Fix:** Insert the standard contention and 503 handler into `server/routes/researchRoutes.ts` before the 500 fallback.

#### BUG-C7-08: Unhandled Startup Promise Rejection and Error Status Masking in `server/index.ts`
- **File Links:** [server/index.ts#L76-L89](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/index.ts#L76-L89)
- **Referee Ruling:** **CONFIRMED** (F: 6 × I: 5 = **30**).
  `startServer()` is an unawaited async function called without `.catch(...)`. Additionally, global error middleware hardcodes `res.status(500)`, ignoring `err.status` / `err.statusCode` from Express middleware (e.g. 400 for malformed JSON, 413 for body limits).
- **Surgical Fix:** In `server/index.ts`, inspect `err.status ?? err.statusCode ?? 500` and append `.catch(...)` with `process.exit(1)` to `startServer()`.

#### BUG-C7-09: `SessionService` Leaks Internal Service Account Environment Variable Diagnostics in Client Error Messages
- **File Links:** [sessionService.ts#L67-L71](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/sessionService.ts#L67-L71), [researchRoutes.ts#L242-L244](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/routes/researchRoutes.ts#L242-L244), [serverRoutesParity.test.ts#L342-L343](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/tests/unit/serverRoutesParity.test.ts#L342-L343), [httpResponses.json#L75-L80](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/tests/fixtures/goldenBaseline/httpResponses.json#L75-L80)
- **Referee Ruling:** **DISPROVED (False Positive)** (F: 0 × I: 0 = **0**).
  `researchRoutes.ts#L242-L244` explicitly traps `if (errMsg.includes('Database unavailable'))` and returns only `{ success: false, error: 'Database unavailable' }`. Golden baseline characterization tests enforce that internal diagnostic strings are never returned to clients.

#### BUG-C7-10: Dead Code Unreachable Fallback in Score Derivation for Non-Speed/Non-Memory Assessment Types
- **File Links:** [leaderboardAppService.ts#L376-L378](file:///C:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server/services/leaderboardAppService.ts#L376-L378)
- **Referee Ruling:** **DISMISSED (Benign Defensive Fallback / YAGNI)** (F: 0 × I: 1 = **0**).
  The fallback is unreachable given current constants, but it is harmless defensive coding. Removing it provides zero user or architectural value and introduces unnecessary code churn.

---

### Final Stats & Next Steps
- **Total Reported:** 10
- **Confirmed Actionable Bugs:** 8 (BUG-C7-01 through BUG-C7-08)
- **Disproved / Dismissed:** 2 (BUG-C7-09, BUG-C7-10)
- All 8 confirmed bugs are ready for Phase 2 surgical fixing.
