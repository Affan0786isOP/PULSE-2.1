import { describe, expect, it } from 'vitest';
import { normalizeAssessmentType } from '../../server/engines/assessmentTypes';
import {
  isOptedInLeaderboardUser,
  isValidLeaderboardScoreMetric,
  normalizeLeaderboardAssessmentType,
  safeLeaderboardDisplayNameForRead,
  validateLeaderboardDisplayName,
} from '../../shared/domain/leaderboardEligibility';

describe('server assessment type normalization wrapper', () => {
  it.each([
    ['visual-reaction', 'visual-reaction'],
    ['reaction-test', 'visual-reaction'],
    ['direction', 'direction'],
    ['direction-test', 'direction'],
    ['color-recognition', 'color-recognition'],
    ['color-test', 'color-recognition'],
    ['block-memory', 'block-memory'],
    ['number-memory', 'number-memory'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeAssessmentType(input)).toBe(expected);
  });

  it('normalizes whitespace and underscores without corrupting canonical IDs', () => {
    expect(normalizeAssessmentType(' visual_reaction ')).toBe('visual-reaction');
    expect(normalizeAssessmentType('direction_test')).toBe('direction');
  });

  it('does not silently convert unknown types to Visual Reaction', () => {
    expect(normalizeAssessmentType('made-up-test')).toBe('made-up-test');
  });
});

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
  it.each(['', '   ', '.', '-', '_', '\u0301', '._-', 'Guest', 'Anonymous', 'Unknown', 'Participant 12', 'http://example.com', 'person@example.com', 'Ahmed1234567', 'bad\u202Ename', '<script>', 'shit', 'shit'])(
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

  it.each(['Dick', 'Bot', 'Admin', 'Staff', 'Sex'])(
    'does not reject an ordinary word or name merely because it appears on an overbroad blocklist: %s',
    alias => expect(validateLeaderboardDisplayName(alias)).toMatchObject({ valid: true, normalized: alias })
  );

  it('screens profanity hidden by separators, digits, suffixes, prefixes, or confusable letters', () => {
    for (const alias of ['sh1t', 'ѕһіt', 'fuck123', 'shitty', 'xXfuckXx', 'f u c k', 'f.u.c.k', 'b1tch', 'Ass Hole']) {
      expect(validateLeaderboardDisplayName(alias).valid, alias).toBe(false);
    }
  });

  it.each(['fuckboi', 'Fuckwit', 'shitface', 'motherfucker', 'dumbshit', 'asshat', 'fuckers', 'motherfucking'])(
    'rejects clear compound profanity on submission and public read: %s',
    alias => {
      expect(validateLeaderboardDisplayName(alias).valid, alias).toBe(false);
      expect(safeLeaderboardDisplayNameForRead(alias), alias).toBeNull();
    }
  );

  it('rejects obfuscated generic aliases consistently on writes and reads', () => {
    for (const alias of ['Аnonymous', 'Anonymоus', 'a n o n y m o u s', 'g.u.e.s.t', 'participant-123']) {
      expect(validateLeaderboardDisplayName(alias).valid, alias).toBe(false);
      expect(safeLeaderboardDisplayNameForRead(alias), alias).toBeNull();
    }
  });

  it.each([
    'Harshit', 'Harshita', 'Ishita', 'Kshitij', 'Kshitiz', 'Akshit',
    'Akshita', 'Nishit', 'Nishita', 'Shital', 'Shitij', 'Rishit',
    'Vanshita', 'Anshita', 'Shitanshu', 'Push It', 'Fish It', 'Mass Holes', 'Class Hole',
    'Scunthorpe', 'Snigger', 'Therapist', 'Dick', 'Admin', 'Bot', 'Staff', 'Sex',
  ])('allows legitimate names and phrases containing profanity-like substrings: %s', alias => {
    expect(validateLeaderboardDisplayName(alias), alias).toMatchObject({ valid: true, normalized: alias });
    expect(safeLeaderboardDisplayNameForRead(alias), alias).toBe(alias);
  });

  it('keeps obfuscated legacy aliases out of the stricter new-submission evasion filter', () => {
    for (const alias of ['fuck123', 'xXfuckXx', 'f u c k', 'f.u.c.k', 'b1tch']) {
      expect(validateLeaderboardDisplayName(alias).valid, alias).toBe(false);
      expect(safeLeaderboardDisplayNameForRead(alias), alias).toBe(alias);
    }
  });

  it('preserves safe legacy aliases with punctuation and emoji while rejecting clearly unsafe values', () => {
    expect(safeLeaderboardDisplayNameForRead('Legacy Player! 🙂')).toBe('Legacy Player! 🙂');
    expect(safeLeaderboardDisplayNameForRead('Díck')).toBe('Díck');
    expect(safeLeaderboardDisplayNameForRead('bad\u202Ename')).toBeNull();
    expect(safeLeaderboardDisplayNameForRead('https://example.com')).toBeNull();
    expect(safeLeaderboardDisplayNameForRead('Anonymous')).toBeNull();
    expect(safeLeaderboardDisplayNameForRead('ѕһіt')).toBeNull();
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
