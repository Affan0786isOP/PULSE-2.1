import { describe, expect, it } from 'vitest';
import { calculateReactionTimeDistribution, calculateTrialProgression, getAgeGroupShortLabel, medianValue } from '../../shared/dataset/analytics';

describe('dataset analytics', () => {
  it('calculates medians without mutating input and ignores non-finite values', () => {
    const values = [300, Number.NaN, 100, 200];
    expect(medianValue(values)).toBe(200);
    expect(values).toEqual([300, Number.NaN, 100, 200]);
    expect(medianValue([Number.POSITIVE_INFINITY, Number.NaN])).toBe(0);
  });
  it('uses canonical short age-cohort labels', () => {
    expect(getAgeGroupShortLabel('Children (8–12)')).toBe('8–12');
    expect(getAgeGroupShortLabel('Unlisted cohort')).toBe('Unlisted cohort');
  });
  it('bins eligible trials and counts distinct sessions per device and bin', () => {
    const trials = [
      { id: 'a-1', experimentId: 'a', reactionTime: 139, device: 'Desktop' },
      { id: 'a-2', experimentId: 'a', reactionTime: 140, device: 'Desktop' },
      { id: 'b-1', experimentId: 'b', reactionTime: 139, device: 'Mobile' },
      { id: 'excluded-low', reactionTime: 80, device: 'Desktop' },
      { id: 'excluded-high', reactionTime: 2000, device: 'Desktop' },
      { id: 'excluded-false', reactionTime: 150, falseStart: true, device: 'Desktop' },
      { id: 'excluded-invalid', reactionTime: 150, valid: false, device: 'Desktop' },
      { id: 'excluded-timeout', reactionTime: 150, timedOut: true, device: 'Desktop' },
    ];
    const result = calculateReactionTimeDistribution(trials);
    expect(result).toHaveLength(13);
    expect(result[0]).toMatchObject({ label: '80–140ms', desktop: 1, mobile: 1, desktopN: 1, mobileN: 1, n: 2 });
    expect(result[1]).toMatchObject({ label: '140–175ms', desktop: 1, mobile: 0, desktopN: 1, mobileN: 0, n: 1 });
  });
  it('preserves caller-specific session identity and progression eligibility', () => {
    const trials = [
      { id: '1', experimentId: 'exp-a', sessionId: 'shared', trialNumber: 1, reactionTime: 100, device: 'Desktop' },
      { id: '2', experimentId: 'exp-b', sessionId: 'shared', trialNumber: 1, reactionTime: 200, device: 'Desktop' },
      { id: '3', experimentId: 'exp-c', sessionId: 'other', trialNumber: 1, reactionTime: 300, device: 'Mobile' },
      { id: '4', trialNumber: 1, reactionTime: 80, device: 'Desktop' },
      { id: '5', trialNumber: 2, reactionTime: 3000, timedOut: true, device: 'Desktop' },
    ];
    const desktop = calculateTrialProgression(trials, (trial) => trial.experimentId || trial.sessionId || trial.id);
    const mobile = calculateTrialProgression(trials, (trial) => trial.sessionId || trial.experimentId || trial.id);
    expect(desktop[0]).toMatchObject({ desktop: 150, mobile: 300, overall: 200, desktopN: 2, mobileN: 1, overallN: 3 });
    expect(mobile[0]).toMatchObject({ desktopN: 1, mobileN: 1, overallN: 2 });
    expect(desktop[1]).toMatchObject({ desktop: 3000, desktopN: 1 });
  });
});
