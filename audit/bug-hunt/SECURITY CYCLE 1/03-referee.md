# Cycle 1: Security Audit Referee Report

**Date:** 2026-11-10  
**Agent Role:** Security Audit Referee (final source-only disposition)  
**Subagent ID:** Not used — delegated agents and independent runtime verification were unavailable  
**Evaluation Scope:** Source-based security review of authentication, authorization, data access, API boundaries, and deployment-sensitive configuration  
**Source Ref:** `7d7d44e95914771c4af3e1d3607b9c43eb9e8abb` (`audit/bug-hunt-reports`)  
**Run Status:** **INCOMPLETE — partial source-only pass**  
**Incomplete Reason:** `sandbox_and_independent_verification_unavailable`

---

## Verified Security Judgments

### SEC-1

- **Hunter's claim:** When the server runs with `NODE_ENV !== 'production'`, a public unauthenticated caller can use the repository-visible master passcode `180611` to obtain an admin session. If the built-in session-signing fallback is also selected, the caller can sign an admin token directly. The server sets an absent `NODE_ENV` to `development`, so an unset runtime variable enters this branch.
- **Skeptic's response:** RETAIN AS NEEDS VALIDATION. Production mode explicitly disables the fallback credentials and secret, and the repository does not prove which value the hosting platform supplies at runtime. However, the non-production path accepts the master passcode even when another passcode is configured, and the known signing fallback is also present. Admin route guards do not mitigate a token issued through this path. Firestore availability is also required for the verifier to complete its revocation check.
- **Referee analysis:** The source trace is valid:
  - `server/index.ts:2-4` defaults an absent `NODE_ENV` to `development`.
  - `server/middleware/adminAuth.ts:8-22` contains a fixed session-secret fallback and selects it whenever the environment is not production and no configured secret is used.
  - `server/middleware/adminAuth.ts:27-37` accepts `180611` in all non-production modes, including when a different `ADMIN_PASSCODE` has been configured.
  - `server/routes/adminRoutes.ts:66-108` exchanges the passcode for a signed token.
  - `server/middleware/adminAuth.ts:116-151` checks the token signature, lifetime, and Firestore revocation record.
  - `server/routes/adminRoutes.ts:134-164, 193-243, 270-365` applies `requireAdminAuth` to the administrative read, moderation, and maintenance operations.
  
  The potential chain crosses the admin authentication boundary and could permit unauthorized leaderboard administration. However, the decisive runtime condition is not visible in the repository. The absence of a `NODE_ENV` declaration in `vercel.json` does not prove that the host fails to inject it. The Firestore availability precondition is also not established for every environment. No source-only analysis can establish the currently deployed effective environment or demonstrate an unauthorized result.
- **Frequency (1-10):** Not scored — unresolved deployment precondition.
- **Impact (1-10):** Not scored — potential administrative mutation is not an observed result.
- **Risk Score:** Not calculated.
- **VERDICT:** **NEEDS VALIDATION** (not a confirmed vulnerability).
- **Confidence:** High that the conditional source path exists; deployment exploitability remains unknown.
- **True severity:** Not assigned. The security-audit skill does not permit severity on `needs_validation` records.
- **Suggested fix:** Remove the master passcode and built-in HMAC secret. Require explicit, unique server-side `ADMIN_PASSCODE` and `PULSE_ADMIN_SESSION_SECRET` values for every deployment, fail closed if either is missing, and make tests inject dummy credentials rather than relying on production-like defaults. Do not treat an unset `NODE_ENV` as a safe development signal. Rotate these credentials and invalidate affected sessions if an exposed environment is found to have accepted the fallback.

---

## VERIFIED SECURITY REPORT

### Stats

- Source-grounded security candidates: 1
- Confirmed vulnerabilities: 0
- Needs validation: 1
- Rejected candidates: 0
- Runtime reproductions: 0
- Live/deployment probes: 0
- Independent delegated verifiers: 0

### Needs Validation

| # | Verdict | Source locations | Description | Required validation |
|---|---|---|---|---|
| **SEC-1** | Needs validation | `server/index.ts:2-4`; `server/middleware/adminAuth.ts:8-37, 47-51, 116-151`; `server/routes/adminRoutes.ts:66-108, 134-164, 193-243` | A non-production runtime accepts the fixed master admin passcode; an unset `NODE_ENV` is defaulted to development. If this mode is active on a reachable deployment with admin Firestore access, a public caller can obtain a valid token and invoke admin operations. | An authorized owner must inspect the effective runtime `NODE_ENV` for production, preview, and staging, confirm whether those environments are reachable and have admin Firestore access, and verify the presence of explicit admin credentials without disclosing their values. Do not send probes to deployed endpoints. |

### Positive Security Patterns

1. **Firestore boundary:** `firestore.rules:5-64` uses default-deny, participant UID-scoped reads, denies client writes, and keeps session, moderation, audit, and private leaderboard data server-only.
2. **Participant identity:** Authenticated research and leaderboard routes verify Firebase ID tokens and use the verified UID; session validation binds the session to that UID.
3. **Admin protection:** Administrative read, moderation, and maintenance routes use a shared admin-session guard and no-store headers.
4. **Research privacy:** The research service explicitly allowlists public trial fields and sanitizes client-provided data before public dataset writes; a privacy regression test exists.
5. **Request controls:** JSON request bodies are limited to 1 MB, and route-specific rate limiters are registered.
6. **Response hardening:** The server applies CSP/security headers and centralizes error responses.

These are positive source observations, not proof that the live deployment or all runtime paths are secure.

### Coverage Statement and Unresolved Work

**Inspected:** Server startup and middleware; Firebase Admin initialization; Firestore rules; admin auth and admin routes; Firebase participant-token verification; research and leaderboard routes; session/research services; selected Firestore repositories; frontend Firebase/admin-token helpers; rate limiting; security headers; relevant authentication, route, and public-dataset privacy tests; and Vercel configuration.

**Not verified:** Live runtime environment variables; Vercel deployment settings and preview access policy; actual Firestore IAM/provider configuration; deployed HTTP headers; historical secret exposure; complete lockfile/advisory reachability; all browser/mobile lifecycle paths; full repository-wide entrypoint and attack-class coverage; and behavior under adversarial inputs.

**Execution boundary:** No target-controlled process, build, test, emulator, browser, or fuzzer was run. No deployed endpoint, external identity provider, cloud control plane, or production data was probed. The available environment does not provide the OS-enforced sandbox required by the repository security-audit skill, nor independent sub-agent verification. The security-audit skill's structured validators were therefore not run, and no formal coverage ledger or schema-validated `findings.json` is claimed.

**Prior runs:** No compatible prior security-audit `coverage-ledger.json` or `findings.json` was present. `audit/bug-hunt/cycle-1` is a functional bug hunt and was not treated as prior security-audit coverage.

**Final status:** This is a partial source-only security review, not a completed full audit and not an attestation that PULSE is secure. Complete the deployment-owner checks for SEC-1, then rerun the security-audit skill in an environment with the required sandbox, independent verification, and validators.
