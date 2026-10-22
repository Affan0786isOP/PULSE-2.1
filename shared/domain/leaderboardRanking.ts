export interface LeaderboardRankableEntry {
  id: string;
  assessmentType: string;
  scoreMetric: number;
}

const SPEED_ASSESSMENTS = new Set([
  'visual-reaction',
  'direction',
  'color-recognition'
]);

function scoreDisplayKey(entry: LeaderboardRankableEntry): string {
  return SPEED_ASSESSMENTS.has(entry.assessmentType)
    ? entry.scoreMetric.toFixed(2)
    : String(entry.scoreMetric);
}
const rankCache = new WeakMap<readonly LeaderboardRankableEntry[], Map<LeaderboardRankableEntry, number>>();

/**
 * Uses competition ranking for values that are identical at displayed precision:
 * 1, 1, 3. Speed metrics are compared at their displayed two-decimal precision;
 * memory metrics use their exact integer value.
 */
export function getDisplayedLeaderboardRank<T extends LeaderboardRankableEntry>(
  entries: readonly T[],
  entry: T
): number {
  let entriesMap = rankCache.get(entries);

  if (!entriesMap) {
    entriesMap = new Map<LeaderboardRankableEntry, number>();

    // Group entries by assessmentType
    const byType = new Map<string, T[]>();
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      let arr = byType.get(e.assessmentType);
      if (!arr) {
        arr = [];
        byType.set(e.assessmentType, arr);
      }
      arr.push(e);
    }

    // For each group, compute competition ranks in O(N)
    for (const typeEntries of byType.values()) {
      const firstIndexByKey = new Map<string, number>();
      for (let i = 0; i < typeEntries.length; i++) {
        const e = typeEntries[i];
        const key = scoreDisplayKey(e);
        if (!firstIndexByKey.has(key)) {
          firstIndexByKey.set(key, i);
        }
        // Competition rank is the index of the first occurrence + 1
        entriesMap.set(e, firstIndexByKey.get(key)! + 1);
      }
    }

    rankCache.set(entries, entriesMap);
  }

  const rank = entriesMap.get(entry);
  if (rank !== undefined) {
    return rank;
  }

  // Edge case: the entry is not in the array but might be evaluated against it.
  const sameAssessmentEntries = entries.filter(candidate => candidate.assessmentType === entry.assessmentType);
  const key = scoreDisplayKey(entry);
  const firstIndex = sameAssessmentEntries.findIndex(candidate => scoreDisplayKey(candidate) === key);
  if (firstIndex >= 0) return firstIndex + 1;
  return sameAssessmentEntries.indexOf(entry) + 1;
}
