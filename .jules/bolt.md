## 2023-10-22 - [O(N^2) Leaderboard Ranking Map]
**Learning:** `getDisplayedLeaderboardRank` had O(N^2) complexity because when mapped over a leaderboard array, it filtered the entire array by assessmentType and then searched for the first appearance of the score using `findIndex`, repeating this process for every item.
**Action:** Used a `WeakMap` cached at module scope to precompute the ranks into an O(1) Map lookup upon the first evaluation of an array reference, bringing the rendering pass down to O(N).
