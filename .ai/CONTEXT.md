# PULSE AI System Context Snapshot

> **Quick Navigation:**  
> - Specification: [`docs/PROJECT_SPEC.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/docs/PROJECT_SPEC.md)  
> - Architecture: [`docs/ARCHITECTURE.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/docs/ARCHITECTURE.md)  
> - Data Model: [`docs/DATA_MODEL.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/docs/DATA_MODEL.md)  
> - Security Model: [`docs/SECURITY.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/docs/SECURITY.md)  
> - Design System: [`docs/DESIGN_SYSTEM.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/docs/DESIGN_SYSTEM.md)  
> - Development Guide: [`docs/DEVELOPMENT.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/docs/DEVELOPMENT.md)

---

## 1. What is PULSE?
**PULSE (Precision User Latency & Stimulus Evaluator)** is a web-based cognitive assessment platform, research data engine, and cryptographic latency benchmark suite. It measures motor response latency, executive function, attentional control, and working memory across demographic age cohorts with millisecond-level precision.

---

### Current Design Direction

PULSE is moving to a single light-first design across desktop and mobile, based on the updated home experience: white/light-blue surfaces (`#FFFFFF`, `#F4F9FF`, `#EAF3FD`), deep ink (`#090D1A`), and blue primary accent (`#0066FF`). Global theme initialization now forces `data-theme="light"`; old saved settings must not restore dark mode. Assessment stimulus colors may use deliberate high-contrast states, but ordinary pages, cards, navigation, admin views, and modals must follow the light palette. Treat `docs/DESIGN_SYSTEM.md` as the design contract and verify both builds because desktop and mobile currently define common semantic tokens in separate stylesheet files.

## 2. Technology Stack
- **Frontend Core:** React 19.x, TypeScript 5.8.x, Vite 6.x, React Router DOM 7.x (see `package.json` for declared ranges and `package-lock.json` for resolved versions).
- **Styling & Motion:** Tailwind CSS 4.x (with `@tailwindcss/vite`), `motion/react` 12.x, Lucide React icons (see package manifest/lockfile for exact versions).
- **Data Visualization:** Recharts 3.x, Visx 4.x alpha modules, and D3 modules (`d3-array`, `d3-scale`, `d3-shape`, `d3-sankey`).
- **Backend / API:** Express 4.21.2 on Node.js (via `tsx` in dev, `esbuild` bundled in prod), `express-rate-limit`.
- **Database & Auth:** Firebase Web SDK 12.x (client reads + anonymous auth), Firebase Admin SDK 14.x (server-authoritative writes and HMAC verification); consult the lockfile for resolved versions.
- **Target Surfaces:** Dual-surface application architecture:
  - Desktop SPA: `src/` (root Vite instance on port 3000)
  - Mobile PWA: `mobile/` (sub-Vite instance with dedicated manifest and touch-optimized components)

---

## 3. High-Level Architecture & Data Flow

```
[Browser Client] (React 19 / Vite / PWA)
       │
       │ 1. Start Session: POST /api/research/session/start
       │ 2. Execute Assessment Protocol (performance.now())
       │ 3. Submit Observations: POST /api/research/submit or /api/leaderboard/submit
       ▼
[Express Server] (server/ / Node.js)
       │
       │ 1. Validate Timestamps & Physiological Bounds (RT >= 80ms)
       │ 2. Calculate Derived Metrics (Mean, Median, Interference, Span)
       │ 3. Sign Payload with HMAC-SHA256 (PULSE_PROVENANCE_SECRET)
       ▼
[Firebase Firestore] (Admin SDK)
       ├── assessmentTrials (5-year policy target; pseudonymous UID-scoped)
       ├── assessmentResults (5-year policy target; derived metrics)
       ├── publicDataset (indefinite policy target; sanitized research records)
       ├── leaderboardResults (2-year policy target; voluntary alias)
       └── adminAuditLogs (7-year policy target; moderation log)
```

**Retention enforcement caveat:** `security/retention.md` records policy targets, not proof of automatic enforcement. At the audited source revision, `firebase.json` only configures Firestore rules and indexes; no checked-in TTL configuration or purge scheduler was found. The session service enforces an application-level expiry but does not itself delete expired records. Deployed cloud configuration has not been verified; do not claim automatic deletion or legal compliance until it is checked.

---

## 4. Key Directory Map
```
/
├── src/                      # Desktop React Application
│   ├── components/           # UI Components & Assessment Protocols
│   │   ├── admin/            # Admin dashboard, moderation, export audit
│   │   ├── brand/            # Unified logo, reticle, telemetry cards
│   │   └── dataset/          # Research dataset explorer subcomponents
│   ├── lib/                  # State stores, Firebase client, timing utilities
│   │   └── dataset/          # Data normalization pipeline & React hooks
│   └── styles/               # CSS variables & aesthetic rules
├── mobile/                   # Mobile PWA Subproject (Dedicated Vite config)
│   └── src/                  # Mobile-tailored screens and touch layouts
├── security/                 # Retention policy targets, data map, processor inventories
├── shared/                   # Cross-surface contracts, registries, and domain logic
├── docs/                     # Full project documentation suite
│   ├── specs/                # Deep technical specifications
│   └── decisions/            # Architecture Decision Records (ADRs)
├── .ai/                      # AI agent rules, context snapshot, decisions
├── server.ts                 # Thin entry point (re-exports server/index.ts)
└── server/                   # Express API: config, middleware, routes, services, engines
```

---

## 5. Security & Trust Invariants
- **Client writes are rejected:** `firestore.rules` enforces `allow write: if false` on all canonical collections. All mutations must occur via `server.ts`.
- **Zero PII in open dataset:** Public records omit user IDs, session IDs, emails, and exact timestamps (aggregated to `completedAtMonth` YYYY-MM).
- **Admin authentication:** Restricted via `ADMIN_PASSCODE` verified server-side with session-bound HMAC tokens and IP rate limiting.

---

## 6. Important Files Before Editing
- **Timing & Validation:** [`src/lib/protocolValidators.ts`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/src/lib/protocolValidators.ts)
- **Client Firestore API:** [`src/lib/firestore.ts`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/src/lib/firestore.ts)
- **Server API & Provenance:** [`server.ts`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/server.ts)
- **Design Tokens:** [`docs/DESIGN_SYSTEM.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/docs/DESIGN_SYSTEM.md), [`src/brand/tokens.css`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/src/brand/tokens.css), and [`src/styles/pulse-aesthetic.css`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/src/styles/pulse-aesthetic.css); verify the actual CSS cascade before changing tokens.
- **Shared Contracts:** `shared/contracts/`, `shared/registries/`, and `shared/domain/` define cross-surface types and registries; inspect them before duplicating or changing protocol/route definitions.
