export const CANONICAL_ASSESSMENT_IDS = [
  'visual-reaction',
  'direction',
  'color-recognition',
  'block-memory',
  'number-memory',
] as const;

export type AssessmentId = (typeof CANONICAL_ASSESSMENT_IDS)[number];

export const VALID_AGE_GROUPS = [
  'Children (8–12)',
  'Adolescents (13–17)',
  'Young adults (18–25)',
  'Adults (26–40)',
  'Middle-aged adults (41–60)',
  'Older adults (61–75)',
  'Seniors (76+)',
] as const;

export type AgeGroup = (typeof VALID_AGE_GROUPS)[number];

export type DeviceCategory = 'desktop' | 'mobile';

export type MetricDirection = 'lower-is-better' | 'higher-is-better';

export type DomainName =
  | 'assessment'
  | 'research'
  | 'analytics'
  | 'leaderboard'
  | 'user'
  | 'administration';
