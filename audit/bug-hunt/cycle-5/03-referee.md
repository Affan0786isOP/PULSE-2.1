# Cycle 5: Bug Referee Report

**Date:** 2026-11-10  
**Agent Role:** Bug Referee (Final Arbiter)  
**Subagent ID:** `5b2a72ac-f439-45ef-9f32-9b4779153f78`  
**Evaluation Scope:** Authoritative verification and risk scoring of Cycle 5 findings BUG-1 through BUG-3.

---

### Verified Bug Judgments

#### BUG-1
- **Hunter's claim:** In `server/routes/adminRoutes.ts` (lines 134-160), an unhandled `INVALID_CURSOR` error from `getLeaderboardPage` returns HTTP 500 Internal Server Error instead of HTTP 400 Bad Request when an invalid or stale cursor is supplied.
- **Skeptic's response:** ACCEPT. `getLeaderboardPage` / `firestoreLeaderboardRepository.ts` throws plain `new Error('INVALID_CURSOR')`. Because it is not an `AppError`, the route falls back to 500 instead of 400, unlike `researchRoutes.ts` which explicitly handles it as 400.
- **Your analysis:** Direct inspection confirms both the Hunter and Skeptic are correct. In `server/routes/adminRoutes.ts` (lines 146-160), `deps.adminService.getLeaderboardPage(...)` calls `this.leaderboardRepo.getAllEntriesForAdminPage(...)`. In `server/repositories/firestore/firestoreLeaderboardRepository.ts` (line 154), an unlocated cursor throws `throw new Error('INVALID_CURSOR')`. In `adminRoutes.ts`, the catch block checks `const status = err instanceof AppError ? err.status : 500`. Since the error is a standard `Error` rather than an `AppError`, it returns HTTP 500. A cursor parameter is user/client input; malformed or stale input must return HTTP 400 (`Bad Request`) rather than HTTP 500 (`Internal Server Error`), which pollutes server error budgets and triggers false APM alerts.
- **Frequency (1-10):** 4 (Admins and automated dashboard queries paginating with stale, expired, or invalid cursors)
- **Impact (1-10):** 4 (Violates HTTP/REST client contract, triggers false-positive 5xx alert alarms)
- **Risk Score:** 16
- **VERDICT:** ACTIONABLE BUG (Score ≥ 5)
- **Confidence:** High
- **True severity:** Medium
- **Suggested fix:** In `server/routes/adminRoutes.ts` lines 154-159 (or in `adminService.ts`), check if `err instanceof Error && err.message === 'INVALID_CURSOR'` (or throw an `AppError('Invalid cursor parameter', 400)`) and return HTTP 400 Bad Request, mirroring the handling in `server/routes/researchRoutes.ts` (lines 346 & 395).

---

#### BUG-2
- **Hunter's claim:** In `scripts/capture-break-ui.mjs` (lines 4, 27-30), hardcoded ephemeral artifact directory path without existence verification causes the UI capture script to crash with `ENOENT`, breaking CI pipelines and fresh workspaces.
- **Skeptic's response:** DISPROVE. `capture-break-ui.mjs` is an unreferenced local ad-hoc script not run in CI or package.json scripts. The directory exists on the host. Frequency 1, Impact 1 (Risk 1 < 5).
- **Your analysis:** Skeptic is correct. Inspection of `package.json` (lines 7-29) and `.github/workflows/` confirms `capture-break-ui.mjs` is neither a registered script nor referenced by any CI workflow or build pipeline. It is an unreferenced ad-hoc scratch script. Furthermore, `Test-Path "C:/Users/affan/.gemini/antigravity/brain/202e9e53-c5ee-4811-a57c-41fd3b897aa2"` evaluates to `True` on the host. The Hunter's claim that this breaks CI pipelines is factually inaccurate. Per the threshold rule and lazy senior dev principle (no speculative design for unused/ad-hoc paths), this has negligible frequency and zero production impact.
- **Frequency (1-10):** 1 (Orphaned scratch script never executed by CI or users)
- **Impact (1-10):** 1 (Zero production or build impact even if manually executed outside the host)
- **Risk Score:** 1
- **VERDICT:** DISMISSED (Score < 5 - Leave alone)
- **Confidence:** High
- **True severity:** Low (Technically defective path for portable use, but non-actionable)
- **Suggested fix:** N/A (Dismissed below threshold; do not add unrequested scaffolding).

---

#### BUG-3
- **Hunter's claim:** In `mobile/src/components/LeaderboardOptIn.tsx` (lines 6-12, 94-101), incomplete prop contract omits `sessionId`, forcing reliance on client fallback heuristics and weakening contract guarantees.
- **Skeptic's response:** DISPROVE. The mobile submission contract works as intended. `mobile/src/lib/firestore.ts` intentionally resolves `const activeSessionId = payload.sessionId || payload.idempotencyKey;` and dispatches valid `sessionId` and `idempotencyKey` values. No runtime failure or data loss occurs. Frequency 1, Impact 1 (Risk 1 < 5).
- **Your analysis:** Skeptic is correct. In `mobile/src/components/ReactionTest.tsx` (line 897), `BlockMemoryTest.tsx` (line 749), `ColorTest.tsx` (line 780), `DirectionTest.tsx` (line 935), and `NumberMemoryTest.tsx` (line 732), callers pass `idempotencyKey={sessionId}`. Inside `mobile/src/lib/firestore.ts` (lines 405-427), `submitLeaderboardResult` resolves `activeSessionId = payload.sessionId || payload.idempotencyKey` and creates `activeIdempotencyKey = `${payload.idempotencyKey}-leaderboard``. Both fields are sent to `/api/leaderboard/submit` and successfully processed. There is zero runtime failure, data corruption, or schema violation. The Hunter's claim is an aesthetic critique regarding desktop-mobile prop symmetry. Per the rule: "Do NOT design for rare or future cases nobody asked about... rate its frequency at 1 and leave it alone."
- **Frequency (1-10):** 1 (Existing logic operates properly on 100% of mobile submissions)
- **Impact (1-10):** 1 (Zero functional degradation or user impact)
- **Risk Score:** 1
- **VERDICT:** DISMISSED (Score < 5 - Leave alone)
- **Confidence:** High
- **True severity:** Low (Cosmetic interface symmetry only)
- **Suggested fix:** N/A (Dismissed below threshold; do not add unrequested prop boilerplate).

---

## VERIFIED BUG REPORT

**Stats:**
- Total reported by Hunter: 3
- Dismissed as false positives / invalid claims: 0
- Dismissed below threshold (Frequency × Impact < 5 or rare/future cases): 2
- Confirmed actionable bugs (Risk Score ≥ 5): 1
- Critical: 0 | Medium: 1 | Low: 0

**Confirmed actionable bugs (ordered by Risk Score descending, then severity):**

| # | Severity | Frequency (1-10) | Impact (1-10) | Risk Score | File | Line(s) | Description | Suggested Fix |
|---|----------|------------------|---------------|------------|------|---------|-------------|---------------|
| BUG-1 | Medium | 4 | 4 | 16 | `server/routes/adminRoutes.ts` | 134-160 | Passing an invalid or stale pagination cursor throws `INVALID_CURSOR`, which falls back to HTTP 500 instead of HTTP 400 Bad Request. | Catch `INVALID_CURSOR` (or check `err.message === 'INVALID_CURSOR'`) and return HTTP 400 Bad Request with `{ success: false, error: 'Invalid cursor parameter' }`. |

**Dismissed below threshold (Frequency × Impact < 5 or rare/future cases - left alone):**
- **BUG-2 (`scripts/capture-break-ui.mjs`):** Risk Score = 1 (Freq: 1, Imp: 1). Unreferenced ad-hoc scratch script not hooked into `package.json` or CI workflows. Directory exists on the host. Left alone per YAGNI and the < 5 threshold rule.
- **BUG-3 (`mobile/src/components/LeaderboardOptIn.tsx`):** Risk Score = 1 (Freq: 1, Imp: 1). Mobile leaderboard flow correctly maps `sessionId` via fallback in `mobile/src/lib/firestore.ts` without runtime error or data loss. Pure aesthetic prop naming critique; left alone per YAGNI and the < 5 threshold rule.

**Low-confidence items (flagged for manual review):**
- None. All items evaluated with High confidence via direct source code and repository verification.
