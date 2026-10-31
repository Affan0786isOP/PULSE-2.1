export const CANONICAL_ASSESSMENT_IDS = [
  'visual-reaction',
  'direction',
  'color-recognition',
  'block-memory',
  'number-memory',
] as const;

export type AssessmentId = (typeof CANONICAL_ASSESSMENT_IDS)[number];
export type AssessmentType = AssessmentId;

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



/**
 * Version metadata scoped to canonical assessment protocols.
 * Raw-latency scoring changes in v1.1.0; memory scoring and schema remain v1.0.0.
 */
export function getAssessmentVersionMetadata(assessmentType: string) {
  if (!(CANONICAL_ASSESSMENT_IDS as readonly string[]).includes(assessmentType)) {
    throw new Error(`Unsupported canonical assessment type: ${assessmentType}`);
  }

  const isRawLatencyAssessment =
    assessmentType === 'visual-reaction' ||
    assessmentType === 'direction' ||
    assessmentType === 'color-recognition';

  return {
    assessmentVersion: 'v1.0.0',
    protocolVersion: isRawLatencyAssessment ? 'v1.1.0' : 'v1.0.0',
    datasetSchemaVersion: 'v1.0.0',
    metricsVersion: isRawLatencyAssessment ? 'v1.1.0' : 'v1.0.0',
  };
}
