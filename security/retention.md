# PULSE Cognitive Assessment Platform - Data Retention & Lifecycle Policy

**Version:** 1.0.0  
**Effective Date:** September 20, 2026  
**Applicability:** All participant telemetry, aggregated benchmarks, leaderboard submissions, and administrative audit ledgers.

---

## 1. Purpose & Governance
This document records proposed retention targets and lifecycle expectations for PULSE. It does not itself configure Firestore TTL, a scheduled purge job, backups deletion, or an erasure workflow, and it is not a legal determination of compliance with GDPR, the FTC Health Breach Notification Rule, Washington My Health My Data Act, or other laws. Verify deployed controls and obtain appropriate legal review before promising a statutory deletion timeline.

---

## 2. Retention Schedule by Data Tier

| Data Tier / Collection | Classification | Policy Target (not proof of enforcement) | Required enforcement / verification |
| :--- | :--- | :--- | :--- |
| **`experimentSessions`** | Ephemeral session tokens & PRNG seeds | **90 days policy target** | Application expiry is currently 15 minutes; no checked-in automated document purge/TTL configuration was found. Verify deployed cleanup before calling this automatic. |
| **`assessmentTrials`** | Granular millisecond reaction telemetry | **5-year policy target** | No checked-in scheduled purge or complete participant-erasure workflow was verified in the audited source. |
| **`assessmentResults`** | Longitudinal assessment score summaries | **5-year policy target** | No checked-in scheduled purge or complete participant-erasure workflow was verified in the audited source. |
| **`publicDataset`** | Sanitized open research benchmark data | **Indefinite policy target** | No age-out process is intended by this target; verify field sanitization and re-identification risk periodically. |
| **`leaderboardResults`** | Voluntary opted-in public rank records | **2-year policy target** | Moderation hide/delete endpoints exist; automatic 2-year purge and an authenticated participant-removal workflow were not verified. |
| **`adminAuditLogs`** | Administrative moderation trail | **7-year policy target** | No automatic seven-year purge was verified; avoid claiming a statutory requirement without legal review. |

---

## 3. Data Minimization & Sanitization Controls
1. **Zero Email Requirement:** Neither test participants nor administrators store email addresses or passwords in the database.
2. **Anonymous Participant UIDs:** All participant tokens use Firebase Anonymous Authentication (`signInAnonymously`). No personal names, telephone numbers, or government IDs are accepted or held.
3. **Open Dataset Sanitization:** The public research dataset (`/api/research/dataset`) strips all session identifiers and UIDs before publication, serving only randomized anonymized cognitive reaction curves.

---

## 4. Participant Deletion Workflow — Not Yet Verified

No dedicated participant data-erasure endpoint or complete workflow across active collections and backups was identified in the audited repository. The process below is therefore a required operational design, not a claim about current functionality:

- Provide a verified way for a participant or authorized operator to identify the anonymous UID and linked records.
- Delete or appropriately de-identify matching `assessmentTrials` and `assessmentResults`; handle public dataset records and leaderboard entries according to the approved policy; document any exception for immutable audit events.
- Track deletion outcomes and backups/replicas, and verify the operation through tests and operational evidence.
- Treat **45 calendar days** as an unverified internal target only until the applicable legal requirements are reviewed and the full workflow is implemented and tested.
