# Swift Performance, Testing, Macros & Swift 6 Migration

## 9. Performance — measure, then choose

Low-level Swift performance is dominated by four costs. Know which one you're paying.

1. **Function calls** — argument copies, static vs dynamic dispatch, call-frame allocation, and blocked optimization.
2. **Memory layout** — inline vs out-of-line storage; dynamically sized types.
3. **Allocation** — global (free), stack (cheap: one subtraction), heap (expensive: search plus locking).
4. **Copies** — retains/releases and recursive struct copies.

**But do the algorithmic work first.** Every time you write a loop, try replacing it with a call to an algorithm. The largest wins are almost never micro-optimizations:

- **Know the complexity of what you call.** `Array.remove(at:)` is O(n); calling it in a loop is O(n²). `removeAll(where:)` is O(n) total. Building a `Data` by re-slicing per byte is O(n²); `popFirst()` is O(1). Both of these were 100×+ regressions hiding behind clean-looking code.
- **Chained `map`/`flatMap`/`filter` allocate an array per stage.** Elegant ≠ fast. If a pipeline runs per-pixel or per-element in a hot loop, size the output once and write into it.
- **Then profile.** Instruments' Time Profiler and Allocations, run against a _test_ (secondary-click the test's run button → Profile) so you're measuring exactly the code you care about. `platform_memmove` dominating a flame graph means accidental copying; a million transient allocations means intermediate arrays; `swift_beginAccess` means runtime exclusivity checks; `swift_retain`/`swift_release` means reference-counting traffic.

**Concrete levers, roughly in order of what they buy:**

- **`final` on classes you don't intend to subclass** turns dynamic dispatch static and unlocks inlining. Whole-module optimization lets the compiler prove this for you in many cases — and enables generic specialization, which is where generics stop costing anything.
- **Struct storage is inline; class storage is out-of-line.** Small structs are free; a large struct with three reference-typed fields costs three retains _per copy_, versus one for a class. If you copy it a lot, use copy-on-write.
- **An `any P` existential has a 3-word inline buffer.** Values that fit live inline; larger ones get heap-allocated per copy. Same technique applies: give the large type indirect storage with copy-on-write and it fits in the buffer again.
- **Homogeneous `[MyModel]` beats `[any Model]`** — densely packed, type info passed once, specializable. `[any Model]` is the flexible-but-opaque option; take it when you need it.
- **Constraining a generic parameter to a class** (`T: AnyObject`) gives the compiler a known representation even without specialization.
- **`InlineArray<N, T>`** (Swift 6.2) for fixed-size storage: elements stored inline, size in the type via value generics, no heap allocation, no reference counting, no uniqueness or exclusivity checks. Wrong choice if it gets copied or shared.
- **`Span` / `RawSpan` / `OutputSpan`** (Swift 6.2) replace `withUnsafeBufferPointer` for direct access to contiguous storage. They're non-escapable, so the compiler ties their lifetime to the container — you get pointer performance with no lifetime bugs, and the retains/releases disappear.
- **Moving stored properties out of a nested class into the parent struct** removes runtime exclusivity checks.
- Shipped in Swift 6.3, when you've measured the need: `@inline(always)` (pair with `final` on methods) and `@specialized(where T == ...)` (SE-0460) to pre-specialize a generic for hot concrete types.
- Landing in Swift 6.4 (**unreleased** — see the note below §15): `borrow`/`mutate` accessors instead of `get`/`set` for large stored values, `UniqueArray`/`UniqueBox`, and `Ref`/`MutableRef` to hoist a repeated lookup out of a loop.

**Async functions** keep their state on a per-task slab allocator rather than the C stack, and split into partial functions at each suspension point. The cost profile is similar to sync functions with slightly higher call overhead — which is another reason not to make something `async` that has nothing to await.

**Hops to and from the main actor cost a real context switch.** Batch: push the loop _into_ `loadArticles`/`updateUI` so they take arrays, rather than hopping twice per iteration.

---

## 10. ARC and object lifetime

- **An object's guaranteed lifetime ends at its last use, not at the closing brace.** Observed lifetimes are an emergent property of the optimizer and _will_ change. Code that depends on when a `deinit` runs is a latent bug.
- **`weak`/`unowned` are for breaking reference cycles — nothing else.** Reading a `weak` reference after the strong owner's last use may legitimately give `nil`. Optional binding there is _worse_ than force-unwrap: it turns a loud crash into a silent wrong answer.
- **Better than `weak`: don't build the cycle.** Factor the shared data into a third type both sides reference, turning the cycle into a tree.
- **Next best: redesign the API** so the object is only reachable through a strong reference. `withExtendedLifetime` works but shifts correctness onto you and spreads through a codebase — treat it as a patch, not a design.
- **Keep `deinit` side effects local.** Publishing metrics or firing a global effect from `deinit` sequences against optimizer decisions. Use `defer` at the call site instead, and leave `deinit` for verification.
- Xcode's **Optimize Object Lifetimes** build setting shortens observed lifetimes toward the guaranteed minimum, and will surface exactly these bugs.

---

## 11. Testing — Swift Testing by default

Use **Swift Testing** for new tests. XCTest remains required for exactly three things: UI automation (`XCUIApplication`), performance metrics (`XCTMetric`), and tests that must be written in Objective-C or that catch Objective-C exceptions.

- **`@Test` on any function** — global, static, or instance; `async`, `throws`, and global-actor-isolated all work.
- **`#expect(...)` takes ordinary expressions.** No family of `XCTAssertEqual`-style functions to memorize — `#expect(a == b)`, `#expect(list.isEmpty)`, `#expect(!x.contains(y))` all capture and display subexpression values on failure.
- **`try #require(...)`** to stop the test on failure, and to unwrap an optional safely. This replaces `continueAfterFailure = false` and lets you choose per-expectation.
- **Suites are `struct`s.** A fresh instance is created per test function, so state can't leak between tests. Use `init` for setup; only use a `class`/`actor` when you need `deinit` for teardown. Nest suites to group.
- **Parameterize instead of copy-pasting or looping.** `@Test(arguments: [...])` runs each case independently, in parallel, individually re-runnable, with the failing argument named in the results. Two argument collections produce the full cross product — use `zip()` when you want matched pairs instead.
- **Traits carry intent:** `.enabled(if:)` / `.disabled("reason")` for conditions (never comment a test out — a disabled test still compiles), `.bug(url)` for tracking, `.tags(...)` to relate tests across files and targets, `.timeLimit`, `.serialized` when a test genuinely can't run in parallel. Use `@available` rather than a runtime `#available` check so the testing library knows.
- **`withKnownIssue { }`** for a test failing on something outside your control — it keeps compiling and running and tells you when the issue is fixed, unlike `.disabled`.
- **`confirmation`** for callbacks that fire N times; `withCheckedContinuation` for one-shot callbacks with no async overload.
- **Tests run in parallel by default, in randomized order.** That's a feature: it surfaces hidden inter-test dependencies. Refactor rather than reaching for `.serialized`.
- **Exit tests** — `#expect(processExitsWith: .failure) { ... }` — cover `precondition`/`fatalError` paths in an isolated child process. macOS, Linux, FreeBSD, Windows only.
- Migrating: both frameworks coexist in one target, so migrate incrementally and write new tests in Swift Testing today. **Test framework interoperability** (swift-testing ST-0021; check your Xcode version for availability) lets helpers that wrap `XCTFail` be called from Swift Testing tests and vice versa; set the mode to **complete** or **strict** (not **limited**, and never **none**) so cross-framework issues stay errors and point you at the `Issue.record` replacement.

---

## 12. Macros

Reach for a macro when you're writing code the compiler could derive — and only then.

- **Macros are type-checked before expansion.** Arguments are checked against the macro's declared signature, so misuse is a clean error at the call site, not a mess inside generated code.
- **Freestanding (`#foo`)** produce an expression or declaration. **Attached (`@Foo`)** augment a declaration in one of five roles: member, peer, accessor, member-attribute, conformance. Roles compose — `@Observable` is member + member-attribute + conformance.
- **Test macros as pure syntax-tree transforms** with `assertMacroExpansion`. It's the fastest loop, and it's how you avoid bugs in code nobody reads. Set a breakpoint in `expansion` and `po` the syntax node to learn its shape.
- **Emit real diagnostics when the macro doesn't apply.** Throw an error, or use `context.addDiagnostic` for warnings and fix-its at a specific location. Never let a macro silently generate code that won't compile.
- Expanded code is ordinary Swift: inspectable ("Expand Macro"), debuggable, steppable.

---

## 13. Logging and debugging

- **`Logger` from `os`, not `print`.** Create one per subsystem and category. Messages are stored in an optimized form and only rendered when displayed, so logging is cheap enough to leave in.
- **Non-numeric interpolations are redacted by default.** Opt in per value with `privacy: .public` only for data that is genuinely not personal. Use `.private(mask: .hash)` when you need to correlate values without exposing them.
- **Levels control persistence and cost:** `debug` (never persisted, fastest — the message construction is optimized away entirely when not streaming), `info`, `notice` (default), `error`, `fault` (most persistent, slowest). Log at `error`/`fault` for the things you'll want in a bug report.
- **Log a correlation ID** (a task or request UUID) and you can filter a whole failure's history out of a device log archive without reproducing it. `log collect --device --start ...`, then filter by subsystem in Console.
- `format:` and `align:` are free — use them so logs are readable and column-selectable.
- LLDB understands Swift tasks: it steps through `await` across threads, `swift task info` shows priority and children, and named tasks show up in both the debugger and Instruments' Swift Concurrency template.

---

## 14. Unsafe code and interop

- **"Unsafe" means the API cannot fully validate its input, so violating its preconditions is undefined behavior** — not that it crashes. Safe APIs _do_ trap deliberately; a clean fatal error is the safe outcome.
- **Prefer `Span` over `Unsafe*Pointer`.** Since Swift 6.2 there is a safe, non-escaping, equally fast way to get at contiguous storage. Reserve raw pointers for C interop.
- If you must use pointers: keep the unsafe region as small as possible, use **buffer** pointers (address + count) rather than bare pointers so bounds are tracked, never let a pointer escape the closure that vends it, and run the **Address Sanitizer**.
- Enable **strict memory safety** in security-critical modules — it forces every unsafe use to be acknowledged in source, which is what makes an audit possible. Swift 6.4's `@diagnose` attribute (unreleased) lets you turn it on for individual functions.
- **Interop is bidirectional and incremental.** C, Objective-C, and C++ types map into Swift directly (including C++ value semantics, containers as Swift collections, and move-only types as `~Copyable`). Swift 6.3's `@c` attribute exposes Swift functions back to C (with `@implementation` when the declaration already exists in a header). Adopt Swift one file at a time; don't rewrite.

---

## 15. Modern syntax you should be using

Agents routinely write the older, longer form of all of these.

**Rows marked ⚠ are Swift 6.4, which has not shipped.** The current release is 6.3.x. Their proposals are accepted and implemented in main, so they are safe to plan around and unsafe to write today — check the project's toolchain before using one, and prefer the older form if it targets 6.3 or earlier.

| Instead of                                                            | Write                                                                                                    | Since |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----- |
| Nested ternaries; an immediately-called closure to initialize a `let` | `if`/`switch` **expressions**                                                                            | 5.9   |
| Overloads for 1, 2, 3… arguments                                      | **parameter packs** (`each T`), and `for` over a pack                                                    | 5.9   |
| `ObservableObject` + `@Published` on every property                   | **`@Observable`**                                                                                        | 5.9   |
| Polling an object for changes                                         | **`Observations { ... }`** — an `AsyncSequence` of transactional updates                                 | 6.2   |
| `NotificationCenter` with stringly-typed `userInfo`                   | concrete notification types (`MainActorMessage` / `AsyncMessage`)                                        | 6.2   |
| `Process` + pipes for scripting                                       | the **Subprocess** package (`AsyncBufferSequence.strings()` for line-by-line output; 1.0 lands with 6.4) | 6.2+  |
| Hand-rolled string index math                                         | **Swift Regex** — literals for brevity, `RegexBuilder` for structure                                     | 5.7   |
| `[String]` of fixed size in a hot path                                | **`InlineArray<N, T>`**                                                                                  | 6.2   |
| `withUnsafeBufferPointer`                                             | **`.span`** / **`.bytes`** (`RawSpan`) / `OutputSpan`                                                    | 6.2   |
| Manual `Task.isCancelled` juggling to finish a write                  | `Task` **cancellation shield** (SE-0504)                                                                 | 6.4 ⚠ |
| Rebuilding a dictionary by hand to use the key                        | **`mapKeyedValues`**                                                                                     | 6.4 ⚠ |
| `@available(iOS ..., macOS ..., tvOS ..., watchOS ..., visionOS ...)` | **`@available(anyAppleOS ...)`**                                                                         | 6.4 ⚠ |
| `Rocket.SaturnV` when a type shadows a module                         | **module selector** `Rocket::SaturnV`                                                                    | 6.3   |
| Blanket "warnings as errors"                                          | **`@diagnose`** per declaration / warning group                                                          | 6.4 ⚠ |
| `@unchecked Sendable` because of a `weak var`                         | `weak let`; or state non-sendability with **`~Sendable`**                                                | 6.4 ⚠ |
| Manually parsing binary formats with pointers                         | **Swift Binary Parsing** (`ParserSpan`, overflow-checked parsing initializers)                           | 6.2   |
| Awkward test function names                                           | **raw identifiers**: `` @Test func `fruits have a tropical climate`() ``                                 | 6.0   |

Also worth knowing: **Swift Regex parsers compose with Foundation's real parsers** (`.date(...)`, `.currency(...)`) — never hand-roll date or number parsing inside a regex. Make the locale explicit rather than inheriting the system's. And use `NegativeLookahead` or `Local` (atomic groups) to stop a pattern backtracking across a whole input.

---

## 16. Migrating an existing codebase to Swift 6

The order matters, and mixing steps is how migrations stall.

1. **Build with the new compiler first.** Source compatibility means this should just work, in Swift 5 mode.
2. **Per target, enable complete concurrency checking** (Swift 5 mode + all Swift 6 warnings). Start with the **UI/app layer**, not the frameworks below it — much of it is already main-actor-annotated by the SDK, so the fix rate is high.
3. **Fix the warnings, cheapest first.** Expect hundreds of warnings from a handful of root causes: `var` globals that should be `let`, free functions that belong on `@MainActor`, one public struct that needs `: Sendable`. A single line can clear dozens.
4. **Flip the target to the Swift 6 language mode** to lock the work in.
5. **Move to the next target and repeat.**
6. **Refactor afterwards, separately.** Never combine a significant refactor with enabling data-race safety — you'll have to back out both.

You can turn strict checking back off and ship; every fix you made is a genuine improvement that survives. Enable **Approachable Concurrency** and, for app modules, main-actor-by-default _before_ you start — both dramatically reduce the number of errors you'll see, and Xcode ships migration tooling that applies many of the changes for you (swift.org/migration).

---
