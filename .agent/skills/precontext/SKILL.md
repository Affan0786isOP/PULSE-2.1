---
name: precontext
description: Tells the agent which critical project context, architecture, rules, and schema files to read before starting development or code modifications in PULSE.
---

# Precontext: Mandatory Orientation Before Development

Before planning, modifying code, refactoring, or authoring features in the **PULSE** codebase, you must read and internalize the foundational project context files.

This prevents common architectural violations such as:
- Client-side direct database mutations (violating server-authoritative provenance).
- Breaking dual-surface synchronization between desktop (`src/`) and mobile PWA (`mobile/src/`).
- Using non-standard timing (`Date.now()` or `setTimeout`) instead of high-precision `performance.now()`.
- Leaking PII into public research datasets.
- Re-introducing deprecated surfaces (such as web admin `/api/admin/*` routes or passcodes).

---

## 1. Primary Required Reading (Read First)

Every agent must inspect these core files prior to writing code or making non-trivial edits:

1. **AI Development Rules & Invariants:**
   - [`file:///.ai/RULES.md`](file:///.ai/RULES.md)
   - *Key topics:* Server-authoritative writes, zero PII, `performance.now()` hardware timing, $RT \ge 80\text{ms}$ floor, design tokens, screenshot verification loops.

2. **System Context & Technology Stack:**
   - [`file:///.ai/CONTEXT.md`](file:///.ai/CONTEXT.md)
   - *Key topics:* Dual-surface routing, Firebase anonymous auth + Express Admin SDK backend, directory layout, core dependencies.

3. **Architectural Decisions Ledger:**
   - [`file:///.ai/DECISIONS.md`](file:///.ai/DECISIONS.md)
   - *Key topics:* HMAC-SHA256 provenance signing, removal of web `/admin` surface, navbar unification, and anonymous participant modeling.

---

## 2. Domain-Specific Reading (Read Based on Task Scope)

Depending on the specific area of development, inspect the relevant specifications:

### A. Core Architecture & Environment
- **Architecture Overview:** [`file:///docs/ARCHITECTURE.md`](file:///docs/ARCHITECTURE.md)
- **Development Setup & Commands:** [`file:///docs/DEVELOPMENT.md`](file:///docs/DEVELOPMENT.md)
- **Package Configuration:** [`file:///package.json`](file:///package.json)

### B. Data Models, Schemas & Security
- **Data Model & Firestore Schema:** [`file:///docs/DATA_MODEL.md`](file:///docs/DATA_MODEL.md)
- **Security Boundaries & Retention:** [`file:///docs/SECURITY.md`](file:///docs/SECURITY.md) and [`file:///security_spec.md`](file:///security_spec.md)
- **Firestore Security Rules:** [`file:///firestore.rules`](file:///firestore.rules)
- **Leaderboard Provenance Specification:** [`file:///docs/specs/LEADERBOARD_PROVENANCE.md`](file:///docs/specs/LEADERBOARD_PROVENANCE.md)

### C. Cognitive Protocols & Assessment Engines
- **Assessment Protocols Spec:** [`file:///docs/specs/ASSESSMENT_PROTOCOLS.md`](file:///docs/specs/ASSESSMENT_PROTOCOLS.md)
- **Protocol Validators:** [`file:///src/lib/protocolValidators.ts`](file:///src/lib/protocolValidators.ts)
- **Server Engines:** [`file:///server/engines/`](file:///server/engines/)

### D. UI, Styling & Design System
- **Design System & Observatory Theme:** [`file:///docs/DESIGN_SYSTEM.md`](file:///docs/DESIGN_SYSTEM.md)
- **Brand Guidelines:** [`file:///docs/BRAND_GUIDELINES.md`](file:///docs/BRAND_GUIDELINES.md)
- **Canonical Navigation Component:** [`file:///src/components/Navbar.tsx`](file:///src/components/Navbar.tsx)
- **Mobile Dual-Surface Structure:** [`file:///mobile/src/`](file:///mobile/src/)

---

## 3. Quick Checklist Before Proposing or Executing Code

- [ ] Have you verified the active vs deprecated routes (`/api/admin/*` is deleted; operator actions use CLI scripts)?
- [ ] Are mutations routed via `server/` with Admin SDK HMAC attestation rather than direct Firestore client calls?
- [ ] Does any new test or protocol preserve the $RT \ge 80\text{ms}$ physiological floor and `performance.now()` precision?
- [ ] If modifying navigation or layouts, did you check active assessment lockout and dual-surface (`/` vs `/mobile/`) compatibility?
- [ ] Are all dependencies verified against React 19, Vite 6, and Node 22/`npm`?
