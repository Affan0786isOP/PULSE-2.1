# Changelog

All notable changes to the PULSE platform are documented in this file based on verified repository commit history.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]
- Documentation system overhaul and architecture specification suite.

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
