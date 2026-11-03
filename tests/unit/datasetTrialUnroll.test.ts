import { describe, expect, it } from 'vitest';
import { unrollTrialsFromDatasetDocs as unrollDesktop } from '../../src/lib/dataset';
import { unrollTrialsFromDatasetDocs as unrollMobile } from '../../mobile/src/lib/dataset';

const implementations = [
  { name: 'desktop', unroll: unrollDesktop },
  { name: 'mobile', unroll: unrollMobile },
] as const;

describe.each(implementations)('$name dataset trial unrolling', ({ unroll }) => {
  it('assigns unique IDs to repeated attempts of the same logical trial', () => {
    const trials = unroll([{
      id: 'public-record-with-retry',
      assessmentType: 'direction',
      progressionTrials: [
        { trialNumber: 1, attemptNumber: 1, reactionTime: 220, correct: false, valid: true },
        { trialNumber: 1, attemptNumber: 2, reactionTime: 230, correct: true, valid: true },
      ],
    }]);
    const ids = trials.map(trial => trial.id);
    expect(ids).toEqual([
      'public-record-with-retry-tr-1',
      'public-record-with-retry-tr-1-attempt-2',
    ]);
    expect(new Set(ids).size).toBe(2);
    expect(trials.map(trial => trial.attemptNumber)).toEqual([1, 2]);
  });

  it('keeps correctness separate from mechanical validity', () => {
    const trials = unroll([{
      id: 'public-record-correctness',
      assessmentType: 'direction',
      progressionTrials: [
        { trialNumber: 1, attemptNumber: 1, reactionTime: 220, correct: false, valid: true },
      ],
    }]);
    expect(trials[0]).toMatchObject({ accuracy: 0, correct: false, valid: true });
  });
});
