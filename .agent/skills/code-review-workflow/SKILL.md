---
name: code-review-workflow
description: Complete end-to-end code review workflow engine covering both requesting and receiving code reviews. Use when completing implementation tasks, major features, or PRs to formulate structured review requests, or when receiving code review feedback to evaluate suggestions with technical rigor, verify before implementing, and push back constructively against flawed recommendations.
---

# Code Review Workflow

Unified workflow for initiating, executing, and responding to code reviews with engineering rigor.

## When to Use & Phase Routing

Evaluate whether you are preparing code for review or responding to feedback on existing code:

1. **Requesting Code Review (Pre-Merge & Completion Phase)**
   - **Scope:** Completed a major feature, bugfix, or refactor; verifying that work meets all acceptance criteria; generating diff summaries, test evidence, and PR review requests.
   - **Reference File:** Read [requesting.md](references/requesting.md) for self-review checklists, diff scoping, and review submission procedures.
   - **Reviewer Persona:** Read [code-reviewer.md](references/code-reviewer.md) for the specialized code-reviewer agent role prompt.

2. **Receiving & Processing Code Review Feedback**
   - **Scope:** Received review comments from human reviewers, peers, or automated review bots; evaluating whether suggestions are sound, edge-case safe, and aligned with project constraints before applying edits.
   - **Reference File:** Read [receiving.md](references/receiving.md) for technical verification protocols, pushback guidelines, and anti-performative agreement rules.

## Core Universal Invariants
1. **Never Performative Agreement:** Do not blindly say "You're completely right!" and paste unverified code. Inspect the codebase, verify claims against tests, and explain the technical rationale.
2. **Fresh Verification Before Claiming Resolution:** Never mark a review comment resolved without executing the relevant tests or build commands to prove the fix works.
3. **Surgical Diff Scope:** Review requests must highlight the minimal diff necessary to fulfill the requirements, clearly calling out any deliberate tradeoffs (`shortcut:` flags).
