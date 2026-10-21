export const DARK_APPARATUS_ROUTES = [
  '/reaction-test',
  '/visual-reaction',
  '/direction-test',
  '/direction',
  '/block-memory',
  '/block-memory-test',
  '/number-memory',
  '/number-memory-test',
  '/colour-recognition',
  '/color-recognition',
  '/color-test',
];

export function isDarkApparatusRoute(pathname?: string | null): boolean {
  if (!pathname) return false;
  const clean = pathname.replace(/^\/mobile(?:\/|$)/, '/');
  const normalized = clean.startsWith('/') ? clean : `/${clean}`;
  return DARK_APPARATUS_ROUTES.some(
    r => normalized === r || normalized === `${r}/` || normalized.startsWith(`${r}/`)
  );
}

export function preloadRoute(path: string): void {
  if (typeof window === 'undefined') return;
  const clean = path.replace(/^\/mobile(?:\/|$)/, '/');
  switch (clean) {
    case '/assessments':
      import('../components/Assessments').catch(() => {});
      break;
    case '/about':
      import('../../../src/components/About').catch(() => {});
      break;
    case '/leaderboard':
      import('../components/Leaderboard').catch(() => {});
      break;
    case '/improve':
      import('../components/Improve').catch(() => {});
      break;
    case '/reaction-test':
      import('../components/ReactionTest').catch(() => {});
      break;
    case '/direction-test':
      import('../components/DirectionTest').catch(() => {});
      break;
    case '/block-memory':
      import('../components/BlockMemoryTest').catch(() => {});
      break;
    case '/number-memory':
      import('../components/NumberMemoryTest').catch(() => {});
      break;
    case '/colour-recognition':
      import('../components/ColorTest').catch(() => {});
      break;
  }
}
