# PULSE Developer & Operational Guide

This document covers local setup, environment configuration, build workflows, and operational procedures for the PULSE codebase.

---

## 1. Prerequisites
- **Node.js:** v22.12+ (v22 LTS recommended)
- **Package Manager:** `npm` (v10+). Pinned via `"packageManager"` in `package.json`; do not use `bun` or `yarn` for installs, as only `package-lock.json` is kept in sync.
- **Operating System:** macOS, Linux, or Windows (PowerShell/WSL)

---

## 2. Local Setup & Installation

```bash
# 1. Clone repository
git clone https://github.com/Affan0786isOP/PULSE-2.1.git
cd PULSE-2.1

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
```

---

## 3. Environment Variables Configuration

Populate `.env` with the appropriate credentials:

```bash
# Firebase Client Configuration (Optional in local offline mode, required for cloud sync)
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="pulse-lab-36920.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="pulse-lab-36920"
VITE_FIREBASE_STORAGE_BUCKET="pulse-lab-36920.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"

# Server Secrets (required for the corresponding production APIs; never prefix with VITE_)
PULSE_PROVENANCE_SECRET="replace-with-a-strong-random-signing-key"

# Server-Side Firebase Admin Credentials (Optional for offline preview, required for production writes)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"pulse-lab-36920",...}'

# Telegram Activity Telemetry (Optional server-side observability)
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
TELEGRAM_CHAT_ID="-100xxxxxxxxxx"
TELEGRAM_TOPIC_VISITS="42"
TELEGRAM_TOPIC_RESULTS="43"
TELEGRAM_TOPIC_LEADERBOARD="44"
TELEGRAM_ALLOW_GENERAL_TOPIC_FALLBACK="false"
TELEGRAM_MODE="dry-run" # 'live', 'dry-run' (default), or 'disabled'
```

---

## 4. Verified NPM Scripts

All commands below are verified directly against [`package.json`](../package.json):

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `tsx server.ts` | Starts full-stack Express server with Vite middleware on port 3000. |
| `npm run build` | `vite build && esbuild server.ts ...` | Builds client SPA to `dist/` and bundles server to `dist/server.js`. |
| `npm start` | `node dist/server.js` | Launches production bundled Express server. |
| `npm run lint` | `tsc --noEmit` | Runs TypeScript compiler type check on root desktop project. |
| `npm run check` | `tsc --noEmit && cd mobile && tsc --noEmit` | Runs full dual-surface type checking (desktop + mobile). |
| `npm test` | `vitest run` | Executes the full Vitest suite. |
| `npm run dev:mobile` | `vite --config mobile/vite.config.ts ...` | Runs standalone mobile Vite dev server on port 3000. |
| `npm run build:mobile` | `vite build --config mobile/vite.config.ts` | Builds mobile PWA bundle. |
| `npm run preview` | `vite preview` | Previews production client build. |
| `npm run clean` | `rm -rf dist server.js` | Purges build artifacts. |
| `npm run generate-icons`| `node scripts/generate-icons.js` | Re-generates PWA app icons and favicons from source SVG. |
| `npm run migrate:leaderboard-privacy` | `tsx scripts/migrateLeaderboardPrivacyAndAudit.ts` | One-time/rerunnable server-admin migration: moves legacy private leaderboard fields out of public rows and normalizes string audit timestamps. Back up Firestore first; this command modifies live data and is not run automatically. |

---

## 5. Deployment notes for the leaderboard backend

1. Set `PULSE_PROVENANCE_SECRET` and `FIREBASE_SERVICE_ACCOUNT` in the server/host environment. Web administration routes and admin passcode sessions have been deprecated/removed; moderation and administrative tasks are managed via direct server-side operator scripts utilizing the Firebase Admin SDK.
2. Deploy `firestore.rules` and `firestore.indexes.json` before switching traffic. Leaderboard reads must go through the API; direct client Firestore reads of `leaderboardResults` are intentionally denied.
3. Back up the relevant Firestore collections, then run `npm run migrate:leaderboard-privacy` once to scrub legacy private fields from public rows and normalize historic string audit timestamps. Verify the migration summary and spot-check provenance before considering cutover complete.
4. The migration script is **not** run against live Firestore by the development workflow. Running it requires valid Firebase Admin credentials and explicit operator action.

## 6. Development Workflows

### Running Full-Stack Dev Server (Recommended)
```bash
npm run dev
```
- Spawns Express on `http://localhost:3000`.
- Injects Vite HMR (Hot Module Replacement) middleware for client updates.
- Serves API routes (`/api/*`) and SSR fallback routes simultaneously.

### Running Mobile PWA Dev Server
```bash
npm run dev:mobile
```
- Spawns mobile-specific Vite instance loading `mobile/index.html`.

### Type Verification
```bash
# Check desktop
npm run lint

# Check both desktop & mobile
npm run check
```

---

## 6. Common Failure Modes & Troubleshooting

1. **`FIREBASE_SERVICE_ACCOUNT missing` on server start:**  
   *Symptom:* Server logs `[Firebase Admin] Initialization failed`.  
   *Solution:* In local development, client reads will still function via Web SDK. For testing server writes (`/api/research/submit`), provide valid service account JSON in `FIREBASE_SERVICE_ACCOUNT` or use local in-memory fallback.

2. **`VITE_FIREBASE_PROJECT_ID mismatch`:**  
   *Symptom:* Browser console warning `Rejecting mismatched environment configuration`.  
   *Solution:* Ensure `VITE_FIREBASE_PROJECT_ID` is set to `pulse-lab-36920`.

3. **Port 3000 already in use:**  
   *Symptom:* `EADDRINUSE: address already in use :::3000`.  
   *Solution:* Terminate orphaned node/tsx processes or run on an alternate port via `PORT=3001 npm run dev`.
