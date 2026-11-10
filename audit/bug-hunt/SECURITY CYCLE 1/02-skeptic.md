# Cycle 2: Security Audit — Adversarial Review

**Date:** 2026-11-10  
**Agent Role:** Security Audit Skeptic (adversarial source review)  
**Subagent ID:** Not used — this is a second review pass by the same assistant, not an independent delegated verifier  
**Evaluation Scope:** Challenge of candidate SEC-1 and review of nearby controls  
**Source Ref:** `7d7d44e95914771c4af3e1d3607b9c43eb9e8abb`

---

## SEC-1 — Development-mode admin credential fallback

### Strongest counter-argument

The code intentionally disables the default admin passcode and the built-in session secret when `NODE_ENV === 'production'`:

- `getAdminPasscode()` returns an empty value in production when `ADMIN_PASSCODE` is not configured.
- `getAdminSessionSecret()` returns an empty value in production when `PULSE_ADMIN_SESSION_SECRET` is not configured.
- `validateAdminPasscode()` rejects the development master passcode in production.
- Admin data and mutation routes use `requireAdminAuth`; the login endpoint is intentionally unauthenticated because it is the authentication entry point.
- The session verifier checks token expiry, HMAC integrity, and Firestore revocation state.

Consequently, the source does **not** establish that the production deployment is vulnerable. If every public deployment runs with `NODE_ENV='production'`, this fallback path is disabled there. A missing Firestore service also causes token verification to return 503 rather than authorize an admin request.

### Why the lead is not disproved

The source also establishes a concrete way to enter the non-production branch:

- `server/index.ts:2-4` explicitly sets `NODE_ENV='development'` when the runtime has not set it.
- In any non-production mode, `validateAdminPasscode()` accepts `180611` after the configured-passcode comparison fails (`server/middleware/adminAuth.ts:27-37`). Configuring a different passcode does not disable that master passcode in non-production mode.
- `/api/admin/login` turns a successful passcode check into a signed token (`server/routes/adminRoutes.ts:66-108`). The login limiter is a throttle, not a defence against a credential that is already known.
- If the signing secret is not configured outside production, the HMAC fallback is repository-visible (`server/middleware/adminAuth.ts:8, 17-22)); a fresh nonce avoids an existing revocation entry in ordinary operation.
- The repo's Vercel configuration does not declare `NODE_ENV`. The hosting platform's effective runtime value is external to the source inspected here.

This means the source supports a real conditional authorization path. It does not support a claim that the condition is active in the current production or preview environment.

### Nearby claims challenged and not promoted

1. **Firestore rules are not an identified bypass.** The rules are default-deny, client writes are denied, and participant reads are UID-scoped. The anonymized public dataset is separately readable by authenticated users; the server-side write path uses allowlisted fields and a privacy regression test.
2. **Public Firebase web configuration is not a finding.** Client configuration is public by design; the meaningful control is the Firestore rules and server authorization, not concealing the project identifier or browser API key.
3. **Admin route guards are not generally missing.** The login route is the expected credential exchange. The administrative read, moderation, and maintenance routes inspected apply `requireAdminAuth`.
4. **The in-memory rate-limit fallback is not a confirmed authorization bypass.** It may weaken cross-instance throttling while Firestore is unavailable, but the reviewed routes still perform their primary authentication checks.
5. **No dependency vulnerability is asserted.** A dependency advisory/reachability review was not performed, and no current external advisory data was retrieved.

### Skeptic decision

**Retain SEC-1 as `needs_validation`; do not mark it confirmed or rejected.**

The source-level credential branch is real. The decisive deployment fact—effective runtime `NODE_ENV` on each public environment, plus availability of the admin Firestore dependency—cannot be resolved from this repository snapshot. No severity should be assigned until that condition and its result are independently established.

### Exact validation required

An authorized deployment owner should inspect, without printing secret values:

- The effective runtime `NODE_ENV` for production, preview, and staging deployments.
- Whether `ADMIN_PASSCODE`, `PULSE_ADMIN_SESSION_SECRET`, and the server-side Firebase Admin configuration are present for each environment.
- Whether non-production deployments are internet-reachable and have access to the admin Firestore collections.

If any reachable environment runs the server with `NODE_ENV !== 'production'`, treat the fallback as active and disable it before further exposure. Do not validate this by sending requests to a deployed endpoint. A later local reproduction should use dummy credentials and an isolated Firestore emulator inside the OS-enforced sandbox required by the security-audit skill.

---

## Positive Controls Rechecked

- Firestore default-deny and server-only collection rules remain source-visible.
- Participant sessions are checked against the authenticated UID, requested assessment type, expiry, and consumed state.
- Admin mutation handlers use the token verifier and no-store response headers.
- Public research observations are built from allowlisted fields rather than copying arbitrary client objects into the public collection.
- API JSON bodies are capped at 1 MB and route-level rate limits are registered.

These observations are source-level controls only; no runtime tests were executed in this pass.
