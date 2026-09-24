# PULSE Architectural Decisions Ledger

This file records verified architectural and engineering decisions established in the codebase.

---

### Decision: Server-Authoritative Cryptographic Provenance
- **Status:** Accepted
- **Context:** Cognitive assessment benchmarks and public research datasets are vulnerable to fabricated results and metric injection when clients write directly to the database.
- **Decision:** All database mutations are routed through `server.ts` with Firebase Admin SDK. The server verifies physiological thresholds ($RT \ge 80\text{ms}$), sequential monotonic timing, and signs the resulting dataset record with an HMAC-SHA256 token generated with `PULSE_PROVENANCE_SECRET`. Direct client writes in `firestore.rules` are set to `allow write: if false`.
- **Consequences:** Client apps cannot modify Firestore directly. Network connectivity to the Express server is required for persisting assessment results and leaderboard submissions.
- **Evidence:** [`server.ts`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server.ts), [`firestore.rules`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/firestore.rules), [`security_spec.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/security_spec.md).

---

### Decision: Dual-Surface Architecture (Desktop SPA + Mobile PWA)
- **Status:** Accepted
- **Context:** Mobile cognitive assessment requires specialized touch target sizing, viewport isolation, and PWA standalone capabilities, while desktop demands high-resolution telemetry dashboards and keyboard shortcuts.
- **Decision:** Implement a dual-surface structure with root desktop application in `/src` and a dedicated subproject in `/mobile`. Automated device routing in [`src/lib/deviceRouting.ts`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/deviceRouting.ts) and Express server redirect mobile devices to `/mobile/`.
- **Consequences:** Mobile components are maintained separately in `mobile/src/`, requiring coordinated updates when core shared protocols change.
- **Evidence:** [`src/lib/deviceRouting.ts`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/deviceRouting.ts), [`mobile/vite.config.ts`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/mobile/vite.config.ts), [`package.json`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/package.json).

---

### Decision: Zero-PII Anonymous Participant Model
- **Status:** Accepted
- **Context:** Compliance with GDPR (Art. 5/17), FTC Health Breach Notification Rule, and Washington My Health My Data Act (RCW 19.373) for cognitive and health telemetry.
- **Decision:** Require zero user email addresses or passwords. Use Firebase Anonymous Authentication for all participant sessions. Aggregate open scientific datasets to broad demographic age cohorts and coarse temporal months (`YYYY-MM`), with zero UIDs or IP addresses in `publicDataset`.
- **Consequences:** User data is tied to browser instance anonymous tokens. Leaderboard participation is strictly opt-in with self-declared aliases.
- **Evidence:** [`security/retention.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/security/retention.md), [`security/data-map.yaml`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/security/data-map.yaml), [`src/lib/protocolValidators.ts`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/protocolValidators.ts).

---

### Decision: High-Precision Hardware-Aware Timing
- **Status:** Accepted
- **Context:** Standard web timing using `Date.now()` and uncalibrated frame loops introduces jitter and display latency artifacts.
- **Decision:** Stimulus presentation and response timestamps are captured using `performance.now()`. Display refresh rates are detected dynamically via `requestAnimationFrame` sampling (`refreshRateDetector.ts`) to calculate hardware frame presentation delays.
- **Consequences:** Sub-millisecond timing resolution is preserved across supported hardware configurations.
- **Evidence:** [`src/lib/refreshRateDetector.ts`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/refreshRateDetector.ts), [`src/components/ReactionTest.tsx`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/components/ReactionTest.tsx).
