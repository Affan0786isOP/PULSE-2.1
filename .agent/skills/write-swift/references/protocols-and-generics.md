# Protocols, Generics, some vs any & API Design

## 7. Protocols and generics

Don't start with a class. **Don't start with a protocol either.**

The workflow: **write concrete types → notice repeated code across them → factor the shared capability into a protocol → write generic code against it.** Overloads with near-identical bodies are the signal that it's time to generalize.

- **A protocol with no per-type customization is a wasted protocol.** If every conformance would use the same default implementation, write a constrained extension on an existing protocol instead. Elaborate protocol hierarchies ("type zoology") cost compile time and binary size and buy nothing.
- **Prefer has-a to is-a.** If only some of a protocol's operations make sense for your type, don't refine it — wrap it in a generic struct and expose exactly the API you mean. (`GeometricVector<Storage: SIMD>` rather than `GeometricVector: SIMD`.)
- **A protocol requirement is a customization point** — it's dynamically dispatched, and a conforming type's implementation wins everywhere. **A method only in an extension is statically dispatched**, so a conformer's version _shadows_ rather than overrides it, and code that only knows `any P` calls the extension's. If a type should be able to customize something, make it a requirement.
- **Composition over inheritance.** Class inheritance is monolithic (one superclass), intrusive (you inherit stored properties and initializer complexity), and leaves unwritten contracts about what may be overridden and when to call super. Compose small values instead.
- **A forced downcast is a code smell** — it usually means a type relationship was lost to a class hierarchy or an existential.

### `some` vs `any`

- **Write `some P` by default. Change to `any P` when you need to store arbitrary types.** Same discipline as `let` before `var`.
- `some P` — one fixed underlying type per scope. You keep every type relationship, including associated types, and the compiler can specialize.
- `any P` — type-erased box, dynamic type varies at runtime. Needed for heterogeneous collections, for optionality of the underlying type, and to hide the abstraction entirely. You pay for it: associated-type relationships are erased to their upper bounds, and calls are opaque to the optimizer.
- **You cannot call a method that takes an associated type on an `any P`.** Erasure works in producing position (the result is erased to its upper bound) but not consuming position. The fix is to pass the existential into a function taking `some P` — the compiler unboxes it, and inside that scope the type is fixed again.
- **Constrained existentials and opaque types** — `some Collection<Element>`, `any Collection<any Animal>` — let you hide `LazyFilterSequence<[Animal]>` while still exposing the element type. Declare primary associated types on your own protocols (`protocol Container<Item>`) for the type callers actually supply, not for implementation details like `Iterator`.
- **Same-type requirements in `where` clauses** are how you pin down relationships across protocols (`where Self.CropType.FeedType == Self`). Without them, "grow then harvest" doesn't typecheck, and wrong conformances compile.

---

## 8. API design — clarity at the point of use

Clarity at the point of use is the goal that outranks every other one here.

- **No type prefixes in Swift-only APIs.** Modules disambiguate. Keep prefixes only where the API mirrors an Objective-C one. But avoid very general names from specific frameworks — they read badly out of context and force manual disambiguation.
- **Drop leading `get`** from async alternatives and from anything that returns its result directly. `persistentPosts`, not `getPersistentPosts`.
- **Access control is documentation.** `private` (file), `internal` (module, and the default), `package`, `public`. Being explicit at the boundary is what forces the sendability and API-evolution decisions above.
- **Design the model so illegal states can't be spelled.** Private setters plus a validating mutating method; enums for closed sets; a strongly typed `UUID` instead of a `String`.
- **Property wrappers** factor out an _access policy_ (`@Argument`, `@Published`, defensive copying, lazy, thread-local) so the declaration site states the policy in one word. Combine with `@dynamicMemberLookup` on a key path to project through a wrapper (that's how `$binding.title` works).
- **Result builders** for declarative DSLs. **Macros** when the boilerplate is code the compiler could have written (§12).

---
