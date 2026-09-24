# PULSE Developer & Operational Guide

This document covers local setup, environment configuration, build workflows, and operational procedures for the PULSE codebase.

---

## 1. Prerequisites
- **Node.js:** v20.x or higher (v22 recommended)
- **Package Manager:** `npm` (v10+) or `bun`
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

# Server Secrets (CRITICAL: Never prefix with VITE_)
ADMIN_PASSCODE="your-secure-admin-passcode"
PULSE_PROVENANCE_SECRET="your-32-character-hmac-secret-key"

# Server-Side Firebase Admin Credentials (Optional for offline preview, required for production writes)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"pulse-lab-36920",...}'
```

---

## 4. Verified NPM Scripts

All commands below are verified directly against [`package.json`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/package.json):

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `tsx server.ts` | Starts full-stack Express server with Vite middleware on port 3000. |
| `npm run build` | `vite build && esbuild server.ts ...` | Builds client SPA to `dist/` and bundles server to `dist/server.js`. |
| `npm start` | `node dist/server.js` | Launches production bundled Express server. |
| `npm run lint` | `tsc --noEmit` | Runs TypeScript compiler type check on root desktop project. |
| `npm run check` | `tsc --noEmit && cd mobile && tsc --noEmit` | Runs full dual-surface type checking (desktop + mobile). |
| `npm test` | `vitest run --passWithNoTests` | Executes Vitest test suite. |
| `npm run dev:mobile` | `vite --config mobile/vite.config.ts ...` | Runs standalone mobile Vite dev server on port 3000. |
| `npm run build:mobile` | `vite build --config mobile/vite.config.ts` | Builds mobile PWA bundle. |
| `npm run preview` | `vite preview` | Previews production client build. |
| `npm run clean` | `rm -rf dist server.js` | Purges build artifacts. |
| `npm run generate-icons`| `node scripts/generate-icons.js` | Re-generates PWA app icons and favicons from source SVG. |

---

## 5. Development Workflows

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
