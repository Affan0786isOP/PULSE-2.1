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

  it('calculates population trial progression resolving retries at logical-trial level for both speed and accuracy', () => {
    const progression = calculateDirectionTrialProgression(mockSessions, 4);
    expect(progression).toHaveLength(4);

    // Trial 1: sess-1 has 420 (correct), sess-2 has 600 (correct)
    // Speed: median = 510, n / overallN = 2
    // Accuracy: 2/2 = 100%, totalAttempts / accuracyN = 2
    expect(progression[0].trialLabel).toBe('Trial 1');
    expect(progression[0].overall).toBe(510);
    expect(progression[0].n).toBe(2);
    expect(progression[0].overallN).toBe(2);
    expect(progression[0].accuracy).toBe(100);
    expect(progression[0].totalAttempts).toBe(2);
    expect(progression[0].accuracyN).toBe(2);

    // Trial 3: sess-1 has 500 (correct), sess-2 has 700 (incorrect)
    // Speed: sess-1 only = 500 ms, overallN = 1
    // Accuracy: 1 correct out of 2 attempts = 50%, accuracyN = 2
    expect(progression[2].trialLabel).toBe('Trial 3');
    expect(progression[2].overall).toBe(500);
    expect(progression[2].overallN).toBe(1);
    expect(progression[2].accuracy).toBe(50);
    expect(progression[2].accuracyN).toBe(2);

    // Trial 4: sess-1 has 380 (incorrect), sess-2 has false start attempt then 580 (correct)
    // Speed: sess-2 only = 580, overallN = 1
    // Accuracy: 1 correct out of 2 logical trials = 50%, accuracyN = 2
    expect(progression[3].trialLabel).toBe('Trial 4');
    expect(progression[3].overall).toBe(580);
    expect(progression[3].n).toBe(1);
    expect(progression[3].overallN).toBe(1);
    expect(progression[3].accuracy).toBe(50);
    expect(progression[3].accuracyN).toBe(2);
  });

  it('handles trialsFallback with multiple sessions preserving distinct session groups', () => {
    const fallbackTrials = [
      { experimentId: 'exp-1', trialNumber: 1, reactionTime: 400, accuracy: 1 },
      { experimentId: 'exp-1', trialNumber: 2, reactionTime: 450, accuracy: 1 },
      { experimentId: 'exp-2', trialNumber: 1, reactionTime: 500, accuracy: 1 },
      { experimentId: 'exp-2', trialNumber: 2, reactionTime: 550, accuracy: 0, validity: 'INCORRECT' },
    ];
    const progression = calculateDirectionTrialProgression([], 2, fallbackTrials as any);
    expect(progression).toHaveLength(2);

    // Trial 1: exp-1 (400), exp-2 (500) -> median 450, 100% accuracy, n=2, attempts=2
    expect(progression[0].overall).toBe(450);
    expect(progression[0].overallN).toBe(2);
    expect(progression[0].accuracy).toBe(100);
    expect(progression[0].accuracyN).toBe(2);

    // Trial 2: exp-1 (450, correct), exp-2 (550, incorrect) -> median 450, 50% accuracy, overallN=1, accuracyN=2
    expect(progression[1].overall).toBe(450);
    expect(progression[1].overallN).toBe(1);
    expect(progression[1].accuracy).toBe(50);
    expect(progression[1].accuracyN).toBe(2);
  });
});
