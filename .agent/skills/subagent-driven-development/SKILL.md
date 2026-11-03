---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

Orchestrates independent implementation subagents in parallel turns with strict verification gates.

## When to Use & Routing

Evaluate whether executing task loops or reviewing workflow examples:

1. **Subagent Task Loop & Review Lifecycle**
   - Dispatching implementer subagents, handling progress reports, task review checklists, fix loops, and final code reviews.
   - **Reference File:** Read [task-loop-and-review.md](references/task-loop-and-review.md).

2. **Rationalizations & End-to-End Workflow Examples**
   - Detailed breakdown of rationalization prevention and full example run traces.
   - **Reference File:** Read [rationalizations-and-examples.md](references/rationalizations-and-examples.md).

## Core Universal Invariants
1. **Independent Task Scope:** Only dispatch tasks that can execute without shared state or sequential dependency conflicts.
2. **Fresh Verification Requirement:** Subagents must provide fresh command output proving tests pass before a task is marked complete.
3. **Code Review Gate:** Every completed task must pass a code review check against the task acceptance criteria.
