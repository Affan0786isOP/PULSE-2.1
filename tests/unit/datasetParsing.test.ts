import { describe, expect, it } from 'vitest';
import { unrollTrialsFromDatasetDocs } from '../../shared/dataset/transform';

describe('shared dataset trial unroller', () => {
  it('preserves latency/accuracy precedence and normalizes valid directions', () => {
    const [trial] = unrollTrialsFromDatasetDocs([{
      id: 'public-record-1',
      participantId: 'must-not-be-used',
      experimentId: 'must-not-be-used',
      assessmentType: 'direction',
      completedAtMonth: '2026-10',
      deviceCategory: 'mobile',
      screenWidth: 390,
      screenHeight: 844,
      progressionTrials: [{
        trialNumber: 2,
        trialIndex: 1,
        sequenceNumber: 3,
        attemptNumber: 1,
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
      id: 'public-record-1-tr-2',
      participantId: '',
      experimentId: 'public-record-1',
      condition: 'arrow-left',
      test: 'direction',
      trialNumber: 2,
      trialIndex: 1,
      sequenceNumber: 3,
      attemptNumber: 1,
      reactionTime: 240,
      accuracy: 0,
      correct: false,
      valid: true,
      timestamp: '',
      completedAtMonth: '2026-10',
      device: 'mobile',
      screenWidth: 390,
      screenHeight: 844,
      foreperiodMs: 300,
    });
  });

  it('honors explicit validity, accuracy fallbacks, and assessment filtering', () => {
    const docs = [{
      id: 'public-record-2',
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

  it('does not invent a timestamp, viewport dimensions, or participant identifier', () => {
    const [trial] = unrollTrialsFromDatasetDocs([{
      id: 'public-record-3',
      assessmentType: 'visual-reaction',
      completedAtMonth: '2026-10',
      progressionTrials: [{
        trialNumber: 1,
        reactionTime: 200,
        valid: true,
      }],
    }]);

    expect(trial.timestamp).toBe('');
    expect(trial.completedAtMonth).toBe('2026-10');
    expect(trial.participantId).toBe('');
    expect(trial.screenWidth).toBe(0);
    expect(trial.screenHeight).toBe(0);
    expect(Number.isNaN(trial.stimulusTimestamp)).toBe(true);
    expect(Number.isNaN(trial.responseTimestamp)).toBe(true);
  });

  it('keeps non-direction conditions out of arrow normalization', () => {
    const [trial] = unrollTrialsFromDatasetDocs([{
      id: 'public-record-4',
      assessmentType: 'color-recognition',
      progressionTrials: [{ condition: 'congruent', reactionTime: 250, valid: true }],
    }]);
    expect(trial.condition).toBe('congruent');
  });
});
