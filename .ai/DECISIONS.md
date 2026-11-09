# PULSE Architectural Decisions Ledger

This file records verified architectural and engineering decisions established in the codebase.

---

### Decision: Server-Authoritative Cryptographic Provenance
- **Status:** Accepted
- **Context:** Cognitive assessment benchmarks and public research datasets are vulnerable to fabricated results and metric injection when clients write directly to the database.
- **Decision:** All database mutations are routed through `server.ts` with Firebase Admin SDK. The server verifies physiological thresholds ($RT \ge 80\text{ms}$), sequential monotonic timing, and signs the resulting dataset record with an HMAC-SHA256 token generated with `PULSE_PROVENANCE_SECRET`. Direct client writes in `firestore.rules` are set to `allow write: if false`.
- **Consequences:** Client apps cannot modify Firestore directly. Network connectivity to the Express server is required for persisting assessment results and leaderboard submissions.
- **Evidence:** [`server.ts`](../server.ts), [`firestore.rules`](../firestore.rules), [`security_spec.md`](../security_spec.md).

---

### Decision: Unified Responsive Routing & Surface Encapsulation (Supersedes Dual-Surface URL Routing)
- **Status:** Accepted (v2.2.0)
- **Context:** Separate `/` (desktop) and `/mobile/` (mobile) URL paths introduced SEO fragmentation, broken link sharing across devices, and redirect flashes.
- **Decision:**
  1. Unify all top-level routes (`/`, `/assessments`, `/leaderboard`, etc.) onto single canonical URLs.
  2. Implement `useViewportSurface` in `src/App.tsx` to conditionally render `<DesktopApp />` or `<MobileAppWrapper />` at the 768px breakpoint.
  3. Queue surface changes safely during active or acquiring assessment runs via `assessmentLockStore` so screen resizing or device rotation never aborts a test in progress.
  4. Extract common locks, navigation guards, settings stores, and PWA bridges into `@shared/`.
- **Consequences:** Eliminates `/mobile/` path redirects, standardizes canonical URLs, and centralizes cross-surface guards.
- **Evidence:** [`src/App.tsx`](../src/App.tsx), [`src/hooks/useViewportSurface.ts`](../src/hooks/useViewportSurface.ts), [`shared/assessment/assessmentLockStore.ts`](../shared/assessment/assessmentLockStore.ts), [`docs/decisions/ADR-004-UNIFIED-RESPONSIVE-ROUTING.md`](../docs/decisions/ADR-004-UNIFIED-RESPONSIVE-ROUTING.md).

---

### Decision: Zero-PII Anonymous Participant Model
- **Status:** Accepted
- **Context:** Compliance with GDPR (Art. 5/17), FTC Health Breach Notification Rule, and Washington My Health My Data Act (RCW 19.373) for cognitive and health telemetry.
- **Decision:** Require zero user email addresses or passwords. Use Firebase Anonymous Authentication for all participant sessions. Aggregate open scientific datasets to broad demographic age cohorts and coarse temporal months (`YYYY-MM`), with zero UIDs or IP addresses in `publicDataset`.
- **Consequences:** User data is tied to browser instance anonymous tokens. Leaderboard participation is strictly opt-in with self-declared aliases.
- **Evidence:** [`security/retention.md`](../security/retention.md), [`security/data-map.yaml`](../security/data-map.yaml), [`src/lib/protocolValidators.ts`](../src/lib/protocolValidators.ts).

---

### Decision: Assessment Pacing Standardization & Unadjusted Latency Scoring
- **Status:** Accepted (v1.1.0)
- **Context:** Dynamic client-side display refresh rate detection (`requestAnimationFrame` frequency counting) and theoretical half-frame offset subtraction (`displayDelayOffsetMs`) introduced cross-device scoring discrepancies, fragile calibration loops, and unnecessary client-server coupling.
- **Decision:**
  1. Standardize desktop and mobile live-timer assessment loops to an average ~60 updates per second software pacing cadence via the shared `@shared/timing/framePacer.ts` helper.
  2. Permanently delete `refreshRateDetector.ts` and `useRefreshRate.ts` from desktop and mobile. Remove display calibration UI and recalibration handlers from `SettingsModal.tsx`.
  3. Adopt unadjusted browser-measured stimulus-to-response latency ($RT_{\text{net}} = RT_{\text{raw}}$ rounded to two decimal places) for `visual-reaction`, `direction`, and `color-recognition`, bumping their `protocolVersion` and `metricsVersion` to `v1.1.0`. Memory assessments remain at `v1.0.0`.
  4. New observations set legacy `displayDelayOffset*` fields to `null`. Canonical provenance normalization in `provenanceService.ts` preserves deterministic digests for both historical records and new submissions.
- **Consequences:** Eliminates hardware-dependent half-frame latency subtraction and active screen cadence telemetry while maintaining 100% backward compatibility for canonical provenance digests and historical research datasets.
- **Evidence:** [`shared/timing/framePacer.ts`](../shared/timing/framePacer.ts), [`shared/contracts/common.ts`](../shared/contracts/common.ts), [`src/components/ReactionTest.tsx`](../src/components/ReactionTest.tsx), [`tests/unit/framePacer.test.ts`](../tests/unit/framePacer.test.ts).

---

### Decision: Canonical Navbar Unification & Active Test Safety
- **Status:** Accepted
- **Context:** Fragmented headers across pages led to inconsistent navigation styling, modal churn, and accidental navigation during live cognitive assessments.
- **Decision:** Unify all desktop and shared navigation into `src/components/Navbar.tsx` with explicit light theme defaults, dark mode support for assessment test viewports, and strict active-assessment lockouts (blocking route links and modal triggers while tests are underway).
- **Consequences:** Single source of truth for global navigation and accessibility (focus cycling, backdrop dismissal, inert background isolation).
- **Evidence:** [`src/components/Navbar.tsx`](../src/components/Navbar.tsx), [`tests/unit/navbarComponent.test.tsx`](../tests/unit/navbarComponent.test.tsx).

---

### Decision: Web Admin Surface Deprecation (Superseded 2026-11-06)
- **Status:** Superseded
- **Historical context:** The web admin surface was decommissioned at the time this decision was recorded because browser-facing moderation endpoints were considered unnecessary attack surface.
- **Historical decision:** Moderation was temporarily restricted to operator-controlled server CLI scripts using Firebase Admin credentials.
- **Supersession:** The desktop `/admin` console and protected `/api/admin/*` routes were restored on 2026-11-06. The original decommissioning rationale remains relevant as a security constraint: every protected API operation must enforce server-side signed-session authorization, no-store responses, rate limiting, and auditability. The mobile router still does not expose `/admin`.
- **Evidence:** [`src/App.tsx`](../src/App.tsx), [`server/routes/adminRoutes.ts`](../server/routes/adminRoutes.ts), [`server/middleware/adminAuth.ts`](../server/middleware/adminAuth.ts), [`server/config/rateLimits.ts`](../server/config/rateLimits.ts).


---

### Decision: Dual-Tier Theme Architecture with Radial Transitions & Dark Apparatus Protection
- **Status:** Accepted
- **Context:** Cognitive research apparatuses require stable, high-contrast dark visual backgrounds to prevent pupil constriction and luminance glare during millisecond reaction benchmarks, while landing, about, and exploration pages benefit from user-selectable light, dark, and system themes.
- **Decision:** Implement a user-controlled theme system via settingsStore.ts and useSystemTheme.ts persisting to localStorage and pulse_settings cookies. Theme changes leverage the CSS View Transitions API (startViewTransition) to animate an outward circular radial reveal centered on the user's click position. Routes specified in `routeTheme.ts` (/reaction-test, /direction-test, /block-memory, etc.) are designated protected dark apparatuses and locked to dark mode regardless of global theme preference.
- **Consequences:** Theme switching is fluid and accessible (bypassed when prefers-reduced-motion is active); assessment accuracy is shielded from ambient luminance shifts.
- **Evidence:** [src/lib/useSystemTheme.ts](../src/lib/useSystemTheme.ts), [src/lib/routeTheme.ts](../src/lib/routeTheme.ts), [src/lib/settingsStore.ts](../src/lib/settingsStore.ts), [`tests/unit/desktopThemeSystem.test.tsx`](../tests/unit/desktopThemeSystem.test.tsx), [`tests/unit/mobileThemeSystem.test.tsx`](../tests/unit/mobileThemeSystem.test.tsx).

---

### Decision: Homepage Narrative Architecture & Mobile Token Parity
- **Status:** Accepted
- **Context:** The original single-viewport homepage lacked comprehensive explanation of PULSE's client-side measurement pipeline, protocol discovery, latency calibration, and privacy practices.
- **Decision:** Implement product narrative architecture across both Desktop and Mobile while strictly preserving existing live heroes:
  - **Desktop (`src/components/home/`):** 10-part product narrative (`Hero → Proof → Assessments → Problem → Result → Why PULSE → How It Works → FAQ → Final CTA → Footer`) using Tailwind `dark:` utilities and `DesktopAssessmentCarousel`.
  - **Mobile (`mobile/src/components/home/`):** 8 concise scenes (`MobileProofScene`, `MobileAssessmentsScene` with native CSS scroll-snap `MobileAssessmentSwipeStrip`, `MobileResultScene`, `MobileWhyPulseScene`, `MobileProblemScene`, `MobileFAQScene`, `MobileFinalCTAScene`, `MobileHomeFooter`) rendered in `<main id="main-content">` below an untouched `MobileHero`.
  - **Ambient Wave Extension:** `MobileHeroWaveContinuation` extends the hero's cyan/electric-blue SVG wave into the top narrative scenes behind cards (`pointer-events-none -z-0 aria-hidden="true"`).
  - **Styling Invariant:** Newly authored mobile narrative components strictly enforce mobile CSS tokens (`var(--surface-1)`, `var(--surface-2)`, `var(--accent)`, `var(--text-primary)`, `var(--text-secondary)`) with zero desktop `dark:` utility bleed and zero desktop cross-imports.
- **Consequences:** Provides comprehensive product understanding and objection handling without disturbing existing live hero conversion metrics.
- **Evidence:** [`src/components/Home.tsx`](../src/components/Home.tsx), [`mobile/src/components/Home.tsx`](../mobile/src/components/Home.tsx), [`tests/unit/mobile_homepage_narrative.test.tsx`](../tests/unit/mobile_homepage_narrative.test.tsx), [`tests/e2e/mobile-homepage-narrative.spec.ts`](../tests/e2e/mobile-homepage-narrative.spec.ts), [`shared/homepage/assessmentPresentation.ts`](../shared/homepage/assessmentPresentation.ts).

---

### Decision: Targeted Server-Authoritative Telegram Activity Observability
- **Status:** Accepted
- **Context:** Real-time production observability of user engagement and assessment completions was needed across both Desktop and Mobile without compromising participant privacy or cognitive timing precision.
- **Decision:** Implement low-noise targeted operational telemetry streaming to dedicated topics in a Telegram Forum Supergroup (`TELEGRAM_TOPIC_VISITS`, `TELEGRAM_TOPIC_RESULTS`, `TELEGRAM_TOPIC_LEADERBOARD`). Page views are restricted strictly to four allowlisted routes (`/`, `/about`, `/assessments`, `/leaderboard`) using a pseudonymous, opt-out-capable browser-profile ID (`dev_uuid`). Assessment and leaderboard alerts are enqueued strictly server-side from canonical committed records after database writes succeed. Outbound sends are paced by a global chat rate-limiter (~18 msgs/min) with a durable outbox.
- **Consequences:** Provides instant operational visibility with zero client-side PII leakage and zero latency overhead on millisecond cognitive tests.
- **Evidence:** [`shared/types/telemetry.ts`](../shared/types/telemetry.ts), [`server/services/telegramNotifierService.ts`](../server/services/telegramNotifierService.ts), [`server/routes/telemetryRoutes.ts`](../server/routes/telemetryRoutes.ts).

---

### Decision: Interactive Research Dataset Explorer & 720p Baseline Aspect Scaling
- **Status:** Accepted (v2.6.0)
- **Context:** The public open-science cognitive dataset previously existed only as an upcoming placeholder screen (`DatasetComingSoon.tsx`), lacking interactive inspection of anonymous response time distributions and cohort metadata. Furthermore, scaling across varying laptop/desktop resolutions (1080p, 1440p, 4K) often produced divergent layouts and stretched card geometries when unanchored to a canonical aspect ratio.
- **Decision:**
  1. Port and integrate full interactive Dataset Explorer into `src/components/Dataset.tsx` and `mobile/src/components/Dataset.tsx`, connecting to the live server `/api/dataset` and Firestore `publicDataset` endpoints.
  2. Implement canonical 1280×720 baseline scaling on desktop using `useBaselineScale` (with breakpoint clamping at $768\text{px}$), ensuring higher resolution displays (FHD, QHD, 4K) scale uniformly to match 720p geometry while preserving vertical scrolling.
  3. Enforce dual-strategy dark/light theme support across both surfaces: mobile uses CSS variable tokens (`var(--surface-1)`, `var(--text-primary)`, `var(--border-subtle)`), while desktop uses Tailwind theme classes.
  4. Standardize desktop and mobile navigation headers on `/dataset` to match global navbar behavior, with dynamic brand mark switching (`#0066FF` in light mode, `var(--accent)` cyan in dark mode).
- **Consequences:** Researchers and participants can explore, filter, and inspect cognitive benchmark distributions interactively. Visual geometry remains mathematically consistent across desktop monitor tiers.
- **Evidence:** [`src/components/Dataset.tsx`](../src/components/Dataset.tsx), [`mobile/src/components/Dataset.tsx`](../mobile/src/components/Dataset.tsx), [`src/lib/useBaselineScale.ts`](../src/lib/useBaselineScale.ts), [`src/components/Navbar.tsx`](../src/components/Navbar.tsx), [`docs/specs/DATASET_PIPELINE.md`](../docs/specs/DATASET_PIPELINE.md).
---

### Decision: Comprehensive Multi-Agent Bug Remediation & Security Hardening
- **Status:** Accepted (v2.6.1)
- **Context:** An independent multi-hunter and skeptic audit identified 43 confirmed defects spanning edge routing, serverless Telegram outbox queuing, race conditions in leaderboard deduplication, unverified rate limit client claims, service worker takeover races, and missing test abort lifecycles.
- **Decision:**
  1. Hardened edge routing and static delivery: blocked `/server.js` at the edge in `vercel.json`, eliminated unhandled `ERR_HTTP_HEADERS_SENT` crashes in static route error handling, and served prerendered SEO pages for clean URLs.
  2. Bounded and resilient telemetry: replaced unbounded in-memory outbox in `telegramNotifierService.ts` with an LRU queue capped at 200 items, exponential retry backoff, and an explicit asynchronous `flush()` hook for serverless environments.
  3. Concurrency-safe participant erasure: guarded `dedupeLeaderboardBestPerOwner.ts` by checking `indexSnap.data()?.deleting === true` within transactional reads (`tx.get`) to prevent resurrection of erased profiles.
  4. Replay and protocol contracts: returned HTTP 200 replay receipts for consumed sessions via typed `SessionAlreadyConsumedError`, enforced protocol-specific trial ceilings (`visual-reaction`: 30, `direction`: 30, `color-recognition`: 40, `memory`: 105), and added required `targetDirection` to mobile flanker false-start payloads.
  5. Standardized Abort-on-Interrupt and SW lifecycle: coordinated `setServiceWorkerActiveSession(true/false)` across all 5 test engines on desktop and mobile, standardizing test interruption cleanup.
- **Consequences:** Eliminates critical edge security leaks, prevents serverless outbox memory bloat, ensures transactional data integrity, and unifies cognitive engine test lifecycles.
- **Evidence:** [`server/services/telegramNotifierService.ts`](../server/services/telegramNotifierService.ts), [`scripts/dedupeLeaderboardBestPerOwner.ts`](../scripts/dedupeLeaderboardBestPerOwner.ts), [`server/engines/assessmentEngine.ts`](../server/engines/assessmentEngine.ts), [`vercel.json`](../vercel.json).


### Decision: Documentation Audit & Synchronization Baseline (2026-11-03)
- **Status:** Accepted
- **Context:** Documentation drift had accumulated across runtime requirements, dual-surface build steps, protocol QA instructions, agent toolchain guidance, and statements about the admin route surface.
- **Decision:** Keep package metadata as the source of truth for Node/npm/tool versions; document the production desktop + mobile + SEO generation build sequence; remove obsolete refresh-rate calibration QA expectations; distinguish route presence from authorization and backend access; and record documentation verification as a source-backed task rather than asserting unverified behavior.
- **Consequences:** Future documentation updates should inspect `package.json`, both application routers, the relevant admin component and server route registrations before making claims about runtime requirements, feature availability, or administrative access.
- **Evidence:** [package.json](../package.json), [src/App.tsx](../src/App.tsx), [mobile/src/App.tsx](../mobile/src/App.tsx), [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md), [docs/TESTING.md](../docs/TESTING.md).


### Decision: Restored Authenticated Web Administration (2026-11-06)
- **Status:** Accepted
- **Context:** Staff needed a browser-accessible surface for leaderboard moderation and Dataset aggregate maintenance, while preserving the server-side authorization boundary.
- **Decision:** Restore the desktop `/admin` console and protected `/api/admin/*` routes. Keep `ADMIN_PASSCODE` and `PULSE_ADMIN_SESSION_SECRET` server-only; issue signed, time-bounded session tokens, check revocation nonces in `adminSessionRevocations`, and revoke the nonce on logout. Apply no-store headers to admin responses and rate-limit login and mutation operations. Keep CLI scripts as a trusted maintenance/recovery path. The mobile route table does not expose `/admin`.
- **Consequences:** Admin capabilities are available through the desktop console without making Firestore directly writable by clients or exposing credentials in the browser bundle. Each API route remains independently protected; an exposed page route does not itself confer authorization.
- **Evidence:** [`src/App.tsx`](../src/App.tsx), [`src/components/admin/AdminPage.tsx`](../src/components/admin/AdminPage.tsx), [`server/routes/adminRoutes.ts`](../server/routes/adminRoutes.ts), [`server/middleware/adminAuth.ts`](../server/middleware/adminAuth.ts), [`firestore.rules`](../firestore.rules).

---

### Decision: Repository-Wide Typography Contract (2026-11-06)
- **Status:** Accepted
- **Context:** Font usage had drifted across desktop, mobile, chart components, brand assets, and generated Open Graph cards.
- **Decision:** Approve Inter, Space Grotesk, and JetBrains Mono only, with Google Fonts weights 400, 500, 600, and 700. Centralize family aliases in `src/brand/tokens.css` and enforce usage through `scripts/audit-typography.mjs`; wire the audit into npm test, check, and build scripts.
- **Consequences:** Typography changes must update shared tokens and pass the automated repository-wide audit; desktop/mobile parity is checked as part of routine verification.
- **Evidence:** [`src/brand/tokens.css`](../src/brand/tokens.css), [`scripts/audit-typography.mjs`](../scripts/audit-typography.mjs), [`package.json`](../package.json).

---

### Decision: Controlled Dataset Summary Maintenance (2026-11-05)
- **Status:** Accepted
- **Context:** Public Dataset summary reads previously fell back to scanning the entire `publicDataset` collection when the aggregate document was missing. Repeated public requests could therefore cause avoidable Firestore reads. The public Dataset also needed an explicit way to fetch fresh chart records without recalculating summary aggregates.
- **Decision:**
  1. Public summary requests read only `publicDatasetMeta/summary`; if it is absent or invalid, the API returns a reconciliation-required response and never scans the source collection.
  2. Successful research submissions keep the aggregate updated transactionally once the metadata document is initialized.
  3. The existing authenticated desktop `/admin` console exposes a protected status, dry-run, and explicitly confirmed rebuild action. Rebuild scans `publicDataset` under a migration lock and writes only `publicDatasetMeta/summary`.
  4. Public manual refresh refreshes detailed Dataset records and their aggregate metadata read; it never triggers reconciliation. The server enforces a two-minute refresh limit.
  5. The CLI remains available as an operator recovery path.
- **Consequences:** Normal public Dataset loads never recalculate aggregate statistics. Full-collection reconciliation is intentional, operator-controlled maintenance; research submissions are briefly paused during an apply run.
- **Evidence:** [`server/services/datasetSummaryReconciliation.ts`](../server/services/datasetSummaryReconciliation.ts), [`server/repositories/firestore/firestoreResearchDatasetRepository.ts`](../server/repositories/firestore/firestoreResearchDatasetRepository.ts), [`server/routes/adminRoutes.ts`](../server/routes/adminRoutes.ts), [`src/components/admin/DatasetSummaryMaintenancePanel.tsx`](../src/components/admin/DatasetSummaryMaintenancePanel.tsx), [`src/lib/dataset.ts`](../src/lib/dataset.ts).

---

### Decision: Dataset Explorer Telemetry Redesign — Trial Sequence Progression & Speed/Accuracy Split Card
- **Status:** Accepted (v2.7.0)
- **Context:** The Dataset Explorer previously displayed a single overall median RT trajectory without an accuracy counterpart, and the top-of-dashboard overview lacked visual pairing of Speed and Accuracy.
- **Decision:**
  1. Add a full-width **Trial Sequence Progression accuracy line chart** (Trials 1–10) alongside the existing population median RT curve in both Desktop (`src/components/Dataset.tsx`) and Mobile (`mobile/src/components/Dataset.tsx`) Dataset Explorers.
  2. Harden the trial-progression analytical engine against absent or sparse trial buckets (null-slot guard before index access).
  3. Refactor the top overview into a unified **split Speed/Accuracy performance card** replacing separate metric tiles.
  4. Split DirectionDataset's performance section into labelled sub-sections with clean section badges; add an interactive overlay view toggle on the 4-axis cardinal radar: `[ Accuracy % | Reaction Time | Both ]`.
  5. Synchronize `mobile/src/components/DirectionDataset.tsx` to match the full 5-row desktop telemetry layout.
- **Consequences:** Researchers can inspect RT and accuracy trial-progression trajectories side-by-side. The direction radar now supports three overlay modes. Mobile and desktop Dataset Explorers are in full architectural parity.
- **Evidence:** [`src/components/Dataset.tsx`](../src/components/Dataset.tsx), [`mobile/src/components/Dataset.tsx`](../mobile/src/components/Dataset.tsx), [`src/components/DirectionDataset.tsx`](../src/components/DirectionDataset.tsx), [`mobile/src/components/DirectionDataset.tsx`](../mobile/src/components/DirectionDataset.tsx), [`shared/dataset/analytics.ts`](../shared/dataset/analytics.ts).

---

### Decision: Uniform 720p Baseline Scaling Extended Platform-Wide via PageShell
- **Status:** Accepted (v2.7.0)
- **Context:** Baseline scaling was previously opt-in per route, requiring individual pages to pass a `scale` prop and creating drift when new routes were added without it.
- **Decision:** Centralize scaling activation in `PageShell` (`src/components/layout/PageShell.tsx`) as `shouldScale = !disableScaling`. All desktop routes wrapped by `PageShell` receive uniform 1280×720 baseline zoom by default. Routes with multi-row data tables or long-form content must pass `disableScaling` explicitly. Scaling safeguards (portal decoupling for modals, fluid overflow for tables) are codified in `.agent/rules/resolution-scaling-invariants.md`.
- **Consequences:** No per-route scaling boilerplate required. New desktop pages automatically receive the canonical geometry baseline. `disableScaling` is the documented escape hatch.
- **Evidence:** [`src/components/layout/PageShell.tsx`](../src/components/layout/PageShell.tsx), [`src/lib/useBaselineScale.ts`](../src/lib/useBaselineScale.ts), [`.agent/rules/resolution-scaling-invariants.md`](../.agent/rules/resolution-scaling-invariants.md), [`tests/unit/pageShell.test.tsx`](../tests/unit/pageShell.test.tsx).

---

### Decision: Eliminate In-Memory Idempotency Cache & Deduplicate Mobile Chart Library
- **Status:** Accepted (v2.7.0)
- **Context:** A process-local in-memory deduplication cache for research session submissions created cross-restart inconsistencies in Vercel serverless deployments (each invocation starts a fresh process). Additionally, `src/bklit-ui/` duplicated chart primitives from `mobile/src/bklit-ui/`, causing silent divergence over time.
- **Decision:**
  1. Remove the server-side in-memory idempotency/deduplication map. Session replay protection relies exclusively on Firestore-backed nonce revocation (`adminSessionRevocations`) and the consumed-session flag on the research session document.
  2. Remove `src/bklit-ui/` from the desktop build surface. The canonical chart primitive library lives exclusively in `mobile/src/bklit-ui/`. Desktop visualizations use Recharts and direct SVG/D3.
- **Consequences:** Session idempotency is now fully durable across serverless restarts. No dual-maintenance of chart primitives. Desktop imports from `src/bklit-ui/` will fail — do not reintroduce.
- **Evidence:** Commit `4a452b9`, [`server/engines/assessmentEngine.ts`](../server/engines/assessmentEngine.ts), [`mobile/src/bklit-ui/`](../mobile/src/bklit-ui/).

---

### Decision: Firestore Indexed Cursor Reads Replace Collection Scans
- **Status:** Accepted (v2.7.0)
- **Context:** Leaderboard and Dataset repository queries previously used full-collection reads or unindexed range queries, resulting in unbounded Firestore read costs and silent omission of historical rows missing optional fields.
- **Decision:** All leaderboard and Dataset repository reads page by document ID (`__name__`) or a declared Firestore composite index. Full-collection scans are prohibited outside admin-initiated reconciliation operations (which hold the migration lock and brief-pause submissions).
- **Consequences:** Read costs are proportional to result set size. Historical leaderboard rows missing `scoreMetric` or `createdAt` are not silently excluded. New collection queries must declare a composite index before shipping.
- **Evidence:** Commit `b2956b8`, [`server/repositories/firestore/firestoreLeaderboardRepository.ts`](../server/repositories/firestore/firestoreLeaderboardRepository.ts), [`server/repositories/firestore/firestoreResearchDatasetRepository.ts`](../server/repositories/firestore/firestoreResearchDatasetRepository.ts), [`firestore.indexes.json`](../firestore.indexes.json), [`tests/unit/serverRepositories.test.ts`](../tests/unit/serverRepositories.test.ts).
