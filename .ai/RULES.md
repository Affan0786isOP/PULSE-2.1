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
2. **Preserve Application Architecture:** Do not alter routing strategies (`/` desktop vs `/mobile/` PWA), state management models, or component contracts unless explicitly instructed.
3. **No Unvetted Dependencies:** Do not install new packages without explicit justification and compatibility verification with React 19, Vite 6, and Tailwind CSS v4.
4. **Preserve Comments & Docstrings:** Retain existing explanatory comments, citations, and protocol docstrings unless directly obsolete.

---

## 3. Security & Trust Boundaries
1. **Server-Authoritative Writes:** All Firestore mutations to canonical collections (`publicDataset`, `assessmentTrials`, `assessmentResults`, `leaderboardResults`, `adminAuditLogs`) MUST route through the Express server backend (`server.ts`). Never attempt direct client writes to locked Firestore paths.
2. **Never Expose Secrets:** Never prefix backend secrets (`ADMIN_PASSCODE`, `PULSE_PROVENANCE_SECRET`, `FIREBASE_SERVICE_ACCOUNT`) with `VITE_` or include them in client bundles.
3. **Zero PII in Public Datasets:** Never attach participant personal names, emails, IPs, or precise birthdates to `publicDataset` or assessment trial records.

---

## 4. Scientific Measurement Integrity
1. **High-Resolution Timing:** Use `performance.now()` and monotonic timestamps for measured reaction latencies. Use `Date.now()` only for wall-clock metadata; `setTimeout`/`setInterval` may schedule foreperiods and timeouts but must never be used to calculate reaction latency or claim exact stimulus-onset time.
2. **No Transition on Active Stimuli:** Do not apply CSS transitions or animations to the stimulus apparatus, stimulus indicator, timer, or status text during a measured reaction trial. In both desktop and mobile reaction components, ensure the `STIMULUS_ACTIVE` state applies `transition-none` to the apparatus and changing text. A repaint is necessary to present the stimulus; avoid extra layout work and animated state changes around that presentation. `requestAnimationFrame` timestamps estimate browser-frame onset and are not physical display measurements.
3. **Physiological Floor Enforcement:** Maintain the $80\text{ms}$ physiological reaction time floor ($RT \ge 80\text{ms}$). Responses under $80\text{ms}$ are classified as `ANTICIPATORY_TOO_FAST` or false starts.

---

## 5. UI, Design & Accessibility
1. **Respect Design Tokens:** Adhere strictly to the observatory dark palette (`--surface-0` through `--surface-3`, `#00F0FF` Signal Cyan, `#10B981` Provenance Green) and typography defined in [`docs/DESIGN_SYSTEM.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/docs/DESIGN_SYSTEM.md).
2. **Active States & Tactility:** Every interactive element must have defined `:active` and `:focus-visible` styles.
3. **Reduced Motion:** Always respect `prefers-reduced-motion` and the `reducedMotionEnabled` setting via `<MotionConfig>`.
4. **Dual-Surface Compatibility:** Changes to shared logic must maintain parity between the desktop application (`/src`) and mobile PWA (`/mobile/src`).
5. **Theme Surface Cohesion (No Accidental Dual-Tone):** When building or styling multi-card layouts, carousels, or stacked components, maintain consistent surface coloring across all card states (active and inactive). Do not mix dark cards and light cards within the same carousel or stack unless specifically instructed.
6. **Mobile Brand Mark Integrity:** Always use the official `<PulseLogo>` component for branding lockups on mobile pages and headers. Never replace the logo mark with plain text (`<span>PULSE</span>`) or unvetted approximations. Ensure `<PulseLogo>` accepts and applies the correct `textColor` matching the current theme surface.
7. **Localized Contrast for Neon / Glowing Marks on Light Themes:** When rendering glowing cyan, neon, or white line-art logos on light surfaces, increase legibility by applying a high-contrast dark aperture/disc **strictly and only directly behind the logo graphic**. Do not darken the parent card or surrounding layout to achieve contrast.

---

## 6. Documentation Maintenance
1. **Synchronize Documentation:** When architectural or data model changes are made, update [`docs/PROJECT_SPEC.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/docs/PROJECT_SPEC.md), [`docs/ARCHITECTURE.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/docs/ARCHITECTURE.md), and [`docs/DATA_MODEL.md`](https://github.com/Affan0786isOP/PULSE-2.1/blob/main/docs/DATA_MODEL.md).
2. **Never Mark Planned as Implemented:** Clearly distinguish implemented features from planned enhancements across all docs.
