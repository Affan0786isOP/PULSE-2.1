# Admin Leaderboard Management Implementation Plan (2-Stage Execution)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a focused, secure Admin page (`/admin`) to manage and moderate the leaderboard (alias correction, soft-hide/unhide, and permanent deletion of public entries), unlocked via `Ctrl+Shift+A` (or `Cmd+Shift+A` on desktop, or a 5-tap gesture on mobile) on `/leaderboard` with development fallback passcode `180611`.

**Execution Strategy (2-Stage Zero-Conflict Rollout):**
- **Stage 1 (Additions Only — Zero edits to existing code):** Create all new files (models, services, routes, client API utilities, components, and isolated unit tests). Zero modifications to existing project files so concurrent ongoing development by the user is completely unaffected.
- **Stage 2 (Wiring & Mutations — Touch existing code):** Wire endpoints into `server/index.ts` & `rateLimits.ts`, update repositories/verifier for `attestedDisplayName` and erasure locks, connect client routes in `src/App.tsx`, attach triggers to `Leaderboard.tsx`, and run full integration quality gates.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Express, Firebase Firestore (Firebase Admin SDK), Vitest.

---

## File Breakdown by Stage

### Stage 1: Genuinely NEW Files Only (No overlap with existing files)
1. `server/models/adminModels.ts` (Admin DTO, audit models, update interfaces)
2. `server/services/interfaces/IAdminService.ts` (Service interface)
3. `server/services/adminService.ts` (Admin service logic with DTO projection)
4. `server/routes/adminRoutes.ts` (Admin Express router with auth guards)
5. `src/lib/adminActions.ts` (Client API fetch methods)
6. `src/lib/useAdminAuth.ts` (React auth hook)
7. `src/components/admin/AdminPasscodeModal.tsx` (Passcode entry modal)
8. `src/components/admin/AdminEditAliasModal.tsx` (Alias editor modal with validation)
9. `src/components/admin/AdminPage.tsx` (Standalone admin management view)
10. `tests/unit/adminAuth.test.ts` (Standalone test: timing-safe auth & token claims)
11. `tests/unit/adminService.test.ts` (Standalone test: service logic & DTO projection)
12. `tests/unit/adminRoutes.test.ts` (Standalone test: router endpoints & status codes)
13. `tests/unit/adminPage.test.tsx` (Standalone test: React UI table and modals)

### Stage 2: Existing Files Modified (Wiring & Invariants)
1. `firestore.indexes.json` (TTL for `adminSessionRevocations` & composite search index)
2. `docs/SECURITY.md` (Update §1.4 & Threat Matrix #7)
3. `server/middleware/auth.ts` (Add `getAdminPasscode`, `validateAdminTokenClaims`, `verifyAdminSession`, `revokeAdminSessionToken`)
4. `server/repositories/firestore/firestoreLeaderboardSubmissionRepository.ts` (Write `attestedDisplayName`)
5. `server/repositories/interfaces/ILeaderboardRepository.ts` (Add `updateEntryAlias` signature)
6. `server/repositories/firestore/firestoreLeaderboardRepository.ts` (Implement `updateEntryAlias`, add erasure locks & public delete check)
7. `server/services/leaderboardAppService.ts` (Update `verifySubmissionProvenance` to use `attestedDisplayName`)
8. `server/container.ts` (Inject `adminService` into `ServerContainer`)
9. `server/config/rateLimits.ts` (Add `adminLoginLimiter` & `adminMutationLimiter`)
10. `server/index.ts` (Register `registerAdminRoutes`)
11. `src/App.tsx` (Register lazy `/admin` route)
12. `src/components/Leaderboard.tsx` (Attach `Ctrl+Shift+A` listener)
13. `mobile/src/components/Leaderboard.tsx` (Attach 5-tap mobile gesture)
14. `tests/unit/adminProvenance.test.ts` & `tests/unit/adminRepositoryInvariants.test.ts` (Full integration verification)

---

## Stage 1: Additions Only (Zero Existing File Modifications)

### Task 1.1: Server Admin Models & Service Layer
- **Files to Create:**
  - `server/models/adminModels.ts`
  - `server/services/interfaces/IAdminService.ts`
  - `server/services/adminService.ts`
  - `tests/unit/adminService.test.ts`
- **Interfaces:**
  - `AdminLeaderboardDTO`, `AdminLeaderboardPageResponse`, `UpdateAliasInput`, `CreateAuditLogInput`.
  - `IAdminService` methods: `login`, `logout`, `getLeaderboardPage`, `editLeaderboardAlias`, `hideLeaderboardEntry`, `unhideLeaderboardEntry`, `deleteLeaderboardEntry`.
- [x] **Step 1:** Create `server/models/adminModels.ts`.
- [x] **Step 2:** Create `server/services/interfaces/IAdminService.ts`.
- [x] **Step 3:** Create `server/services/adminService.ts` implementing DTO projection (strips `ownerUid`, `sessionId`, `trialsDigest`, `qualityFlags`).
- [x] **Step 4:** Create `tests/unit/adminService.test.ts` testing service behavior with mock repository.
- [x] **Step 5:** Run `npx vitest run tests/unit/adminService.test.ts` and verify it passes.

---

### Task 1.2: Server Admin Express Routes & Auth Helpers Module
- **Files to Create:**
  - `server/routes/adminRoutes.ts`
  - `tests/unit/adminAuth.test.ts`
  - `tests/unit/adminRoutes.test.ts`
- **Endpoints in router:**
  - `POST /api/admin/login`
  - `POST /api/admin/logout`
  - `GET /api/admin/leaderboard/all`
  - `POST /api/admin/leaderboard/edit-alias`
  - `POST /api/admin/leaderboard/hide`
  - `POST /api/admin/leaderboard/unhide`
  - `POST /api/admin/leaderboard/delete`
- [x] **Step 1:** Create `tests/unit/adminAuth.test.ts` testing constant-time SHA-256 password checks, token generation, and claims validation.
- [x] **Step 2:** Create `server/routes/adminRoutes.ts` with router middleware, route handlers, `Cache-Control: no-store`, and error code mapping (400, 401, 404, 409, 422, 503).
- [x] **Step 3:** Create `tests/unit/adminRoutes.test.ts` testing standalone router with mock Express app and mock service.
- [x] **Step 4:** Run `npx vitest run tests/unit/adminAuth.test.ts tests/unit/adminRoutes.test.ts` and verify it passes.

---

### Task 1.3: Client Admin Library & React Modals
- **Files to Create:**
  - `src/lib/adminActions.ts`
  - `src/lib/useAdminAuth.ts`
  - `src/components/admin/AdminPasscodeModal.tsx`
  - `src/components/admin/AdminEditAliasModal.tsx`
  - `src/components/admin/AdminPage.tsx`
  - `tests/unit/adminPage.test.tsx`
- [x] **Step 1:** Create `src/lib/adminActions.ts` (typed fetch wrappers with `x-admin-token` header).
- [x] **Step 2:** Create `src/lib/useAdminAuth.ts` (auth hook with `login` and `logout`).
- [x] **Step 3:** Create `src/components/admin/AdminPasscodeModal.tsx` (accessible dialog with autofocus and error feedback).
- [x] **Step 4:** Create `src/components/admin/AdminEditAliasModal.tsx` (alias modal with `validateLeaderboardDisplayName` feedback).
- [x] **Step 5:** Create `src/components/admin/AdminPage.tsx` (clean responsive table, prefix search, protocol filter, cursor pagination, guarded delete prompt, pessimistic unhide).
- [x] **Step 6:** Create `tests/unit/adminPage.test.tsx` verifying component render, alias modal, and actions.
- [x] **Step 7:** Run `npx vitest run tests/unit/adminPage.test.tsx` and verify it passes.

---

### Stage 1 Checkpoint:
- Zero existing files touched.
- All new files compile cleanly and pass their unit tests.
- Existing 43 test files / 374 tests remain 100% untouched.

---

## Stage 2: Wiring & Invariants (Modifying Existing Codebase)

### Task 2.1: Submission Path, Repository Invariants & Provenance Verification
- **Files to Modify:**
  - `firestore.indexes.json`
  - `server/repositories/firestore/firestoreLeaderboardSubmissionRepository.ts`
  - `server/repositories/interfaces/ILeaderboardRepository.ts`
  - `server/repositories/firestore/firestoreLeaderboardRepository.ts`
  - `server/services/leaderboardAppService.ts`
  - `server/models/leaderboardModels.ts`
- **Files to Create:**
  - `tests/unit/adminProvenance.test.ts`
  - `tests/unit/adminRepositoryInvariants.test.ts`
- [x] **Step 1:** Verify legacy baseline verifier on existing fixtures.
- [x] **Step 2:** Add TTL override and composite index in `firestore.indexes.json`.
- [x] **Step 3:** In `firestoreLeaderboardSubmissionRepository.ts`, add `attestedDisplayName: input.displayName` to `privateMetaDoc`.
- [x] **Step 4:** In `leaderboardAppService.ts`, update `verifySubmissionProvenance()` to reconstruct HMAC using exact attested characters with colon replacement, and validate current alias separately.
- [x] **Step 5:** In `firestoreLeaderboardRepository.ts`, implement `updateEntryAlias()` checking pre-edit provenance (reject 422 if unverifiable), checking erasure locks (409), and preserving `provenanceToken`.
- [x] **Step 6:** Guard `softHideEntry()` and `deleteEntry()` against erasure locks, and enforce `snap.exists` in `deleteEntry()`.
- [x] **Step 7:** Run `npx vitest run tests/unit/adminProvenance.test.ts tests/unit/adminRepositoryInvariants.test.ts`.

---

### Task 2.2: Auth Revocation Wiring & Security Documentation
- **Files to Modify:**
  - `docs/SECURITY.md`
  - `server/middleware/auth.ts`
  - `server/container.ts`
- [x] **Step 1:** Update `docs/SECURITY.md` §1.4 and Threat Matrix #7 with the Web Moderation Console security defenses.
- [x] **Step 2:** In `server/middleware/adminAuth.ts`, implement `getAdminPasscode` (fails closed in prod, rejects `'180611'`/placeholders in prod), `validateAdminTokenClaims`, `verifyAdminSessionToken`, and `revokeAdminTokenNonce`.
- [x] **Step 3:** Wire `adminService` into `server/container.ts`.

---

### Task 2.3: Server Route Mounting & Rate Limiting
- **Files to Modify:**
  - `server/config/rateLimits.ts`
  - `server/index.ts`
  - `tests/unit/serverRoutesDelegation.test.ts`
  - `tests/unit/serverRoutesParity.test.ts`
- [x] **Step 1:** Register `adminLoginLimiter` and `adminMutationLimiter` in `server/config/rateLimits.ts`.
- [x] **Step 2:** Call `registerAdminRoutes` in `server/index.ts`.
- [x] **Step 3:** Run `npx vitest run tests/unit/serverRoutesDelegation.test.ts tests/unit/serverRoutesParity.test.ts` and verify parity.

---

### Task 2.4: Client Route Mounting & Secret Shortcuts
- **Files to Modify:**
  - `src/App.tsx`
  - `src/components/Leaderboard.tsx`
  - `mobile/src/components/Leaderboard.tsx`
  - `tests/unit/adminAuthModal.test.tsx` (new test)
- [x] **Step 1:** Register lazy route `/admin` in `src/App.tsx`.
- [x] **Step 2:** Attach `Ctrl+Shift+A` and `Cmd+Shift+A` listener to `src/components/Leaderboard.tsx`.
- [x] **Step 3:** Attach 5-tap gesture to `mobile/src/components/Leaderboard.tsx` with full-page redirect to `/admin`.
- [x] **Step 4:** Run `npx vitest run tests/unit/adminAuthModal.test.tsx`.

---

## Quality & Acceptance Gates (End of Stage 2)

```bash
# Gate 1: Full Vitest suite (all 43 baseline files + new admin suites must pass with 0 regressions)
npm test

# Gate 2: Static TypeScript check on Desktop and Mobile
npm run check

# Gate 3: Targeted Security, Provenance, Revocation, Concurrency & Legacy Verification Tests
npx vitest run tests/unit/serverRoutesDelegation.test.ts tests/unit/serverRoutesParity.test.ts tests/unit/adminRoutes.test.ts tests/unit/adminProvenance.test.ts tests/unit/adminAuth.test.ts tests/unit/adminRepositoryInvariants.test.ts

# Gate 4: Production Build Check
npm run build
```
