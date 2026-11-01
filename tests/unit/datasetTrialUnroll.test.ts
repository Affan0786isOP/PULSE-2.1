import { describe, expect, it } from 'vitest';
import { unrollTrialsFromDatasetDocs as unrollDesktop } from '../../src/lib/dataset';
import { unrollTrialsFromDatasetDocs as unrollMobile } from '../../mobile/src/lib/dataset';

const implementations = [
  { name: 'desktop', unroll: unrollDesktop },
  { name: 'mobile', unroll: unrollMobile },
] as const;

describe.each(implementations)('$name dataset trial unrolling', ({ unroll }) => {
  const docs = [{
    id: 'session-with-retry',
    assessmentType: 'direction',
    progressionTrials: [
      { trialNumber: 1, attemptNumber: 1, reactionTime: 220, correct: false, valid: true },
      { trialNumber: 1, attemptNumber: 2, reactionTime: 230, correct: true, valid: true },
    ],
  }];

  it('assigns unique IDs to repeated attempts of the same logical trial', () => {
    const trials = unroll(docs);
    const ids = trials.map((trial) => trial.id);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids[0]).toBe('session-with-retry-tr-1');
    expect(ids[1]).toBe('session-with-retry-tr-1-attempt-2');
  });

  it('keeps correctness separate from mechanical validity', () => {
    const trials = unroll(docs);

    expect(trials.map((trial) => trial.accuracy)).toEqual([0, 1]);
    expect(trials[0]).toMatchObject({ correct: false, valid: true });
  });
});
