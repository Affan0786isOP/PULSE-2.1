import { describe, it, expect } from 'vitest';
import { deriveForeperiodCategory } from './protocolValidators';

describe('deriveForeperiodCategory', () => {
  describe('Valid inputs - SHORT category', () => {
    it('should return SHORT for the minimum valid value (100)', () => {
      expect(deriveForeperiodCategory(100)).toBe('SHORT');
    });

    it('should return SHORT for a mid-range value (250)', () => {
      expect(deriveForeperiodCategory(250)).toBe('SHORT');
    });

    it('should return SHORT for the maximum valid value (500)', () => {
      expect(deriveForeperiodCategory(500)).toBe('SHORT');
    });
  });

  describe('Valid inputs - LONG category', () => {
    it('should return LONG for the minimum valid value (501)', () => {
      expect(deriveForeperiodCategory(501)).toBe('LONG');
    });

    it('should return LONG for a mid-range value (1500)', () => {
      expect(deriveForeperiodCategory(1500)).toBe('LONG');
    });

    it('should return LONG for the maximum valid value (3000)', () => {
      expect(deriveForeperiodCategory(3000)).toBe('LONG');
    });
  });

  describe('Invalid inputs - Out of bounds', () => {
    it('should return null for values below 100', () => {
      expect(deriveForeperiodCategory(99)).toBeNull();
      expect(deriveForeperiodCategory(0)).toBeNull();
      expect(deriveForeperiodCategory(-100)).toBeNull();
    });

    it('should return null for values above 3000', () => {
      expect(deriveForeperiodCategory(3001)).toBeNull();
      expect(deriveForeperiodCategory(5000)).toBeNull();
    });
  });

  describe('Invalid inputs - Edge cases and invalid types', () => {
    it('should return null for null', () => {
      expect(deriveForeperiodCategory(null)).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(deriveForeperiodCategory(undefined)).toBeNull();
    });

    it('should return null for NaN', () => {
      expect(deriveForeperiodCategory(NaN)).toBeNull();
    });

    it('should return null for Infinity', () => {
      expect(deriveForeperiodCategory(Infinity)).toBeNull();
      expect(deriveForeperiodCategory(-Infinity)).toBeNull();
    });

    it('should return null for non-integer numbers', () => {
      expect(deriveForeperiodCategory(100.5)).toBeNull();
      expect(deriveForeperiodCategory(500.1)).toBeNull();
      expect(deriveForeperiodCategory(501.9)).toBeNull();
      expect(deriveForeperiodCategory(3000.01)).toBeNull();
    });
  });
});
