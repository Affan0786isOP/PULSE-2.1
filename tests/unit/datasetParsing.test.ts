import { describe, expect, it } from 'vitest';
import { unrollTrialsFromDatasetDocs } from '../../shared/dataset/transform';

describe('shared dataset trial unroller', () => {
  it('preserves latency and accuracy fallback precedence and direction normalization', () => {
    const [trial] = unrollTrialsFromDatasetDocs([{
      id: 'session-1',
      participantId: 'participant-1',
      experimentId: 'experiment-1',
      assessmentType: 'direction',
      completedAtMonth: '2026-10',
      deviceCategory: 'Mobile',
      screenWidth: 390,
      screenHeight: 844,
      progressionTrials: [{
        trialNumber: 2,
        reactionTime: 240,
        rawLatencyMs: 250,
        inputLatencyMs: 260,
        correct: false,
        accuracy: 100,
        condition: 'arrow-left',
        stimulusPresentedAtPerfMs: 10,
        responseDetectedAtPerfMs: 250,
        foreperiodMs: 300,
      }],
    }]);

    expect(trial).toMatchObject({
      id: 'session-1-tr-2',
      participantId: 'participant-1',
      experimentId: 'experiment-1',
      condition: 'arrow-left',
      test: 'direction',
      reactionTime: 240,
      accuracy: 0,
      correct: false,
      valid: true,
      timestamp: '2026-10',
      device: 'Mobile',
      screenWidth: 390,
      screenHeight: 844,
      foreperiodMs: 300,
    });
  });

  it('honors validity overrides, raw-latency fallbacks, and selected assessment filtering', () => {
    const docs = [{
      id: 'session-2',
      assessmentType: 'direction',
      progressionTrials: [
        { trialNumber: 1, rawLatencyMs: 275, accuracy: 85, validity: 'INVALID', condition: 'arrow-up' },
        { trialNumber: 2, inputLatencyMs: 325, validity: 'VALID', condition: 'arrow-down' },
      ],
    }];
    const [first, second] = unrollTrialsFromDatasetDocs(docs, 'direction');
    expect(first).toMatchObject({ reactionTime: 275, accuracy: 0.85, valid: false, condition: 'arrow-up' });
    expect(second).toMatchObject({ reactionTime: 325, valid: true, condition: 'arrow-down' });
    expect(unrollTrialsFromDatasetDocs(docs, 'visual-reaction')).toEqual([]);
  });
});
