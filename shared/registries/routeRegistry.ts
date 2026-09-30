import type { DomainName } from '../contracts/common';

export interface SeoBehavior {
  index: boolean;
}

export interface RouteDefinition {
  routeId: string;
  path: string;
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
    seoBehavior: { index: true },
    isAdministrative: false,
  },
  {
    routeId: 'analytics',
    path: '/analytics',
    domain: 'analytics',
    navigationLabel: 'Analytics',
    aliases: [],
    deviceAvailability: 'all',
    seoBehavior: { index: true },
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
    aliases: ['/research-privacy'],
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

  // Administrative Routes (Desktop only, isAdministrative: true)
  {
    routeId: 'admin-login',
    path: '/admin/login',
    domain: 'administration',
    navigationLabel: 'Admin Login',
    aliases: [],
    deviceAvailability: 'desktop-only',
    seoBehavior: { index: false },
    isAdministrative: true,
  },
  {
    routeId: 'admin-dashboard',
    path: '/admin',
    domain: 'administration',
    navigationLabel: 'Admin Dashboard',
    aliases: ['/admin/overview', '/admin/quality'],
    deviceAvailability: 'desktop-only',
    seoBehavior: { index: false },
    isAdministrative: true,
  },
  {
    routeId: 'admin-moderation',
    path: '/admin/moderation',
    domain: 'administration',
    navigationLabel: 'Moderation',
    aliases: [],
    deviceAvailability: 'desktop-only',
    seoBehavior: { index: false },
    isAdministrative: true,
  },
  {
    routeId: 'admin-audit',
    path: '/admin/audit',
    domain: 'administration',
    navigationLabel: 'Audit Logs',
    aliases: ['/admin/export-audit'],
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
