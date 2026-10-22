import { describe, expect, it } from 'vitest';
import { createFramePacer } from '../../shared/timing/framePacer';

describe('createFramePacer', () => {
  const refreshRates = [60, 75, 90, 120, 144, 240];

  it.each(refreshRates)('targets about 60 updates/s on a %iHz sequence over [0, 1000)ms', (hz) => {
    const pacer = createFramePacer(60);
    let updates = 0;
    const frameInterval = 1000 / hz;

    for (let now = 0; now < 1000; now += frameInterval) {
      if (pacer.shouldUpdate(now)) updates++;
    }

    // RAF samples are discrete; allow a one-frame boundary tolerance.
    expect(updates).toBeGreaterThanOrEqual(59);
    expect(updates).toBeLessThanOrEqual(61);
  });

  it('initializes safely at timestamp zero and does not double-count it', () => {
    const pacer = createFramePacer(60);
    expect(pacer.shouldUpdate(0)).toBe(true);
    expect(pacer.shouldUpdate(0)).toBe(false);
    expect(pacer.shouldUpdate(16)).toBe(false);
    expect(pacer.shouldUpdate(17)).toBe(true);
  });

  it('retains fractional phase on a 75Hz sequence', () => {
    const pacer = createFramePacer(60);
    let updates = 0;

    for (let now = 0; now < 1000; now += 1000 / 75) {
      if (pacer.shouldUpdate(now)) updates++;
    }

    expect(updates).toBeGreaterThanOrEqual(59);
    expect(updates).toBeLessThanOrEqual(61);
  });

  it('resets timing phase cleanly between stimuli', () => {
    const pacer = createFramePacer(60);
    expect(pacer.shouldUpdate(100)).toBe(true);
    expect(pacer.shouldUpdate(108)).toBe(false);
    pacer.reset();
    expect(pacer.shouldUpdate(0)).toBe(true);
    expect(pacer.shouldUpdate(17)).toBe(true);
  });

  it('does not emit catch-up bursts after a simulated one-second freeze', () => {
    const pacer = createFramePacer(60);
    expect(pacer.shouldUpdate(0)).toBe(true);
    expect(pacer.shouldUpdate(1000)).toBe(true);
    expect(pacer.shouldUpdate(1000)).toBe(false);
    expect(pacer.shouldUpdate(1000)).toBe(false);
    expect(pacer.shouldUpdate(1017)).toBe(true);
  });

  it('rejects an invalid target cadence', () => {
    expect(() => createFramePacer(0)).toThrow(RangeError);
    expect(() => createFramePacer(Number.NaN)).toThrow(RangeError);
  });
});
