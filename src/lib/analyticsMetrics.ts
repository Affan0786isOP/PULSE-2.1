export type AnalyticsProtocol = 'visual-reaction' | 'direction' | 'colour-recognition' | 'block-memory' | 'number-memory';

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function metricSpec(protocol: AnalyticsProtocol): { label: string; unit: 'ms' | 'blocks' | 'digits' } {
  if (protocol === 'block-memory') return { label: 'Block memory span', unit: 'blocks' };
  if (protocol === 'number-memory') return { label: 'Number memory span', unit: 'digits' };
  return { label: 'Reaction time', unit: 'ms' };
}
