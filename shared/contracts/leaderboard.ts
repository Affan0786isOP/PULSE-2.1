import type { AssessmentId } from './common';

export interface LeaderboardQuery {
  assessmentId?: AssessmentId;
  limit?: number;
}
