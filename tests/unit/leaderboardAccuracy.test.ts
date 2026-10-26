import { describe, expect, it } from 'vitest';
import { normalizeLeaderboardAccuracy } from '../../shared/domain/leaderboardEligibility';

describe('normalizeLeaderboardAccuracy', () => {
  it('keeps values as canonical percentages', () => {
    expect(normalizeLeaderboardAccuracy({ accuracy: 60 })).toBe(60);
    expect(normalizeLeaderboardAccuracy({ accuracy: 0.5 })).toBe(0.5);
  });
  it('uses overallAccuracy for memory assessment metrics', () => {
    expect(normalizeLeaderboardAccuracy({ overallAccuracy: 83.33 })).toBe(83.33);
  });
  it('falls back only when the primary accuracy is invalid', () => {
    expect(normalizeLeaderboardAccuracy({ accuracy: 120, overallAccuracy: 75 })).toBe(75);
    expect(normalizeLeaderboardAccuracy({ accuracy: Number.NaN, overallAccuracy: 25 })).toBe(25);
  });
  it('returns null rather than fabricating zero', () => {
    expect(normalizeLeaderboardAccuracy({})).toBeNull();
    expect(normalizeLeaderboardAccuracy(null)).toBeNull();
    expect(normalizeLeaderboardAccuracy({ accuracy: -1 })).toBeNull();
    expect(normalizeLeaderboardAccuracy({ accuracy: 101 })).toBeNull();
    expect(normalizeLeaderboardAccuracy({ overallAccuracy: Infinity })).toBeNull();
  });
});
