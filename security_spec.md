# PULSE Security & Threat Model Specification

## Overview
This specification details the threat model, cryptographic attestation mechanics, and security boundary guarantees enforced across the PULSE application.

---

## 1. Security Architecture & Threat Boundaries

### 1.1 Server-Side Cryptographic Provenance (HMAC-SHA256)
* **Threat Addressed:** Client-side metric manipulation or direct database injection of fabricated assessment results.
* **Guarantee Provided:**
  * Assessment metrics submitted to `/api/research/submit` and `/api/leaderboard/submit` are evaluated and derived server-side.
  * The server checks physiological bounds (reaction time $\ge 80\text{ms}$, accuracy calculation validity, trial observation sequence continuity).
  * The server signs the verified metrics payload using HMAC-SHA256 initialized with `PULSE_PROVENANCE_SECRET`.
  * Firestore Security Rules validate structural schema, expected field types, allowed age groups, and timestamp freshness constraints ($\pm 5\text{min}$ of `request.time`). Note: Firestore Security Rules validate schema and freshness constraints; they do NOT independently recalculate or verify the HMAC cryptographic signature.
  * Direct client creation (`allow create: if false`) is disabled across `publicDataset`, `trialObservations`, `adminAuditLogs`, and `leaderboardResults`. All canonical database writes are executed exclusively by the authoritative server API.
* **Threat Limits:** Client-side automation running inside a real browser DOM (e.g. headless Selenium/Puppeteer generating synthetic click events) cannot be distinguished from human input at the network boundary alone without hardware-attestation APIs.

### 1.2 Session & Participant ID Isolation
* **Threat Addressed:** Cross-user data tampering or unauthorized reading of trial observations.
* **Guarantee Provided:**
  * Firebase Anonymous Authentication automatically provisions unique user tokens (`request.auth.uid`).
  * Firestore Security Rules enforce `resource.data.participantId == request.auth.uid` for all trial observation reads and writes.
  * Unauthenticated writes to `/trialObservations` or `/publicDataset` are rejected.

### 1.3 Schema Enforcers & Data Invariants
* **Threat Addressed:** Payload pollution, identity leakages, or unvalidated schema mutations.
* **Guarantee Provided:**
  * Firestore rules enforce strict key whitelist matching (`data.keys().hasOnly(...)`).
  * Rejection of sensitive PII fields (`userId`, `email`, `displayName`) in the anonymous public dataset.
  * Data boundary validation in TypeScript ensures payload shapes match protocol rules before database operations.

### 1.4 Rate Limiting & Denial of Service Mitigation
* **Threat Addressed:** Automated API flooding and dataset pollution attacks.
* **Guarantee Provided:**
  * Express rate limiters (`express-rate-limit`) restrict provenance token requests per IP address.
  * Idempotency keys prevent duplicate submission of the same assessment payload.

---

## 2. Threat Matrix & Validation Policy

| # | Threat Vector | Defense Layer | Outcome |
|---|---|---|---|
| 1 | Direct database write without provenance token | Firestore Rules | **DENIED** (Missing required `provenanceToken`) |
| 2 | Invalid HMAC token / Tampered metrics | Server API & Firestore Rules | **REJECTED** (Server verifies HMAC token; direct client writes disabled by Firestore Rules) |
| 3 | Chronologically invalid trial observations | Server Provenance Handler | **REJECTED** (Timestamps out of sequence) |
| 4 | Superhuman reaction times ($< 80\text{ms}$) | Server & Protocol Validators | **REJECTED** (Violates physiological floor) |
| 5 | Cross-user observation spoofing | Firestore Rules | **DENIED** (`participantId != request.auth.uid`) |
| 6 | Identity fields in research dataset | Firestore Rules | **DENIED** (`!('email' in data)`) |
| 7 | Schema key pollution / Extra fields | Firestore Rules | **DENIED** (`hasOnly` whitelist check fails) |
| 8 | Unauthenticated submission | Firestore Rules | **DENIED** (`request.auth == null`) |
