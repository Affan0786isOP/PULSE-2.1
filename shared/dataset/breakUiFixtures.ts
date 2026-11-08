import type { DatasetObservation } from './types';

export type BreakUiDatasetMode = 'demo' | 'worst' | 'empty' | 'one' | 'huge';

export const BREAK_UI_EMPTY_DOCS: DatasetObservation[] = [];
export const BREAK_UI_EMPTY_TRIALS: any[] = [];

export const BREAK_UI_ONE_DOCS: DatasetObservation[] = [
  {
    id: 'break-ui-one-001',
    assessmentType: 'direction',
    ageGroup: '25-34',
    device: 'desktop',
    deviceCategory: 'desktop',
    inputModality: 'keyboard',
    displayRefreshRateHz: 60,
    medianReactionTime: 412,
    averageReactionTime: 412,
    accuracy: 100,
    overallAccuracy: 100,
    totalAttempts: 1,
    totalCorrect: 1,
    totalIncorrect: 0,
    totalFalseStarts: 0,
    consistency: 10,
    standardDeviation: 15,
    progressionTrials: [
      {
        trialNumber: 1,
        reactionTime: 412,
        direction: 'up',
        targetDirection: 'up',
        accuracy: 1,
        correct: true,
        valid: true,
        falseStart: false,
        timedOut: false,
      },
    ],
  },
];

export const BREAK_UI_ONE_TRIALS: any[] = [
  {
    id: 'trial-1',
    participantId: 'p-1',
    experimentId: 'exp-1',
    condition: 'standard',
    test: 'direction',
    trialNumber: 1,
    stimulusTimestamp: 1000,
    responseTimestamp: 1412,
    reactionTime: 412,
    accuracy: 1,
    correct: true,
    valid: true,
    falseStart: false,
    timedOut: false,
    direction: 'up',
    targetDirection: 'up',
  },
];

// Adversarial Worst-Case Dataset
// Hits extreme numbers, boundary violations, asymmetric devices, 0% accuracy, extreme latencies
export const BREAK_UI_WORST_DOCS: DatasetObservation[] = [
  // 1. Extreme Fast Outlier (near physiological floor, 100% correct)
  {
    id: 'worst-fast-001',
    assessmentType: 'direction',
    ageGroup: '18-24',
    device: 'desktop',
    deviceCategory: 'desktop',
    inputModality: 'keyboard',
    displayRefreshRateHz: 360,
    medianReactionTime: 82, // near 80ms minimum limit
    averageReactionTime: 85,
    accuracy: 100,
    overallAccuracy: 100,
    totalAttempts: 9999999, // Unbounded attempt count testing formatting/overflow
    totalCorrect: 9999999,
    totalIncorrect: 0,
    totalFalseStarts: 0,
    consistency: 1.2,
    standardDeviation: 2.1,
    progressionTrials: [
      { trialNumber: 1, reactionTime: 82, direction: 'up', targetDirection: 'up', accuracy: 1, correct: true, valid: true },
      { trialNumber: 2, reactionTime: 85, direction: 'down', targetDirection: 'down', accuracy: 1, correct: true, valid: true },
      { trialNumber: 3, reactionTime: 83, direction: 'left', targetDirection: 'left', accuracy: 1, correct: true, valid: true },
      { trialNumber: 4, reactionTime: 84, direction: 'right', targetDirection: 'right', accuracy: 1, correct: true, valid: true },
    ],
  },
  // 2. Extreme Slow Outlier (near timeout floor, 0% correct, mobile)
  {
    id: 'worst-slow-002',
    assessmentType: 'direction',
    ageGroup: '65+',
    device: 'mobile',
    deviceCategory: 'mobile',
    inputModality: 'touch',
    displayRefreshRateHz: 60,
    medianReactionTime: 2950, // extreme high RT (clamping indicator test)
    averageReactionTime: 2980,
    accuracy: 0, // 0% accuracy test
    overallAccuracy: 0,
    totalAttempts: 10,
    totalCorrect: 0,
    totalIncorrect: 10,
    totalFalseStarts: 0,
    consistency: 85.5,
    standardDeviation: 350,
    progressionTrials: [
      { trialNumber: 1, reactionTime: 2950, direction: 'up', targetDirection: 'down', accuracy: 0, correct: false, valid: true },
      { trialNumber: 2, reactionTime: 2980, direction: 'down', targetDirection: 'up', accuracy: 0, correct: false, valid: true },
      { trialNumber: 3, reactionTime: 2920, direction: 'left', targetDirection: 'right', accuracy: 0, correct: false, valid: true },
      { trialNumber: 4, reactionTime: 2990, direction: 'right', targetDirection: 'left', accuracy: 0, correct: false, valid: true },
    ],
  },
  // 3. Asymmetric Directional Bias (100% Up, 0% all other directions)
  {
    id: 'worst-asymmetric-003',
    assessmentType: 'direction',
    ageGroup: '35-44',
    device: 'desktop',
    deviceCategory: 'desktop',
    inputModality: 'keyboard',
    displayRefreshRateHz: 144,
    medianReactionTime: 620,
    averageReactionTime: 630,
    accuracy: 50,
    overallAccuracy: 50,
    totalAttempts: 20,
    totalCorrect: 10,
    totalIncorrect: 8,
    totalFalseStarts: 2,
    consistency: 28.4,
    standardDeviation: 75,
    progressionTrials: [
      { trialNumber: 1, reactionTime: 320, direction: 'up', targetDirection: 'up', accuracy: 1, correct: true, valid: true },
      { trialNumber: 2, reactionTime: 310, direction: 'up', targetDirection: 'up', accuracy: 1, correct: true, valid: true },
      { trialNumber: 3, reactionTime: 1250, direction: 'down', targetDirection: 'left', accuracy: 0, correct: false, valid: true },
      { trialNumber: 4, reactionTime: 1400, direction: 'right', targetDirection: 'left', accuracy: 0, correct: false, valid: true },
    ],
  },
  // 4. Missing/Null Fields Session (Schema robustness)
  {
    id: 'worst-sparse-004',
    assessmentType: 'direction',
    ageGroup: 'unknown-age' as any,
    device: undefined,
    deviceCategory: undefined,
    inputModality: undefined,
    medianReactionTime: undefined,
    averageReactionTime: 512,
    accuracy: undefined,
    overallAccuracy: 75,
    totalAttempts: undefined,
    totalCorrect: undefined,
    progressionTrials: undefined,
  },
  // 5. Visual Reaction Worst Case (Extreme foreperiod + timeouts)
  {
    id: 'worst-visual-005',
    assessmentType: 'visual-reaction',
    ageGroup: '45-54',
    device: 'desktop',
    deviceCategory: 'desktop',
    displayRefreshRateHz: 60,
    medianReactionTime: 120, // well below 150ms benchmark
    averageReactionTime: 125,
    totalAttempts: 50,
    totalTrials: 50,
    totalFalseStarts: 25,
    totalCorrect: 25,
    consistency: 42.1,
    standardDeviation: 60,
    progressionTrials: Array.from({ length: 10 }, (_, i) => ({
      trialNumber: i + 1,
      reactionTime: i % 2 === 0 ? 110 : 850,
      foreperiod: 1000 + i * 500,
      valid: i % 2 === 0,
      falseStart: i % 2 !== 0,
      timedOut: false,
    })),
  },
];

export const BREAK_UI_WORST_TRIALS: any[] = [
  {
    id: 'worst-t-1',
    participantId: 'p-worst',
    experimentId: 'exp-worst',
    condition: 'stress',
    test: 'direction',
    trialNumber: 1,
    stimulusTimestamp: 1000,
    responseTimestamp: 1082,
    reactionTime: 82,
    accuracy: 1,
    correct: true,
    valid: true,
    falseStart: false,
    timedOut: false,
    direction: 'up',
    targetDirection: 'up',
  },
  {
    id: 'worst-t-2',
    participantId: 'p-worst',
    experimentId: 'exp-worst',
    condition: 'stress',
    test: 'direction',
    trialNumber: 2,
    stimulusTimestamp: 2000,
    responseTimestamp: 4950,
    reactionTime: 2950,
    accuracy: 0,
    correct: false,
    valid: true,
    falseStart: false,
    timedOut: false,
    direction: 'down',
    targetDirection: 'up',
  },
  {
    id: 'worst-t-3',
    participantId: 'p-worst',
    experimentId: 'exp-worst',
    condition: 'stress',
    test: 'direction',
    trialNumber: 3,
    stimulusTimestamp: 6000,
    responseTimestamp: 6050,
    reactionTime: 50,
    accuracy: 0,
    correct: false,
    valid: false,
    falseStart: true,
    timedOut: false,
    direction: 'left',
    targetDirection: 'left',
  },
];

export function generateHugeDataset(): { docs: DatasetObservation[]; trials: any[] } {
  const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
  const ageGroups = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const docs: DatasetObservation[] = [];
  const trials: any[] = [];

  for (let i = 1; i <= 1200; i++) {
    const age = ageGroups[i % ageGroups.length];
    const isMobile = i % 3 === 0;
    const rt = Math.round(300 + (i % 600) + Math.sin(i) * 150);
    const acc = Math.max(50, Math.min(100, Math.round(70 + (i % 31))));
    
    docs.push({
      id: `huge-${i}`,
      assessmentType: i % 2 === 0 ? 'direction' : 'visual-reaction',
      ageGroup: age,
      device: isMobile ? 'mobile' : 'desktop',
      deviceCategory: isMobile ? 'mobile' : 'desktop',
      inputModality: isMobile ? 'touch' : 'keyboard',
      displayRefreshRateHz: isMobile ? 60 : 144,
      medianReactionTime: rt,
      averageReactionTime: rt + 15,
      accuracy: acc,
      overallAccuracy: acc,
      totalAttempts: 10,
      totalCorrect: Math.round((acc / 100) * 10),
      totalIncorrect: 10 - Math.round((acc / 100) * 10),
      totalFalseStarts: i % 7 === 0 ? 1 : 0,
      consistency: 18.5,
      standardDeviation: 45,
      progressionTrials: [
        {
          trialNumber: 1,
          reactionTime: rt,
          direction: directions[i % 4],
          targetDirection: directions[i % 4],
          accuracy: 1,
          correct: true,
          valid: true,
          foreperiod: 1200 + (i % 800),
        },
      ],
    });

    if (i <= 50) {
      trials.push({
        id: `huge-trial-${i}`,
        participantId: `user-${i}`,
        experimentId: 'exp-huge',
        condition: 'standard',
        test: 'direction',
        trialNumber: 1,
        stimulusTimestamp: 1000 * i,
        responseTimestamp: 1000 * i + rt,
        reactionTime: rt,
        accuracy: 1,
        correct: true,
        valid: true,
        falseStart: false,
        timedOut: false,
        direction: directions[i % 4],
        targetDirection: directions[i % 4],
      });
    }
  }

  return { docs, trials };
}
