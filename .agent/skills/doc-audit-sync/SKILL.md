---
name: doc-audit-sync
description: Systematic, token-optimized procedure for auditing and synchronizing multi-file documentation suites, ADRs, specs, and AI context files. Use when updating README, CHANGELOG, ARCHITECTURE, DATA_MODEL, SECURITY, or .ai context files after codebase changes.
---

# Documentation Audit & Synchronization Skill

## When to Use
Use this skill whenever:
- A major feature, architectural change, or refactor is completed.
- Deprecated routes, APIs, or credentials (e.g. admin routes, passwords) are purged from code.
- Dependencies or engine floors (e.g. Node.js version, package manager) change.
- The project documentation suite (README, CHANGELOG, ARCHITECTURE, specs, ADRs, `.ai/` directory) needs verification against actual code.

## Procedure

### Step 1: Discover and Map Documentation Files
Identify all doc files across root, `docs/`, `docs/specs/`, `docs/decisions/`, `security/`, and `.ai/`.

### Step 2: Extract Invariants from Source Code
Before touching documents, verify true facts from source:
1. `package.json`: Check `"name"`, `"version"`, `"engines"`, `"packageManager"`, and `"scripts"`.
2. Git commit history: Run `git log -n 10 --oneline` to find all recent features, fixes, and deprecations.
3. Security boundaries: Inspect `firestore.rules` and server routes to confirm active vs deleted endpoints.

### Step 3: Run Fast Scan for Obsolete Remnants
Run an in-session python scan to search for stale keywords across all doc files:
- Deprecated routes (e.g., `/api/admin/*`)
- Obsolete secret keys (e.g., `ADMIN_PASSCODE`)
- Outdated versions (e.g., Node 18/20 instead of 22)
- Inconsistent package managers (e.g., `bun` vs `npm`)

### Step 4: Apply Surgical Edits
- Group updates by document tier.
- Use `replace_file_content` for line-level replacements.
- Never overwrite entire files unless authoring a completely new document.

### Step 5: Update Release Notes & AI Context
- Add entries to `CHANGELOG.md` under the current version.
- Update `.ai/CONTEXT.md`, `.ai/DECISIONS.md`, and `.ai/RULES.md` so future agent sessions operate on current context.

### Step 6: Automated Link & Reference Verification
Run a verification script to confirm all cross-referenced paths exist and no broken links remain.
