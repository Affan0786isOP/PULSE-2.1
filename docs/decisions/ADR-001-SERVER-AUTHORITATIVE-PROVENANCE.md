# ADR-001: Server-Authoritative Cryptographic Provenance

## Status
Accepted

## Context
Client-side web applications that write directly to Firestore are vulnerable to fabricated metric injection, artificially fast reaction times, and leaderboard manipulation. For scientific datasets and public competitive benchmarks, data integrity and physiological plausibility must be guaranteed.

## Decision
1. Direct client write operations to canonical Firestore collections (`publicDataset`, `assessmentTrials`, `assessmentResults`, `leaderboardResults`, `adminAuditLogs`) are disabled in `firestore.rules` (`allow write: if false`).
2. All assessment outcomes must be submitted as raw trial arrays to the Express server API (`server.ts`).
3. The server validates sequential timestamps, applies the $80\text{ms}$ physiological human reaction floor, derives summary statistics, and signs the resulting record with an HMAC-SHA256 token using `PULSE_PROVENANCE_SECRET`.
4. Writes to Firestore are executed exclusively via the Firebase Admin SDK on the backend.

## Consequences
- **Positive:** Guarantees database integrity, eliminates client-side metric spoofing, and creates an auditable cryptographic proof for open research records.
- **Negative:** Submitting results requires active network connectivity to the Express server API.

## Evidence
- [`firestore.rules`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/firestore.rules)
- [`server.ts`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server.ts)
- [`security_spec.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/security_spec.md)
