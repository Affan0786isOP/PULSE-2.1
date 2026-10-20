# PULSE AI System Context Snapshot

> **Quick Navigation:**  
> - Specification: [`docs/PROJECT_SPEC.md`](../docs/PROJECT_SPEC.md)  
> - Architecture: [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)  
> - Data Model: [`docs/DATA_MODEL.md`](../docs/DATA_MODEL.md)  
> - Security Model: [`docs/SECURITY.md`](../docs/SECURITY.md)  
> - Design System: [`docs/DESIGN_SYSTEM.md`](../docs/DESIGN_SYSTEM.md)  
> - Development Guide: [`docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md)

---

## 1. What is PULSE?
**PULSE (Precision User Latency & Stimulus Evaluator)** is a web-based cognitive assessment platform, research data engine, and cryptographic latency benchmark suite. It measures motor response latency, executive function, attentional control, and working memory across demographic age cohorts with millisecond-level precision.

---

## 2. Technology Stack
- **Frontend Core:** React 19.0.1, TypeScript 5.8.2, Vite 6.2.3, React Router DOM 7.18.2.
- **Styling & Motion:** Tailwind CSS 4.1.14 (with `@tailwindcss/vite`), `motion/react` 12.23.24, Lucide React icons.
- **Data Visualization:** Recharts 3.10.1.
- **Backend / API:** Express 4.21.2 on Node.js (via `tsx` in dev, `esbuild` bundled in prod), `express-rate-limit`.
- **Database & Auth:** Firebase Web SDK 12.17.1 (client, anonymous auth + read-only Firestore), Firebase Admin SDK 14.3.0 (server-authoritative writes and HMAC verification).
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
       ├── assessmentTrials (5-yr retention, pseudonymous UID-scoped)
       ├── assessmentResults (5-yr retention, derived metrics)
       ├── publicDataset (Indefinite, fully anonymized, open research)
       ├── leaderboardResults (voluntary public alias; no automated expiry found in reviewed code)
       └── adminAuditLogs (7-yr retention, immutable moderation log)
```

---

## 4. Key Directory Map
```
/
├── src/                      # Desktop React Application
│   ├── components/           # UI Components & Assessment Protocols
│   │   ├── brand/            # Unified logo, reticle, telemetry cards
│   │   ├── dataset/          # Research dataset explorer subcomponents
│   │   └── home/             # Homepage views, 3D assessment carousel
│   ├── lib/                  # State stores, Firebase client, timing utilities
│   │   └── dataset/          # Data normalization pipeline & React hooks
│   └── styles/               # CSS variables & aesthetic rules
├── mobile/                   # Mobile PWA Subproject (Dedicated Vite config)
│   └── src/                  # Mobile-tailored screens and touch layouts
├── security/                 # Retention policies, data maps, processor inventories
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
- **Administrative operations:** Web admin routes and UI have been audited and removed to minimize attack surface. Moderation actions are executed directly via server CLI scripts utilizing Firebase Admin credentials (`FIREBASE_SERVICE_ACCOUNT`).

---

## 6. Important Files Before Editing
- **Timing & Validation:** [`src/lib/protocolValidators.ts`](../src/lib/protocolValidators.ts)
- **Client Firestore API:** [`src/lib/firestore.ts`](../src/lib/firestore.ts)
- **Server API & Provenance:** [`server.ts`](../server.ts)
- **Design Tokens:** [`src/DESIGN_SYSTEM.md`](../src/DESIGN_SYSTEM.md) and [`src/styles/pulse-aesthetic.css`](../src/styles/pulse-aesthetic.css)
