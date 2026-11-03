---
name: project-intelligence
description: Complete codebase intelligence, architectural analysis, code health evaluation, and modification blast-radius assessment system. Use when exploring unfamiliar repositories, understanding module topology and call hierarchies, auditing technical debt and hotspots, reviewing or authoring Architectural Decision Records (ADRs/WHY markers), or performing impact checks before modifying shared utilities, database schemas, or public APIs.
---

# Project Intelligence

Unified intelligence engine for repository exploration, architectural decisions, code health diagnostics, and change-risk assessments.

## When to Use & Routing

Select the specialized intelligence workflow required for the current task:

1. **Codebase Exploration & Knowledge Graph Navigation**
   - **Scope:** Orienting in a new repository, locating where specific business logic or entities live, tracing call hierarchies, or analyzing dependencies before reading source code.
   - **Reference File:** Read [exploration.md](references/exploration.md) for Repowise/MCP graph navigation procedures and indexing tiers.

2. **Architectural Decisions & Tradeoffs (ADRs, WHY markers)**
   - **Scope:** Understanding why code is structured a certain way, authoring or querying Architecture Decision Records, evaluating architectural patterns, and analyzing structural tradeoffs.
   - **Reference File:** Read [architecture.md](references/architecture.md) for ADR schemas, decision extraction, and lifecycle tracking.

3. **Code Health, Complexity & Hotspot Audits**
   - **Scope:** Auditing technical debt, cyclomatic complexity, churn hotspots, untested areas, or comparing before/after maintainability metrics across refactoring phases.
   - **Reference File:** Read [code-health.md](references/code-health.md) for code health diagnostics and hotspot prioritization.

4. **Pre-Modification Blast Radius & Change Risk Assessment**
   - **Scope:** Assessing the impact of planned changes to shared utilities, core services, database models, public APIs, or configuration before editing.
   - **Reference File:** Read [modification-risk.md](references/modification-risk.md) for dependency checking, breaking change detection, and rollback planning.

## Core Universal Invariants
1. **Prefer Knowledge Graphs Over Brute-Force Grep:** Use codebase-memory-mcp tools (search_graph, 	race_path, get_code_snippet, check_index_coverage) first. Fall back to grep/find only for string literals, configuration files, and non-indexed assets.
2. **Read-Only Invariant for Analysis:** Exploration, health diagnostics, and pre-modification checks are non-destructive and must not alter source files.
3. **Verify Blast Radius Before Modifying Shared Code:** Always check callers and downstream dependents before refactoring or removing functions.
