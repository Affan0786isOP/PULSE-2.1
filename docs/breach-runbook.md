# PULSE Research Platform - Security Incident & Data Breach Runbook

**Version:** 1.0.0  
**Effective Date:** September 20, 2026  
**Applicability:** All production deployments, staging instances, databases, and administrative consoles of PULSE.  
**Mandatory Statutory Notification Windows:**
- **72 hours**: Supervisory notification from confirmation of breach under GDPR Article 33.
- **60 days**: Individual breach notice under FTC Health Breach Notification Rule (16 CFR 318.4) for health/cognitive telemetry.
- **45 days**: Data subject erasure execution reaching backup and archival storage under Consumer Health Data Privacy laws (RCW 19.373).

---

## 1. Incident Severity Matrix

| Severity | Definition | Examples | Response Target |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Active compromise of server infrastructure, leaked service account keys, mass unauthorized data modification or exfiltration. | Leak of `FIREBASE_SERVICE_ACCOUNT` or `ADMIN_PASSCODE`; mass deletion/alteration of `assessmentResults`. | **Immediate (≤ 15 minutes)** |
| **SEV-2 (High)** | Tampering with cryptographic provenance, unauthorized elevation of privileges, or denial-of-wallet exploitation. | Compromised `PULSE_PROVENANCE_SECRET`; repeated bypass of rate limiters causing billing spikes. | **≤ 1 hour** |
| **SEV-3 (Medium)** | Isolated vulnerability discovery without evidence of active exploitation; abnormal spike in false starts/aborted sessions. | Insecure direct object reference bug identified; single user report of data irregularity. | **≤ 6 hours** |
| **SEV-4 (Low)** | Minor misconfiguration, non-security-impacting bug, or automated vulnerability scanner notice. | Content Security Policy report-only alert; benign bot traffic. | **≤ 24 hours** |

---

## 2. Immediate Containment Checklist (First 60 Minutes)

### Phase 2.1: Key Revocation & Secret Rotation
If server credentials or administrative keys are suspected to be leaked:
1. **Rotate Firebase Service Account:**
   - Navigate to Google Cloud Console > IAM & Admin > Service Accounts.
   - Delete compromised key ID.
   - Generate a new JSON key file, base64 encode or format into `FIREBASE_SERVICE_ACCOUNT` environment variable.
2. **Rotate Admin Master Passcode:**
   - Update `ADMIN_PASSCODE` in server environment variables (e.g., Cloud Run, Vercel).
   - This immediately invalidates all active admin sessions (`verifyAdminSession` validates against current secret).
3. **Rotate Provenance HMAC Secret:**
   - Change `PULSE_PROVENANCE_SECRET` in server environment variables.
   - Prevents attackers from signing counterfeit assessment trials or leaderboard records.
4. **Redeploy Application:**
   - Trigger deployment to purge in-memory state and reload rotated secrets.

### Phase 2.2: Infrastructure Isolation
1. **Firestore Lockdown (Emergency Rule Deployment):**
   - If active client-side compromise occurs, deploy emergency Firestore lockdown:
     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /{document=**} {
           allow read, write: if false;
         }
       }
     }
     ```
   - Server-side Firebase Admin SDK bypasses client security rules and remains functional for diagnostics.
2. **IP Rate Limit Tightening:**
   - Adjust `express-rate-limit` settings in `server.ts` or edge proxy (Cloudflare/Cloud Run Armor) to throttle abusive source IPs.

---

## 3. Evidence Preservation & Forensics

1. **Capture Logs Before Container Recycling:**
   - Export Cloud Logging (Google Cloud / Cloud Run) entries covering 48 hours prior to incident onset.
   - Filter by query:
     ```
     resource.type="cloud_run_revision"
     textPayload=~"Admin" OR textPayload=~"Unauthorized" OR textPayload=~"Error"
     ```
2. **Audit Administrative Logs:**
   - Inspect Firestore `adminAuditLogs` collection for unauthorized moderation actions (`HIDE_LEADERBOARD_ENTRY`, `DELETE_LEADERBOARD_ENTRY`).
3. **Verify Data Integrity via Provenance Tokens:**
   - Run verification checks on `assessmentResults` and `leaderboardResults`:
     ```bash
     POST /api/research/verify-provenance
     POST /api/leaderboard/verify-provenance
     ```
   - Identify any entries where provenance HMAC verification returns `verified: false`.

---

## 4. 72-Hour Breach Notification Workflow (GDPR Art. 33 / CCPA)

```
[Incident Detected]
       │
       ▼
[T+0 to T+4h: Triaging & Severity Classification]
       │
       ▼
[T+4h to T+24h: Forensic Assessment & PII Impact Analysis]
       │
       ├─► Zero Real PII Impact (Only anonymous reaction times):
       │   Document in internal incident registry. No supervisory notice required unless high risk.
       │
       └─► Potential Impact on Pseudonymous Records:
           │
           ▼
[T+24h to T+48h: Prepare Supervisory Authority Notification]
           │ - Nature of personal data breach
           │ - Approximate number of data subjects
           │ - Measures taken or proposed to address breach
           │
           ▼
[T+48h to T+72h: Submit Formal Report to Lead DPA]
```

### Notice Template for Data Protection Authority (DPA)
```text
To: Data Protection Authority
Subject: Notification of Security Incident pursuant to Article 33 GDPR

1. Controller: PULSE Cognitive Assessment Platform
2. Date & Time of Incident: [YYYY-MM-DD HH:MM UTC]
3. Date & Time of Discovery: [YYYY-MM-DD HH:MM UTC]
4. Nature of Breach: [Unauthorized access / Denial of service / Key disclosure]
5. Categories of Data Affected:
   - High-precision reaction time metrics and cognitive performance scores
   - Anonymous Firebase UIDs (no names, no email addresses, no government IDs, no financial data)
   - Self-declared public leaderboard aliases
6. Number of Data Subjects Affected: [Approximate count]
7. Likely Consequences: Low risk to rights and freedoms of natural persons due to anonymous architecture.
8. Remedial Measures Implemented: Immediate key rotation, rate limiting tightening, Firestore rule enforcement.
9. Contact Point for Inquiries: Data Protection Lead (security@pulse-lab.in)
```

---

## 5. Post-Mortem & Remediation (Within 14 Days)

1. **Root Cause Analysis (5 Whys):**
   - Identify exact flaw (code vulnerability, dependency vulnerability, secret leak, misconfigured rule).
2. **Preventative Controls:**
   - Add automated regression tests.
   - Verify static security scanning in CI/CD pipeline.
   - Update data flow documentation in `security/data-map.yaml`.
3. **Executive Summary:**
   - Archive post-mortem report in `docs/incidents/` for future compliance and audit inspection.
