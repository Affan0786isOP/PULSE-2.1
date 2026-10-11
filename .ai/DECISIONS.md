# PULSE Architectural Decisions Ledger

This file records verified architectural and engineering decisions established in the codebase.

---

### Decision: Light-First Shared Visual Identity
- **Status:** Accepted
- **Context:** The updated PULSE home experience establishes a clear, accessible light visual language. Supporting a dark-only global theme now conflicts with the chosen product direction and creates inconsistent page styling.
- **Decision:** Apply the light-first design across desktop and mobile: `#FFFFFF`/`#F4F9FF`/`#EAF3FD` surfaces, `#090D1A` primary text, and `#0066FF` primary accent. Theme initialization, application settings, semantic tokens, PWA browser chrome, logo defaults, and all screen-specific styling must agree. Do not keep a dark theme toggle unless product requirements explicitly change.
- **Consequences:** CSS and component updates must cover both `src/` and `mobile/src/`. Assessment stimulus states can use deliberate contrast for measurement, but ordinary page and admin surfaces remain light. Run visual checks on representative desktop and mobile routes.
- **Evidence:** [`src/lib/settingsStore.ts`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/src/lib/settingsStore.ts), [`mobile/src/lib/settingsStore.ts`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/mobile/src/lib/settingsStore.ts), [`docs/DESIGN_SYSTEM.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/docs/DESIGN_SYSTEM.md).

---

### Decision: Server-Authoritative Cryptographic Provenance
- **Status:** Accepted
- **Context:** Cognitive assessment benchmarks and public research datasets are vulnerable to fabricated results and metric injection when clients write directly to the database.
- **Decision:** All database mutations are routed through `server.ts` with Firebase Admin SDK. The server validates protocol-specific physiological thresholds (including the 80 ms reaction-time floor), checks chronological timestamp ordering, and signs applicable result/dataset payloads with an HMAC-SHA256 token generated with `PULSE_PROVENANCE_SECRET`. Direct client writes in `firestore.rules` are set to `allow write: if false`.
- **Consequences:** Client apps cannot modify Firestore directly. Network connectivity to the Express server is required for persisting assessment results and leaderboard submissions.
- **Evidence:** [`server.ts`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/server.ts), [`firestore.rules`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/firestore.rules), [`security_spec.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/security_spec.md).

---

### Decision: Dual-Surface Architecture (Desktop SPA + Mobile PWA)
- **Status:** Accepted
- **Context:** Mobile cognitive assessment requires specialized touch target sizing, viewport isolation, and PWA standalone capabilities, while desktop demands high-resolution telemetry dashboards and keyboard shortcuts.
- **Decision:** Implement a dual-surface structure with root desktop application in `/src` and a dedicated subproject in `/mobile`. Automated device routing in [`src/lib/deviceRouting.ts`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/src/lib/deviceRouting.ts) and Express server redirect mobile devices to `/mobile/`.
- **Consequences:** Mobile components are maintained separately in `mobile/src/`, requiring coordinated updates when core shared protocols change.
- **Evidence:** [`src/lib/deviceRouting.ts`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/src/lib/deviceRouting.ts), [`mobile/vite.config.ts`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/mobile/vite.config.ts), [`package.json`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/package.json).

---

### Decision: Privacy-Oriented Anonymous Participant Model
- **Status:** Accepted
- **Context:** Minimize direct identity collection in cognitive-assessment telemetry. This architecture supports privacy-by-design goals but does not, by itself, establish compliance with GDPR, the FTC Health Breach Notification Rule, Washington My Health My Data Act, or other laws; legal and operational controls require separate review.
- **Decision:** Require zero user email addresses or passwords. Use Firebase Anonymous Authentication for all participant sessions. Aggregate open scientific datasets to broad demographic age cohorts and coarse temporal months (`YYYY-MM`), with zero UIDs or IP addresses in `publicDataset`.
- **Consequences:** User data is tied to browser instance anonymous tokens. Leaderboard participation is strictly opt-in with self-declared aliases.
- **Evidence:** [`security/retention.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/security/retention.md), [`security/data-map.yaml`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/security/data-map.yaml), [`src/lib/protocolValidators.ts`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/src/lib/protocolValidators.ts).

---

### Decision: High-Precision Hardware-Aware Timing
- **Status:** Accepted
- **Context:** Standard web timing using `Date.now()` and uncalibrated frame loops introduces jitter and display latency artifacts.
- **Decision:** Stimulus presentation and response timestamps are captured using `performance.now()`. Browser frame cadence is estimated via `requestAnimationFrame` sampling (`refreshRateDetector.ts`). `displayDelayOffsetMs` is a model-derived frame-midpoint estimate, not a direct photodiode or physical display measurement.
- **Consequences:** The Performance API provides high-resolution monotonic timestamps. Effective end-to-end measurement accuracy depends on browser scheduling, display refresh and scan-out, input hardware, and operating conditions; hardware-independent or laboratory-grade accuracy has not been established by the source code alone.
- **Evidence:** [`src/lib/refreshRateDetector.ts`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/src/lib/refreshRateDetector.ts), [`src/components/ReactionTest.tsx`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/src/components/ReactionTest.tsx).
