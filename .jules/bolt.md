## Performance Optimization: Parallelizing Queries with Promise.all

In `server/services/leaderboardAppService.ts`, the `backfillLegacyOwnership` method previously iterated through an array of items (sessions) using a `for...of` loop, awaiting a database call (`linkOwnerToEntry`) for each one sequentially. This created an N+1 query issue, where execution time grew linearly with the number of sessions due to blocking I/O on each iteration.

By refactoring this pattern to map the array of items to an array of promises and awaiting them concurrently using `Promise.all()`, we can execute all database calls in parallel. This significantly reduces total execution time and mitigates the N+1 bottleneck, representing a massive performance improvement, particularly for database operations or high-latency external API calls.
