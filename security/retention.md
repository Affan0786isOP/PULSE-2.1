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
| **`leaderboardResults`** | Voluntary opted-in public rank records | **2 years** | Competition cycle refresh or user-requested removal/moderation action. |
| **`adminAuditLogs`** | Immutable moderation & administrative trail | **7 years** | Statutory security and compliance audit logging requirements. |

---

## 3. Data Minimization & Sanitization Controls
1. **Zero Email Requirement:** Neither test participants nor administrators store email addresses or passwords in the database.
2. **Anonymous Participant UIDs:** All participant tokens use Firebase Anonymous Authentication (`signInAnonymously`). No personal names, telephone numbers, or government IDs are accepted or held.
3. **Open Dataset Sanitization:** The public research dataset (`/api/research/dataset`) strips all session identifiers and UIDs before publication, serving only randomized anonymized cognitive reaction curves.

---

## 4. Participant Deletion Procedures (Right to Erasure)
- **Execution Window:** In accordance with GDPR Art. 17 and RCW 19.373, verified erasure requests are executed across active databases and backup systems within **45 calendar days**.
- **Mechanism:** Since participants possess anonymous UIDs (`request.auth.uid`), an authenticated erasure request deletes linked `assessmentTrials` and `assessmentResults` matching that UID, and flags any corresponding `leaderboardResults` doc for immediate purge.
