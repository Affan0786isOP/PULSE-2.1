# Changelog

All notable changes to the PULSE platform are documented in this file based on verified repository commit history.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]
- Documentation system overhaul and architecture specification suite.

### Changed
- **Backend modularisation:** Decomposed the 3,700-line `server.ts` into `server/` (`config`, `middleware`, `routes`, `services`, `engines`). API endpoints, request/response contracts, middleware order, rate limits and exports are unchanged; `server.ts` remains the entry point for `npm run dev`, the esbuild bundle and Vercel.
- Consolidated the repeated inline HMAC calls behind `signProvenancePayload()` in `server/services/provenanceService.ts`.
- Renamed the npm package from `react-example` to `pulse`.
- Archived 46 legacy `fix_*` / `patch_*` scripts from the repository root into `scripts/archive/`.

### Added
- Unit tests for the server engines, provenance service, idempotency store and device-routing helpers (`tests/unit/serverEngines.test.ts`).

### Fixed (docs)
- `docs/ARCHITECTURE.md` rate-limit figures now match the code (general API 200 req / 15 min, admin login 10 req / 15 min).

---

## [2.2.0] — 2026-09-20 / 2026-09-24

### Added
- **Awwwards-Tier Hero Section:** Upgraded desktop home hero with high-precision display headings, blur-up stagger animation, ambient background glow, and noise grain overlay.
- **Unified Brand Identity System:** Integrated official geometric P-symbol (`PulseLogo`), responsive lockups, standalone marks, and state-aware reactive stimulus reticle (`StimulusReticle`).
- **Cryptographic Provenance Engine:** Server-side HMAC-SHA256 attestation across assessment submissions and leaderboard entries with physiological threshold enforcement ($RT \ge 80\text{ms}$).
- **Statutory Privacy Governance:** Formalized data retention schedules (GDPR, FTC Health Breach Notification, RCW 19.373) and automated breach incident runbook.
- **Dedicated iOS Chrome & PWA Detection:** Enhanced PWA standalone mode detection and installation prompts.

### Changed
- **Dual-Surface Routing Stabilization:** Refined edge and client-side device detection between desktop (`/`) and mobile PWA (`/mobile/`), eliminating redirect loops and double-nav churn.
- **Assessment & Leaderboard UX:** Decoupled CTA buttons from background authentication state to ensure immediate responsiveness.
- **Anti-Slop Visual Remediation:** Standardized design tokens, eliminated gratuitous gradients, and achieved strict visual consistency across desktop and mobile.

### Fixed
- **Navigation & Auth UX:** Resolved transient navigation state bugs (`isNavigating`), stabilized modal transitions, and added full `prefers-reduced-motion` compliance.
- **Routing & SEO:** Sanitized URL query parameters and implemented staging search-engine indexing controls.

---

*Note: Pre-v2.0 development history was not tracked in the current Git branch history.*
