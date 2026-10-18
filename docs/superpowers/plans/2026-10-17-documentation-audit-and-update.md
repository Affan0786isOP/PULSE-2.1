# Token-Optimized Documentation Audit & Surgical Update Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute a highly token-optimized audit and update of the PULSE documentation suite across all 20 files and project naming by applying minimal surgical diffs (`replace_file_content`), zero subagent duplication overhead, and lean verification scripts.

**Architecture:** Instead of full-file overwrites (which cost ~20k+ output tokens), all changes are grouped into 4 lean batches using bounded line replacements targeting only obsolete version strings, stale admin web endpoints, missing recent changelog releases, and inconsistent package manager references.

**Tech Stack:** Markdown, Git, Node.js 22 LTS / npm 10.9.7, TypeScript 5.8, Express 4.21, React 19, Cloud Firestore.

**Spec:** Current repository HEAD (`2b8ec7b`), aligning with canonical Navbar unification, admin route deprecation, and zero-PII data pipelines.

## Global Constraints

- **Project Name Consistency:** Official long-form title: `PULSE (Precision User Latency & Stimulus Evaluator)`. Npm package: `pulse`. Repository slug: `Affan0786isOP/PULSE-2.1`.
- **Node & NPM Version:** Node `^22.12.0 || >=23.0.0`, npm `10.9.7`. Bun and Yarn are prohibited.
- **Admin Invariant:** No references to active web admin UI, `/api/admin/*`, or `ADMIN_PASSCODE`. All moderation is documented as server CLI scripts using `FIREBASE_SERVICE_ACCOUNT`.
- **Token Optimization Rule:** Use `replace_file_content` targeting exact line ranges. Never overwrite entire files unless creating a new document.

## Review Focus

1. **LEADERBOARD_PROVENANCE.md:** Replace sequence diagram admin route and Section 4 web endpoints with CLI script operations.
2. **breach-runbook.md & CONTRIBUTING.md:** Remove all mentions of `ADMIN_PASSCODE`.
3. **CONTRIBUTING.md & docs/DEVELOPMENT.md:** Update Node 20 to Node 22.12+ and remove `bun`.
4. **README.md:** Fix title character encoding and verify links.
5. **CHANGELOG.md:** Add release entry `[2.2.1] - 2026-10-17` for canonical navbar, mobile drawer accessibility, and dead code cleanup.

---

### Task 1: Governance & Identity Surgical Updates (README, CONTRIBUTING, LICENSE, CHANGELOG)

**Files:**
- Modify: `README.md:1-12`
- Modify: `CONTRIBUTING.md:7-11, 40-43`
- Modify: `LICENSE.md:1-6`
- Modify: `CHANGELOG.md:8-25`

- [ ] **Step 1: Fix README.md title encoding**
  - Replace line 1 with clean UTF-8 em-dash: `# PULSE — Precision User Latency & Stimulus Evaluator`.

- [ ] **Step 2: Update CONTRIBUTING.md prerequisites and secrets**
  - In lines 7-11: Change Node.js to `v22.12+ (v22 LTS recommended)`, Package Manager to strictly `npm (v10+)` (remove `or bun`).
  - In line 41: Remove `ADMIN_PASSCODE` from server secrets list, retaining `PULSE_PROVENANCE_SECRET` and `FIREBASE_SERVICE_ACCOUNT`.

- [ ] **Step 3: Verify LICENSE.md naming**
  - Ensure project name is `PULSE (Precision User Latency & Stimulus Evaluator)` and repository is `Affan0786isOP/PULSE-2.1`.

- [ ] **Step 4: Update CHANGELOG.md with v2.2.1 and modular server entries**
  - Add `## [2.2.1] — 2026-10-17` covering Canonical Navbar unification, active assessment navigation/modal lockouts, mobile drawer focus trapping, and dead code audit cleanup.

- [ ] **Step 5: Commit Task 1**
  - Run: `git commit -am "docs: update governance, contributing, and changelog"`

---

### Task 2: Architecture, Development & Testing Guides Surgical Updates

**Files:**
- Modify: `docs/ARCHITECTURE.md:120-145`
- Modify: `docs/DEVELOPMENT.md:7-11, 73-77`
- Modify: `docs/TESTING.md:7-13, 58-69`

- [ ] **Step 1: Synchronize docs/ARCHITECTURE.md**
  - Ensure Section 5.1 module breakdown notes that admin routes and services are audited and removed.
  - Re-verify rate limit figures (general API 2,000 req / 15 min, session 60 req / 15 min).

- [ ] **Step 2: Update docs/DEVELOPMENT.md prerequisites & deployment notes**
  - Change line 8 to `Node.js: v22.12+ (v22 LTS recommended)`.
  - Reaffirm npm-only workflow and CLI-only operator moderation in Section 5.

- [ ] **Step 3: Update docs/TESTING.md**
  - Include verification checks for unified `Navbar` accessibility (focus cycling, backdrop dismissal, assessment lockouts).

- [ ] **Step 4: Commit Task 2**
  - Run: `git commit -am "docs: synchronize architecture, development, and testing guides"`

---

### Task 3: Security Spec & Breach Runbook Hardening

**Files:**
- Modify: `security_spec.md:15-18`
- Modify: `docs/SECURITY.md:32-37`
- Modify: `docs/breach-runbook.md:15-19, 32-36`

- [ ] **Step 1: Verify security_spec.md**
  - Confirm Firestore rules invariants and server-authoritative HMAC attestation.

- [ ] **Step 2: Update docs/SECURITY.md**
  - Reaffirm threat matrix row 7 regarding elimination of web admin console.

- [ ] **Step 3: Purge obsolete ADMIN_PASSCODE from docs/breach-runbook.md**
  - In Section 1 (Severity Matrix SEV-1): Remove `ADMIN_PASSCODE` leak example; focus on `FIREBASE_SERVICE_ACCOUNT` key leaks.
  - In Phase 2.1 (Key Revocation): Update step 2 to clarify operator script execution and lack of web admin passwords.

- [ ] **Step 4: Commit Task 3**
  - Run: `git commit -am "docs: harden security specs and remove obsolete admin secrets from breach runbook"`

---

### Task 4: Specifications & ADRs Synchronization

**Files:**
- Modify: `docs/BRAND_GUIDELINES.md:80-84`
- Modify: `docs/DESIGN_SYSTEM.md:58-70`
- Modify: `docs/DATA_MODEL.md:14-19`
- Modify: `docs/PROJECT_SPEC.md:127-140`
- Modify: `docs/specs/ASSESSMENT_PROTOCOLS.md:1-10`
- Modify: `docs/specs/DATASET_PIPELINE.md:10-17`
- Modify: `docs/specs/LEADERBOARD_PROVENANCE.md:15-32, 53-58`
- Modify: `docs/decisions/ADR-001-SERVER-AUTHORITATIVE-PROVENANCE.md:8-14`
- Modify: `docs/decisions/ADR-002-DUAL-SURFACE-ROUTING.md:10-15`
- Modify: `docs/decisions/ADR-003-ZERO-PII-DATASET.md:10-15`

- [ ] **Step 1: Update docs/specs/LEADERBOARD_PROVENANCE.md**
  - Replace sequence diagram `Admin Console` and `POST /api/admin/leaderboard/hide` with Operator CLI moderation workflow.
  - Update Section 4 to describe server CLI scripts instead of HTTP web endpoints.

- [ ] **Step 2: Update docs/PROJECT_SPEC.md implementation matrix**
  - Verify row `Admin Console` reflects `DEPRECATED / REMOVED` and `Desktop Home & Hero` reflects canonical unified Navbar.

- [ ] **Step 3: Review and harmonize Brand, Design, Data Model, Protocols, Dataset specs, and ADRs**
  - Confirm consistent nomenclature (`PULSE (Precision User Latency & Stimulus Evaluator)`).
  - Verify zero-PII and dual-surface routing invariants across ADR-001, ADR-002, and ADR-003.

- [ ] **Step 4: Commit Task 4**
  - Run: `git commit -am "docs: synchronize leaderboard provenance, project specs, and ADRs"`

---

## Verification Plan

### Automated Verification
```bash
# Run lean doc check script to confirm 0 missing files and 0 broken cross-references
python -c "
import os
files = [
    'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE.md', 'README.md', 'security_spec.md',
    'docs/ARCHITECTURE.md', 'docs/BRAND_GUIDELINES.md', 'docs/breach-runbook.md',
    'docs/DATA_MODEL.md', 'docs/DESIGN_SYSTEM.md', 'docs/DEVELOPMENT.md',
    'docs/PROJECT_SPEC.md', 'docs/SECURITY.md', 'docs/TESTING.md',
    'docs/specs/ASSESSMENT_PROTOCOLS.md', 'docs/specs/DATASET_PIPELINE.md',
    'docs/specs/LEADERBOARD_PROVENANCE.md',
    'docs/decisions/ADR-001-SERVER-AUTHORITATIVE-PROVENANCE.md',
    'docs/decisions/ADR-002-DUAL-SURFACE-ROUTING.md',
    'docs/decisions/ADR-003-ZERO-PII-DATASET.md'
]
assert all(os.path.exists(f) for f in files)
print('All 20 documentation files validated.')
"
```
