# Changelog

All notable changes to the PULSE platform are documented in this file based on verified repository commit history.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.2.1] — 2026-10-17

### Added
- **Canonical Navbar Unification:** Replaced legacy disparate headers with universal `Navbar` component supporting explicit light/dark themes, brand lockup, and modal triggers across all desktop views.
- **Cognitive Session Safety:** Enforced active assessment lockouts, blocking accidental navigation, modal activation, and tab switches with an explicit "Exit Test" safeguard.
- **Mobile Drawer Accessibility:** Implemented bidirectional Tab/Shift+Tab focus cycling, Escape-key dismissal, backdrop dismissibility, and inert background isolation.
- **Screenshot Audit Harnesses:** Added Playwright capture scripts in `scratch/` for desktop and mobile viewport audits.

### Changed
- **Backend Modularisation:** Decomposed the monolithic `server.ts` into modular `server/` architecture (`config`, `middleware`, `routes`, `services`, `engines`, `repositories`).
- **Admin Surface Deprecation:** Fully audited and removed the web admin console, browser admin login routes (`/api/admin/*`), and obsolete client auth contexts. Moderation is now handled strictly via server operator scripts.
- **Desktop Leaderboard Redesign:** Modernized desktop leaderboard view with light theme, fluid waves, and direct server query optimization.
- Consolidated HMAC signing routines behind `signProvenancePayload()` in `server/services/provenanceService.ts`.
- Renamed npm package from `react-example` to `pulse`.

### Removed
- Confirmed dead frontend components (`FullscreenPrompt`, `WhatIsPulseScene`, `gooey-nav`, unreferenced brand cards).
- Archived 46 legacy scripts from repository root into `scripts/archive/`.

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
