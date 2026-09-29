import { describe, expect, it } from 'vitest';
import { median, metricSpec } from '../../src/lib/analyticsMetrics';

describe('analytics metrics', () => {
  it('computes the midpoint median for even samples', () => {
    expect(median([100, 110, 120, 130])).toBe(115);
  });

  it('returns zero for an empty sample', () => {
    expect(median([])).toBe(0);
  });

  it('assigns units by protocol family', () => {
    expect(metricSpec('visual-reaction')).toEqual({ label: 'Reaction time', unit: 'ms' });
    expect(metricSpec('block-memory')).toEqual({ label: 'Block memory span', unit: 'blocks' });
    expect(metricSpec('number-memory')).toEqual({ label: 'Number memory span', unit: 'digits' });
  });
});
