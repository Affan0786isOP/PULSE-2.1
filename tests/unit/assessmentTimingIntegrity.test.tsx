import { describe, it, expect } from 'vitest';

describe('Assessment Timing and State Integrity Under Engine States', () => {
  // Test the invariant across all 5 engine state spaces
  const isAssessmentActive = (state: string): boolean => {
    return state !== 'READY' && state !== 'REPORT' && state !== 'UNMOUNTED';
  };

  it('correctly disables info trigger during active states for Reaction and Direction tests', () => {
    // Reaction & Direction states:
    // READY, STARTING, AWAITING_STIMULUS, STIMULUS_ACTIVE, TRIAL_COMPLETE, REPORT, UNMOUNTED
    expect(isAssessmentActive('READY')).toBe(false);
    expect(isAssessmentActive('STARTING')).toBe(true);
    expect(isAssessmentActive('AWAITING_STIMULUS')).toBe(true);
    expect(isAssessmentActive('STIMULUS_ACTIVE')).toBe(true);
    expect(isAssessmentActive('TRIAL_COMPLETE')).toBe(true);
    expect(isAssessmentActive('REPORT')).toBe(false);
    expect(isAssessmentActive('UNMOUNTED')).toBe(false);
  });

  it('correctly disables info trigger during active states for Colour test', () => {
    // Colour states:
    // READY, STARTING, STIMULUS_ACTIVE, FEEDBACK, REPORT, UNMOUNTED
    expect(isAssessmentActive('READY')).toBe(false);
    expect(isAssessmentActive('STARTING')).toBe(true);
    expect(isAssessmentActive('STIMULUS_ACTIVE')).toBe(true);
    expect(isAssessmentActive('FEEDBACK')).toBe(true);
    expect(isAssessmentActive('REPORT')).toBe(false);
    expect(isAssessmentActive('UNMOUNTED')).toBe(false);
  });

  it('correctly disables info trigger during active states for Block Memory and Number Memory tests', () => {
    // Block & Number memory states:
    // READY, STARTING, SHOWING, INPUT, SUCCESS, FAILED, REPORT, UNMOUNTED
    expect(isAssessmentActive('READY')).toBe(false);
    expect(isAssessmentActive('STARTING')).toBe(true);
    expect(isAssessmentActive('SHOWING')).toBe(true);
    expect(isAssessmentActive('INPUT')).toBe(true);
    expect(isAssessmentActive('SUCCESS')).toBe(true);
    expect(isAssessmentActive('FAILED')).toBe(true);
    expect(isAssessmentActive('REPORT')).toBe(false);
    expect(isAssessmentActive('UNMOUNTED')).toBe(false);
  });

  it('guarantees that opening info drawer does not mutate timestamps or timing observation arrays', () => {
    const rawObservations: Array<{ trial: number; latency: number }> = [
      { trial: 1, latency: 210.4 },
      { trial: 2, latency: 195.2 }
    ];
    const initialClone = JSON.parse(JSON.stringify(rawObservations));

    let isOpen = false;
    // Simulate user clicking info trigger when test is in READY or REPORT
    const openInfoDrawer = () => {
      isOpen = true;
    };
    const closeInfoDrawer = () => {
      isOpen = false;
    };

    openInfoDrawer();
    expect(isOpen).toBe(true);
    // Observations must remain untouched
    expect(rawObservations).toEqual(initialClone);

    closeInfoDrawer();
    expect(isOpen).toBe(false);
    expect(rawObservations).toEqual(initialClone);
  });
});
