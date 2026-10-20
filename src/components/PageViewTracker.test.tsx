import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeTrackedRoute } from './PageViewTracker';

describe('PageViewTracker Component Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('normalizeTrackedRoute', () => {
    it('preserves desktop routes as-is', () => {
      expect(normalizeTrackedRoute('/', 'desktop')).toBe('/');
      expect(normalizeTrackedRoute('/about', 'desktop')).toBe('/about');
      expect(normalizeTrackedRoute('/assessments', 'desktop')).toBe('/assessments');
      expect(normalizeTrackedRoute('/leaderboard', 'desktop')).toBe('/leaderboard');
    });

    it('normalizes mobile prefix paths to canonical routes', () => {
      expect(normalizeTrackedRoute('/mobile', 'mobile')).toBe('/');
      expect(normalizeTrackedRoute('/mobile/', 'mobile')).toBe('/');
      expect(normalizeTrackedRoute('/mobile/about', 'mobile')).toBe('/about');
      expect(normalizeTrackedRoute('/mobile/assessments', 'mobile')).toBe('/assessments');
      expect(normalizeTrackedRoute('/mobile/leaderboard', 'mobile')).toBe('/leaderboard');
    });
  });
});
