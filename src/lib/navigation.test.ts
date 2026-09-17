import { describe, it, expect } from 'vitest';
import { resolveActiveNavId } from './navigation';

describe('resolveActiveNavId', () => {
  describe('Assessment protocols & sub-routes', () => {
    const protocolViews = [
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

    it.each(protocolViews)('resolves currentView "%s" to "assessments"', (view) => {
      expect(resolveActiveNavId(view)).toBe('assessments');
    });

    const protocolPaths = [
      '/assessments',
      '/assessments/visual-reaction',
      '/reaction-test',
      '/direction-test',
      '/colour-recognition',
      '/color-recognition',
      '/color-test',
      '/block-memory',
      '/block-memory-test',
      '/number-memory',
      '/number-memory-test',
    ];

    it.each(protocolPaths)('resolves pathname "%s" to "assessments"', (path) => {
      expect(resolveActiveNavId(undefined, path)).toBe('assessments');
    });

    it('handles uppercase and whitespace gracefully', () => {
      expect(resolveActiveNavId('  REACTION-TEST  ')).toBe('assessments');
      expect(resolveActiveNavId(undefined, ' /ASSESSMENTS ')).toBe('assessments');
    });
  });

  describe('Leaderboard', () => {
    it('resolves leaderboard view and aliases to "leaderboard"', () => {
      expect(resolveActiveNavId('leaderboard')).toBe('leaderboard');
      expect(resolveActiveNavId('rankings')).toBe('leaderboard');
    });

    it('resolves leaderboard path to "leaderboard"', () => {
      expect(resolveActiveNavId(undefined, '/leaderboard')).toBe('leaderboard');
    });
  });

  describe('Dataset & Analytics', () => {
    it('resolves dataset and analytics views to "dataset"', () => {
      expect(resolveActiveNavId('dataset')).toBe('dataset');
      expect(resolveActiveNavId('analytics')).toBe('dataset');
    });

    it('resolves dataset and analytics paths to "dataset"', () => {
      expect(resolveActiveNavId(undefined, '/dataset')).toBe('dataset');
      expect(resolveActiveNavId(undefined, '/analytics')).toBe('dataset');
    });
  });

  describe('Improve', () => {
    it('resolves improve view and path to "improve"', () => {
      expect(resolveActiveNavId('improve')).toBe('improve');
      expect(resolveActiveNavId(undefined, '/improve')).toBe('improve');
    });
  });

  describe('Privacy', () => {
    it('resolves privacy view and aliases to "privacy"', () => {
      expect(resolveActiveNavId('privacy')).toBe('privacy');
      expect(resolveActiveNavId('research-privacy')).toBe('privacy');
      expect(resolveActiveNavId('privacy-policy')).toBe('privacy');
    });

    it('resolves privacy paths to "privacy"', () => {
      expect(resolveActiveNavId(undefined, '/privacy')).toBe('privacy');
      expect(resolveActiveNavId(undefined, '/research-privacy')).toBe('privacy');
    });
  });

  describe('Home', () => {
    it('resolves home view to "home"', () => {
      expect(resolveActiveNavId('home')).toBe('home');
    });

    it('resolves root paths to "home"', () => {
      expect(resolveActiveNavId(undefined, '/')).toBe('home');
      expect(resolveActiveNavId(undefined, '/mobile')).toBe('home');
      expect(resolveActiveNavId(undefined, '/mobile/')).toBe('home');
    });
  });

  describe('Unmatched and Unknown routes', () => {
    it('does NOT fall back to "home" for unknown views or paths', () => {
      expect(resolveActiveNavId('unknown-view')).toBe('');
      expect(resolveActiveNavId(undefined, '/unknown-path')).toBe('');
      expect(resolveActiveNavId('', '')).toBe('');
      expect(resolveActiveNavId(undefined, undefined)).toBe('');
    });
  });
});
