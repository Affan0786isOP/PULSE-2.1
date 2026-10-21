# Changelog

All notable changes to the PULSE platform are documented in this file based on verified repository commit history and NCSC project development records.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.4.0] - 2026-10-21

### Added
- **Targeted Telegram Activity Observability:** Added low-noise operational notifications dispatched to dedicated topics in a Telegram Forum Supergroup (`TELEGRAM_TOPIC_VISITS`, `TELEGRAM_TOPIC_RESULTS`, `TELEGRAM_TOPIC_LEADERBOARD`).
- **Durable Telegram Outbox & Rate-Limiter:** Added `TelegramNotifierService` with persistent in-memory outbox, HTML parse mode escaping, bounded exponential backoff, priority-based dispatching, and a global chat rate-limiter target (~18 msgs/min).
- **Targeted Page View Telemetry:** Mounted `PageViewTracker` across Desktop and Mobile surfaces, restricted strictly to allowlisted views (`/`, `/about`, `/assessments`, `/leaderboard`) with route normalization and React 19 StrictMode deduplication.
- **Pseudonymous Browser Profile ID:** Added `getOrCreateDeviceId()` in `shared/telemetry/deviceId.ts` generating persistent `dev_` UUIDs in `localStorage` with explicit telemetry opt-out controls (`setTelemetryOptOut`).
- **Telemetry Ingestion Route:** Added `POST /api/telemetry/page-view` with strict payload schema validation, route allowlisting, and 48-hour event-ID idempotency deduplication.

### Changed
- **Server Dependency Container:** Wired `ITelegramNotifierService` into `server/container.ts` and `server/index.ts`.
- **Authoritative Event Hooks:** Connected non-blocking telemetry outbox enqueueing directly to canonical committed writes in `POST /api/research/submit` and `POST /api/leaderboard/submit`.

## [2.3.0] - 2026-10-20

### Added
- **NCSC Project Logbook Integration:** Added canonical machine-readable research working logbook ([`docs/PULSE_NCSC_Project_Logbook_AI_Optimized.md`](docs/PULSE_NCSC_Project_Logbook_AI_Optimized.md)) covering 25 structured retrospective activity entries from July to October 2026 across protocol development, latency timing calibration, and data integrity audits.
- **User-Controlled Theme System:** Full dark, light, and system theme selection across desktop and mobile surfaces with dual `localStorage` and cookie persistence.
- **Radial View Transitions:** Click-origin circular wipe animations powered by CSS View Transitions API (`applyThemeWithRadialTransition`), automatically bypassed when `prefers-reduced-motion` is active.
- **Dark Apparatus Invariant:** Protected routes (`/reaction-test`, `/direction-test`, `/block-memory`, `/number-memory`, `/colour-recognition`) enforce strict dark mode to preserve contrast and latency measurement validity.
- **Theme Audit Harness:** Headless visual audit script (`scripts/audit-visual-themes.mjs`) and unit test suites (`tests/unit/desktopThemeSystem.test.tsx`, `tests/unit/mobileThemeSystem.test.tsx`, `tests/unit/settingsPersistence.test.ts`).

### Fixed
- **Theme Surface Cohesion:** Synchronized wave crest strokes, side wave gradients, and stage backdrops across About, Assessments, Leaderboard, Improve, and Privacy views.
- **Navbar Layout Shift:** Locked navbar heights across theme switches to eliminate layout shifts.
- **Hero Dynamic Contrast:** Unified `currentColor` in `AnimatedResultCount` for seamless dark and light theme legibility.

---

## [2.2.1] - 2026-10-17

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

### Fixed
- **Mobile Drawer Assessment Transition:** Hardened drawer lifecycle so active assessment transitions immediately unmount mobile drawer dialogs and restore background inert state without layout leakage.

### Removed
- Confirmed dead frontend components (`FullscreenPrompt`, `WhatIsPulseScene`, `gooey-nav`, unreferenced brand cards).
- Archived 46 legacy scripts from repository root into `scripts/archive/`.

---

## [2.2.0] - 11 October 2026

### NCSC Research Entry 25
- **Activity:** Redesigned the light-mode laptop homepage and enhanced the 3D assessment carousel.
- **Work Recorded:** The latest retrieved commit reports revised homepage hierarchy, navigation and Start Testing call to action, enhanced 3D carousel geometry, responsive laptop metrics, live public result counts and additional desktop-home/Playwright verification scripts.
- **Observation / Learning:** The commit proves that the code and test scripts were added to the repository; the commit message alone does not prove those tests were executed or that the production site runs this exact version.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2.1/commit/2477d7e13dcb6debf2a770614f6cac591c8c3314

---

## [2.1.4] - 10 October 2026

### NCSC Research Entry 24
- **Activity:** Fixed mobile-routing edge cases and standardized assessment logo assets.
- **Work Recorded:** PR #25 addresses desktop-to-mobile routing. PR #26 handles routing preference persistence and slash normalization edge cases. Other commits migrated assessment marks to transparent PNG assets and normalized their sizing across desktop/mobile views.
- **Observation / Learning:** Multiple routing fixes show that the issue had edge cases beyond a single redirect condition. PR records indicate that automated/live-browser verification was not completed in the PR-authoring environment.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2.1/pull/25 ; https://github.com/Affan0786isOP/PULSE-2.1/pull/26 ; https://github.com/Affan0786isOP/PULSE-2.1/commit/83f9b4913d472386f29668afc830e46713ec43ce

---

## [2.1.3] - 9 October 2026

### NCSC Research Entry 23
- **Activity:** Made the favicon discoverable on desktop and mobile entry points.
- **Work Recorded:** A commit standardized favicon discovery across desktop and mobile entrypoints.
- **Observation / Learning:** Separate desktop and mobile entry points need consistent metadata and public assets.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2.1/commit/52af422a24a43d2d60dee433f064e9ed467f8150

---

## [2.1.2] - 8 October 2026

### NCSC Research Entry 22
- **Activity:** Improved search-engine discoverability and public information pages.
- **Work Recorded:** Commits standardized the canonical domain, added a public About page, improved crawlability/prerendering shells, and included protections for non-production hosts.
- **Observation / Learning:** Search engines may need stable canonical URLs and readable public page content. SEO changes should be checked against the live deployed site, not only source files.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2.1/commit/06b29d42d4a8a3e765478e2ddc274cafded76de1 ; https://github.com/Affan0786isOP/PULSE-2.1/commit/1697a133b445745a422c8a2da68b529e7a52e3c9

---

## [2.1.1] - 5 October 2026

### NCSC Research Entry 21
- **Activity:** Resolved a deployment startup dependency issue and temporarily deferred public dataset/analytics routes.
- **Work Recorded:** PR #19 addresses a Vercel Firebase Admin/Jose ESM startup crash by pinning a compatible jose version through an npm override/lockfile change; the PR reports that a Vercel preview reached READY and /api/health returned 200. Other changes placed Dataset/Analytics behind a Coming Soon state while audit fixes were integrated.
- **Observation / Learning:** A healthy API endpoint is a useful check, but it does not prove every authenticated workflow, assessment submission or database operation works. A Coming Soon route should not be described as a fully available feature.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2.1/pull/19 ; https://github.com/Affan0786isOP/PULSE-2.1/pull/18

---

## [2.1.0] - 4 October 2026

### NCSC Research Entry 20
- **Activity:** Performed a broader UI, telemetry and accessibility audit; added security-audit tooling.
- **Work Recorded:** The commit history describes a frontend audit/overhaul touching design, telemetry protocols and accessibility, and the addition of a comprehensive security audit skill.
- **Observation / Learning:** The audit approach expanded beyond appearance to include accessibility, measurement protocols and security concerns.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2.1/commit/08832d367fff64c5294ae82831c0f1334b72e8cf ; https://github.com/Affan0786isOP/PULSE-2.1/commit/e339c8548bd1c23fe865b682267b1f4b3b834242

---

## [2.0.1] - 29 September 2026

### NCSC Research Entry 19
- **Activity:** Simplified the desktop homepage and worked through dependency-audit items.
- **Work Recorded:** The history records a single-screen desktop homepage with no-scroll intent and a pull request for home layout. Dependency changes addressed the jose override, Node engines, package-manager sprawl and unused dependencies.
- **Observation / Learning:** Reducing interface clutter and dependency complexity can improve maintainability, but dependency upgrades must be checked for compatibility.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2.1/commit/98354026e945728e942c4fa48f95b360fd5b208a ; https://github.com/Affan0786isOP/PULSE-2.1/pull/16

---

## [2.0.0] - 26 September 2026

### NCSC Research Entry 18
- **Activity:** Reworked the desktop layout and addressed mobile-route redirection.
- **Work Recorded:** A homepage commit introduced a left-aligned hero and right navigation rail. Another recorded fix says desktop users should not be automatically redirected away from /mobile unless explicitly forced.
- **Observation / Learning:** Desktop/mobile detection and remembered preferences can conflict; testing should include direct URL entry as well as navigation from the homepage.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2.1/commit/f81aac982bfc314911853f2039e32cb0cbbe26de ; https://github.com/Affan0786isOP/PULSE-2.1/commit/11a90b16b69c8f96aeea36033e6fb8114558d7b2

---

## [1.9.0] - 25 September 2026

### NCSC Research Entry 17
- **Activity:** Reviewed privacy, identity and age-eligibility changes in PULSE-2.
- **Work Recorded:** PULSE-2 pull requests were created/merged for a Phase 0 privacy/data specification, anonymous Firebase identity, adult eligibility before participant identity, and a revert of Phase 1/2 changes while keeping Phase 0. A privacy-policy alignment pull request was also recorded.
- **Observation / Learning:** Privacy requirements can change the data that should be collected and when identity is created. A later revert means the history must be read as a sequence of decisions, not as one uninterrupted implementation.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2/pulls

---

## [1.8.0] - 24 September 2026

### NCSC Research Entry 16
- **Activity:** Explored a modular engine/protocol architecture and standardized assessment interfaces.
- **Work Recorded:** PULSE-3 records an initial engine/protocol/contracts/tests/config commit, deterministic protocol replay tests, five standardized assessment-view components with mobile touch pads, and integration/mobile E2E test and Firestore-invariant work. This was a distinct repository and architectural experiment.
- **Observation / Learning:** A separate experiment is useful for comparing architectures, but should not be treated as merged into the main application without integration evidence.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-3/commit/98ab70af9f796898bd67f3206e958bad4037aa6e ; https://github.com/Affan0786isOP/PULSE-3/commit/b7364bd2eecd66301b691fcd5795ae2bbfc8a47a

---

## [1.7.0] - 23 September 2026

### NCSC Research Entry 15
- **Activity:** Prepared a staged rebuild and architecture specification.
- **Work Recorded:** The proposed design separated a deterministic TypeScript assessment engine from UI and data persistence. It described performance.now() as the authoritative clock, immutable raw telemetry, validity classification, normalized observations and atomic persistence. The specification also described session/result/trial identifiers and version metadata.
- **Observation / Learning:** This was a design baseline, not proof that all proposed packages or schemas were implemented in the current application. Current repo docs still describe a React/Express/Firebase application.
- **Evidence Reference:** Saved project context: “PULSE Rebuild - Architectural Design Specification v1.0.0”; repository history later available at https://github.com/Affan0786isOP/PULSE-2.1

---

## [1.6.0] - 22 September 2026

### NCSC Research Entry 14
- **Activity:** Unified brand elements and refined the homepage, assessments and leaderboard presentation.
- **Work Recorded:** Commit messages record a unified PULSE brand identity system, updates to Assessments and Leaderboard components, and a hero-section upgrade with staggered presentation, ambient glow and grain.
- **Observation / Learning:** Consistent visual identity can improve clarity, but the interface should not imply that a measurement has been scientifically validated when this has not been demonstrated.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2.1/commit/b6a5f5df1ff849846b9ccc6f6fb1d74c0081ba36 ; https://github.com/Affan0786isOP/PULSE-2.1/commit/6190610862df5b6a0a33d898d0131c4d7c917630

---

## [1.5.0] - 20 September 2026

### NCSC Research Entry 13
- **Activity:** Recorded a strict frontend-quality check.
- **Work Recorded:** A commit message reports an Anti-Slop check achieving “100% clean” with 0 errors, 0 warnings and 0 advisories under strict mode.
- **Observation / Learning:** This is a result stated in the commit message. The original check output and exact definition of the check are not included in the available logbook evidence.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2.1/commit/9acc6bea3c73a4452fa411b3708cff966f1deb12

---

## [1.4.0] - 19 September 2026

### NCSC Research Entry 12
- **Activity:** Refined responsive navigation, mobile routing, accessibility and front-end consistency.
- **Work Recorded:** The history contains multiple changes to responsive routing and authentication flow, Open Graph metadata, reduced-motion support, font loading, mobile theme color and UI stability. An Anti-Slop frontend remediation commit and later audit-resolution commit were also recorded.
- **Observation / Learning:** A visual cleanup should remove unnecessary complexity while preserving working interactions and accessibility.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2.1/commit/734f6ba86645dcad56e8f83a297ef9e80c3bce2e ; https://github.com/Affan0786isOP/PULSE-2.1/commit/f132f4aad2c1c733c4aa00298d76c40ad2c6b6d3

---

## [1.3.0] - 17 September 2026

### NCSC Research Entry 11
- **Activity:** Hardened mobile routing, accessibility, settings and privacy/SEO behavior.
- **Work Recorded:** The repository records device-routing/PWA separation, navigation and authentication lifecycle guards, modal-stack accessibility and trial-interruption prevention, persistence and calibration lifecycle updates, scientific wording revisions, privacy-policy and canonical SEO fixes, and background-canvas lifecycle improvements.
- **Observation / Learning:** Interface changes can affect measurements when modals interrupt trials or device routing is inconsistent. Accessibility and timing correctness must be considered together.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2.1/commit/3f0699ad24c3e6c82fef0ff1bfa123d3f846f51d ; https://github.com/Affan0786isOP/PULSE-2.1/commit/ab3383976f72be86d290ce2d4a25da2eee2d5e59

---

## [1.2.0] - 14 September 2026

### NCSC Research Entry 10
- **Activity:** Refined validity thresholds, telemetry, dashboard comparisons and dataset filtering.
- **Work Recorded:** Commits record unifying the VRT validity threshold and memory-span semantics, preserving foreperiod telemetry and protocol fallbacks, improving the VRT dashboard with wait-time comparison telemetry, and integrating a global dataset filter bar and unit tests.
- **Observation / Learning:** A reliable analysis view depends on consistent filtering and preserving the context behind each observation.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2.1/commit/8248ec564304adcaf3d2487ba8189d683cc66013 ; https://github.com/Affan0786isOP/PULSE-2.1/commit/2df695a8c07bf369ff52a18b36de1f0b5f276081

---

## [1.1.0] - 13 September 2026

### NCSC Research Entry 09
- **Activity:** Created PULSE-2.1 and began a concentrated dataset-correctness pass.
- **Work Recorded:** The repository was initialized and received fixes for colour statistics, memory-span semantics, Visual Reaction Test (VRT) distribution statistics, refresh-rate thresholds, block-memory span labels, foreperiod categorization, trial identity and observation identity. Dataset normalization/filtering/chart fixes and tests were also recorded.
- **Observation / Learning:** Metric labels and values need to describe the same underlying data. Incorrect category derivation or duplicated observation identity can make a dataset misleading.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2.1/commit/49ea15a87025ac24f4b7afd4b828535530b040ad ; https://github.com/Affan0786isOP/PULSE-2.1/commit/957415150652adc4ddd3f9cf35862b40d6c2422b

---

## [1.0.1] - 12 September 2026

### NCSC Research Entry 08
- **Activity:** Investigated a deployment failure affecting the research API.
- **Work Recorded:** The recorded errors included an ESM dependency-loading issue involving jwks-rsa/jose and a missing or empty FIREBASE_SERVICE_ACCOUNT environment variable. The user later reported the deployment was fixed after Firebase credential configuration.
- **Observation / Learning:** The first visible error may not be the only blocker. A reported successful deployment is different from a complete end-to-end test of all assessment and data paths.
- **Evidence Reference:** Historical conversation excerpts dated 2026-09-12; exact original deployment state is not independently verifiable from this entry.

---

## [1.0.0] - 9 September 2026

### NCSC Research Entry 07
- **Activity:** Started a second development line and refined assessment-session logic.
- **Work Recorded:** PULSE-2 received an initial commit and infrastructure setup. Further commits address assessment session management, authentication state, memory assessment scoring/trial validation, security and privacy, test seeding/PB tracking, and experiment-session error handling.
- **Observation / Learning:** The new repository shows a shift toward managing sessions and validating submitted assessment records in addition to the UI.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE-2/commit/ab584bc99d16695d402d90a05c2e016e5eeba5a1 ; https://github.com/Affan0786isOP/PULSE-2/commit/e231cec2408c80f9c7cbb87a4b9afd74859cf47b ; https://github.com/Affan0786isOP/PULSE-2/commit/db583d83a7f6d2c915431b0ad47b6766d906458a

---

## [0.5.0] - 8 September 2026

### NCSC Research Entry 06
- **Activity:** Moved toward server-authoritative data handling and improved leaderboard/SEO behavior.
- **Work Recorded:** The repository recorded a transition to server-authoritative architecture, cleanup of leaderboard/dataset state, standardized assessment result reporting, SEO components, and exclusion of hidden entries from leaderboard queries. Project discussions also record that the source repository should remain private and that PULSE was being hosted on Vercel with the custom domain pulse-lab.in.
- **Observation / Learning:** Public-facing results need consistent rules about what is eligible to appear, while private source access must remain controlled.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE/commit/3e1ea19cb9b7ed09a0a0511654daccb6d247315d ; https://github.com/Affan0786isOP/PULSE/commit/2eb27e4319fae5ac119cb2b9bb194694811c6e8b

---

## [0.4.0] - 7 September 2026

### NCSC Research Entry 05
- **Activity:** Worked on security, reliability, analytics tracking and dataset logic.
- **Work Recorded:** Commit messages record improvements to application security/reliability and refactoring of analytics tracking and dataset logic.
- **Observation / Learning:** For research-oriented software, the meaning and provenance of data need to be as clear as the visual presentation of results.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE/commit/ed8f2033188e9442d9518f790b7a7689f63f9dad ; https://github.com/Affan0786isOP/PULSE/commit/362897f264e4c0c126f6e97610ecd13f52daf8fd

---

## [0.3.0] - 6 September 2026

### NCSC Research Entry 04
- **Activity:** Improved mobile experience, chart performance and Firestore write helpers.
- **Work Recorded:** The repository records enhancements to mobile UX and chart performance. Another commit added safer UUID and Firestore write helper logic. These changes addressed interface performance and safer handling of data-writing operations.
- **Observation / Learning:** Usability and data handling are both important: a smooth interface does not guarantee that stored research records are correct.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE/commit/cf0d5bfc91ff98373a886d08436987962bd51ef3 ; https://github.com/Affan0786isOP/PULSE/commit/4dbb4f9b4f5cfff2be7f7da123609401844c9466

---

## [0.2.1] - 5 September 2026

### NCSC Research Entry 03
- **Activity:** Removed unused interface and chart components.
- **Work Recorded:** A refactoring commit removed unused UI and chart components. The intent recorded by the commit was code cleanup rather than introduction of a new assessment.
- **Observation / Learning:** Removing unused code can reduce complexity, but changes need regression checks to ensure active pages remain unaffected.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE/commit/d7b3053da1ff3c09b4ca52dba81332516a25fc17

---

## [0.2.0] - 4 September 2026

### NCSC Research Entry 02
- **Activity:** Created the main PULSE application repository.
- **Work Recorded:** The repository history begins under the name PULSE: Precision User Latency and Stimulus Evaluator. This established a tracked baseline for continued application development.
- **Observation / Learning:** A version-controlled repository provides a record of changes, but repository creation by itself does not establish that the system was scientifically validated.
- **Evidence Reference:** https://github.com/Affan0786isOP/PULSE/commit/8be770b2e9ee543d502f4ff12de2ff4af65df320

---

## [0.1.0] - 16 July 2026

### NCSC Research Entry 01
- **Activity:** Initial project concept and early prototype direction.
- **Work Recorded:** The available record describes PULSE as a school science-fest project that began as a basic HTML/CSS/JavaScript website. The idea evolved toward a game-like sequence: landing page, cognitive task, results, a learning/improvement explanation, and a leaderboard. Early task ideas included reaction, colour, direction and memory activities. The public prototype repository also records a colour-test implementation on this date.
- **Observation / Learning:** At this stage, the evidence establishes product ideas and a prototype direction, not a validated scientific result or a completed participant study.
- **Evidence Reference:** Conversation excerpts dated 2026-07-16; pulse-imaginarium commit: https://github.com/Affan0786isOP/pulse-imaginarium/commit/3f472ba3e856df17d51552cb08428b8bbc200d82
