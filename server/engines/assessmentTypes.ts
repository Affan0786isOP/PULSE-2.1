export function normalizeAssessmentType(type: string): string {
  const t = String(type || '').toLowerCase().trim().replace(/[_\s]+/g, '-');
  if (t === 'reaction-test' || t === 'visual-reaction' || t === 'reaction' || t === 'visual' || t === 'visual-reaction-test') return 'visual-reaction';
  if (t === 'direction-test' || t === 'direction' || t === 'direction-reflex') return 'direction';
  if (t === 'colour-recognition' || t === 'color-test' || t === 'colour-test' || t === 'color-recognition' || t === 'color' || t === 'colour' || t === 'color-rec' || t === 'colour-rec') return 'color-recognition';
  if (t === 'block-memory' || t === 'block-memory-test' || t === 'block') return 'block-memory';
  if (t === 'number-memory' || t === 'number-memory-test' || t === 'number') return 'number-memory';
  return t;
}
