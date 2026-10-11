# PULSE Security & Threat Model

This document summarizes the security controls visible in the repository and their limits. It is not a compliance certification; deployed settings, operational processes, and legal requirements require separate verification.

---

## 1. Current Security Controls

### 1.1 Server-Authoritative Cryptographic Provenance (HMAC-SHA256)
- **Mechanism:** Client devices cannot write directly to canonical Firestore collections. Raw trial timestamps and user inputs are transmitted to `/api/research/submit` and `/api/leaderboard/submit`.
- **Validation Engine:** The Express server validates:
  1. Monotonic chronological progression of trial timestamps.
  2. Physiological human latency boundaries ($RT \ge 80\text{ms}$).
  3. Accuracy and score calculations.
- **Signing:** Verified payloads are cryptographically signed using an HMAC-SHA256 token initialized with the server secret `PULSE_PROVENANCE_SECRET`.
- **Database Rules:** [`firestore.rules`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/firestore.rules) sets `allow write: if false` on all primary collections (`publicDataset`, `assessmentTrials`, `assessmentResults`, `leaderboardResults`, `adminAuditLogs`). All database modifications are executed exclusively by the backend via Firebase Admin SDK.

### 1.2 Zero-PII Anonymous Participant Architecture
- **No User Credentials:** The platform does not collect, store, or process user email addresses, passwords, phone numbers, or physical identities.
- **Anonymous Tokens:** Participants are provisioned anonymous Firebase Authentication tokens (`request.auth.uid`).
- **Research Dataset Sanitization:** The public benchmark collection (`publicDataset`) contains zero user IDs, zero session IDs, zero IP addresses, and aggregates completion dates to coarse year-months (`YYYY-MM`).

### 1.3 Rate Limiting & Denial of Service Protection
- API endpoints are protected with IP-based rate limiting via `express-rate-limit`:
  - `/api/admin/login`: 10 requests per 15 minutes (also passes through the `/api/admin` general limiter).
  - `/api/research/session/*`: 30 requests per 15 minutes.
  - `/api/research/submit`: 30 requests per 15 minutes.
  - `/api/leaderboard/submit`: 30 requests per 15 minutes.
  - Provenance verification endpoints: 60 requests per 15 minutes.
  - General API routes: 200 requests per 15 minutes.
  - Counters use the in-memory default store per process; limits are not shared across multiple server instances.

### 1.4 Admin Console Access Control
- Administrative routes (`/admin/*`) require authentication via a master passcode (`ADMIN_PASSCODE`).
- Successful authentication generates a short-lived, cryptographically signed admin session token.
- Moderation operations (hide/delete leaderboard entries) are recorded in the server-managed `adminAuditLogs` collection. Operational immutability and retention depend on access controls and deployed configuration.

---

## 2. Regulatory Duties & Breach Response — Verification Required

The repository contains a breach runbook, but source code and runbook text do not prove that PULSE meets every statutory requirement. Notification deadlines and deletion duties depend on applicable law and the facts of an incident; they must be reviewed by qualified counsel and supported by operational procedures. The current source audit did not verify an automated participant-erasure workflow or automated retention purge. Do not state that PULSE is legally compliant solely on the basis of these documents.

Detailed incident-response and secret-rotation notes are maintained in [`docs/breach-runbook.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/docs/breach-runbook.md); verify their operational readiness separately.

---

## 3. Threat Matrix

| # | Threat Vector | Mitigation Layer | Status |
| :--- | :--- | :--- | :--- |
| 1 | Direct client database tampering | Firestore Security Rules (`allow write: if false`) | **BLOCKED** |
| 2 | Forged score submissions | Server HMAC-SHA256 Provenance Attestation | **BLOCKED** |
| 3 | Chronologically replayed trial logs | Monotonic sequence verification in `server/engines/assessmentEngine.ts` | **BLOCKED** |
| 4 | Superhuman synthetic reaction times | $80\text{ms}$ physiological floor validator | **BLOCKED** |
| 5 | Cross-user trial eavesdropping | Firestore Rules (`participantId == request.auth.uid`) | **BLOCKED** |
| 6 | Direct identifier leakage in the public research dataset | Server-side sanitization and field allow-listing | **MITIGATED; residual re-identification risk must be assessed** |
| 7 | Brute-force admin login attempts | In-memory IP rate limiting (10 req / 15 min, plus admin API limiter) | **MITIGATED (single process)** |

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
