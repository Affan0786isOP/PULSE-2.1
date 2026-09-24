# PULSE — Precision User Latency & Stimulus Evaluator

**PULSE** is a high-precision cognitive assessment platform, research data engine, and cryptographic latency benchmark suite designed for sub-millisecond visual reaction timing, executive function evaluation, and spatial memory analysis across demographic age cohorts.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js v20+ (v22 recommended)
- `npm` or `bun`

### 2. Install & Launch
```bash
# Clone the repository
git clone https://github.com/Affan0786isOP/PULSE-2.1.git
cd PULSE-2.1

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Launch full-stack development environment (Express + Vite on port 3000)
npm run dev
```

Visit [`http://localhost:3000`](http://localhost:3000) in your browser. Mobile viewports are automatically routed to [`http://localhost:3000/mobile/`](http://localhost:3000/mobile/).

---

## 🏛️ System Architecture & Technology Stack

PULSE operates as a dual-surface application connecting React 19 clients to an Express Node.js application server with Google Cloud Firestore and Firebase Authentication.

- **Frontend:** React 19.0, TypeScript 5.8, Vite 6.2, Tailwind CSS 4.1, Motion (`motion/react`), Lucide Icons.
- **Visualizations:** Visx, Recharts, D3.
- **Backend:** Express 4.21, `express-rate-limit`, Firebase Admin SDK.
- **Database & Auth:** Google Cloud Firestore (Server-authoritative writes), Firebase Anonymous Authentication.

---

## ⚡ Assessment Battery

1. **Visual Reaction Time (`/reaction-test`):** Sub-millisecond motor latency and anticipatory false start detection under randomized foreperiods ($100\text{ms} - 3000\text{ms}$).
2. **Direction Discriminability (`/direction-test`):** Eriksen Flanker selective attention task measuring inhibitory control and conflict cost.
3. **Color Recognition (`/colour-recognition`):** Stroop semantic interference test measuring cognitive flexibility.
4. **Spatial Block Memory (`/block-memory`):** Corsi block-tapping task measuring visuospatial working memory span.
5. **Number Memory (`/number-memory`):** Forward digit span test measuring verbal short-term memory capacity.

---

## 📊 Research Data & Leaderboard

- **Research Dataset Explorer (`/dataset`):** Interactive distribution curves, demographic age filters, and one-click CSV/JSON research exports.
- **Global Leaderboard (`/leaderboard`):** Top 100 rankings per assessment protocol backed by cryptographic HMAC-SHA256 provenance proofs.
- **Cognitive Optimization (`/improve`):** Evidence-based guides on sleep, circadian rhythms, and reaction time training.

---

## 🔐 Security & Privacy Summary

- **Server-Authoritative Writes:** Direct client database writes are denied by Firestore rules; all records are verified and signed server-side.
- **Zero PII Collected:** No email addresses, passwords, phone numbers, or IP addresses are stored in public datasets.
- **Physiological Floor:** Reaction latencies $< 80\text{ms}$ are flagged as anticipatory false starts.

---

## 🛠️ Verified Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Full-stack development server (Express + Vite) on port 3000 |
| `npm run build` | Builds desktop SPA bundle and bundles ESM Express server |
| `npm run dev:mobile` | Standalone mobile Vite dev server |
| `npm run build:mobile` | Builds mobile PWA bundle |
| `npm start` | Runs production server (`dist/server.js`) |
| `npm run lint` | Runs desktop TypeScript type check |
| `npm run check` | Dual-surface type check (Desktop + Mobile) |
| `npm test` | Runs Vitest unit tests |

---

## 📚 Detailed Documentation

- **[Product Specification](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/PROJECT_SPEC.md):** Complete product functionality, protocols, and implementation status.
- **[System Architecture](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/ARCHITECTURE.md):** Detailed topologies, sequence diagrams, and subsystem designs.
- **[Developer Guide](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/DEVELOPMENT.md):** Comprehensive setup, scripts, and debugging tips.
- **[Data Model & Schemas](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/DATA_MODEL.md):** Firestore collection schemas, types, and retention schedules.
- **[Security & Threat Model](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/SECURITY.md):** HMAC attestation, trust boundaries, and statutory compliance.
- **[Design System & Tokens](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/DESIGN_SYSTEM.md):** Color tokens, typography, and official brand assets.
- **[Testing & Verification](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/TESTING.md):** QA checklists and verification procedures.
- **[AI Agent Rules](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/.ai/RULES.md):** Strict guidelines for AI coding agents.
