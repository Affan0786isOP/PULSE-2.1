import { describe, expect, it } from 'vitest';
import {
  calculateReactionTimeDistribution,
  calculateTrialProgression,
  calculateConsistencyDistribution,
  calculateForeperiodAggregation,
  calculatePopulationTrialProgression,
  calculateTrialValidityBreakdown,
  calculateIqr,
  percentileValue,
  getAgeGroupShortLabel,
  medianValue,
} from '../../shared/dataset/analytics';

describe('dataset analytics', () => {
  it('calculates medians and percentiles without mutating input and ignores non-finite values', () => {
    const values = [300, Number.NaN, 100, 200];
    expect(medianValue(values)).toBe(200);
    expect(values).toEqual([300, Number.NaN, 100, 200]);
    expect(medianValue([Number.POSITIVE_INFINITY, Number.NaN])).toBe(0);

    const ordered = [100, 200, 300, 400];
    expect(percentileValue(ordered, 0.25)).toBe(175);
    expect(percentileValue(ordered, 0.75)).toBe(325);
    expect(calculateIqr(ordered)).toEqual({ q1: 175, q3: 325, iqr: 150 });
  });

  it('calculates consistency distribution and merges small bins (< 10) to prevent small-cell re-identification', () => {
    // 5 sessions in 0-50%, 6 in 50-60%, 15 in 60-70%
    const records = [
      ...Array.from({ length: 5 }, () => ({ consistency: 40, device: 'desktop' })),
      ...Array.from({ length: 6 }, () => ({ consistency: 55, device: 'mobile' })),
      ...Array.from({ length: 15 }, () => ({ consistency: 65, device: 'desktop' })),
    ];
    const distribution = calculateConsistencyDistribution(records, 10);
    // Bins 0-50% (5) and 50-60% (6) must merge into <60% with count 11
    expect(distribution.length).toBe(2);
    expect(distribution[0]).toMatchObject({ label: '<60%', count: 11, desktop: 5, mobile: 6, n: 11 });
    expect(distribution[1]).toMatchObject({ label: '60–70%', count: 15, desktop: 15, mobile: 0, n: 15 });
  });

  it('aggregates foreperiod by 6 standardized intervals using latest valid attempt and suppresses < 10', () => {
    // Create 12 sessions with valid attempts in 100-500ms, and only 3 sessions in 501-1000ms
    const docs = [
      ...Array.from({ length: 12 }, (_, i) => ({
        id: `sess-${i}`,
        progressionTrials: [
          // Trial 1: first attempt premature false start
          { trialNumber: 1, falseStart: true, foreperiodMs: 200 },
          // Trial 1: second attempt valid with RT=300
          { trialNumber: 1, falseStart: false, valid: true, reactionTime: 300, foreperiodMs: 300 },
          // Trial 2: valid in 100-500ms with RT=320
          { trialNumber: 2, falseStart: false, valid: true, reactionTime: 320, foreperiodMs: 400 },
        ],
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `sess-small-${i}`,
        progressionTrials: [
          { trialNumber: 1, falseStart: false, valid: true, reactionTime: 250, foreperiodMs: 700 },
        ],
      })),
    ];

    const result = calculateForeperiodAggregation(docs, 10);
    expect(result).toHaveLength(6);
    expect(result[0]).toMatchObject({
      interval: '100–500ms',
      n: 12,
      medianRT: 310, // session medians are (300+320)/2 = 310
      suppressed: false,
    });
    expect(result[1]).toMatchObject({
      interval: '501–1000ms',
      n: 3,
      suppressed: true,
    });
  });

  it('calculates trial progression 1-10 using latest valid attempt per session and equal session weighting', () => {
    const docs = [
      {
        id: 's1',
        progressionTrials: [
          { trialNumber: 1, falseStart: true, reactionTime: 50 },
          { trialNumber: 1, valid: true, reactionTime: 250 },
          { trialNumber: 2, valid: true, reactionTime: 220 },
        ],
      },
      {
        id: 's2',
        progressionTrials: [
          { trialNumber: 1, valid: true, reactionTime: 350 },
          { trialNumber: 2, valid: true, reactionTime: 280 },
        ],
      },
    ];

    const progression = calculatePopulationTrialProgression(docs, 10);
    expect(progression).toHaveLength(10);
    expect(progression[0]).toMatchObject({
      trialLabel: 'Trial 1',
      trialNumber: 1,
      overall: 300, // median of [250, 350]
      overallN: 2,
    });
    expect(progression[1]).toMatchObject({
      trialLabel: 'Trial 2',
      trialNumber: 2,
      overall: 250, // median of [220, 280]
      overallN: 2,
    });
    expect(progression[2]).toMatchObject({
      trialLabel: 'Trial 3',
      trialNumber: 3,
      overall: 0,
      overallN: 0,
    });
  });

  it('classifies trial validity mutually exclusively into 4 categories', () => {
    const docs = [
      {
        progressionTrials: [
          { falseStart: true, reactionTime: 0 }, // premature
          { falseStart: false, reactionTime: 45 }, // anticipatory (< 80ms)
          { falseStart: false, reactionTime: 250 }, // valid (80 <= rt < 3000)
          { timedOut: true, reactionTime: 3000 }, // timeout
          { falseStart: false, reactionTime: 3500 }, // timeout (rt >= 3000)
        ],
      },
    ];

    const breakdown = calculateTrialValidityBreakdown(docs);
    expect(breakdown).toEqual({
      valid: 1,
      premature: 1,
      anticipatory: 1,
      timeout: 2,
      unknown: 0,
      totalAttempts: 5,
      validPercent: 20,
      prematurePercent: 20,
      anticipatoryPercent: 20,
      timeoutPercent: 40,
    });
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
      { id: 'excluded-nan', reactionTime: Number.NaN, device: 'Desktop' },
      { id: 'excluded-false', reactionTime: 150, falseStart: true, device: 'Desktop' },
      { id: 'excluded-invalid', reactionTime: 150, valid: false, device: 'Desktop' },
      { id: 'excluded-timeout', reactionTime: 150, timedOut: true, device: 'Desktop' },
    ];
    const result = calculateReactionTimeDistribution(trials);
    expect(result).toHaveLength(13);
    expect(result[0]).toMatchObject({ label: '80–140ms', desktop: 1, mobile: 1, desktopN: 1, mobileN: 1, n: 2 });
    expect(result[1]).toMatchObject({ label: '140–175ms', desktop: 1, mobile: 0, desktopN: 1, mobileN: 0, n: 1 });
  });
  it('keeps caller-specific identity rules for histogram session counts', () => {
    const trials = [
      { id: 'one', experimentId: 'exp-one', sessionId: 'same-session', reactionTime: 120 },
      { id: 'two', experimentId: 'exp-two', sessionId: 'same-session', reactionTime: 121 },
    ];
    const desktopIdentity = calculateReactionTimeDistribution(trials, (trial) => trial.experimentId || trial.sessionId || trial.id);
    const mobileIdentity = calculateReactionTimeDistribution(trials, (trial) => trial.sessionId || trial.experimentId || trial.id);
    expect(desktopIdentity[0].desktopN).toBe(2);
    expect(mobileIdentity[0].desktopN).toBe(1);
  });

  it('preserves caller-specific session identity and progression eligibility', () => {
    const trials = [
      { id: '1', experimentId: 'exp-a', sessionId: 'shared', trialNumber: 1, reactionTime: 100, device: 'Desktop' },
      { id: '2', experimentId: 'exp-b', sessionId: 'shared', trialNumber: 1, reactionTime: 200, device: 'Desktop' },
      { id: '3', experimentId: 'exp-c', sessionId: 'other', trialNumber: 1, reactionTime: 300, device: 'Mobile' },
      { id: '4', trialNumber: 1, reactionTime: 80, device: 'Desktop' },
      { id: '5', trialNumber: 2, reactionTime: 3000, timedOut: true, device: 'Desktop' },
      { id: '6', trialNumber: 3, reactionTime: Number.NaN, device: 'Desktop' },
    ];
    const desktop = calculateTrialProgression(trials, (trial) => trial.experimentId || trial.sessionId || trial.id);
    const mobile = calculateTrialProgression(trials, (trial) => trial.sessionId || trial.experimentId || trial.id);
    expect(desktop[0]).toMatchObject({ desktop: 150, mobile: 300, overall: 200, desktopN: 2, mobileN: 1, overallN: 3 });
    expect(mobile[0]).toMatchObject({ desktopN: 1, mobileN: 1, overallN: 2 });
    expect(desktop[1]).toMatchObject({ desktop: 3000, desktopN: 1 });
    expect(desktop[2]).toMatchObject({ desktop: 0, desktopN: 0 });
  });
});
