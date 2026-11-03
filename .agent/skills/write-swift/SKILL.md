---
name: write-swift
description: How to write modern Swift well — modeling with value types, Swift 6 data-race safety and approachable concurrency (@concurrent, main-actor-by-default, actors, task groups), protocols and generics (some vs any), API design, performance and ARC, Swift Testing, macros, and the modern language features agents don't know about yet. Use when writing, reviewing, or migrating Swift, or when a concurrency error, a hang, a data race, a retain cycle, or a performance problem needs fixing.
---

# Write Swift

Modern Swift engineering standards, Swift 6 concurrency safety, and platform idioms.

## When to Use & Routing

Load specialized reference files based on the task:

1. **Quick Reference & Syntax Index**
   - Compact reference table for value types, concurrency, actors, `some`/`any`, ARC, and macros.
   - **Reference File:** Read [quick-reference.md](references/quick-reference.md).

2. **Data Modeling, Enums & Error Visibility**
   - Value types, explicit failure states, and avoiding premature reference types.
   - **Reference File:** Read [modeling-and-errors.md](references/modeling-and-errors.md).

3. **Swift 6 Concurrency, Sendable & Actors**
   - Structured concurrency, async let, task groups, actor reentrancy, `@MainActor`, and data race isolation.
   - **Reference File:** Read [concurrency.md](references/concurrency.md).

4. **Protocols, Generics & API Design**
   - Opaque return types (`some`) vs existential types (`any`), protocol design, and clear call-site naming.
   - **Reference File:** Read [protocols-and-generics.md](references/protocols-and-generics.md).

5. **Performance, Swift Testing & Swift 6 Migration**
   - ARC optimization, Swift Testing (`@Test`, `#expect`), and safe migration to Swift 6 complete concurrency checking.
   - **Reference File:** Read [performance-testing-and-migration.md](references/performance-testing-and-migration.md).

## Core Universal Invariants
1. **Value Types First:** Model state with structs and enums. Classes are reserved strictly for shared mutable state or identity-backed resources.
2. **Structured Concurrency:** Prefer task groups and `async let` over detached uncoordinated tasks.
3. **Visible Failure Paths:** Represent expected operational errors via typed `throw` or `Result`, never unhandled optionals or force-unwraps (`!`).
