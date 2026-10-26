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

### Decision: Dual-Surface Architecture (Desktop SPA + Mobile PWA)
- **Status:** Accepted
- **Context:** Mobile cognitive assessment requires specialized touch target sizing, viewport isolation, and PWA standalone capabilities, while desktop demands high-resolution telemetry dashboards and keyboard shortcuts.
- **Decision:** Implement a dual-surface structure with root desktop application in `/src` and a dedicated subproject in `/mobile`. Client-side routing in [`src/lib/deviceRouting.ts`](../src/lib/deviceRouting.ts) inspects device capabilities after load; Express redirects only when explicit routing flags request a surface.
- **Consequences:** Mobile components are maintained separately in `mobile/src/`, requiring coordinated updates when core shared protocols change.
- **Evidence:** [`src/lib/deviceRouting.ts`](../src/lib/deviceRouting.ts), [`mobile/vite.config.ts`](../mobile/vite.config.ts), [`package.json`](../package.json).

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

### Decision: Web Admin Surface Deprecation & Scoped CLI Operations
- **Status:** Accepted
- **Context:** Browser-facing `/admin` routes, login forms, and HTTP moderation endpoints presented an unnecessary external attack surface.
- **Decision:** Decommission and delete all web-facing admin UI pages, authentication contexts, and `/api/admin/*` endpoints. Restrict administrative moderation (soft-hide, unhide, purge) exclusively to server CLI operator scripts running directly with `FIREBASE_SERVICE_ACCOUNT` credentials.
- **Consequences:** Minimizes attack surface and eliminates admin passcode session management from client/server HTTP routing.
- **Evidence:** [`docs/breach-runbook.md`](../docs/breach-runbook.md), [`docs/specs/LEADERBOARD_PROVENANCE.md`](../docs/specs/LEADERBOARD_PROVENANCE.md).


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
