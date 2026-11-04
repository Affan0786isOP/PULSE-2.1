import { describe, expect, it } from 'vitest';
import {
  calculateDirectionalProfile,
  calculateDirectionHeatmap,
  calculateDirectionAttemptOutcomes,
  calculateDirectionDerivedConsistency,
  calculateDirectionTrialProgression,
  type DirectionSessionRecord,
} from '../../shared/dataset/analytics';

describe('Direction Dataset Analytics', () => {
  const mockSessions: DirectionSessionRecord[] = [
    {
      id: 'sess-1',
      device: 'desktop',
      ageGroup: 'Young adults (18–25)',
      accuracy: 90,
      medianReactionTime: 450,
      averageReactionTime: 470,
      progressionTrials: [
        { trialNumber: 1, targetDirection: 'UP', reactionTime: 420, accuracy: 1 },
        { trialNumber: 2, targetDirection: 'RIGHT', reactionTime: 460, accuracy: 1 },
        { trialNumber: 3, targetDirection: 'DOWN', reactionTime: 500, accuracy: 1 },
        { trialNumber: 4, targetDirection: 'LEFT', reactionTime: 380, accuracy: 0, validity: 'INCORRECT' },
      ],
    },
    {
      id: 'sess-2',
      device: 'mobile',
      ageGroup: 'Middle-aged adults (41–60)',
      accuracy: 75,
      medianReactionTime: 620,
      averageReactionTime: 650,
      progressionTrials: [
        { trialNumber: 1, targetDirection: 'UP', reactionTime: 600, accuracy: 1 },
        { trialNumber: 2, targetDirection: 'RIGHT', reactionTime: 640, accuracy: 1 },
        { trialNumber: 3, targetDirection: 'DOWN', reactionTime: 700, accuracy: 0, validity: 'INCORRECT' },
        { trialNumber: 4, targetDirection: 'LEFT', reactionTime: 20, falseStart: true },
        { trialNumber: 4, targetDirection: 'LEFT', reactionTime: 580, accuracy: 1 },
      ],
    },
  ];

  it('calculates directional profile for all 4 cardinal axes independently', () => {
    const profile = calculateDirectionalProfile(mockSessions);
    expect(profile).toHaveLength(4);
    const up = profile.find((p) => p.direction === 'UP')!;
    expect(up.totalAttempts).toBe(2);
    expect(up.correctAttempts).toBe(2);
    expect(up.accuracy).toBe(100);
    expect(up.medianRT).toBe(510); // (420 + 600) / 2
  });

  it('calculates 4x5 heatmap cells and respects session boundaries without individual dots', () => {
    const { cells, maxCount, totalSessions } = calculateDirectionHeatmap(mockSessions);
    expect(totalSessions).toBe(2);
    expect(cells).toHaveLength(20);
    // sess-1: acc=90, rt=450 -> '90–100%' and '300–500ms'
    const cell1 = cells.find((c) => c.accuracyBand === '90–100%' && c.rtBand === '300–500ms');
    expect(cell1?.count).toBe(1);
    // sess-2: acc=75, rt=620 -> '70–80%' and '500–700ms'
    const cell2 = cells.find((c) => c.accuracyBand === '70–80%' && c.rtBand === '500–700ms');
    expect(cell2?.count).toBe(1);
    expect(maxCount).toBe(1);
  });

  it('calculates mutually exclusive attempt outcomes including retries and timeouts', () => {
    const outcomes = calculateDirectionAttemptOutcomes(mockSessions);
    expect(outcomes.totalAttempts).toBe(9); // 4 in sess-1 + 5 in sess-2
    expect(outcomes.correct).toBe(6);
    expect(outcomes.incorrect).toBe(2);
    expect(outcomes.premature).toBe(1);
    expect(outcomes.timeout).toBe(0);
    expect(outcomes.correct + outcomes.incorrect + outcomes.premature + outcomes.timeout).toBe(outcomes.totalAttempts);
  });

  it('derives consistency from valid RT variance using coefficient of variation', () => {
    const consistencies = calculateDirectionDerivedConsistency(mockSessions);
    expect(consistencies).toHaveLength(2);
    expect(consistencies[0].device).toBe('desktop');
    expect(consistencies[0].consistency).toBeGreaterThan(0);
    expect(consistencies[0].consistency).toBeLessThanOrEqual(100);
  });

  it('calculates population trial progression resolving retries at logical-trial level', () => {
    const progression = calculateDirectionTrialProgression(mockSessions, 4);
    expect(progression).toHaveLength(4);
    // Trial 1: sess-1 has 420, sess-2 has 600 -> median = 510
    expect(progression[0].trialLabel).toBe('Trial 1');
    expect(progression[0].overall).toBe(510);
    expect(progression[0].n).toBe(2);
    // Trial 4: sess-2 has false start retry, latest valid is 580. sess-1 had incorrect trial (RT not valid correct).
    // sess-2 is the only valid correct attempt on Trial 4 -> RT = 580, n=1
    expect(progression[3].trialLabel).toBe('Trial 4');
    expect(progression[3].overall).toBe(580);
    expect(progression[3].n).toBe(1);
  });
});
