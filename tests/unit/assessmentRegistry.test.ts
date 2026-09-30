import { describe, it, expect } from 'vitest';
import {
  resolveAssessmentId,
  isValidAssessmentId,
  getAssessmentDefinition,
  ASSESSMENT_DEFINITIONS,
} from '@shared/registries/assessmentRegistry';
import { CANONICAL_ASSESSMENT_IDS } from '@shared/contracts/common';

describe('Assessment Registry', () => {
  it('contains exactly five canonical assessment definitions', () => {
    const keys = Object.keys(ASSESSMENT_DEFINITIONS);
    expect(keys).toHaveLength(5);
    expect(keys.sort()).toEqual([...CANONICAL_ASSESSMENT_IDS].sort());
  });

  describe('resolveAssessmentId with approved aliases', () => {
    it('resolves canonical IDs to themselves', () => {
      expect(resolveAssessmentId('visual-reaction')).toBe('visual-reaction');
      expect(resolveAssessmentId('direction')).toBe('direction');
      expect(resolveAssessmentId('color-recognition')).toBe('color-recognition');
      expect(resolveAssessmentId('block-memory')).toBe('block-memory');
      expect(resolveAssessmentId('number-memory')).toBe('number-memory');
    });

    it('resolves visual-reaction aliases', () => {
      expect(resolveAssessmentId('reaction-test')).toBe('visual-reaction');
      expect(resolveAssessmentId('visual-reaction-test')).toBe('visual-reaction');
      expect(resolveAssessmentId('reaction')).toBe('visual-reaction');
      expect(resolveAssessmentId('visual')).toBe('visual-reaction');
    });

    it('resolves direction aliases', () => {
      expect(resolveAssessmentId('direction-test')).toBe('direction');
      expect(resolveAssessmentId('direction-reflex')).toBe('direction');
    });

    it('resolves color-recognition aliases', () => {
      expect(resolveAssessmentId('colour-recognition')).toBe('color-recognition');
      expect(resolveAssessmentId('color-recognition')).toBe('color-recognition');
      expect(resolveAssessmentId('color-test')).toBe('color-recognition');
      expect(resolveAssessmentId('colour-test')).toBe('color-recognition');
      expect(resolveAssessmentId('color')).toBe('color-recognition');
      expect(resolveAssessmentId('colour')).toBe('color-recognition');
      expect(resolveAssessmentId('color-rec')).toBe('color-recognition');
      expect(resolveAssessmentId('colour-rec')).toBe('color-recognition');
    });

    it('resolves block-memory aliases', () => {
      expect(resolveAssessmentId('block-memory-test')).toBe('block-memory');
      expect(resolveAssessmentId('block')).toBe('block-memory');
    });

    it('resolves number-memory aliases', () => {
      expect(resolveAssessmentId('number-memory-test')).toBe('number-memory');
      expect(resolveAssessmentId('number')).toBe('number-memory');
    });

    it('handles case-insensitivity and leading/trailing whitespace', () => {
      expect(resolveAssessmentId('  Reaction-Test  ')).toBe('visual-reaction');
      expect(resolveAssessmentId('COLOUR-RECOGNITION')).toBe('color-recognition');
      expect(resolveAssessmentId('  Direction-Reflex ')).toBe('direction');
    });

    it('strictly returns undefined for unknown or unapproved strings (no silent fallback)', () => {
      expect(resolveAssessmentId('unknown')).toBeUndefined();
      expect(resolveAssessmentId('invalid-test')).toBeUndefined();
      expect(resolveAssessmentId('')).toBeUndefined();
      expect(resolveAssessmentId('   ')).toBeUndefined();
      expect(resolveAssessmentId(null)).toBeUndefined();
      expect(resolveAssessmentId(undefined)).toBeUndefined();
    });
  });

  describe('isValidAssessmentId', () => {
    it('returns true only for the five canonical IDs', () => {
      expect(isValidAssessmentId('visual-reaction')).toBe(true);
      expect(isValidAssessmentId('direction')).toBe(true);
      expect(isValidAssessmentId('color-recognition')).toBe(true);
      expect(isValidAssessmentId('block-memory')).toBe(true);
      expect(isValidAssessmentId('number-memory')).toBe(true);
    });

    it('returns false for aliases and unknown strings', () => {
      expect(isValidAssessmentId('colour-recognition')).toBe(false);
      expect(isValidAssessmentId('reaction-test')).toBe(false);
      expect(isValidAssessmentId('unknown')).toBe(false);
      expect(isValidAssessmentId(null)).toBe(false);
      expect(isValidAssessmentId(undefined)).toBe(false);
    });
  });

  describe('getAssessmentDefinition', () => {
    it('returns full definition for canonical assessment', () => {
      const vrt = getAssessmentDefinition('visual-reaction');
      expect(vrt.id).toBe('visual-reaction');
      expect(vrt.displayName).toBe('Visual Reaction');
      expect(vrt.primaryMetric).toBe('averageReactionTime');
      expect(vrt.metricDirection).toBe('lower-is-better');
      expect(vrt.unit).toBe('ms');
      expect(vrt.supportedDevices).toEqual(['desktop', 'mobile']);

      const block = getAssessmentDefinition('block-memory');
      expect(block.id).toBe('block-memory');
      expect(block.metricDirection).toBe('higher-is-better');
      expect(block.unit).toBe('Blocks');
    });
  });
});
