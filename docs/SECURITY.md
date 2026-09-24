# PULSE Security & Threat Model

This document outlines the security controls, cryptographic attestation mechanisms, trust boundaries, and statutory data protection policies implemented in PULSE.

---

## 1. Current Security Controls

### 1.1 Server-Authoritative Cryptographic Provenance (HMAC-SHA256)
- **Mechanism:** Client devices cannot write directly to canonical Firestore collections. Raw trial timestamps and user inputs are transmitted to `/api/research/submit` and `/api/leaderboard/submit`.
- **Validation Engine:** The Express server validates:
  1. Monotonic chronological progression of trial timestamps.
  2. Physiological human latency boundaries ($RT \ge 80\text{ms}$).
  3. Accuracy and score calculations.
- **Signing:** Verified payloads are cryptographically signed using an HMAC-SHA256 token initialized with the server secret `PULSE_PROVENANCE_SECRET`.
- **Database Rules:** [`firestore.rules`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/firestore.rules) sets `allow write: if false` on all primary collections (`publicDataset`, `assessmentTrials`, `assessmentResults`, `leaderboardResults`, `adminAuditLogs`). All database modifications are executed exclusively by the backend via Firebase Admin SDK.

### 1.2 Zero-PII Anonymous Participant Architecture
- **No User Credentials:** The platform does not collect, store, or process user email addresses, passwords, phone numbers, or physical identities.
- **Anonymous Tokens:** Participants are provisioned anonymous Firebase Authentication tokens (`request.auth.uid`).
- **Research Dataset Sanitization:** The public benchmark collection (`publicDataset`) contains zero user IDs, zero session IDs, zero IP addresses, and aggregates completion dates to coarse year-months (`YYYY-MM`).

### 1.3 Rate Limiting & Denial of Service Protection
- API endpoints are protected with IP-based rate limiting via `express-rate-limit`:
  - `/api/admin/login`: 5 requests per 15 minutes.
  - `/api/research/session/*`: 30 requests per 15 minutes.
  - `/api/research/submit`: 30 requests per 15 minutes.
  - `/api/leaderboard/submit`: 30 requests per 15 minutes.
  - General API routes: 100 requests per 15 minutes.

### 1.4 Admin Console Access Control
- Administrative routes (`/admin/*`) require authentication via a master passcode (`ADMIN_PASSCODE`).
- Successful authentication generates a short-lived, cryptographically signed admin session token.
- Moderation operations (hide/delete leaderboard entries) are logged immutably to `adminAuditLogs`.

---

## 2. Statutory Compliance & Breach Response
PULSE operates in compliance with international privacy mandates:
- **GDPR (Art. 33):** 72-hour supervisory authority notification for confirmed breaches affecting pseudonymous data.
- **FTC Health Breach Notification Rule (16 CFR 318):** 60-day individual notification window for cognitive telemetry.
- **Washington My Health My Data Act (RCW 19.373):** 45-day verified data subject erasure execution reaching active databases and backup systems.
- Detailed emergency procedures and secret rotation checklists are maintained in [`docs/breach-runbook.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/breach-runbook.md).

---

## 3. Threat Matrix

| # | Threat Vector | Mitigation Layer | Status |
| :--- | :--- | :--- | :--- |
| 1 | Direct client database tampering | Firestore Security Rules (`allow write: if false`) | **BLOCKED** |
| 2 | Forged score submissions | Server HMAC-SHA256 Provenance Attestation | **BLOCKED** |
| 3 | Chronologically replayed trial logs | Monotonic sequence verification in `server.ts` | **BLOCKED** |
| 4 | Superhuman synthetic reaction times | $80\text{ms}$ physiological floor validator | **BLOCKED** |
| 5 | Cross-user trial eavesdropping | Firestore Rules (`participantId == request.auth.uid`) | **BLOCKED** |
| 6 | Identity leakage in open research data | Schema key whitelist; complete absence of PII | **BLOCKED** |
| 7 | Brute-force admin login attempts | IP rate limiting (5 req / 15 min) | **BLOCKED** |

---

## 4. Known Risks & Security TODOs

1. **Hardware / DOM Automation Limits:**  
   *Risk:* Headless browser automation (e.g. Puppeteer/Selenium) operating on a physical display device generating simulated click events with realistic delays cannot be definitively distinguished from human input without WebAuthn hardware attestation.  
   *TODO:* Investigate WebAuthn / Device Attestation APIs for high-stakes tournament modes.

2. **In-Memory Rate Limiting in Multi-Instance Deployments:**  
   *Risk:* Default `express-rate-limit` stores counters in server memory. In multi-container clustered environments (e.g. multiple Cloud Run instances), rate limits are not shared across nodes.  
   *TODO:* Add a Redis/Firestore backing store for distributed rate limiting if scaling beyond a single container instance.

3. **Anonymous Account Orphaned Data:**  
   *Risk:* Users clearing browser cookies generate new anonymous UIDs, leaving historical trials disconnected from the active client.  
   *TODO:* Implement optional multi-factor or passkey linking for participants desiring longitudinal tracking across devices without compromising the zero-email architecture.
