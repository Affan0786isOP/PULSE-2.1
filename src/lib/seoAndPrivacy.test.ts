import { describe, it, expect } from 'vitest';
import { getCanonicalPath as getDesktopCanonical } from '../components/SEO';
import { getCanonicalPath as getMobileCanonical } from '../../mobile/src/components/SEO';

describe('SEO Canonicalization & Alias Mappings', () => {
  describe('Desktop getCanonicalPath', () => {
    it('normalizes root and simple paths', () => {
      expect(getDesktopCanonical('/')).toBe('/');
      expect(getDesktopCanonical('')).toBe('/');
      expect(getDesktopCanonical('/about')).toBe('/about');
      expect(getDesktopCanonical('/dataset')).toBe('/dataset');
    });

    it('strips trailing slashes from routes', () => {
      expect(getDesktopCanonical('/dataset/')).toBe('/dataset');
      expect(getDesktopCanonical('/about/')).toBe('/about');
    });

    it('removes /mobile prefix', () => {
      expect(getDesktopCanonical('/mobile')).toBe('/');
      expect(getDesktopCanonical('/mobile/')).toBe('/');
      expect(getDesktopCanonical('/mobile/reaction-test')).toBe('/reaction-test');
      expect(getDesktopCanonical('/mobile/privacy')).toBe('/privacy');
    });

    it('correctly maps all protocol and route aliases to canonical routes', () => {
      // VRT
      expect(getDesktopCanonical('/visual-reaction')).toBe('/reaction-test');
      expect(getDesktopCanonical('/mobile/visual-reaction')).toBe('/reaction-test');

      // Direction
      expect(getDesktopCanonical('/direction')).toBe('/direction-test');
      expect(getDesktopCanonical('/mobile/direction')).toBe('/direction-test');

      // Colour
      expect(getDesktopCanonical('/color-recognition')).toBe('/colour-recognition');
      expect(getDesktopCanonical('/color-test')).toBe('/colour-recognition');
      expect(getDesktopCanonical('/mobile/color-test')).toBe('/colour-recognition');

      // Memory tests
      expect(getDesktopCanonical('/block-memory-test')).toBe('/block-memory');
      expect(getDesktopCanonical('/mobile/block-memory-test')).toBe('/block-memory');
      expect(getDesktopCanonical('/number-memory-test')).toBe('/number-memory');
      expect(getDesktopCanonical('/mobile/number-memory-test')).toBe('/number-memory');

      // Privacy and Research
      expect(getDesktopCanonical('/research-privacy')).toBe('/privacy');
      expect(getDesktopCanonical('/privacy-policy')).toBe('/privacy');
      expect(getDesktopCanonical('/mobile/privacy-policy')).toBe('/privacy');

      // Analytics / Dataset
      expect(getDesktopCanonical('/analytics')).toBe('/dataset');
      expect(getDesktopCanonical('/mobile/analytics')).toBe('/dataset');
    });
  });

  describe('Mobile getCanonicalPath parity', () => {
    it('produces identical canonical paths to desktop for all routes and aliases', () => {
      const testRoutes = [
        '/',
        '/mobile',
        '/mobile/',
        '/reaction-test',
        '/visual-reaction',
        '/mobile/visual-reaction',
        '/direction',
        '/direction-test',
        '/mobile/direction',
        '/color-recognition',
        '/color-test',
        '/colour-recognition',
        '/block-memory',
        '/block-memory-test',
        '/number-memory',
        '/number-memory-test',
        '/privacy',
        '/research-privacy',
        '/privacy-policy',
        '/dataset',
        '/analytics',
        '/mobile/analytics',
        '/settings'
      ];

      for (const route of testRoutes) {
        expect(getMobileCanonical(route)).toBe(getDesktopCanonical(route));
      }
    });
  });
});
