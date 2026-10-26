---
name: precontext
description: Tells the agent which critical project context, architecture, rules, and schema files to discover and read, how to use codebase-memory-mcp knowledge graph tools, and how to apply token-efficient context management before and during development.
---

# Precontext: Mandatory Orientation & Token-Optimized Execution

Before planning, modifying code, refactoring, or authoring features in any codebase, an agent must discover, read, and internalize foundational project context files, leverage the codebase knowledge graph, and practice disciplined token optimization.

This prevents common architectural violations such as:
- Breaking core architectural invariants and boundaries (e.g. client vs server authority, unverified direct database writes).
- Introducing breaking changes across multi-platform surfaces (e.g. desktop web vs mobile PWA vs API services).
- Violating timing, precision, or strict latency requirements.
- Leaking PII, sensitive credentials, or violating regulatory retention boundaries.
- Re-introducing deprecated endpoints, outdated dependencies, or purged routines.
- Bloating context windows with redundant file reads, whole-file dumps, and chat narration that degrades model reasoning.

---

## 1. Token-Optimized Context & Execution Invariants

A core invariant governs all tasks: **optimize for the fewest tokens that preserve full meaning, correctness, and usefulness.** Shorter is not automatically better if it introduces ambiguity, drops edge cases, or leads to implementation errors.

Apply token optimization across these ten pillars:

1. **Context Efficiency:**
   - Include only information directly relevant to the current task.
   - Eliminate unrelated historical logs, duplicate explanations, conversational pleasantries, and unnecessary background.
   - Do not re-read or dump files that are already established in context or can be queried with targeted graph tools.

2. **Prompt & Instruction Compression:**
   - Use direct instructions, active voice, compact bullet points, and explicit labels.
   - Prefer simple, plain English over convoluted formalisms or academic prose.
   - State constraints, expected inputs, and acceptance criteria concisely.

3. **Context Prioritisation:**
   - Prioritise in order: (1) current user request & immediate goal, (2) explicit constraints & invariants, (3) recent architectural decisions, (4) current relevant codebase state, and (5) essential historical rationale.
   - De-prioritise or omit completed milestones, superseded decisions, and non-impacted subtrees.

4. **Preserve Critical Details (Zero Loss of Correctness):**
   - **Never sacrifice correctness for brevity.**
   - Retain exact filenames, relative/absolute paths, line numbers, function signatures, API contracts, schema types, error messages, acceptance criteria, security policies, and boundary conditions.
   - Avoid vague placeholders or hand-waving shortcuts (e.g., never say "fix everything" or "make it better"; specify exact targets and contracts).

5. **Output Efficiency:**
   - Deliver answers and implementations directly without echoing the user prompt, conversational filler, or verbose meta-commentary ("Sure, I can help with that...").
   - Omit repetitive intros and trailing sign-offs. Focus entirely on actionable code, diffs, or clear findings.

6. **Agent & Tool Efficiency:**
   - Minimize tool trips. Never run redundant searches or duplicate file reads when existing context or previous tool output contains the answer.
   - Use graph tools (`search_graph`, `get_code_snippet`) for precise symbol inspection rather than pulling entire 1,000-line files.
   - Reuse verified findings across multi-step tasks rather than re-discovering the same dependencies.

7. **Coding-Task & Editing Efficiency (Surgical Diffs):**
   - **Always prefer surgical edits over whole-file overwrites.** Target exact line ranges with targeted replacements (`edit_file` / `replace_file_content`).
   - Specify explicit scope, required changes, constraints, validation commands, and completion criteria without padding.
   - Avoid dumping full test suites or logs; run targeted tests matching modified files.

8. **Planning & Auditing Efficiency:**
   - Consolidate overlapping findings into deduplicated, structured points.
   - Clearly distinguish blocking errors from optional improvements or polish.
   - Provide concrete, actionable remedies instead of restating the same observation in multiple sections.

9. **Long-Context Management:**
   - Maintain compact, structured working notes tracking current state, decisions made, unresolved blockers, and next steps.
   - When compacting or summarizing context, preserve immutable facts, key paths, symbol names, and unresolved questions.

10. **Budget Awareness & Adaptive Depth:**
    - Calibrate investigation depth and response length to the complexity of the task and known model token constraints.
    - Simple queries/edits receive minimal, direct context and answers.
    - Complex architectural refactors receive comprehensive graph verification, coverage checks, and safety bounds while remaining free of fluff.

---

## 2. Codebase Knowledge Graph Orientation (codebase-memory-mcp)

Before jumping into brute-force file searches or grepping, **always prefer `codebase-memory-mcp` tools** to discover the project structure, symbol graph, and call paths with minimal token footprint:

1. **High-Level Topology:**
   - Call `get_architecture` or `index_status` / `list_projects` to review architectural layers, module breakdown, and indexing generation.
2. **Symbol & Dependency Tracing:**
   - Use `search_graph` to locate handlers, classes, routes, models, or core services by pattern.
   - Use `trace_path` (`direction="inbound"` or `"outbound"`) to map callers and dependencies before proposing any structural changes.
   - Use `get_code_snippet` to retrieve targeted implementation snippets without dumping whole files.
3. **Coverage Verification:**
   - Run `check_index_coverage` on candidate paths. If a section is unindexed, stale, or excluded, fall back to targeted reads or grep.
4. **Cypher Querying:**
   - Use `query_graph` for multi-hop relationship queries (e.g. endpoints to database models).

---

## 3. Primary Required Reading (Discover & Read First)

Inspect core guidance files in the repository root, `docs/`, or `.ai/`/`.github/` directories prior to authoring non-trivial changes:

1. **AI Development Rules & Invariants:**
   - Look for: `RULES.md`, `.ai/RULES.md`, `.cursorrules`, `CLAUDE.md`, or `.agent/rules/`.
   - *Key topics to extract:* Architecture boundaries, data mutation rules, security invariants, design token constraints, and verification requirements.

2. **System Context & Technology Stack:**
   - Look for: `CONTEXT.md`, `.ai/CONTEXT.md`, `README.md`, or `docs/ARCHITECTURE.md`.
   - *Key topics to extract:* Platform architecture, authentication models, directory structure, dependency baselines, and deployment targets.

3. **Architectural Decisions Ledger:**
   - Look for: `DECISIONS.md`, `.ai/DECISIONS.md`, or `docs/decisions/` (ADRs).
   - *Key topics to extract:* Past architectural compromises, decommissioned endpoints, data flow designs, and why specific patterns were chosen.

---

## 4. Domain-Specific Reading (Read Based on Task Scope)

Discover and inspect relevant repository specifications based strictly on task scope:

### A. Core Architecture & Environment
- **Architecture Overview:** `docs/ARCHITECTURE.md` or system diagrams in `docs/`.
- **Development Setup & Commands:** `docs/DEVELOPMENT.md`, `CONTRIBUTING.md`, or `README.md`.
- **Package & Dependency Manifests:** `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or equivalent.

### B. Data Models, Schemas & Security
- **Data Model & Database Schemas:** `docs/DATA_MODEL.md`, Prisma/Drizzle/SQL schemas, or ORM model directories.
- **Security Boundaries & Retention:** `docs/SECURITY.md`, `security_spec.md`, or API auth middleware.
- **Access Rules & Permissions:** `firestore.rules`, PostgreSQL RLS policies, IAM policies, or RBAC definitions.
- **Data Provenance & Ingestion Specs:** Specifications governing data ingestion, provenance signing, and audit trails.

### C. Domain Logic & Business Rules
- **Core Domain Specifications:** Functional specifications in `docs/specs/` or equivalent domain folders.
- **Validation Rules & Contracts:** Input validators, schema validations (Zod, Joi, Pydantic), and shared interfaces.
- **Server Engines & Core Processing:** Backend calculation engines, worker queues, and orchestration layers.

### D. UI, Styling & Design System
- **Design System & Theme Tokens:** `docs/DESIGN_SYSTEM.md`, Tailwind config, CSS custom properties, or component library tokens.
- **Brand Guidelines:** `docs/BRAND_GUIDELINES.md` or visual specifications.
- **Canonical Navigation & Layouts:** Primary navigation shells and shared layouts.
- **Multi-Surface Structure:** Separate surface directories (e.g. `src/` for web, `mobile/src/` for mobile, `admin/` for internal tooling).

---

## 5. Universal Pre-Modification Checklist

Before proposing or executing code changes:

- [ ] **Token Efficiency Check:** Are you making surgical edits rather than whole-file overwrites? Have you avoided redundant file reads and duplicate tool calls?
- [ ] **Critical Detail Check:** Have you preserved all required constraints, exact types, file paths, and contracts without over-compressing?
- [ ] **Graph Orientation:** Have you queried `codebase-memory-mcp` (`get_architecture`, `search_graph`, `trace_path`) to understand relationships and callers?
- [ ] **Route & Symbol Status:** Have you checked for active vs deprecated routes, functions, or parameters to avoid re-introducing dead patterns?
- [ ] **Authority & Mutation Boundaries:** Are data mutations routed through authoritative backend/API handlers rather than untrusted client-side direct calls?
- [ ] **Timing & Precision Constraints:** Are project-specific precision, performance, or timing constraints preserved?
- [ ] **Surface & Theme Parity:** If modifying shared components or layouts, did you check responsive viewports, multi-surface parity, and theme compatibility?
- [ ] **Dependency Alignment:** Are all dependency versions and package manager commands aligned with repository requirements?
