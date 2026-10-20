---
document_type: ncsc_project_logbook
project_name: PULSE
expanded_name: Precision User Latency and Stimulus Evaluator
format: ai-optimized-markdown
language: en
coverage_start: 2026-07-16
coverage_end: 2026-10-11
entry_count: 25
evidence_basis: reconstructed conversation excerpts and repository history
authenticity_status: retrospective_draft_requires_human_verification
submission_ready: false
---

# PULSE — NCSC Project Logbook (AI-Optimized Source)

> **Purpose:** Canonical machine-readable working source for drafting, updating, auditing, or converting the PULSE NCSC logbook. Preserve evidence boundaries. Do not invent dates, experiments, participants, measurements, results, approvals, or signatures.

## 1. Instructions for AI systems

- Treat this file as a **retrospective reconstruction**, not proof that a diary entry was written contemporaneously.
- Keep verified repository/conversation facts separate from inference, recommendations, and proposed next steps.
- A Git commit proves a change was recorded in version history; it does **not** by itself prove the code passed tests or works in production.
- Do not state that participants were recruited, consent was obtained, experiments were conducted, measurements were collected, or statistical analysis was completed unless new genuine evidence is provided.
- Do not fill gaps between dated entries with invented daily activity.
- Preserve each entry’s `record_basis`, `evidence_reference`, and `status_or_limitation` when summarizing or rewriting.
- The `next_step` field is a suggested follow-up, not evidence it was completed.
- Keep unknown project metadata blank/unknown. Never invent student names, school, guide, district, state, signatures, or approvals.
- Confirm NCSC 2026–27 focal theme, local-problem requirement, project eligibility, title, and methodology with the guide before treating this as a submission logbook.
- Preserve conflicting protocol definitions as unresolved until current source documents and guide-approved methodology settle them.
- Dates represent recorded activity dates as recovered from available sources; conversation timestamps and Git commit timestamps may differ.

## 2. Document status and integrity notes

This draft was assembled from available conversation records and Git history. It is not proof that a contemporaneous daily diary was maintained. Review every entry with the guide; correct or remove anything that does not match what actually happened. Do not backdate signatures.

### Known evidence gaps

- No verified participant sample, consent records, participant measurements, statistical analysis, or final research conclusion was present in the recovered archive.
- Available records chiefly document software development, proposed protocols, engineering tests, and data-integrity work.
- Current production behavior is not established solely by historical commits or merged pull requests.
- The available records do not establish that PULSE, a browser-based cognitive-assessment software project, fits the NCSC 2026–27 focal theme or local-problem requirement.
- Protocol definitions vary between some historical specifications and later repository documentation. Resolve against the current source and guide-approved plan.

## 3. Project metadata

- **Name of child scientist / group leader:** [FILL IN]
- **Names of co-workers (if any):** [FILL IN]
- **School / organisation and full address:** [FILL IN]
- **Guide teacher / mentor:** [FILL IN]
- **Guide contact (if required by school):** [FILL IN]
- **District:** [FILL IN]
- **State:** [FILL IN]
- **Project code:** [FILL IN]
- **Project language:** English
- **Period covered by available records:** 16 July 2026 to 11 October 2026

## 4. Working project summary

### Working project title
PULSE: A Browser-Based Platform for Measuring Human Response Time and Cognitive Performance

### Background
The project evolved from a school science-fest website into a browser-based platform intended to present structured cognitive tasks and record response-related metrics.

### Draft aim
To develop and evaluate the software logic and user experience of browser-based cognitive assessments while documenting the reliability and limitations of the collected measurements.

### Assessment areas recorded
Visual Reaction; Direction Choice; Colour Recognition / Stroop; Block Memory; Number Memory.

### Research question
Can a browser-based platform implement repeatable cognitive-task procedures and record their outputs consistently across desktop and mobile use? This is a working question, not a recovered approved NCSC hypothesis.

### Hypothesis
No approved hypothesis was found in the recovered records. Complete only after confirming the project question and methodology with the guide.

### Method documented in this draft
Review of development decisions, source-code change records, dataset/metric definitions, software validation work, routing behaviour and test plans. This is not a substitute for any required field study or participant-data collection.

### Data/results
No validated participant measurement dataset or statistical result was supplied in the available archive.

## 5. NCSC theme and guide approval (must be completed)

- **NCSC focal theme / sub-theme:** [TO BE CONFIRMED WITH GUIDE]
- **Local problem addressed:** [TO BE CONFIRMED WITH GUIDE]
- **Approved project title:** [TO BE CONFIRMED WITH GUIDE]
- **Research question / objective:** [TO BE CONFIRMED WITH GUIDE]
- **Method / evidence to be collected:** [TO BE CONFIRMED WITH GUIDE]
- **Topic eligible for this NCSC stage?:** [TO BE CONFIRMED WITH GUIDE]
- **Guide comments:** [TO BE CONFIRMED WITH GUIDE]
- **Guide name, signature and date:** [TO BE CONFIRMED WITH GUIDE]

## 6. Chronological activity log

Each entry records the activity supported by the available evidence. The next step is a recommendation, not proof of completion. Guide comments and authentication must be completed legitimately after review.

### Entry 01 — 16 July 2026

**Record basis:** Timestamped conversation excerpts and early repository history (the time of the conversation and commit are different records).

**Activity:** Initial project concept and early prototype direction.

**Work recorded:** The available record describes PULSE as a school science-fest project that began as a basic HTML/CSS/JavaScript website. The idea evolved toward a game-like sequence: landing page, cognitive task, results, a learning/improvement explanation, and a leaderboard. Early task ideas included reaction, colour, direction and memory activities. The public prototype repository also records a colour-test implementation on this date.

**Observation / learning:** At this stage, the evidence establishes product ideas and a prototype direction, not a validated scientific result or a completed participant study.

**Suggested next step (not completion evidence):** Clarify the research problem, define measurable outcomes, and confirm with the guide that the project is eligible and aligned with the current NCSC focal theme.

**Evidence:** Conversation excerpts dated 2026-07-16; pulse-imaginarium commit: https://github.com/Affan0786isOP/pulse-imaginarium/commit/3f472ba3e856df17d51552cb08428b8bbc200d82

**Status / limitation:** Concept/prototype direction recorded; exact state of the original prototype not fully recoverable.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 02 — 4 September 2026

**Record basis:** Git commit timestamp: PULSE repository initial commit.

**Activity:** Created the main PULSE application repository.

**Work recorded:** The repository history begins under the name PULSE: Precision User Latency and Stimulus Evaluator. This established a tracked baseline for continued application development.

**Observation / learning:** A version-controlled repository provides a record of changes, but repository creation by itself does not establish that the system was scientifically validated.

**Suggested next step (not completion evidence):** Record meaningful changes in version control and keep requirements and source-of-truth documents consistent.

**Evidence:** https://github.com/Affan0786isOP/PULSE/commit/8be770b2e9ee543d502f4ff12de2ff4af65df320

**Status / limitation:** Repository baseline verified from Git history.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 03 — 5 September 2026

**Record basis:** Git commit history; date based on commit timestamp.

**Activity:** Removed unused interface and chart components.

**Work recorded:** A refactoring commit removed unused UI and chart components. The intent recorded by the commit was code cleanup rather than introduction of a new assessment.

**Observation / learning:** Removing unused code can reduce complexity, but changes need regression checks to ensure active pages remain unaffected.

**Suggested next step (not completion evidence):** Keep cleanup changes narrow and verify the pages and charts that remain in use.

**Evidence:** https://github.com/Affan0786isOP/PULSE/commit/d7b3053da1ff3c09b4ca52dba81332516a25fc17

**Status / limitation:** Change committed; separate test results are not present in the archive.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 04 — 6 September 2026

**Record basis:** Git commit history; two key commit records on this date.

**Activity:** Improved mobile experience, chart performance and Firestore write helpers.

**Work recorded:** The repository records enhancements to mobile UX and chart performance. Another commit added safer UUID and Firestore write helper logic. These changes addressed interface performance and safer handling of data-writing operations.

**Observation / learning:** Usability and data handling are both important: a smooth interface does not guarantee that stored research records are correct.

**Suggested next step (not completion evidence):** Check mobile and desktop behavior separately and verify data writes against the intended schema.

**Evidence:** https://github.com/Affan0786isOP/PULSE/commit/cf0d5bfc91ff98373a886d08436987962bd51ef3 ; https://github.com/Affan0786isOP/PULSE/commit/4dbb4f9b4f5cfff2be7f7da123609401844c9466

**Status / limitation:** Changes committed; no independent browser/test report recovered.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 05 — 7 September 2026

**Record basis:** Git commit history.

**Activity:** Worked on security, reliability, analytics tracking and dataset logic.

**Work recorded:** Commit messages record improvements to application security/reliability and refactoring of analytics tracking and dataset logic.

**Observation / learning:** For research-oriented software, the meaning and provenance of data need to be as clear as the visual presentation of results.

**Suggested next step (not completion evidence):** Document which component creates each record, which fields are authoritative, and how invalid or hidden records are treated.

**Evidence:** https://github.com/Affan0786isOP/PULSE/commit/ed8f2033188e9442d9518f790b7a7689f63f9dad ; https://github.com/Affan0786isOP/PULSE/commit/362897f264e4c0c126f6e97610ecd13f52daf8fd

**Status / limitation:** Repository changes recorded; complete implementation details were not re-audited for this logbook.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 06 — 8 September 2026

**Record basis:** Git commit history; timestamped project discussion also records private-source and hosting concerns.

**Activity:** Moved toward server-authoritative data handling and improved leaderboard/SEO behavior.

**Work recorded:** The repository recorded a transition to server-authoritative architecture, cleanup of leaderboard/dataset state, standardized assessment result reporting, SEO components, and exclusion of hidden entries from leaderboard queries. Project discussions also record that the source repository should remain private and that PULSE was being hosted on Vercel with the custom domain pulse-lab.in.

**Observation / learning:** Public-facing results need consistent rules about what is eligible to appear, while private source access must remain controlled.

**Suggested next step (not completion evidence):** Verify that the server, database rules and UI agree on data eligibility and visibility.

**Evidence:** https://github.com/Affan0786isOP/PULSE/commit/3e1ea19cb9b7ed09a0a0511654daccb6d247315d ; https://github.com/Affan0786isOP/PULSE/commit/2eb27e4319fae5ac119cb2b9bb194694811c6e8b

**Status / limitation:** Changes committed; current domain and production configuration are not established by these historical records.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 07 — 9 September 2026

**Record basis:** Git commit history for PULSE-2.

**Activity:** Started a second development line and refined assessment-session logic.

**Work recorded:** PULSE-2 received an initial commit and infrastructure setup. Further commits address assessment session management, authentication state, memory assessment scoring/trial validation, security and privacy, test seeding/PB tracking, and experiment-session error handling.

**Observation / learning:** The new repository shows a shift toward managing sessions and validating submitted assessment records in addition to the UI.

**Suggested next step (not completion evidence):** Keep session lifecycle, scoring semantics and server/client validation rules consistent.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2/commit/ab584bc99d16695d402d90a05c2e016e5eeba5a1 ; https://github.com/Affan0786isOP/PULSE-2/commit/e231cec2408c80f9c7cbb87a4b9afd74859cf47b ; https://github.com/Affan0786isOP/PULSE-2/commit/db583d83a7f6d2c915431b0ad47b6766d906458a

**Status / limitation:** Changes recorded on PULSE-2 main; later work also occurred on separate branches.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 08 — 12 September 2026

**Record basis:** Timestamped conversation record; the user reported that the deployment was fixed.

**Activity:** Investigated a deployment failure affecting the research API.

**Work recorded:** The recorded errors included an ESM dependency-loading issue involving jwks-rsa/jose and a missing or empty FIREBASE_SERVICE_ACCOUNT environment variable. The user later reported the deployment was fixed after Firebase credential configuration.

**Observation / learning:** The first visible error may not be the only blocker. A reported successful deployment is different from a complete end-to-end test of all assessment and data paths.

**Suggested next step (not completion evidence):** Verify API health, assessment submission, persisted results and leaderboard reads after any deployment configuration changes.

**Evidence:** Historical conversation excerpts dated 2026-09-12; exact original deployment state is not independently verifiable from this entry.

**Status / limitation:** User-reported fixed at that time; current production status unknown.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 09 — 13 September 2026

**Record basis:** Git commit history for PULSE-2.1; many dataset commits on this date.

**Activity:** Created PULSE-2.1 and began a concentrated dataset-correctness pass.

**Work recorded:** The repository was initialized and received fixes for colour statistics, memory-span semantics, Visual Reaction Test (VRT) distribution statistics, refresh-rate thresholds, block-memory span labels, foreperiod categorization, trial identity and observation identity. Dataset normalization/filtering/chart fixes and tests were also recorded.

**Observation / learning:** Metric labels and values need to describe the same underlying data. Incorrect category derivation or duplicated observation identity can make a dataset misleading.

**Suggested next step (not completion evidence):** Use canonical identifiers, document each metric definition, and verify normalization on edge cases.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2.1/commit/49ea15a87025ac24f4b7afd4b828535530b040ad ; https://github.com/Affan0786isOP/PULSE-2.1/commit/957415150652adc4ddd3f9cf35862b40d6c2422b

**Status / limitation:** Changes committed; not all tests were independently executed for this logbook.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 10 — 14 September 2026

**Record basis:** Git commit history.

**Activity:** Refined validity thresholds, telemetry, dashboard comparisons and dataset filtering.

**Work recorded:** Commits record unifying the VRT validity threshold and memory-span semantics, preserving foreperiod telemetry and protocol fallbacks, improving the VRT dashboard with wait-time comparison telemetry, and integrating a global dataset filter bar and unit tests.

**Observation / learning:** A reliable analysis view depends on consistent filtering and preserving the context behind each observation.

**Suggested next step (not completion evidence):** Check that client labels, server validation, stored fields and chart calculations use compatible definitions.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2.1/commit/8248ec564304adcaf3d2487ba8189d683cc66013 ; https://github.com/Affan0786isOP/PULSE-2.1/commit/2df695a8c07bf369ff52a18b36de1f0b5f276081

**Status / limitation:** Changes committed; output values and full test runs not reproduced here.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 11 — 17 September 2026

**Record basis:** Git commit history.

**Activity:** Hardened mobile routing, accessibility, settings and privacy/SEO behavior.

**Work recorded:** The repository records device-routing/PWA separation, navigation and authentication lifecycle guards, modal-stack accessibility and trial-interruption prevention, persistence and calibration lifecycle updates, scientific wording revisions, privacy-policy and canonical SEO fixes, and background-canvas lifecycle improvements.

**Observation / learning:** Interface changes can affect measurements when modals interrupt trials or device routing is inconsistent. Accessibility and timing correctness must be considered together.

**Suggested next step (not completion evidence):** Test route transitions, active trials, settings persistence and reduced-motion behavior without altering measurement semantics unintentionally.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2.1/commit/3f0699ad24c3e6c82fef0ff1bfa123d3f846f51d ; https://github.com/Affan0786isOP/PULSE-2.1/commit/ab3383976f72be86d290ce2d4a25da2eee2d5e59

**Status / limitation:** Changes committed; each behavior still needs independent end-to-end verification.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 12 — 19 September 2026

**Record basis:** Git commit history.

**Activity:** Refined responsive navigation, mobile routing, accessibility and front-end consistency.

**Work recorded:** The history contains multiple changes to responsive routing and authentication flow, Open Graph metadata, reduced-motion support, font loading, mobile theme color and UI robustness. An Anti-Slop frontend remediation commit and later audit-resolution commit were also recorded.

**Observation / learning:** A visual cleanup should remove unnecessary complexity while preserving working interactions and accessibility.

**Suggested next step (not completion evidence):** Perform a focused regression check across desktop/mobile routes, authentication and navigation after grouped UI refactors.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2.1/commit/734f6ba86645dcad56e8f83a297ef9e80c3bce2e ; https://github.com/Affan0786isOP/PULSE-2.1/commit/f132f4aad2c1c733c4aa00298d76c40ad2c6b6d3

**Status / limitation:** Changes committed; the commit message alone does not establish that every possible interaction was tested.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 13 — 20 September 2026

**Record basis:** Git commit history.

**Activity:** Recorded a strict frontend-quality check.

**Work recorded:** A commit message reports an Anti-Slop check achieving “100% clean” with 0 errors, 0 warnings and 0 advisories under strict mode.

**Observation / learning:** This is a result stated in the commit message. The original check output and exact definition of the check are not included in the available logbook evidence.

**Suggested next step (not completion evidence):** Retain the actual check output or report alongside the logbook if it is used as evidence.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2.1/commit/9acc6bea3c73a4452fa411b3708cff966f1deb12

**Status / limitation:** Commit recorded; independent reproduction of the check was not performed here.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 14 — 22 September 2026

**Record basis:** Git commit history.

**Activity:** Unified brand elements and refined the homepage, assessments and leaderboard presentation.

**Work recorded:** Commit messages record a unified PULSE brand identity system, updates to Assessments and Leaderboard components, and a hero-section upgrade with staggered presentation, ambient glow and grain.

**Observation / learning:** Consistent visual identity can improve clarity, but the interface should not imply that a measurement has been scientifically validated when this has not been demonstrated.

**Suggested next step (not completion evidence):** Keep visual hierarchy distinct from the actual evidence and limitations of each test.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2.1/commit/b6a5f5df1ff849846b9ccc6f6fb1d74c0081ba36 ; https://github.com/Affan0786isOP/PULSE-2.1/commit/6190610862df5b6a0a33d898d0131c4d7c917630

**Status / limitation:** Changes committed; no user-study results are established by these design commits.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 15 — 23 September 2026

**Record basis:** Saved project context and a specification dated 2026-09-23; some exact discussion times are unavailable.

**Activity:** Prepared a staged rebuild and architecture specification.

**Work recorded:** The proposed design separated a deterministic TypeScript assessment engine from UI and data persistence. It described performance.now() as the authoritative clock, immutable raw telemetry, validity classification, normalized observations and atomic persistence. The specification also described session/result/trial identifiers and version metadata.

**Observation / learning:** This was a design baseline, not proof that all proposed packages or schemas were implemented in the current application. Current repo docs still describe a React/Express/Firebase application.

**Suggested next step (not completion evidence):** Compare any planned architecture against existing code and confirm which protocol definitions and data schemas are authoritative before changing implementation.

**Evidence:** Saved project context: “PULSE Rebuild — Architectural Design Specification v1.0.0”; repository history later available at https://github.com/Affan0786isOP/PULSE-2.1

**Status / limitation:** Specification recorded; implementation parity remains unverified.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 16 — 24 September 2026

**Record basis:** Git commit history for PULSE-3.

**Activity:** Explored a modular engine/protocol architecture and standardized assessment interfaces.

**Work recorded:** PULSE-3 records an initial engine/protocol/contracts/tests/config commit, deterministic protocol replay tests, five standardized assessment-view components with mobile touch pads, and integration/mobile E2E test and Firestore-invariant work. This was a distinct repository and architectural experiment.

**Observation / learning:** A separate experiment is useful for comparing architectures, but should not be treated as merged into the main application without integration evidence.

**Suggested next step (not completion evidence):** Document which ideas remain experiments and which are adopted in PULSE-2.1.

**Evidence:** https://github.com/Affan0786isOP/PULSE-3/commit/98ab70af9f796898bd67f3206e958bad4037aa6e ; https://github.com/Affan0786isOP/PULSE-3/commit/b7364bd2eecd66301b691fcd5795ae2bbfc8a47a

**Status / limitation:** PULSE-3 experiment recorded; integration into PULSE-2.1 not established.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 17 — 25 September 2026

**Record basis:** PULSE-2 pull-request timestamps; separate from PULSE-2.1 main history.

**Activity:** Reviewed privacy, identity and age-eligibility changes in PULSE-2.

**Work recorded:** PULSE-2 pull requests were created/merged for a Phase 0 privacy/data specification, anonymous Firebase identity, adult eligibility before participant identity, and a revert of Phase 1/2 changes while keeping Phase 0. A privacy-policy alignment pull request was also recorded.

**Observation / learning:** Privacy requirements can change the data that should be collected and when identity is created. A later revert means the history must be read as a sequence of decisions, not as one uninterrupted implementation.

**Suggested next step (not completion evidence):** Confirm the approved privacy requirements and current implementation before any participant data is collected.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2/pulls

**Status / limitation:** Historical branch/PR activity. Do not assume every branch change is part of current PULSE-2.1 main.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 18 — 26 September 2026

**Record basis:** Git commit history.

**Activity:** Reworked the desktop layout and addressed mobile-route redirection.

**Work recorded:** A homepage commit introduced a left-aligned hero and right navigation rail. Another recorded fix says desktop users should not be automatically redirected away from /mobile unless explicitly forced.

**Observation / learning:** Desktop/mobile detection and remembered preferences can conflict; testing should include direct URL entry as well as navigation from the homepage.

**Suggested next step (not completion evidence):** Test route behavior on desktop and mobile devices, including saved preferences and explicit mode switches.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2.1/commit/f81aac982bfc314911853f2039e32cb0cbbe26de ; https://github.com/Affan0786isOP/PULSE-2.1/commit/11a90b16b69c8f96aeea36033e6fb8114558d7b2

**Status / limitation:** Fixes recorded in history; later October routing work shows additional edge cases were still being addressed.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 19 — 29 September 2026

**Record basis:** Git commit and pull request history.

**Activity:** Simplified the desktop homepage and worked through dependency-audit items.

**Work recorded:** The history records a single-screen desktop homepage with no-scroll intent and a pull request for home layout. Dependency changes addressed the jose override, Node engines, package-manager sprawl and unused dependencies.

**Observation / learning:** Reducing interface clutter and dependency complexity can improve maintainability, but dependency upgrades must be checked for compatibility.

**Suggested next step (not completion evidence):** Verify the homepage at intended laptop resolutions and validate the installed package versions against the project manifest.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2.1/commit/98354026e945728e942c4fa48f95b360fd5b208a ; https://github.com/Affan0786isOP/PULSE-2.1/pull/16

**Status / limitation:** Changes recorded; visual/runtime verification not established by this log entry.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 20 — 4 October 2026

**Record basis:** Git commit history.

**Activity:** Performed a broader UI, telemetry and accessibility audit; added security-audit tooling.

**Work recorded:** The commit history describes a frontend audit/overhaul touching design, telemetry protocols and accessibility, and the addition of a comprehensive security audit skill.

**Observation / learning:** The audit approach expanded beyond appearance to include accessibility, measurement protocols and security concerns.

**Suggested next step (not completion evidence):** Keep audit findings separate from verified fixes; attach test results and source references to each claimed resolution.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2.1/commit/08832d367fff64c5294ae82831c0f1334b72e8cf ; https://github.com/Affan0786isOP/PULSE-2.1/commit/e339c8548bd1c23fe865b682267b1f4b3b834242

**Status / limitation:** Audit-related work committed; this record does not certify a complete independent audit.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 21 — 5 October 2026

**Record basis:** Git commit and pull request timestamps.

**Activity:** Resolved a deployment startup dependency issue and temporarily deferred public dataset/analytics routes.

**Work recorded:** PR #19 addresses a Vercel Firebase Admin/Jose ESM startup crash by pinning a compatible jose version through an npm override/lockfile change; the PR reports that a Vercel preview reached READY and /api/health returned 200. Other changes placed Dataset/Analytics behind a Coming Soon state while audit fixes were integrated.

**Observation / learning:** A healthy API endpoint is a useful check, but it does not prove every authenticated workflow, assessment submission or database operation works. A Coming Soon route should not be described as a fully available feature.

**Suggested next step (not completion evidence):** Verify current route behavior and document which features are intentionally deferred.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2.1/pull/19 ; https://github.com/Affan0786isOP/PULSE-2.1/pull/18

**Status / limitation:** PRs merged; live production behavior remains unverified.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 22 — 8 October 2026

**Record basis:** Git commit history.

**Activity:** Improved search-engine discoverability and public information pages.

**Work recorded:** Commits standardized the canonical domain, added a public About page, improved crawlability/prerendering shells, and included protections for non-production hosts.

**Observation / learning:** Search engines may need stable canonical URLs and readable public page content. SEO changes should be checked against the live deployed site, not only source files.

**Suggested next step (not completion evidence):** Inspect Search Console/indexing and verify canonical URLs, sitemap entries and production rendering.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2.1/commit/06b29d42d4a8a3e765478e2ddc274cafded76de1 ; https://github.com/Affan0786isOP/PULSE-2.1/commit/1697a133b445745a422c8a2da68b529e7a52e3c9

**Status / limitation:** SEO changes committed; search indexing results are separate evidence and may lag code changes.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 23 — 9 October 2026

**Record basis:** Git commit history.

**Activity:** Made the favicon discoverable on desktop and mobile entry points.

**Work recorded:** A commit standardized favicon discovery across desktop and mobile entrypoints.

**Observation / learning:** Separate desktop and mobile entry points need consistent metadata and public assets.

**Suggested next step (not completion evidence):** Check browser tab icons on both entry points after a production deployment.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2.1/commit/52af422a24a43d2d60dee433f064e9ed467f8150

**Status / limitation:** Change committed; deployed browser verification not documented here.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 24 — 10 October 2026

**Record basis:** Exact GitHub PR/commit timestamps.

**Activity:** Fixed mobile-routing edge cases and standardized assessment logo assets.

**Work recorded:** PR #25 addresses desktop-to-mobile routing. PR #26 handles routing preference persistence and slash normalization edge cases. Other commits migrated assessment marks to transparent PNG assets and normalized their sizing across desktop/mobile views.

**Observation / learning:** Multiple routing fixes show that the issue had edge cases beyond a single redirect condition. PR records indicate that automated/live-browser verification was not completed in the PR-authoring environment.

**Suggested next step (not completion evidence):** Run direct browser checks for desktop landing, explicit mobile mode, saved preferences, query flags and asset requests; visually compare protocol marks after deployment.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2.1/pull/25 ; https://github.com/Affan0786isOP/PULSE-2.1/pull/26 ; https://github.com/Affan0786isOP/PULSE-2.1/commit/83f9b4913d472386f29668afc830e46713ec43ce

**Status / limitation:** Changes merged/committed; do not treat merge alone as proof every routing case passed.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

### Entry 25 — 11 October 2026

**Record basis:** Latest retrieved commit on PULSE-2.1 main.

**Activity:** Redesigned the light-mode laptop homepage and enhanced the 3D assessment carousel.

**Work recorded:** The latest retrieved commit reports revised homepage hierarchy, navigation and Start Testing call to action, enhanced 3D carousel geometry, responsive laptop metrics, live public result counts and additional desktop-home/Playwright verification scripts.

**Observation / learning:** The commit proves that the code and test scripts were added to the repository; the commit message alone does not prove those tests were executed or that the production site runs this exact version.

**Suggested next step (not completion evidence):** Run the tests, inspect laptop/mobile behavior, verify production deployment, and record results rather than relying on the commit description.

**Evidence:** https://github.com/Affan0786isOP/PULSE-2.1/commit/2477d7e13dcb6debf2a770614f6cac591c8c3314

**Status / limitation:** Latest known repository milestone in this archive; current deployed state unknown.

**Guide comments:** [TO BE COMPLETED AFTER REVIEW]
**Guide authentication:** [DO NOT BACKDATE; complete according to NCSC/school process]

## 7. Blank observation / test record template

> Use only for genuine observations or tests actually conducted. No measurement data were present in the reconstructed archive.

| Date/time | Activity / version | Test conditions | Observed result / issue | Evidence retained | Guide initials |
|---|---|---|---|---|---|
| [actual date/time] | [task/version] | [device/browser/procedure/sample if applicable] | [actual observation; include failures] | [file, screenshot, commit, lab sheet] | [after review] |
| [actual date/time] | [task/version] | [device/browser/procedure/sample if applicable] | [actual observation; include failures] | [file, screenshot, commit, lab sheet] | [after review] |

## 8. Unresolved items before submission

1. Confirm the NCSC focal theme/sub-theme and whether this software-based cognitive-response project is eligible in the relevant category/stage.
2. Confirm the approved title, local problem, research question, objectives, hypothesis (if required), method, and evidence to be collected.
3. Recover any genuine original handwritten notes, screenshots, test outputs, participant records, school feedback, or guide feedback absent from the archive.
4. If participant testing occurred, attach only genuine dated records and verify guide approval, consent, age eligibility, and data minimization requirements.
5. Resolve conflicting historical assessment protocol definitions against the actual current source and guide-approved methodology.
6. Verify the latest deployed version and run relevant tests; record actual outcomes, not merely the existence of commits or test scripts.
7. Review every entry for factual accuracy and obtain guide authentication through the legitimate process.

## 9. End-of-period review template

- **Completed (verified):** [FILL FROM EVIDENCE]
- **Still unverified:** [FILL FROM EVIDENCE]
- **Guide feedback / required changes:** [FILL AFTER REVIEW]
- **Student signature and date:** [COMPLETE LEGITIMATELY]
- **Guide signature and date:** [COMPLETE LEGITIMATELY]

## 10. Source index

### Repository records

- Early prototype — `pulse-imaginarium`: https://github.com/Affan0786isOP/pulse-imaginarium
- Original repository — `PULSE`: https://github.com/Affan0786isOP/PULSE
- Second development line — `PULSE-2`: https://github.com/Affan0786isOP/PULSE-2
- Main later development line — `PULSE-2.1`: https://github.com/Affan0786isOP/PULSE-2.1
- Architecture experiment — `PULSE-3`: https://github.com/Affan0786isOP/PULSE-3
- Latest repository milestone included in this archive (recorded 2026-10-11): https://github.com/Affan0786isOP/PULSE-2.1/commit/2477d7e13dcb6debf2a770614f6cac591c8c3314

### NCSC guidance referenced in the source document

- NCSC Activity Guidebook 2026–27, Department of Science and Technology, Government of India. Verify the current official copy and applicable instructions before submission.
- NCSC programme guidelines on project-report content and logbook authentication. Verify current official URLs and local-stage requirements with the guide.

## 11. Change log for this AI-optimized file

- Converted from `PULSE_NCSC_Project_Logbook_Reconstructed_Draft.docx`.
- Structured repeated entry fields under consistent headings to support AI retrieval and editing.
- Added explicit machine-readable metadata, evidence-boundary instructions, unresolved items, and blank data-entry templates.
- No new research activities, participant data, findings, or signatures were added.
