export function normalizeProtocolType(type?: string): string {
  if (!type) return '';
  const lower = String(type).toLowerCase().trim();
  if (lower === 'visual-reaction' || lower === 'reaction-test' || lower === 'vrt' || lower === 'visual reaction') {
    return 'visual-reaction';
  }
  if (lower === 'direction' || lower === 'direction-test') {
    return 'direction';
  }
  if (
    lower === 'colour-recognition' ||
    lower === 'color-recognition' ||
    lower === 'color-test' ||
    lower === 'colour recognition' ||
    lower === 'color recognition'
  ) {
    return 'colour-recognition';
  }
  if (lower === 'block-memory' || lower === 'block-memory-test' || lower === 'block memory') {
    return 'block-memory';
  }
  if (lower === 'number-memory' || lower === 'number-memory-test' || lower === 'number memory') {
    return 'number-memory';
  }
  return lower;
}
