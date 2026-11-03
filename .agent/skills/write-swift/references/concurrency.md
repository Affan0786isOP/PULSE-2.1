# Swift 6 Concurrency & Sendable

## 3. Concurrency: stay single-threaded until profiling says otherwise

This is the section agents get wrong most often, because the model changed in Swift 6.2.

Start every app entirely on the main thread. Single-threaded code goes a long way, and most apps never need to leave it.

**The progression, in order. Do not skip steps.**

1. **Single-threaded on the main actor.** No concurrency at all. Fine for most apps.
2. **`async`/`await`** to hide latency (network, disk). Still no concurrency of your own — SDK APIs like `URLSession.data(from:)` offload on your behalf.
3. **`@concurrent`** to move _your_ expensive work off the main thread — only after Instruments shows a hang.
4. **`actor`** to move _state_ off the main actor — only when too much main-actor state is forcing tasks to hop back constantly.

**Turn on the right build settings first.** Enable **Approachable Concurrency** in every project. For app modules and UI-facing modules, also set **Default Actor Isolation** to **MainActor** — it's the default for new app projects in Xcode 26, and it deletes most of your `@MainActor` annotations. In a package: `swiftSettings: [.defaultIsolation(MainActor.self)]`. **Do not set main-actor-by-default for a general-purpose library** — libraries should ship `nonisolated` APIs and let clients decide where work runs.

### The rule that changed

**In Swift 6.2, marking a function `async` does _not_ move it off the current actor.** It runs where it was called from. This is what makes "the most natural code to write" data-race free by default.

- **`@concurrent`** — always switches to the concurrent thread pool. Use it on _your_ CPU-heavy work.
- **`nonisolated`** — runs wherever it's called from. **This is the right default for library APIs**, because the caller decides. `nonisolated` on a type makes all its members nonisolated (Swift 6.1+).
- Neither one — stays on the caller's actor.

```swift
nonisolated struct PhotoProcessor {          // decoupled from the main actor
  @concurrent                                // guaranteed to run in the background
  func process(_ data: Data) async -> ProcessedPhoto {
    async let sticker = extractSticker(data)  // two independent jobs, in parallel
    async let colors  = extractColors(data)
    return await ProcessedPhoto(sticker: sticker, colors: colors)
  }
}
```

- **Profile before you offload.** Use Instruments (Time Profiler, hangs). If the code can be made faster without concurrency, always do that first. Concurrency has real cost — task allocation, scheduling, and reasoning.
- **Don't spawn a task for trivial work.** A child task to read a `UserDefaults` value costs more than it saves.
- **One task per end-to-end operation.** Work that must happen in order goes in _one_ task; independent operations get separate tasks so the runtime can interleave them.
- **`await` is a suspension point, and it breaks atomicity.** State can change while you're suspended, and you may resume on a different thread. Re-check assumptions after every `await`. Never hold a lock across one. Never rely on thread-local storage across one.

### Actor reentrancy

Actors guarantee mutual exclusion, not transactions. Between two `await`s on the same actor, other work runs.

- **Mutate actor state in synchronous methods.** Synchronous code on an actor runs to completion uninterrupted — that's your transaction boundary.
- **Keep async actor methods thin**, composed of synchronous transactional operations, and leave the actor in a consistent state at every `await`.
- The classic bug: check cache → `await` download → write cache. Two tasks both miss, both download, the second clobbers the first. Re-check after the `await`, or dedupe the in-flight work.
- **Actors are not FIFO.** They run highest-priority work first, precisely to avoid priority inversion. If you need ordering, use a task (which runs start to finish) or an `AsyncStream`, not an actor.

---

## 4. Sendable and sharing data

`Sendable` marks a type safe to share across isolation domains. The compiler checks it at every task and actor boundary.

- **Value types are `Sendable` when their storage is** — inferred automatically for non-public types. **Public types never get inferred sendability**: marking a public type `Sendable` is a promise to your clients, so Swift makes you write it.
- **Actors and `@MainActor` classes are implicitly `Sendable`**, because their state is isolated.
- **Most model classes should be neither `@MainActor` nor `Sendable`.** Keep them non-`Sendable` on purpose — it prevents half the model being mutated on the main thread while the other half is mutated in the background. If they need to leave the main actor, make them `nonisolated`, not `Sendable`.
- **You can still _send_ a non-`Sendable` object between domains** as long as the sender stops using it. Make all your mutations _before_ handing it off; touching it afterward is the error.
- Closures capture state too. Only mark a function type `@Sendable` if it genuinely crosses domains.
- **`@unchecked Sendable` is a promise the compiler can't check.** Reserve it for types with real internal synchronization (a `Mutex`, a lock). Same for `nonisolated(unsafe)` on a global — last resort, not a warning silencer.

**When you hit a data-race error, work down this list:**

1. **Don't share it.** Move the shared object into a local so each concurrent job gets its own instance. (This is the fix for the overwhelming majority of real errors.)
2. **Make it a `Sendable` value type**, so "sharing" is really copying.
3. **Isolate it to an actor** — the main actor, or your own.
4. Only then reach for `Mutex`/`Atomic` from the `Synchronization` module (store them in `let` properties), or `@unchecked Sendable`.

**Global and static variables are the most common source of errors.** In order of preference: make it a `let`; put it on `@MainActor`; wrap it in a `Mutex`; `nonisolated(unsafe)`. Note globals in Swift are initialized lazily _and_ atomically — unlike C.

**Bridging old callback APIs:** annotate delegate protocols with `@MainActor` if you own them. If you don't, mark the method `nonisolated` and use `MainActor.assumeIsolated { }` — it asserts rather than hopping, so it traps loudly instead of racing silently. `@preconcurrency` on the conformance is the shorthand for the same thing. Use `@preconcurrency import` to temporarily silence sendability warnings from a module that hasn't migrated; the warnings come back — correctly — once it does.

---

## 5. Structured concurrency

Always prefer structured tasks.

Structured tasks (`async let`, task groups) are scoped like local variables: they can't outlive the block, they're awaited automatically, and they inherit cancellation, priority, and task-local values through the task tree. Unstructured tasks (`Task { }`, `Task.detached`) give you none of that automatically.

- **`async let`** for a fixed, statically known number of concurrent children.
- **`withTaskGroup`** when the number is dynamic. Task groups conform to `AsyncSequence` — iterate results as they land. Use **`withDiscardingTaskGroup`** when children return nothing: it frees each child's resources immediately and cancels siblings on the first error.
- **`Task { }`** only when the work's lifetime doesn't fit a scope — reacting to a delegate callback, a button tap, a view appearing. It inherits actor isolation and priority; you must manage cancellation yourself.
- **`Task.detached`** almost never. It inherits nothing — not isolation, not priority, not task-locals. If you need a detached root, put a task group _inside_ it rather than detaching repeatedly.

**Cancellation is cooperative.** Cancelling sets a flag; it stops nothing. Check `Task.isCancelled` or `try Task.checkCancellation()` **before starting expensive work**, and in synchronous helpers too. For work that's suspended rather than running (an `AsyncSequence`'s `next()`), use `withTaskCancellationHandler` — and remember the handler runs immediately and concurrently with the body, so the state it touches needs real synchronization (an atomic or a lock, not an actor — you can't guarantee ordering on an actor).

**Bound your concurrency.** Don't fan out one child per item over an unbounded list. Start N children, then add a new one each time one finishes.

**Task-local values** (`@TaskLocal`) propagate context — a request ID, a trace span — down the task tree without threading a parameter through every signature. Make them optional so unbound reads have a sensible default.

**Bridging callbacks:** `withCheckedContinuation` / `withCheckedThrowingContinuation`. The contract is **resume exactly once on every path** — never resuming hangs the caller forever; resuming twice is a fatal error. For delegate APIs that fire later, store the continuation and nil it out when you resume. (Swift 6.4 — unreleased — adds a `Continuation` type that checks single-resumption at compile time.)

**`AsyncSequence`:** iterate with `for await` / `for try await`. Adapt an existing handler- or delegate-based API with `AsyncStream` / `AsyncThrowingStream` — construct the source inside the closure, `yield` from the handler, and clean up in `onTermination`.

---

## 6. Concurrency in SwiftUI

- **`View` is `@MainActor`-isolated**, and so is everything it contains, including your `@State`. You almost never need to write `@MainActor` on a view or a view model — and with main-actor-by-default you can delete the ones you have.
- **SwiftUI deliberately runs some of your code off the main thread** to keep frames cheap. The signal is `@Sendable` in the API's signature: `visualEffect`, `Shape.path(in:)`, `Layout` requirements, `onGeometryChange`. When you hit an isolation error inside one of those closures, **don't send `self` — copy the one value you need into the closure's capture list.**

```swift
.visualEffect { [pulse] effect, proxy in    // copy the Bool, don't capture self
  effect.blur(radius: pulse ? 2 : 0)
}
```

- **SwiftUI's action callbacks are synchronous on purpose.** Time-sensitive UI updates — starting an animation in response to a gesture or a scroll event — must happen on the same frame as the event. Put the `withAnimation` state change in the synchronous callback; open a `Task` only for the long-running work that follows.
- **Put a piece of state on the seam between UI and async work.** The view kicks off a task; the async layer does a synchronous mutation when it finishes; the UI reacts. That keeps view logic synchronous and makes the async logic testable without importing SwiftUI.

---
