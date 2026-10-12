import { describe, expect, it } from 'vitest';
import {
  isOptedInLeaderboardUser,
  isValidLeaderboardScoreMetric,
  normalizeLeaderboardAssessmentType,
  validateLeaderboardDisplayName,
} from '../../shared/domain/leaderboardEligibility';

describe('shared leaderboard assessment normalization', () => {
  it.each([
    ['reaction-test', 'visual-reaction'],
    ['visual_reaction', 'visual-reaction'],
    ['direction-reflex', 'direction'],
    ['colour-test', 'color-recognition'],
    ['color-rec', 'color-recognition'],
    ['block-memory-test', 'block-memory'],
    ['number', 'number-memory'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeLeaderboardAssessmentType(input)).toBe(expected);
  });

  it('returns null for unknown or non-string assessment types', () => {
    expect(normalizeLeaderboardAssessmentType('made-up-test')).toBeNull();
    expect(normalizeLeaderboardAssessmentType(null)).toBeNull();
    expect(normalizeLeaderboardAssessmentType(42)).toBeNull();
  });
});

describe('leaderboard display names', () => {
  it.each(['', '   ', 'Guest', 'Anonymous', 'Unknown', 'Participant 12', 'http://example.com', 'person@example.com', 'Ahmed1234567', 'bad\u202Ename', '<script>', 'shit', 'shit'])(
    'rejects unsafe or ineligible alias %j',
    (alias) => expect(validateLeaderboardDisplayName(alias).valid).toBe(false)
  );

  it('normalizes Unicode and whitespace before publishing', () => {
    expect(validateLeaderboardDisplayName('  Ａffan   Khan  ')).toMatchObject({ valid: true, normalized: 'Affan Khan' });
    expect(validateLeaderboardDisplayName('أحمد')).toMatchObject({ valid: true, normalized: 'أحمد' });
  });

  it('allows a safe participant alias and matches the public visibility rule', () => {
    expect(validateLeaderboardDisplayName('PULSE learner-7')).toMatchObject({ valid: true, normalized: 'PULSE learner-7' });
    expect(isOptedInLeaderboardUser('PULSE learner-7')).toBe(true);
    expect(isOptedInLeaderboardUser(' Anonymous ')).toBe(false);
  });

  it('rejects aliases longer than 30 Unicode code points', () => {
    expect(validateLeaderboardDisplayName('abcdefghijklmnopqrstuvwxyzabcde').valid).toBe(false);
  });
});

describe('leaderboard score eligibility', () => {
  it.each([
    ['visual-reaction', 50, true],
    ['direction', 10000, true],
    ['color-recognition', 49.9, false],
    ['visual-reaction', 10000.1, false],
    ['block-memory', 1, true],
    ['number-memory', 150, true],
    ['number-memory', 151, false],
    ['block-memory', 2.5, false],
    ['number-memory', 0, false],
    ['number-memory', Number.NaN, false],
    ['made-up-test', 50, false],
  ])('%s score %s is valid=%s', (type, score, valid) => {
    expect(isValidLeaderboardScoreMetric(type, score)).toBe(valid);
  });
});
