export interface AuthoritativeLeaderboardEntry {
  id: string;
  displayName: string;
  assessmentType: string;
  scoreMetric: number;
  ageGroup: string;
  createdAt: number;
  provenanceToken: string;
  hidden: boolean;
}

export function isOptedInLeaderboardUser(displayName: string | null | undefined): boolean {
  const trimmed = String(displayName || '').trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower === 'anonymous' || lower === 'unknown' || lower === 'guest') return false;
  if (lower.startsWith('participant')) return false;
  return true;
}

export function isValidLeaderboardScoreMetric(assessmentType: string, scoreMetric: unknown): boolean {
  if (typeof scoreMetric !== 'number' || !Number.isFinite(scoreMetric) || Number.isNaN(scoreMetric)) {
    return false;
  }
  const isSpeed = assessmentType === 'visual-reaction' || assessmentType === 'direction' || assessmentType === 'color-recognition';
  if (isSpeed) {
    return scoreMetric >= 50 && scoreMetric <= 10000;
  }
  if (assessmentType === 'block-memory' || assessmentType === 'number-memory') {
    return scoreMetric >= 1 && scoreMetric <= 150;
  }
  return scoreMetric >= 0 && scoreMetric <= 100;
}
