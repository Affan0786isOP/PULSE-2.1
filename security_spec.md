# PULSE Security & Threat Model Specification

## Overview
This specification describes source-visible security controls and threat-model intent. It is not a compliance certification; verify the deployed Firebase configuration and runtime behavior separately.

---

## 1. Security Architecture & Threat Boundaries

### 1.1 Server-Side Cryptographic Provenance (HMAC-SHA256)
* **Threat Addressed:** Client-side metric manipulation or direct database injection of fabricated assessment results.
* **Source-visible controls:**
  * Assessment metrics submitted to `/api/research/submit` and `/api/leaderboard/submit` are validated/derived server-side.
  * The server checks protocol-specific physiological bounds (including reaction time $\ge 80\text{ms}$) and chronological trial-timestamp ordering where applicable.
  * Applicable research and leaderboard result payloads receive an HMAC-SHA256 provenance token using `PULSE_PROVENANCE_SECRET`.
  * Firestore Security Rules deny client writes to canonical collections (`allow write: if false`) and restrict owner-scoped reads for private records. They do not independently recalculate scores, enforce a general schema whitelist, or verify the HMAC signature.
  * Canonical mutations are routed through the Express backend using Firebase Admin SDK.
* **Threat Limits:** Client-side automation running inside a real browser DOM (e.g. headless Selenium/Puppeteer generating synthetic click events) cannot be distinguished from human input at the network boundary alone without hardware-attestation APIs.

### 1.2 Session & Participant ID Isolation
* **Threat Addressed:** Cross-user data tampering or unauthorized reading of trial observations.
* **Source-visible controls:**
  * Firebase Anonymous Authentication provides participant UIDs (`request.auth.uid`).
  * Firestore Rules restrict owner-scoped reads to the matching participant UID for private trial/result collections; all client writes to canonical collections are denied.
  * Client writes to `/trialObservations` and `/publicDataset` are rejected by the write-deny rules.

### 1.3 Schema Enforcers & Data Invariants
* **Threat Addressed:** Payload pollution, identity leakages, or unvalidated schema mutations.
* **Source-visible controls:**
  * TypeScript server-side validators and sanitization code validate payload shapes and construct public dataset records.
  * Firestore Rules deny client writes to canonical collections, rather than independently enforcing a general key whitelist on data written by the trusted Admin SDK.
  * Keep the server-side sanitization/allow-list aligned with the `publicDataset` schema; direct Firebase Admin SDK writes bypass Firestore Security Rules.

### 1.4 Rate Limiting & Denial of Service Mitigation
* **Threat Addressed:** Automated API flooding and dataset pollution attacks.
* **Guarantee Provided:**
  * Express rate limiters (`express-rate-limit`) restrict provenance token requests per IP address.
  * Idempotency keys prevent duplicate submission of the same assessment payload.

---

## 2. Threat Matrix & Validation Policy

| # | Threat Vector | Defense Layer | Outcome |
|---|---|---|---|
| 1 | Direct client database write | Firestore Rules | **DENIED** (`allow write: if false`, regardless of supplied fields) |
| 2 | Invalid HMAC token / Tampered metrics | Server API & Firestore Rules | **REJECTED** (Server verifies HMAC token; direct client writes disabled by Firestore Rules) |
| 3 | Chronologically invalid trial observations | Server Provenance Handler | **REJECTED** (Timestamps out of sequence) |
| 4 | Superhuman reaction times ($< 80\text{ms}$) | Server & Protocol Validators | **REJECTED** (Violates physiological floor) |
| 5 | Cross-user observation spoofing | Firestore Rules | **DENIED** (`participantId != request.auth.uid`) |
| 6 | Identity fields in research dataset | Server-side sanitization and schema construction | **Should be omitted by public-dataset construction; verify with tests** |
| 7 | Schema key pollution / Extra fields | Server-side schema validation and sanitization | **Rejected/stripped when covered by validators; test each payload path** |
| 8 | Unauthenticated submission | Firestore Rules | **DENIED** (`request.auth == null`) |
