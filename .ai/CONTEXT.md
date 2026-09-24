# PULSE AI System Context Snapshot

> **Quick Navigation:**  
> - Specification: [`docs/PROJECT_SPEC.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/PROJECT_SPEC.md)  
> - Architecture: [`docs/ARCHITECTURE.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/ARCHITECTURE.md)  
> - Data Model: [`docs/DATA_MODEL.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/DATA_MODEL.md)  
> - Security Model: [`docs/SECURITY.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/SECURITY.md)  
> - Design System: [`docs/DESIGN_SYSTEM.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/DESIGN_SYSTEM.md)  
> - Development Guide: [`docs/DEVELOPMENT.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/DEVELOPMENT.md)

---

## 1. What is PULSE?
**PULSE (Precision User Latency & Stimulus Evaluator)** is a web-based cognitive assessment platform, research data engine, and cryptographic latency benchmark suite. It measures motor response latency, executive function, attentional control, and working memory across demographic age cohorts with millisecond-level precision.

---

## 2. Technology Stack
- **Frontend Core:** React 19.0.1, TypeScript 5.8.2, Vite 6.2.3, React Router DOM 7.18.2.
- **Styling & Motion:** Tailwind CSS 4.1.14 (with `@tailwindcss/vite`), `motion/react` 12.23.24, Lucide React icons.
- **Data Visualization:** Recharts 3.10.1, Visx 4.0.1-alpha, D3 modules (`d3-array`, `d3-scale`, `d3-shape`, `d3-sankey`).
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
[Express Server] (server.ts / Node.js)
       │
       │ 1. Validate Timestamps & Physiological Bounds (RT >= 80ms)
       │ 2. Calculate Derived Metrics (Mean, Median, Interference, Span)
       │ 3. Sign Payload with HMAC-SHA256 (PULSE_PROVENANCE_SECRET)
       ▼
[Firebase Firestore] (Admin SDK)
       ├── assessmentTrials (5-yr retention, pseudonymous UID-scoped)
       ├── assessmentResults (5-yr retention, derived metrics)
       ├── publicDataset (Indefinite, fully anonymized, open research)
       ├── leaderboardResults (2-yr retention, voluntary alias)
       └── adminAuditLogs (7-yr retention, immutable moderation log)
```

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
├── security/                 # Retention policies, data maps, processor inventories
├── docs/                     # Full project documentation suite
│   ├── specs/                # Deep technical specifications
│   └── decisions/            # Architecture Decision Records (ADRs)
├── .ai/                      # AI agent rules, context snapshot, decisions
└── server.ts                 # Full-stack Express API, provenance engine & static server
```

---

## 5. Security & Trust Invariants
- **Client writes are rejected:** `firestore.rules` enforces `allow write: if false` on all canonical collections. All mutations must occur via `server.ts`.
- **Zero PII in open dataset:** Public records omit user IDs, session IDs, emails, and exact timestamps (aggregated to `completedAtMonth` YYYY-MM).
- **Admin authentication:** Restricted via `ADMIN_PASSCODE` verified server-side with session-bound HMAC tokens and IP rate limiting.

---

## 6. Important Files Before Editing
- **Timing & Validation:** [`src/lib/protocolValidators.ts`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/protocolValidators.ts)
- **Client Firestore API:** [`src/lib/firestore.ts`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/lib/firestore.ts)
- **Server API & Provenance:** [`server.ts`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/server.ts)
- **Design Tokens:** [`src/DESIGN_SYSTEM.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/DESIGN_SYSTEM.md) and [`src/styles/pulse-aesthetic.css`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/src/styles/pulse-aesthetic.css)
