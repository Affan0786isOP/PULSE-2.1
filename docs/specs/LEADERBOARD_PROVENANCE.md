# PULSE Leaderboard & Cryptographic Provenance Specification

This document specifies the opt-in leaderboard workflow, anti-cheat validation pipeline, cryptographic HMAC attestation, and administrative moderation system.

---

## 1. Leaderboard Architecture

The PULSE leaderboard (`/leaderboard`) ranks the top 100 verified scores across each assessment protocol:

```mermaid
sequenceDiagram
    participant User as Participant
    participant Client as React Client
    participant Server as Express Server (server.ts)
    participant Firestore as Firestore (leaderboardResults)
    participant Operator as Operator CLI / Admin SDK

    User->>Client: Complete Assessment & Opt In
    Client->>Server: POST /api/leaderboard/submit<br/>(trials, scoreMetric, displayName)
    Note over Server: Server checks displayName (Profanity & Anonymous filter)
    Note over Server: Server recalculates score from raw trials
    Note over Server: Server validates RT >= 80ms floor
    Note over Server: Server generates HMAC-SHA256 Provenance Token
    Server->>Firestore: Create document in leaderboardResults<br/>(hidden: false)
    Server-->>Client: Return success confirmation
    
    Note over Operator,Firestore: Moderation Flow (Server CLI Scripts)
    Operator->>Firestore: Update hidden + write adminAuditLogs transaction
```

---

## 2. Opt-In & Alias Validation Rules
- **Explicit Consent:** Scores are never posted to public rankings without the participant completing the opt-in modal.
- **Anonymous Alias Rejection:** Generic pseudonyms (`Anonymous`, `Unknown`, `Guest`, `Participant-XXXX`) are barred from public rank tables to preserve genuine competitive transparency.
- **Alias safety:** Public aliases are normalized using Unicode NFKC, checked for unsupported control/bidi characters, URL/email-like contact details, digit-heavy strings, generic anonymous aliases, and a curated set of disallowed terms. Invalid names are rejected at submission; legacy invalid aliases are filtered from public reads rather than rewritten in place.

---

## 3. Cryptographic Provenance Model
- **HMAC Secret:** The server generates a 64-character SHA-256 HMAC token calculated over:
  - `assessmentType`
  - `scoreMetric`
  - `ageGroup`
  - `timestamp`
  - Digest of raw trial observations
- **Verification Endpoint:** The server exposes `/api/leaderboard/verify-provenance` to allow independent cryptographic audits of any leaderboard record against the current signing key.

---

## 4. Administrative Moderation Controls
- **Desktop console:** The desktop application exposes `/admin`; the mobile route table does not. The web console lists and moderates leaderboard entries and exposes Dataset-summary maintenance. Route visibility does not grant access to the API.
- **Server-side authentication:** `POST /api/admin/login` validates the server-only `ADMIN_PASSCODE` and issues a signed, time-bounded token using `PULSE_ADMIN_SESSION_SECRET`. Protected endpoints verify token claims/signature and check the nonce against the server-only `adminSessionRevocations` collection. Logout revokes the token nonce. Both secrets must remain server-side and must never use the `VITE_` prefix.
- **Protected endpoints:** `/api/admin/leaderboard/all`, `/api/admin/leaderboard/edit-alias`, `/api/admin/leaderboard/hide`, `/api/admin/leaderboard/unhide`, and `/api/admin/leaderboard/delete` provide moderation operations. Maintenance endpoints expose the leaderboard accuracy backfill and Dataset-summary status/reconciliation. Admin responses use no-store headers and login/mutation requests are rate-limited.
- **Soft-Hide (`hideLeaderboardEntry`):** Sets `hidden = true` on flagged entries without deleting historical data. Soft-hidden entries are excluded from public leaderboard queries.
- **Unhide (`unhideLeaderboardEntry`):** Restores eligible entries subject to ownership, best-score, and erasure guards.
- **Hard-Delete (`deleteLeaderboardEntry`):** Permanently purges fraudulent or malicious entries from Firestore when required.
- **Audit Ledger (`adminAuditLogs`):** Hide/unhide/delete operations and their corresponding audit entries are committed in a single atomic Firestore transaction. The moderation repository records the operator identity, reason, and immutable server timestamp.
- **CLI fallback:** Trusted operators can run server-side maintenance/recovery scripts with Firebase Admin credentials; the Dataset-summary CLI is dry-run by default and requires explicit `--apply` to write.


## 5. Ranking, identity, and tie policy

- **Leaderboard scope:** Each participant contributes at most one visible, approved best score per canonical assessment. Worse or tied attempts are stored as private submission receipts and are not ranked. A flagged candidate is retained as a hidden moderation row while the approved best remains visible; it becomes the public best only if moderation approves it and it outperforms the current best.
- **Legacy data:** Historical duplicate visible rows are not deduplicated by ordinary API requests. Run the best-per-owner migration during a maintenance window after the privacy migration. Rows without a trusted private owner mapping and hidden moderation cases are intentionally left unchanged for manual review.
- **Display names:** Aliases are not verified identities and are not unique participant identifiers. Different participants may choose the same alias, but normalized new data exposes only one current approved best row per owner/assessment.
- **Ordering:** Speed assessments sort by lower score first; memory assessments sort by higher score first. Full precision determines server ordering. Rows whose displayed scores are identical share a displayed rank; sorting within an equal-score group is deterministic by completion time and entry ID.
- **Refresh:** Concurrent in-flight reads for the same assessment share one Firestore request. Completed reads are not cached for five seconds; HTTP caching is disabled on the public endpoint, so the next request reloads data. Rankings are not a live push stream.

## 6. Legacy leaderboard document compatibility

Public leaderboard repository queries page through documents by `__name__` (up to 250 per page) instead of ordering by optional schema fields. This prevents historical rows missing `scoreMetric` or `createdAt` from disappearing because Firestore ordered queries omit documents without the ordered field. The repository validates entries and sorts them in memory with deterministic tie-breaking. Private metadata documents are retrieved in batches of up to 200. This improves legacy completeness but reads the full matching set before in-memory sorting; monitor read volume and latency as the leaderboard grows.
