import type { DomainName } from '../contracts/common';

export interface SeoBehavior {
  index: boolean;
}

export interface RouteDefinition {
  routeId: string;
  path: string;
  /** Canonical destination when a legacy route exists only to redirect. */
  canonicalPath?: string;
  domain?: DomainName;
  navigationLabel: string;
  aliases: readonly string[];
  deviceAvailability: 'all' | 'desktop-only' | 'mobile-only';
  seoBehavior: SeoBehavior;
  isAdministrative: boolean;
}

export const ROUTE_REGISTRY: readonly RouteDefinition[] = [
  // Standalone Pages
  {
    routeId: 'home',
    path: '/',
    domain: undefined, // Deferred: General system landing page
    navigationLabel: 'Home',
    aliases: ['/index.html'],
    deviceAvailability: 'all',
    seoBehavior: { index: true },
    isAdministrative: false,
  },
  {
    routeId: 'about',
    path: '/about',
    domain: undefined,
    navigationLabel: 'About',
    aliases: [],
    deviceAvailability: 'all',
    seoBehavior: { index: true },
    isAdministrative: false,
  },
  {
    routeId: 'assessments',
    path: '/assessments',
    domain: 'assessment',
    navigationLabel: 'Assessments',
    aliases: [],
    deviceAvailability: 'all',
    seoBehavior: { index: true },
    isAdministrative: false,
  },
  {
    routeId: 'leaderboard',
    path: '/leaderboard',
    domain: 'leaderboard',
    navigationLabel: 'Leaderboard',
    aliases: [],
    deviceAvailability: 'all',
    seoBehavior: { index: true },
    isAdministrative: false,
  },
  {
    routeId: 'dataset',
    path: '/dataset',
    domain: 'research',
    navigationLabel: 'Dataset',
    aliases: [],
    deviceAvailability: 'all',
    seoBehavior: { index: false },
    isAdministrative: false,
  },
  {
    routeId: 'analytics',
    path: '/analytics',
    canonicalPath: '/dataset',
    domain: 'analytics',
    navigationLabel: 'Analytics',
    aliases: [],
    deviceAvailability: 'all',
    seoBehavior: { index: false },
    isAdministrative: false,
  },
  {
    routeId: 'improve',
    path: '/improve',
    domain: undefined, // Deferred
    navigationLabel: 'Improve',
    aliases: [],
    deviceAvailability: 'all',
    seoBehavior: { index: true },
    isAdministrative: false,
  },
  {
    routeId: 'privacy',
    path: '/privacy',
    domain: undefined, // Deferred
    navigationLabel: 'Privacy',
    aliases: ['/research-privacy', '/privacy-policy'],
    deviceAvailability: 'all',
    seoBehavior: { index: true },
    isAdministrative: false,
  },

  // Assessment Protocols
  {
    routeId: 'test-visual-reaction',
    path: '/reaction-test',
    domain: 'assessment',
    navigationLabel: 'Visual Reaction',
    aliases: ['/visual-reaction'],
    deviceAvailability: 'all',
    seoBehavior: { index: true },
    isAdministrative: false,
  },
  {
    routeId: 'test-direction',
    path: '/direction-test',
    domain: 'assessment',
    navigationLabel: 'Directional Choice',
    aliases: ['/direction'],
    deviceAvailability: 'all',
    seoBehavior: { index: true },
    isAdministrative: false,
  },
  {
    routeId: 'test-color-recognition',
    path: '/colour-recognition',
    domain: 'assessment',
    navigationLabel: 'Color Recognition',
    aliases: ['/color-recognition', '/color-test'],
    deviceAvailability: 'all',
    seoBehavior: { index: true },
    isAdministrative: false,
  },
  {
    routeId: 'test-block-memory',
    path: '/block-memory',
    domain: 'assessment',
    navigationLabel: 'Block Memory',
    aliases: ['/block-memory-test'],
    deviceAvailability: 'all',
    seoBehavior: { index: true },
    isAdministrative: false,
  },
  {
    routeId: 'test-number-memory',
    path: '/number-memory',
    domain: 'assessment',
    navigationLabel: 'Number Memory',
    aliases: ['/number-memory-test'],
    deviceAvailability: 'all',
    seoBehavior: { index: true },
    isAdministrative: false,
  },
  {
    routeId: 'admin-dashboard',
    path: '/admin',
    domain: 'administration',
    navigationLabel: 'Admin Dashboard',
    aliases: [],
    deviceAvailability: 'desktop-only',
    seoBehavior: { index: false },
    isAdministrative: true,
  },
];


const ROUTE_LOOKUP_MAP: Map<string, RouteDefinition> = new Map();

function cleanRoutePath(path: string): string {
  let clean = path.replace(/^\/mobile(?:\/|$)/, '/');
  if (!clean.startsWith('/')) clean = '/' + clean;
  if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);
  return clean.toLowerCase();
}

for (const route of ROUTE_REGISTRY) {
  ROUTE_LOOKUP_MAP.set(cleanRoutePath(route.path), route);
  for (const alias of route.aliases) {
    ROUTE_LOOKUP_MAP.set(cleanRoutePath(alias), route);
  }
}

/**
 * Resolves a URL path or known route alias to its RouteDefinition.
 */
export function resolveRoute(path: string | null | undefined): RouteDefinition | undefined {
  if (!path || typeof path !== 'string') return undefined;
  return ROUTE_LOOKUP_MAP.get(cleanRoutePath(path));
}

/**
 * Checks whether a given route path belongs to administrative routes.
 */
export function isAdministrativeRoute(path: string | null | undefined): boolean {
  const route = resolveRoute(path);
  return Boolean(route?.isAdministrative);
}


const ASSESSMENT_ROUTE_ID_MAP: Record<string, string> = {
  'visual-reaction': 'test-visual-reaction',
  'direction': 'test-direction',
  'color-recognition': 'test-color-recognition',
  'block-memory': 'test-block-memory',
  'number-memory': 'test-number-memory',
};

export const ASSESSMENT_LAUNCH_ROUTES: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [assessmentId, routeId] of Object.entries(ASSESSMENT_ROUTE_ID_MAP)) {
    const route = ROUTE_REGISTRY.find((r) => r.routeId === routeId);
    if (!route) {
      throw new Error(`Route definition not found in ROUTE_REGISTRY for routeId: ${routeId}`);
    }
    map[assessmentId] = route.path;
  }
  return map;
})();

export function getAssessmentLaunchRoute(assessmentId: string): string {
  return ASSESSMENT_LAUNCH_ROUTES[assessmentId] || '/assessments';
}
