## 2023-10-22 - [O(N^2) Leaderboard Ranking Map]
**Learning:** `getDisplayedLeaderboardRank` had O(N^2) complexity because when mapped over a leaderboard array, it filtered the entire array by assessmentType and then searched for the first appearance of the score using `findIndex`, repeating this process for every item.
**Action:** Used a `WeakMap` cached at module scope to precompute the ranks into an O(1) Map lookup upon the first evaluation of an array reference, bringing the rendering pass down to O(N).

## 2026-10-23 - [Bounded Legacy Leaderboard Ownership Backfill]
**Learning:** Legacy consumed sessions may point to the same retained leaderboard row, and unbounded concurrent ownership-link transactions can race to replace the row's private source-session association.
**Action:** Deduplicate candidate sessions by leaderboard document ID, prefer a unique matching submission ID, skip ambiguous legacy pointers, and process ownership-link transactions in batches of five. Keep all-assessment backfills sequential so the concurrency bound applies across the erasure workflow.

