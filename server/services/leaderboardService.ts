import { isValidLeaderboardScoreMetric as validateMetric } from '../../shared/domain/leaderboardEligibility';

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

export function isValidLeaderboardScoreMetric(assessmentType: string, scoreMetric: unknown): boolean {
  return validateMetric(assessmentType, scoreMetric);
}
