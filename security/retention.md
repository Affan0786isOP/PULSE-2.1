# PULSE Cognitive Assessment Platform - Data Retention & Lifecycle Policy

**Version:** 1.0.0  
**Effective Date:** September 20, 2026  
**Applicability:** All participant telemetry, aggregated benchmarks, leaderboard submissions, and administrative audit ledgers.

---

## 1. Purpose & Governance
This document defines the statutory retention schedules, automated purge triggers, and data subject deletion protocols for the PULSE platform in compliance with GDPR (Art. 5(1)(e) & Art. 17), the FTC Health Breach Notification Rule (16 CFR 318), and State Consumer Health Data Privacy laws (RCW 19.373).

---

## 2. Retention Schedule by Data Tier

| Data Tier / Collection | Classification | Retention Period | Deletion / Purge Trigger |
| :--- | :--- | :--- | :--- |
| **`experimentSessions`** | Ephemeral session tokens & PRNG seeds | **90 days** | Automated TTL expiration or one-time consumption upon submission completion. |
| **`assessmentTrials`** | Granular millisecond reaction telemetry | **5 years** | Scientific replication retention; purged upon verified participant erasure request. |
| **`assessmentResults`** | Longitudinal assessment score summaries | **5 years** | Longitudinal cognitive cohort baselining; purged upon verified participant erasure request. |
| **`publicDataset`** | Anonymized open research benchmark data | **Indefinite** | Anonymized scientific open archive (contains zero UIDs, zero IPs, zero device identifiers). |
| **`leaderboardResults`** | Voluntary opted-in public rank records (one best score per owner) | **Not automatically purged** | Voluntary public alias ranking; participant GDPR erasure supported via `DELETE /api/leaderboard/mine`. |
| **`leaderboardPrivateMeta`** | Private submission receipts, trial digests, owner UIDs, and moderation metadata | **Assessment lifespan** | Purged upon participant erasure request or manual administrative review. |
| **`leaderboardOwnerIndex`** | Pseudonymous owner best-score index and transaction locking | **Active state** | Updated transactionally to track participant approved best scores. |
| **`adminAuditLogs`** | Immutable moderation & administrative trail | **7 years** | Statutory security and compliance audit logging requirements. Moderation executed via server CLI scripts. |

---

## 3. Data Minimization & Sanitization Controls
1. **Zero Email Requirement:** Neither test participants nor administrators store email addresses or passwords in the database.
2. **Anonymous Participant UIDs:** All participant tokens use Firebase Anonymous Authentication (`signInAnonymously`). No personal names, telephone numbers, or government IDs are accepted or held.
3. **Open Dataset Sanitization:** The public research dataset (`/api/research/dataset`) strips all session identifiers and UIDs before publication, serving only randomized anonymized cognitive reaction curves.

---

## 4. Participant Deletion Procedures (Right to Erasure)
- **Leaderboard removal:** An authenticated participant can call `DELETE /api/leaderboard/mine?assessmentType=<canonical-id>` to remove their entries for one assessment, or use `assessmentType=all` to remove all linked leaderboard entries. The endpoint serializes erasure against concurrent submissions and deletes both public rows and private metadata.
- **Legacy leaderboard rows:** The server can link older rows only when a server-owned consumed session explicitly references the row ID. Rows with missing or inconsistent session provenance may still require administrator investigation and are not guaranteed to be found by self-removal.
- **Research-record deletion:** The leaderboard removal endpoint does not delete `assessmentTrials`, `assessmentResults`, `trialObservations`, or other research data. A complete cross-collection participant erasure workflow is not implemented by this endpoint.
- **Execution window:** No scheduled service-level timer is enforced by this repository. Do not claim completion within 45 calendar days across all active stores or backups unless a separate operational process is verified.
