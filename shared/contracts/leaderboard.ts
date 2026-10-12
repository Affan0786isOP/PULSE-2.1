import type { AssessmentId } from './common';

export interface LeaderboardQuery {
  assessmentType?: AssessmentId;
  limit?: number;
}
