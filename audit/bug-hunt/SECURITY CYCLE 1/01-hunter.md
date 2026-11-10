# Cycle 1: Security Audit — Source Hunter Report

**Date:** 2026-11-10  
**Agent Role:** Security Audit Hunter (source reconnaissance)  
**Subagent ID:** Not used — delegated agents are unavailable in this environment  
**Evaluation Scope:** Authentication, authorization, Firestore access, API entry points, session ownership, public-data handling, rate limiting, and security middleware  
**Source Ref:** `7d7d44e95914771c4af3e1d3607b9c43eb9e8abb` (`audit/bug-hunt-reports`)  
**Execution:** Repository source inspection only. No repository code, tests, emulators, or deployed endpoints were executed or probed.

---

## Candidate Security Findings

### SEC-1 — Development-mode admin credential fallback can enable public admin access

- **Claim:** If the application runs with `NODE_ENV` other than `production`, the admin authentication module accepts the fixed development passcode `180611`. When the server starts without `NODE_ENV`, its entry point explicitly changes it to `development`. A public caller who can reach such a deployment can obtain a valid admin session through the login endpoint. If the admin session secret is also unset, the source-visible fallback HMAC secret additionally permits construction of signed tokens without using the login endpoint.
- **Lower-trust principal:** An unauthenticated internet user able to reach the deployment.
- **Protected boundary:** The admin session verification middleware protecting leaderboard administration and maintenance APIs.
- **Source trace:**
  1. `server/index.ts:2-4` changes an absent `NODE_ENV` to `development`.
  2. `server/middleware/adminAuth.ts:8-22` defines a repository-visible session-signing fallback and selects development credentials whenever `NODE_ENV !== 'production'`.
  3. `server/middleware/adminAuth.ts:27-37` accepts the master development passcode `180611` in every non-production mode, including when a different passcode is configured.
  4. `server/routes/adminRoutes.ts:66-108` exposes the passcode login route and returns a newly signed admin token after successful validation.
  5. `server/middleware/adminAuth.ts:116-151` validates the token signature and expiry, then accepts it when its nonce is absent from the Firestore revocation collection.
  6. `server/routes/adminRoutes.ts:134-164, 193-243, 270-365` protects admin data and mutation/maintenance endpoints with `requireAdminAuth`; the login route is the intended entry point, not itself an authorization defect.
- **Potential result if the precondition is present:** A public caller can obtain an admin token using the known passcode, then read administrative leaderboard data and invoke alias-edit, hide, unhide, or delete operations. If the server is using the built-in fallback signing secret, a caller can also sign a fresh token directly. This is a conditional source trace, not an observed deployment result.
- **Decisive unknown:** The effective `NODE_ENV` for each internet-reachable deployment (production, preview, and staging), and whether the admin Firestore service is available in that deployment. The repository's `vercel.json` does not set `NODE_ENV`; a hosting platform may inject it independently.
- **Related test coverage:** `tests/unit/adminAuth.test.ts:27-37` asserts that the development fallback is accepted when variables are absent; `tests/unit/adminAuth.test.ts:52-76` checks the production fail-closed path only when the test explicitly sets `NODE_ENV='production'`.
- **Suggested source fix:** Remove the universal master passcode and built-in signing secret. Require explicit `ADMIN_PASSCODE` and `PULSE_ADMIN_SESSION_SECRET` configuration for every network-reachable deployment and fail closed when either is absent. Keep test credentials test-local. Do not infer a safe environment from an absent `NODE_ENV`; avoid defaulting an unspecified runtime to development for security decisions.
- **Disposition:** `needs_validation`. The source path is present, but runtime environment configuration and the resulting deployment reachability were not observable in this audit.

---

## Positive Source Patterns Observed

- `firestore.rules:5-64` starts with default-deny rules, scopes participant reads by `request.auth.uid`, denies client writes, and keeps experiment sessions, audit logs, and private leaderboard collections server-only.
- `server/middleware/auth.ts` verifies Firebase ID tokens with Firebase Admin before returning a trusted decoded identity.
- `server/routes/researchRoutes.ts` and `server/routes/leaderboardRoutes.ts` derive the participant UID from the verified token rather than trusting a submitted UID.
- `server/services/sessionService.ts` binds sessions to a UID, validates assessment type and expiry, and rejects consumed sessions.
- `server/services/researchService.ts:26-145, 466` uses explicit field allowlists and sanitization before writing trial observations into the research-facing dataset.
- `tests/unit/researchServicePublicDatasetPrivacy.test.ts` contains a regression test for stripping client-supplied metadata from public dataset observations.
- `server/middleware/security.ts:29-66` sets security headers and a production CSP; `server/index.ts` applies a 1 MB JSON body limit and centralized error handling.
- `server/config/rateLimits.ts` registers route-specific throttles, including an admin-login limit.

## Coverage and Limitations

This pass inspected the server entry point, Firebase rules/configuration, admin and participant authentication, research and leaderboard routes, selected service/repository paths, frontend Firebase/admin-token handling, security/rate-limit middleware, and relevant unit tests. This is not a complete inventory of every source file, dependency, build artifact, or deployment control.

No compatible prior `coverage-ledger.json` or `findings.json` was present in the existing `audit/bug-hunt/cycle-1` directory; that directory contains a functional bug hunt, not a prior security-audit run.

The security-audit skill requires OS-enforced isolation before running target-controlled code, independent hunter/verifier roles, and validated structured outputs. This environment does not expose those controls. Therefore no tests, builds, emulators, validators, or live probes were run. This report is a partial, source-only pass and must not be treated as a completed full security audit.
