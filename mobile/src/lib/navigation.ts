/**
 * Resolves the canonical active navigation identifier from currentView and pathname.
 * Ensures assessment protocols and aliases highlight the 'assessments' navigation tab,
 * analytics maps to dataset, and unmatched routes do not fall back to 'home'.
 */
export function resolveActiveNavId(currentView?: string, pathname: string = ''): string {
  const v = (currentView || '').toLowerCase().trim();
  const p = pathname.toLowerCase().trim();

  // 1. Assessment protocols & sub-routes
  const assessmentIds = [
    'assessments',
    'reaction-test',
    'visual-reaction',
    'direction-test',
    'direction',
    'colour-recognition',
    'color-recognition',
    'color-test',
    'block-memory',
    'block-memory-test',
    'number-memory',
    'number-memory-test',
  ];
  if (assessmentIds.includes(v)) return 'assessments';
  if (
    p.startsWith('/assessments') ||
    p.includes('reaction') ||
    p.includes('direction') ||
    p.includes('colour') ||
    p.includes('color') ||
    p.includes('block-memory') ||
    p.includes('number-memory')
  ) {
    return 'assessments';
  }

  // 2. Leaderboard
  if (v === 'leaderboard' || v === 'rankings' || p.startsWith('/leaderboard')) {
    return 'leaderboard';
  }

  // 3. Dataset & Analytics
  if (v === 'dataset' || v === 'analytics' || p.startsWith('/dataset') || p.startsWith('/analytics')) {
    return 'dataset';
  }

  // 4. Improve
  if (v === 'improve' || p.startsWith('/improve')) {
    return 'improve';
  }

  // 5. Privacy
  if (v === 'privacy' || v === 'research-privacy' || v === 'privacy-policy' || p.startsWith('/privacy') || p.startsWith('/research-privacy')) {
    return 'privacy';
  }

  // 6. Home
  if (v === 'home' || p === '/' || p === '/mobile/' || p === '/mobile') {
    return 'home';
  }

  return '';
}
