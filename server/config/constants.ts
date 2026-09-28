export const VALID_AGE_GROUPS = [
  'Children (8–12)',
  'Adolescents (13–17)',
  'Young adults (18–25)',
  'Adults (26–40)',
  'Middle-aged adults (41–60)',
  'Older adults (61–75)',
  'Seniors (76+)'
];

export const VALID_ASSESSMENT_TYPES = [
  'visual-reaction',
  'direction',
  'color-recognition',
  'block-memory',
  'number-memory'
];

// Constants & Limits
export const MAX_TRIALS_PER_SESSION = 100;
export const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
export const MAX_IDEMPOTENCY_ENTRIES = 5000;

export const VRT_SHORT_FOREPERIOD_MIN_MS = 100;
export const VRT_SHORT_FOREPERIOD_MAX_MS = 500;
export const VRT_LONG_FOREPERIOD_MIN_MS = 501;
export const VRT_LONG_FOREPERIOD_MAX_MS = 3000;
