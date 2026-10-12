import { describe, expect, it } from 'vitest';
import { getDisplayedLeaderboardRank } from '../../shared/domain/leaderboardRanking';

describe('displayed leaderboard ranking', () => {
  it('assigns shared competition ranks when speed scores display identically', () => {
    const entries = [
      { id: 'a', assessmentType: 'visual-reaction', scoreMetric: 200.001 },
      { id: 'b', assessmentType: 'visual-reaction', scoreMetric: 200.004 },
      { id: 'c', assessmentType: 'visual-reaction', scoreMetric: 205 }
    ];
    expect(entries.map(entry => getDisplayedLeaderboardRank(entries, entry))).toEqual([1, 1, 3]);
  });

  it('ranks memory scores in their exact integer display domain', () => {
    const entries = [
      { id: 'a', assessmentType: 'number-memory', scoreMetric: 8 },
      { id: 'b', assessmentType: 'number-memory', scoreMetric: 8 },
      { id: 'c', assessmentType: 'number-memory', scoreMetric: 7 }
    ];
    expect(entries.map(entry => getDisplayedLeaderboardRank(entries, entry))).toEqual([1, 1, 3]);
  });

  it('does not equate score values from different assessment types', () => {
    const entries = [
      { id: 'a', assessmentType: 'visual-reaction', scoreMetric: 200 },
      { id: 'b', assessmentType: 'number-memory', scoreMetric: 200 }
    ];
    expect(getDisplayedLeaderboardRank(entries, entries[1])).toBe(2);
  });
});
