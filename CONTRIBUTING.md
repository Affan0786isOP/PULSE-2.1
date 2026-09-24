# Contributing to PULSE

Thank you for contributing to the PULSE cognitive assessment and benchmark platform. This guide outlines development practices, code conventions, security guidelines, and pull request expectations.

---

## 1. Development Prerequisites
- **Node.js:** v20+ (v22 LTS recommended)
- **Package Manager:** `npm` or `bun`
- **Git:** Git 2.30+

---

## 2. Local Setup & Environment
```bash
# Clone the repository
git clone https://github.com/Affan0786isOP/PULSE-2.1.git
cd PULSE-2.1

# Install project dependencies
npm install

# Prepare local environment file
cp .env.example .env
```

---

## 3. Existing Code & Architecture Conventions

These conventions are actively established in the codebase:

### 3.1 Timing & Measurement
- Always use `performance.now()` for millisecond-precision reaction latency timestamps.
- Never use `setTimeout`, `setInterval`, or `Date.now()` for stimulus duration or latency measurement.
- Enforce the $80\text{ms}$ human physiological threshold ($RT \ge 80\text{ms}$).

### 3.2 Security & Data Mutations
- **Server-Authoritative Writes:** Direct client mutations to Firestore collections are disabled. All data mutations must route through Express API endpoints in `server.ts`.
- **Zero PII:** Never introduce user identity fields (email, real name, phone number, IP address) into `publicDataset` or assessment trial collections.
- **Never expose secrets:** Server secrets (`ADMIN_PASSCODE`, `PULSE_PROVENANCE_SECRET`, `FIREBASE_SERVICE_ACCOUNT`) must never be prefixed with `VITE_` or referenced in client-side code.

### 3.3 Dual-Surface Parity
- PULSE maintains a desktop web client (`src/`) and a mobile PWA subproject (`mobile/src/`).
- When modifying shared protocols, types, or validators in `src/lib/`, ensure compatibility with both surfaces.

### 3.4 Styling & Design Tokens
- Use the observatory dark palette tokens (`--surface-0` through `--surface-3`, `#00F0FF` Signal Cyan, `#10B981` Provenance Green) documented in [`docs/DESIGN_SYSTEM.md`](file:///c:/Users/affan/OneDrive/Documents/PULSE/v2.1%20GIT/docs/DESIGN_SYSTEM.md).
- Do not introduce arbitrary saturated purple gradients or heavy drop shadow halos.

---

## 4. Recommended Practices (Introduced by this Guide)

The following practices are recommended for future contributions:
- **Feature Branch Naming:** Use descriptive branch prefixes such as `feat/`, `fix/`, `perf/`, or `refactor/`.
- **Commit Messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat(vrt): add temporal dynamics export`, `fix(mobile): prevent viewport bounce during test`).
- **Pre-Merge Self-Check:** Always execute `npm run check` and `npm test` before pushing changes.

---

## 5. Verification Checklist

Before submitting a Pull Request:
- [ ] Run `npm run lint` (Desktop type check).
- [ ] Run `npm run check` (Dual-surface type check).
- [ ] Run `npm test` (Unit test suite).
- [ ] Verify production build completes with `npm run build` and `npm run build:mobile`.
- [ ] Ensure documentation in `docs/` is updated if architectural behaviors changed.
