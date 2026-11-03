# Modern Swift Quick Reference

## Quick Reference

| Need                               | Reach for                       | Not                                       |
| ---------------------------------- | ------------------------------- | ----------------------------------------- |
| A data type                        | `struct` / `enum`               | `class` without identity or sharing       |
| Shared mutable state               | `actor`, or `@MainActor` class  | `class` + a lock you must remember        |
| Move work off the main thread      | `@concurrent func … async`      | `Task.detached`, `DispatchQueue.global()` |
| A library API's isolation          | `nonisolated`                   | `@MainActor`, `@concurrent`               |
| Fixed number of parallel jobs      | `async let`                     | N unstructured `Task`s                    |
| Dynamic number of parallel jobs    | `withTaskGroup` (bounded)       | one task per element, unbounded           |
| Children that return nothing       | `withDiscardingTaskGroup`       | `withTaskGroup` you never drain           |
| Work tied to a UI event            | `Task { }` inside the callback  | making the callback `async`               |
| Fixing a data race                 | stop sharing the object         | `@unchecked Sendable`                     |
| A shared model class               | non-`Sendable`, or `@MainActor` | `Sendable` + manual locking               |
| Blocking primitive across `await`  | nothing — restructure           | `DispatchSemaphore`, `NSCondition`        |
| Polymorphism                       | `some P`                        | `any P` unless you need storage           |
| Heterogeneous collection           | `[any P]`                       | a class hierarchy                         |
| Shared behavior, no customization  | constrained `extension`         | a new protocol                            |
| A customization point              | protocol **requirement**        | a method only in an extension             |
| Breaking a reference cycle         | restructure to a tree           | `weak` + `withExtendedLifetime`           |
| Removing matching elements         | `removeAll(where:)` — O(n)      | `remove(at:)` in a loop — O(n²)           |
| Direct access to contiguous memory | `.span`                         | `withUnsafeBufferPointer`                 |
| Fixed-size buffer in a hot path    | `InlineArray<N, T>`             | `Array`                                   |
| A new test                         | `@Test` + `#expect`             | `XCTestCase` + `XCTAssertEqual`           |
| The same test over many inputs     | `@Test(arguments:)`             | a `for` loop, or copy-paste               |
| Halting a test on failure          | `try #require`                  | `continueAfterFailure = false`            |
| A temporarily broken test          | `withKnownIssue`                | `.disabled`, or commenting it out         |
| Diagnostics in shipping code       | `Logger` + a correlation ID     | `print`                                   |
| Deciding to optimize               | Instruments on a profiled test  | intuition                                 |
