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
- **Database Rules:** [`firestore.rules`](../firestore.rules) denies all client reads and writes to `leaderboardResults`; public rankings are read through `/api/leaderboard`, which returns an explicit display-only schema. Owner IDs, session IDs, idempotency keys, trial digests, derived metrics and moderation notes live in `leaderboardPrivateMeta`, a server-only collection. All server collection modifications use Firebase Admin SDK.

### 1.2 Zero-PII Anonymous Participant Architecture
- **No User Credentials:** The platform does not collect, store, or process user email addresses, passwords, phone numbers, or physical identities.
- **Anonymous Tokens:** Participants are provisioned anonymous Firebase Authentication tokens (`request.auth.uid`).
- **Research Dataset Sanitization:** The public benchmark collection (`publicDataset`) contains zero user IDs, zero session IDs, zero IP addresses, and aggregates completion dates to coarse year-months (`YYYY-MM`).

### 1.3 Rate Limiting & Denial of Service Protection
- API endpoints use a Firestore-backed shared counter store so limits are shared across serverless instances. Authenticated session/research/leaderboard endpoints are partitioned by decoded UID + IP for accounting; the route still performs authoritative Firebase token verification. A separate per-IP aggregate limit caps unauthenticated traffic.
  - Admin login: 10 requests per 15 minutes.
  - Session start, research submit and leaderboard submit: 30 requests per 15 minutes per identity key.
  - Session APIs: 60 requests per 15 minutes.
  - Public leaderboard GET: 600 requests per 15 minutes per IP.
  - Provenance verification: 60 requests per 15 minutes per IP.
  - General API aggregate: 2,000 requests per 15 minutes per IP.
- The counter collection `_rateLimitCounters` uses hashed document IDs and a Firestore TTL policy on `resetAt`; deploy the updated Firestore index/TTL configuration for automatic cleanup.

### 1.4 Admin Console Access Control
- Administrative routes require the `ADMIN_PASSCODE` (or `PULSE_ADMIN_PASSCODE`) environment variable; there is no hard-coded fallback.
- Admin session tokens require the independent `PULSE_ADMIN_SESSION_SECRET`; leaderboard/research provenance requires a separate `PULSE_PROVENANCE_SECRET`. Both are mandatory and must be different strong random values.
- Missing required admin configuration fails closed. Deployments using the old shared-secret fallback must configure the new variables and rotate the admin passcode before enabling the updated routes.
- Moderation operations (hide/unhide/delete leaderboard entries) are logged to `adminAuditLogs`. New audit timestamps use numeric milliseconds; run the documented migration for historical string timestamps.

---

## 2. Statutory Compliance & Breach Response
PULSE operates in compliance with international privacy mandates:
- **GDPR (Art. 33):** 72-hour supervisory authority notification for confirmed breaches affecting pseudonymous data.
- **FTC Health Breach Notification Rule (16 CFR 318):** 60-day individual notification window for cognitive telemetry.
- **Leaderboard data subject requests:** Authenticated participants can request removal of their leaderboard entries through `DELETE /api/leaderboard/mine?assessmentType=<canonical-id|all>`. Legacy entries are linked only when a server-owned session references that exact row; orphaned legacy rows may still require moderator handling.
- **Research-record erasure:** No complete cross-collection erasure workflow or 45-day deletion service is implemented here. Do not represent a statutory execution window as an automated guarantee.
- Detailed emergency procedures and secret rotation checklists are maintained in [`docs/breach-runbook.md`](breach-runbook.md).

---

## 3. Threat Matrix

| # | Threat Vector | Mitigation Layer | Status |
| :--- | :--- | :--- | :--- |
| 1 | Direct client database tampering | Firestore Security Rules (`allow write: if false`) | **BLOCKED** |
| 2 | Forged score submissions | Server-side metric validation, minimum elapsed-time checks, row-bound HMAC provenance, and moderation flags for extreme scores | **MITIGATED; RESIDUAL RISK** |
| 3 | Chronologically replayed trial logs | Session consumption/idempotency guards and stored server-derived metrics | **MITIGATED; RESIDUAL RISK** |
| 4 | Synthetic/automated reaction and memory scores | Plausibility floors and suspicious-score moderation; no server-secret per-trial challenge yet | **MITIGATED; RESIDUAL RISK** |
| 5 | Direct leaderboard-document reads or writes | Firestore rules deny client access; public data goes through the display-only API | **BLOCKED BY RULES** |
| 6 | Identity leakage in open research data | Dataset schema minimization and separate private leaderboard metadata | **MITIGATED; VERIFY DEPLOYED DATA** |
| 7 | Brute-force admin login attempts | Shared Firestore-backed counters and a separate admin-login limiter | **MITIGATED** |

---

## 4. Known Risks & Security TODOs

1. **Hardware / DOM Automation Limits:**  
   *Risk:* Headless browser automation (e.g. Puppeteer/Selenium) operating on a physical display device generating simulated click events with realistic delays cannot be definitively distinguished from human input without WebAuthn hardware attestation.  
   *TODO:* Investigate WebAuthn / Device Attestation APIs for high-stakes tournament modes.

2. **Automated trial generation / score forgery:**  
   *Risk:* A determined script can still submit crafted trial logs with plausible total elapsed time. HMAC provenance proves which stored payload the server accepted; it does not prove a person generated that payload. Memory challenge generation remains tied to client-visible session data in the reviewed architecture.  
   *TODO:* A future assessment-protocol change should introduce server-issued unpredictable challenge material and stronger per-trial pacing/provenance. The current timing checks and extreme-score flags are mitigations, not proof of human input.

3. **Anonymous Account Orphaned Data:**  
   *Risk:* Users clearing browser cookies generate new anonymous UIDs, leaving historical trials disconnected from the active client.  
   *TODO:* Implement optional multi-factor or passkey linking for participants desiring longitudinal tracking across devices without compromising the zero-email architecture.
