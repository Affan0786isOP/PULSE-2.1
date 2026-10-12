import { normalizeLeaderboardAssessmentType } from '../../shared/domain/leaderboardEligibility';

export function normalizeAssessmentType(type: string): string {
  const normalizedInput = String(type || '').toLowerCase().trim().replace(/[_\\s]+/g, '-');
  return normalizeLeaderboardAssessmentType(normalizedInput) || normalizedInput;
}
