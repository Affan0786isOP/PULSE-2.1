# PULSE AI Agent Development Rules

These rules govern all AI coding agents working within the PULSE repository. They are strict, non-negotiable constraints.

---

## 1. Inspection & Verification Rules
1. **Inspect Before Acting:** Always examine actual source code, configuration files, and types before proposing or making changes. Never guess architecture or file paths.
2. **Evidence Over Assumptions:** Only document or code against verifiable system behavior. If a behavior or requirement cannot be verified, flag it as `UNKNOWN / TO BE VERIFIED`.
3. **Validate Commands:** Verify all scripts against `package.json` and tool configurations before suggesting or executing them.
4. **Visual Verification Loop for UI Changes:** Any visual change to UI components, heroes, modals, navigation, or responsive layouts MUST follow the screenshot-driven feedback loop (`screenshot-driven-ui`). The agent must capture actual screenshots using headless browser automation, inspect the images directly via `view_file`, and iterate (code -> build -> capture -> inspect) until visual quality, contrast, and responsive layout are proven. Never claim UI success without inspected screenshots.

---

## 2. Code Modification Boundaries
1. **No Unprompted Refactors:** Do not refactor, reformat, or rewrite code outside the strict scope of the user's prompt.
2. **Preserve Application Architecture:** Do not alter routing strategies (unified single-route surface switching via `useViewportSurface`), state management models, or component contracts unless explicitly instructed.
3. **No Unvetted Dependencies:** Do not install new packages without explicit justification and compatibility verification with the versions declared in `package.json` (currently React 19, Vite 8, and Tailwind CSS v4).
4. **Preserve Comments & Docstrings:** Retain existing explanatory comments, citations, and protocol docstrings unless directly obsolete.

---

## 3. Security & Trust Boundaries
1. **Server-Authoritative Writes:** All Firestore mutations to canonical collections (`publicDataset`, `assessmentTrials`, `assessmentResults`, `leaderboardResults`, `adminAuditLogs`) MUST route through the Express server backend (`server.ts`). Never attempt direct client writes to locked Firestore paths.
2. **Never Expose Secrets:** Never prefix backend secrets (`PULSE_PROVENANCE_SECRET`, `FIREBASE_SERVICE_ACCOUNT`, `ADMIN_PASSCODE`, `PULSE_ADMIN_SESSION_SECRET`) with `VITE_` or include them in client bundles. The desktop `/admin` console and `/api/admin/*` endpoints are active; every protected API operation must enforce server-side signed-session verification and revocation checks. CLI remains available for controlled maintenance/recovery.
3. **Zero PII in Public Datasets:** Never attach participant personal names, emails, IPs, or precise birthdates to `publicDataset` or assessment trial records.
4. **Dataset Summary Integrity:** Public summary reads must use `publicDatasetMeta/summary` and must never scan the full `publicDataset` collection. Submission increments must remain transactional. Full reconciliation is operator-controlled, dry-run first, explicitly confirmed for apply, and protected by the Firestore migration lock.

---

## 4. Scientific Measurement Integrity
1. **Hardware-Accurate Timing:** Always use `performance.now()` for millisecond-precision reaction time measurements. Never use `Date.now()` or `setTimeout` for stimulus duration or latency calculations.
2. **No Animations During Active Stimuli:** Do not introduce CSS transitions, framer-motion animations, or repaints during active measurement intervals (between stimulus scheduling and user input receipt).
3. **Physiological Floor Enforcement:** Maintain the $80\text{ms}$ physiological reaction time floor ($RT \ge 80\text{ms}$). Responses under $80\text{ms}$ are classified as `ANTICIPATORY_TOO_FAST` or false starts.

---

## 5. UI, Design & Accessibility
1. **Respect Design Tokens:** Adhere strictly to the observatory dark palette (`--surface-0` through `--surface-3`, `#00F0FF` Signal Cyan, `#10B981` Provenance Green) and typography defined in [`docs/DESIGN_SYSTEM.md`](../docs/DESIGN_SYSTEM.md).
2. **Active States & Tactility:** Every interactive element must have defined `:active` and `:focus-visible` styles.
3. **Reduced Motion:** Always respect `prefers-reduced-motion` and the `reducedMotionEnabled` setting via `<MotionConfig>`.
4. **Cross-Surface Compatibility:** Changes to shared logic must maintain parity between desktop (`DesktopApp.tsx`) and mobile (`MobileAppWrapper.tsx`) surfaces using `@shared/*` modules where appropriate.
5. **Theme Surface Cohesion (No Accidental Dual-Tone):** When building or styling multi-card layouts, carousels, or stacked components, maintain consistent surface coloring across all card states (active and inactive). Do not mix dark cards and light cards within the same carousel or stack unless specifically instructed.
6. **Mobile Brand Mark Integrity:** Always use the official `<PulseLogo>` component for branding lockups on mobile pages and headers. Never replace the logo mark with plain text (`<span>PULSE</span>`) or unvetted approximations. Ensure `<PulseLogo>` accepts and applies the correct `textColor` matching the current theme surface.
7. **Localized Contrast for Neon / Glowing Marks on Light Themes:** When rendering glowing cyan, neon, or white line-art logos on light surfaces, increase legibility by applying a high-contrast dark aperture/disc **strictly and only directly behind the logo graphic**. Do not darken the parent card or surrounding layout to achieve contrast.
8. **Uniform 720p Baseline Scaling for Fixed-Viewport Stages:** Single-screen desktop views (such as the Homepage hero and active assessment stimulus stages) MUST use the uniform aspect scaling pattern based on a 1280×720 baseline: $\text{scale} = \min(w / 1280, h / 720)$ for $w \ge 768\text{px}$. The stage container must apply `zoom: scale` and `minHeight: calc(100dvh / scale)`. On viewports $< 768\text{px}$, scale must strictly revert to `1` with natural fluid vertical flow. Do NOT apply this zoom scaling to multi-row data tables (Leaderboard, Dataset) or long-form documentation pages where standard browser vertical scrolling and text reflow are expected.

---

## 6. Documentation Maintenance
1. **Synchronize Documentation:** When architectural or data model changes are made, update [`docs/PROJECT_SPEC.md`](../docs/PROJECT_SPEC.md), [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md), and [`docs/DATA_MODEL.md`](../docs/DATA_MODEL.md).
2. **Never Mark Planned as Implemented:** Clearly distinguish implemented features from planned enhancements across all docs.


## 7. Toolchain source of truth

- Treat `package.json` (`engines`, `packageManager`, dependencies, and scripts) as the authoritative source for runtime and toolchain versions. Do not preserve hard-coded Vite or Node versions in agent guidance after the manifest changes.
- The current declared Node floor is `>=24.12.0`; the package manager is `npm@10.9.7`.
- Approved font families are Inter, Space Grotesk, and JetBrains Mono (weights 400/500/600/700). Use shared brand tokens and pass `npm run audit:typography`; the audit is already included in `npm test`, `npm run check`, and `npm run build`.

---

## 8. Chart library & build surface invariants

1. **No `src/bklit-ui/` imports:** The `src/bklit-ui/` chart library subtree was removed (commit `4a452b9`). Any import from `src/bklit-ui/` on the desktop surface is a build error. Desktop visualizations use Recharts or direct SVG/D3. The canonical chart primitives live in `mobile/src/bklit-ui/`.
2. **No in-memory idempotency cache:** Do not reintroduce a process-local deduplication map for research session submissions. Replay protection must use Firestore-backed nonce revocation only.
3. **No collection scans in production queries:** Leaderboard and Dataset reads must page by document ID or a declared Firestore composite index. Full-collection scans are permitted only inside admin reconciliation flows (with migration lock held). Add index declarations to `firestore.indexes.json` before shipping any new range query.
4. **PageShell scaling default-on:** `PageShell` applies `useBaselineScale` by default (`shouldScale = !disableScaling`). Pass `disableScaling` only for multi-row data tables (Leaderboard, Dataset filter views) or long-form documentation pages where native vertical scrolling is expected. Floating modals spawned inside a scaled `PageShell` must use a React portal to escape the zoom transform.
