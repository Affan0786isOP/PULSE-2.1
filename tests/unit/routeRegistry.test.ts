import { describe, it, expect } from 'vitest';
import {
  resolveRoute,
  isAdministrativeRoute,
  ROUTE_REGISTRY,
} from '@shared/registries/routeRegistry';

describe('Route Registry', () => {
  it('registers all established public and administrative routes', () => {
    expect(ROUTE_REGISTRY.length).toBeGreaterThanOrEqual(16);
  });

  describe('resolveRoute and alias resolution', () => {
    it('resolves canonical routes', () => {
      expect(resolveRoute('/')?.routeId).toBe('home');
      expect(resolveRoute('/assessments')?.routeId).toBe('assessments');
      expect(resolveRoute('/leaderboard')?.routeId).toBe('leaderboard');
      expect(resolveRoute('/dataset')?.routeId).toBe('dataset');
      expect(resolveRoute('/analytics')?.routeId).toBe('analytics');
      expect(resolveRoute('/improve')?.routeId).toBe('improve');
      expect(resolveRoute('/privacy')?.routeId).toBe('privacy');
      expect(resolveRoute('/reaction-test')?.routeId).toBe('test-visual-reaction');
      expect(resolveRoute('/direction-test')?.routeId).toBe('test-direction');
      expect(resolveRoute('/colour-recognition')?.routeId).toBe('test-color-recognition');
      expect(resolveRoute('/block-memory')?.routeId).toBe('test-block-memory');
      expect(resolveRoute('/number-memory')?.routeId).toBe('test-number-memory');
    });

    it('resolves established route aliases to canonical definitions', () => {
      expect(resolveRoute('/visual-reaction')?.path).toBe('/reaction-test');
      expect(resolveRoute('/direction')?.path).toBe('/direction-test');
      expect(resolveRoute('/color-recognition')?.path).toBe('/colour-recognition');
      expect(resolveRoute('/color-test')?.path).toBe('/colour-recognition');
      expect(resolveRoute('/block-memory-test')?.path).toBe('/block-memory');
      expect(resolveRoute('/number-memory-test')?.path).toBe('/number-memory');
      expect(resolveRoute('/research-privacy')?.path).toBe('/privacy');
      expect(resolveRoute('/index.html')?.path).toBe('/');
      expect(resolveRoute('/admin/overview')?.path).toBe('/admin');
      expect(resolveRoute('/admin/quality')?.path).toBe('/admin');
      expect(resolveRoute('/admin/export-audit')?.path).toBe('/admin/audit');
    });

    it('handles mobile prefix paths transparently', () => {
      expect(resolveRoute('/mobile/reaction-test')?.routeId).toBe('test-visual-reaction');
      expect(resolveRoute('/mobile/leaderboard')?.routeId).toBe('leaderboard');
    });

    it('returns undefined for non-existent routes', () => {
      expect(resolveRoute('/unknown-path')).toBeUndefined();
      expect(resolveRoute('')).toBeUndefined();
      expect(resolveRoute(null)).toBeUndefined();
      expect(resolveRoute(undefined)).toBeUndefined();
    });
  });

  describe('domain ownership discipline', () => {
    it('assigns domain only where established or unambiguous', () => {
      expect(resolveRoute('/assessments')?.domain).toBe('assessment');
      expect(resolveRoute('/reaction-test')?.domain).toBe('assessment');
      expect(resolveRoute('/direction-test')?.domain).toBe('assessment');
      expect(resolveRoute('/colour-recognition')?.domain).toBe('assessment');
      expect(resolveRoute('/block-memory')?.domain).toBe('assessment');
      expect(resolveRoute('/number-memory')?.domain).toBe('assessment');

      expect(resolveRoute('/leaderboard')?.domain).toBe('leaderboard');
      expect(resolveRoute('/dataset')?.domain).toBe('research');
      expect(resolveRoute('/analytics')?.domain).toBe('analytics');
      expect(resolveRoute('/admin')?.domain).toBe('administration');
    });

    it('leaves unassigned domains as undefined (deferred)', () => {
      expect(resolveRoute('/')?.domain).toBeUndefined();
      expect(resolveRoute('/improve')?.domain).toBeUndefined();
      expect(resolveRoute('/privacy')?.domain).toBeUndefined();
    });
  });

  describe('administrative route separation and SEO behavior', () => {
    it('distinguishes administrative routes from public routes', () => {
      expect(isAdministrativeRoute('/admin')).toBe(true);
      expect(isAdministrativeRoute('/admin/login')).toBe(true);
      expect(isAdministrativeRoute('/admin/moderation')).toBe(true);
      expect(isAdministrativeRoute('/admin/audit')).toBe(true);

      expect(isAdministrativeRoute('/')).toBe(false);
      expect(isAdministrativeRoute('/assessments')).toBe(false);
      expect(isAdministrativeRoute('/leaderboard')).toBe(false);
      expect(isAdministrativeRoute('/dataset')).toBe(false);
      expect(isAdministrativeRoute('/unknown')).toBe(false);
    });

    it('sets desktop-only and index=false for administrative routes', () => {
      const adminRoute = resolveRoute('/admin');
      expect(adminRoute?.isAdministrative).toBe(true);
      expect(adminRoute?.deviceAvailability).toBe('desktop-only');
      expect(adminRoute?.seoBehavior.index).toBe(false);

      const publicRoute = resolveRoute('/reaction-test');
      expect(publicRoute?.isAdministrative).toBe(false);
      expect(publicRoute?.deviceAvailability).toBe('all');
      expect(publicRoute?.seoBehavior.index).toBe(true);
    });
  });
});
