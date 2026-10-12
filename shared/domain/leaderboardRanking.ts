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

/**
 * Uses competition ranking for values that are identical at displayed precision:
 * 1, 1, 3. Speed metrics are compared at their displayed two-decimal precision;
 * memory metrics use their exact integer value.
 */
export function getDisplayedLeaderboardRank<T extends LeaderboardRankableEntry>(
  entries: readonly T[],
  entry: T
): number {
  const key = scoreDisplayKey(entry);
  const firstIndex = entries.findIndex(candidate =>
    candidate.assessmentType === entry.assessmentType &&
    scoreDisplayKey(candidate) === key
  );
  if (firstIndex >= 0) return firstIndex + 1;
  return entries.indexOf(entry) + 1;
}
