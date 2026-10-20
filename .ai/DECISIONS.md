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

### Decision: High-Precision Hardware-Aware Timing
- **Status:** Accepted
- **Context:** Standard web timing using `Date.now()` and uncalibrated frame loops introduces jitter and display latency artifacts.
- **Decision:** Stimulus presentation and response timestamps are captured using `performance.now()`. Display refresh rates are detected dynamically via `requestAnimationFrame` sampling (`refreshRateDetector.ts`) to calculate hardware frame presentation delays.
- **Consequences:** Sub-millisecond timing resolution is preserved across supported hardware configurations.
- **Evidence:** [`src/lib/refreshRateDetector.ts`](../src/lib/refreshRateDetector.ts), [`src/components/ReactionTest.tsx`](../src/components/ReactionTest.tsx).

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
- **Decision:** Implement a user-controlled theme system via settingsStore.ts and useSystemTheme.ts persisting to localStorage and pulse_settings cookies. Theme changes leverage the CSS View Transitions API (startViewTransition) to animate an outward circular radial reveal centered on the user's click position. Routes specified in 
outeTheme.ts (/reaction-test, /direction-test, /block-memory, etc.) are designated protected dark apparatuses and locked to dark mode regardless of global theme preference.
- **Consequences:** Theme switching is fluid and accessible (bypassed when prefers-reduced-motion is active); assessment accuracy is shielded from ambient luminance shifts.
- **Evidence:** [src/lib/useSystemTheme.ts](../src/lib/useSystemTheme.ts), [src/lib/routeTheme.ts](../src/lib/routeTheme.ts), [src/lib/settingsStore.ts](../src/lib/settingsStore.ts), [	ests/unit/desktopThemeSystem.test.tsx](../tests/unit/desktopThemeSystem.test.tsx), [	ests/unit/mobileThemeSystem.test.tsx](../tests/unit/mobileThemeSystem.test.tsx).
