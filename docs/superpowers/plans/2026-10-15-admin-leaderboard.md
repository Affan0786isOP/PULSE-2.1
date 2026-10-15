# Admin Leaderboard Management Implementation Plan (Revised v6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a focused, secure Admin page (`/admin`) to manage and moderate the leaderboard (alias correction, soft-hide/unhide, and permanent deletion of public entries), unlocked via `Ctrl+Shift+A` (or `Cmd+Shift+A` on desktop, or a 5-tap gesture on mobile) on `/leaderboard` with local development fallback passcode `180611`.

**Architecture:** A server-authoritative admin suite mounted at `/api/admin/*`, using constant-time length-safe password checks, signed HMAC-SHA256 session tokens with verified token revocation via Firestore `adminSessionRevocations`, and strict DTO projection. Moderation mutations reuse existing repository transactions: `softHideEntry()`, `unhideEntry()`, and a guarded `deleteEntry()`, plus a new `updateEntryAlias()` that updates `displayName` in `leaderboardResults` and `leaderboardPrivateMeta.displayName` while preserving the immutable `attestedDisplayName` verified against the existing cryptographic `provenanceToken`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Express, Firebase Firestore (Firebase Admin SDK), Vitest.

---

## 1. Resolved Invariants & Architecture Decisions

### 1.1 Legacy Alias Migration & Provenance Verification Safety
- **Root Cause Identified:** The current `getEntryById()` merges `meta` first and public `doc` second (`{ ...meta, ...data }`). The verifier thus uses public `doc.displayName` for legacy rows. If `meta.displayName` and `doc.displayName` differ on a legacy row, blindly initializing `attestedDisplayName = meta.displayName` produces an immediate verification failure.
- **Contract Specification:**
  1. **Pre-edit Verification Check:** Before modifying any record in `updateEntryAlias()`, the repository reconstructs the HMAC payload using the candidate alias that currently verifies against `row.provenanceToken`.
  2. If `meta.attestedDisplayName` is absent:
     - Try `doc.displayName`. If `signProvenancePayload(tokenData)` matches `provenanceToken`, `doc.displayName` is the verified attested alias.
     - Else try `meta.displayName`. If it matches, `meta.displayName` is the verified attested alias.
     - If neither matches the existing `provenanceToken`, reject the alias edit with HTTP 422 (`UNVERIFIABLE_LEADERBOARD_ENTRY`: *"Cannot alter display name on an entry with broken or missing cryptographic provenance attestation"*).
  3. Once verified, persist `attestedDisplayName = verifiedAlias` in `leaderboardPrivateMeta`. On subsequent edits, `attestedDisplayName` is immutable and never overwritten.
  4. Write `docRef.displayName = newDisplayName`, `metaRef.displayName = newDisplayName`, and `displayNameModifiedByAdmin: true`.
  5. In `server/services/leaderboardAppService.ts` (`verifySubmissionProvenance`):
     - Extract `rawAttested = row.attestedDisplayName !== undefined ? row.attestedDisplayName : row.displayName`.
     - Validate bounds ($\le 128$ chars), preserve exact characters (do NOT run `safeLeaderboardDisplayNameForRead()` over `rawAttested` which can alter Unicode/casing), apply colon replacement (`rawAttested.replace(/:/g, '_')`), and reconstruct HMAC.
     - Separately validate current public alias `safeLeaderboardDisplayNameForRead(row.displayName)`.

### 1.2 Logout Idempotency vs Session Verification
- **Root Cause Identified:** Calling full `verifyAdminSession(req)` on logout creates a conflict: the first logout revokes the token, causing a second logout request to return 401 instead of the required idempotent 200.
- **Contract Specification:**
  - Create two distinct verification helper functions in `server/middleware/auth.ts`:
    1. `validateAdminTokenClaims(token: string): { valid: boolean; nonce?: string; expiresAt?: number }`:
       - Checks token format (`issuedAt:expiresAt:nonce:signature`).
       - Validates timestamps (`issuedAt` not in future, `now <= expiresAt`, lifetime $\le 2$ hours).
       - Validates HMAC signature using `crypto.timingSafeEqual`.
       - Does **not** check the revocation store.
    2. `verifyAdminSession(req: express.Request): Promise<boolean>`:
       - Calls `validateAdminTokenClaims(token)`. If invalid, returns false.
       - Queries `adminSessionRevocations.doc(nonce).get()`. If exists, returns false (revoked).
       - If Firestore throws, fails closed (`503`).
  - **`POST /api/admin/logout` Handler:**
    - Calls `validateAdminTokenClaims(token)`. If invalid or expired, returns 401.
    - If valid, writes `adminSessionRevocations.doc(nonce).set({ revokedAt: Date.now(), expiresAt, ttl: new Date(expiresAt) })`.
    - Repeated logouts with the same valid, unexpired token succeed with 200 idempotently.
    - If Firestore is unavailable, returns 503 so client knows revocation failed.

### 1.3 Erasure Locks & Robust Owner Metadata Resolution
- **Root Cause Identified:** If owner metadata is missing or stored only on the public doc, mutations could skip the erasure check and race with statutory participant erasure.
- **Contract Specification:**
  - In `softHideEntry()`, `unhideEntry()`, `updateEntryAlias()`, and `deleteEntry()`:
    1. Resolve `ownerUid`: check `meta.ownerUid`, falling back to `doc.ownerUid`.
    2. Resolve `assessmentType`: normalize `doc.assessmentType || meta.assessmentType`.
    3. If `ownerUid` exists:
       - Query `ownerIndexRef = db.collection('leaderboardOwnerIndex').doc(ownerIndexDocumentId(ownerUid, assessmentType))`.
       - If `ownerIndexSnap.data()?.deleting === true`, abort transaction with HTTP 409 (`Participant leaderboard erasure is in progress. Please retry later.`).
    4. If a public row has neither `meta.ownerUid` nor `doc.ownerUid` (unlinked legacy row):
       - Allow soft-hide or delete to purge public visibility, but record `ownerUnresolved: true` in `adminAuditLogs`.
       - For `updateEntryAlias()`, require both private receipt and valid provenance (Section 1.1) so unlinked/unverifiable entries are rejected with 422.

### 1.4 Firestore Revocation TTL Deployment Configuration
- Update `firestore.indexes.json` to configure the TTL policy for `adminSessionRevocations`:
  ```json
  "fieldOverrides": [
    {
      "collectionGroup": "_rateLimitCounters",
      "fieldPath": "resetAt",
      "ttl": true,
      "indexes": []
    },
    {
      "collectionGroup": "adminSessionRevocations",
      "fieldPath": "ttl",
      "ttl": true,
      "indexes": []
    }
  ]
  ```
- Deployment verification: included in project deployment scripts (`firebase deploy --only firestore:indexes`). Test verification mocks TTL expiry cleanup.

### 1.5 Prefix Search Index & Search Cursor Contract
- **Composite Indexes (`firestore.indexes.json`):**
  Add indexes to support prefix queries ordered by score or creation:
  ```json
  {
    "collectionGroup": "leaderboardResults",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "assessmentType", "order": "ASCENDING" },
      { "fieldPath": "displayName", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  }
  ```
- **Cursor Specification:**
  - For standard listing & prefix search: `cursor` represents the document ID of the **last returned result** (`query.startAfter(cursorSnap)`).
  - For bounded substring scans (general query `q`): `cursor` represents the **last scanned document ID**, and the response returns `{ entries, nextCursor: lastScannedId, hasMore, totalScanned }`. This guarantees subsequent requests resume scanning without repeating scanned records or skipping matches.

### 1.6 Security Architecture Alignment (`docs/SECURITY.md`)
- Update `docs/SECURITY.md` §1.4 ("Administrative & Operational Access Control") and Threat Matrix item #7:
  - Document the controlled reintroduction of a restricted Web Moderation Console under strict defenses:
    - Route-scoped IP rate-limiting (`adminLoginLimiter` at 10 req / 15 min; `adminMutationLimiter` at 30 req / 15 min).
    - Length-safe constant-time password validation over SHA-256 digests.
    - Ephemeral signed admin session tokens (2-hour hard limit).
    - Authoritative Firestore revocation store (`adminSessionRevocations` with TTL).
    - Fail-closed secret handling in production (`ADMIN_PASSCODE` and `PULSE_ADMIN_SESSION_SECRET` required and rejecting `'180611'`/placeholders).
  - Explicitly document that a shared passcode cannot identify individual moderators; audit entries record actor `'admin'`.
  - Update Threat Matrix #7 status from "REMOVED / ELIMINATED" to "RESTRICTED / MITIGATED".

### 1.7 Mobile-to-Desktop Admin Navigation
- Mobile client router intentionally excludes `/admin`.
- In `mobile/src/components/Leaderboard.tsx`, successful authentication stores `pulse_admin_token` in `sessionStorage` and triggers `window.location.assign('/admin')`.
- `shared/domain/deviceRouting.ts` exempts `/admin` from mobile redirects, allowing the desktop `/admin` page to load cleanly on mobile viewports.

---

## 2. Ordered Implementation Tasks

### Task 1: Submission Path, Repository Invariants & Provenance Verification

**Files:**
- Modify: `firestore.indexes.json`
- Modify: `server/repositories/firestore/firestoreLeaderboardSubmissionRepository.ts`
- Modify: `server/repositories/interfaces/ILeaderboardRepository.ts`
- Modify: `server/repositories/firestore/firestoreLeaderboardRepository.ts`
- Modify: `server/services/leaderboardAppService.ts`
- Modify: `server/models/leaderboardModels.ts`
- Create: `server/models/adminModels.ts`
- Create: `tests/unit/adminProvenance.test.ts`
- Create: `tests/unit/adminRepositoryInvariants.test.ts`

- [ ] **Step 1: Test existing provenance verifier against legacy fixtures**
  - Verify baseline behavior before making changes: verify valid historical fixture verification passes.
- [ ] **Step 2: Update `firestore.indexes.json`**
  - Add TTL override for `adminSessionRevocations` on `fieldPath: "ttl"`.
  - Add composite index for prefix search on `leaderboardResults`.
- [ ] **Step 3: Write `attestedDisplayName` on submission in `firestoreLeaderboardSubmissionRepository.ts`**
  - Add `attestedDisplayName: input.displayName` to `privateMetaDoc`.
- [ ] **Step 4: Update verifier in `server/services/leaderboardAppService.ts`**
  - Extract `rawAttested = row.attestedDisplayName !== undefined ? row.attestedDisplayName : row.displayName`.
  - Validate bounds ($\le 128$ chars), preserve exact characters, reconstruct HMAC with `rawAttested.replace(/:/g, '_')`.
  - Validate current public alias with `safeLeaderboardDisplayNameForRead(row.displayName)`.
- [ ] **Step 5: Implement `updateEntryAlias()` in `firestoreLeaderboardRepository.ts`**
  - Verify existing provenance before mutating; reject broken/unbacked records with 422.
  - Check erasure lock on resolved owner (409 if active).
  - Write `attestedDisplayName` if absent. Update `docRef.displayName` and `metaRef.displayName`.
  - Write audit record with `previousDisplayName`, `newDisplayName`, `reason`, `timestamp`, `actor: 'admin'`.
- [ ] **Step 6: Guard `softHideEntry()` and `deleteEntry()`**
  - Resolve owner across meta and doc; reject with 409 if erasure is active.
  - In `deleteEntry()`, enforce `snap.exists` in `leaderboardResults` (return 404 if targeting private-only receipt).
- [ ] **Step 7: Run tests**
  - `npx vitest run tests/unit/adminProvenance.test.ts tests/unit/adminRepositoryInvariants.test.ts`.

---

### Task 2: Auth, Revocation & Security Documentation

**Files:**
- Modify: `docs/SECURITY.md`
- Modify: `server/middleware/auth.ts`
- Create: `server/services/interfaces/IAdminService.ts`
- Create: `server/services/adminService.ts`
- Modify: `server/container.ts`
- Create: `tests/unit/adminAuth.test.ts`

- [ ] **Step 1: Update documentation in `docs/SECURITY.md`**
  - Update §1.4 and Threat Matrix #7 describing Web Moderation Console defenses.
- [ ] **Step 2: Implement length-safe auth & token revocation in `server/middleware/auth.ts`**
  - `getAdminPasscode()`: throws in production if missing or if set to `'180611'`/placeholder; allows `'180611'` strictly when `process.env.NODE_ENV === 'development'`.
  - Compare SHA-256 digests in constant-time with `crypto.timingSafeEqual`.
  - Separate `validateAdminTokenClaims()` from `verifyAdminSession()`.
  - `revokeAdminSessionToken(token)`: validates claims first, then writes nonce and TTL to `adminSessionRevocations`.
  - `verifyAdminSession(req)`: validates claims, checks revocation in `adminSessionRevocations`, fails closed on DB error.
- [ ] **Step 3: Implement `AdminService` and wire into `server/container.ts`**
  - Methods: `login`, `logout`, `getLeaderboardPage`, `editLeaderboardAlias`, `hideLeaderboardEntry`, `unhideLeaderboardEntry`, `deleteLeaderboardEntry`.
  - Strict projection to `AdminLeaderboardDTO` (strips `ownerUid`, `sessionId`, `trialsDigest`, `qualityFlags`).
- [ ] **Step 4: Run auth tests**
  - `npx vitest run tests/unit/adminAuth.test.ts`.

---

### Task 3: API Routes, Mutation Rate Limiting & Parity

**Files:**
- Create: `server/routes/adminRoutes.ts`
- Modify: `server/config/rateLimits.ts`
- Modify: `server/index.ts`
- Modify: `tests/unit/serverRoutesDelegation.test.ts`
- Modify: `tests/unit/serverRoutesParity.test.ts`
- Create: `tests/unit/adminRoutes.test.ts`

- [ ] **Step 1: Configure rate limits in `server/config/rateLimits.ts`**
  - Add `adminLoginLimiter` (10 per 15 min).
  - Add `adminMutationLimiter` (30 per 15 min).
- [ ] **Step 2: Implement `server/routes/adminRoutes.ts`**
  - Endpoints:
    - `POST /api/admin/login`
    - `POST /api/admin/logout` (idempotent 200 on repeated valid token revocation)
    - `GET /api/admin/leaderboard/all` (supports pagination + prefix search + last-scanned cursor)
    - `POST /api/admin/leaderboard/edit-alias`
    - `POST /api/admin/leaderboard/hide`
    - `POST /api/admin/leaderboard/unhide`
    - `POST /api/admin/leaderboard/delete`
  - Sets `Cache-Control: no-store` on all responses.
  - Maps error states to 400, 401, 404, 409, 422, 503.
- [ ] **Step 3: Register in `server/index.ts`**
- [ ] **Step 4: Run route and parity tests**
  - `npx vitest run tests/unit/adminRoutes.test.ts tests/unit/serverRoutesDelegation.test.ts tests/unit/serverRoutesParity.test.ts`.

---

### Task 4: Client Library & Secret Shortcut Modal

**Files:**
- Create: `src/lib/adminActions.ts`
- Create: `src/lib/useAdminAuth.ts`
- Create: `src/components/admin/AdminPasscodeModal.tsx`
- Modify: `src/components/Leaderboard.tsx`
- Modify: `mobile/src/components/Leaderboard.tsx`
- Create: `tests/unit/adminAuthModal.test.tsx`

- [ ] **Step 1: Implement `src/lib/adminActions.ts` and `src/lib/useAdminAuth.ts`**
  - Includes `logout()` calling `POST /api/admin/logout`.
- [ ] **Step 2: Implement `AdminPasscodeModal.tsx`**
  - Accessible dialog, autofocus, ESC dismiss, error shaking.
  - On mobile, successful authentication triggers `window.location.assign('/admin')`.
- [ ] **Step 3: Integrate shortcuts**
  - Desktop: `Ctrl+Shift+A` and `Cmd+Shift+A` (skips if inside `input`/`textarea`).
  - Mobile: 5 quick taps on header title opens passcode modal.
- [ ] **Step 4: Run component tests**
  - `npx vitest run tests/unit/adminAuthModal.test.tsx`.

---

### Task 5: Admin Page (`/admin`) & Alias Editor Modal

**Files:**
- Create: `src/components/admin/AdminPage.tsx`
- Create: `src/components/admin/AdminEditAliasModal.tsx`
- Modify: `src/App.tsx`
- Create: `tests/unit/adminPage.test.tsx`

- [ ] **Step 1: Implement `AdminEditAliasModal.tsx`**
  - Validates alias with real-time feedback using `validateLeaderboardDisplayName()`.
- [ ] **Step 2: Implement `AdminPage.tsx`**
  - Clean table layout with PULSE design tokens.
  - Server-side prefix/substring search bar and assessment protocol filter.
  - Cursor-based pagination ("Load More") supporting last-scanned cursor.
  - Pessimistic unhide: displays notice if server returns `notBest: true`.
  - Guarded delete confirmation modal explaining private receipt purge.
  - Logout button calling server revocation.
  - Direct URL lock: displays inline passcode prompt if accessed without session.
- [ ] **Step 3: Register lazy route in `src/App.tsx`**
- [ ] **Step 4: Run component tests**
  - `npx vitest run tests/unit/adminPage.test.tsx`.

---

## 3. Verification & Quality Acceptance Gates

Reported Baseline: **43 test files, 374 passed tests**.

Execution Commands & Acceptance Criteria:
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
