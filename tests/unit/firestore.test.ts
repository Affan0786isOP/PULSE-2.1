import { describe, it, expect } from 'vitest';
import { normalizeAssessmentType } from '../../src/lib/firestore';

describe('normalizeAssessmentType', () => {
  it('returns valid types for canonical types', () => {
    expect(normalizeAssessmentType('visual-reaction')).toBe('visual-reaction');
    expect(normalizeAssessmentType('direction')).toBe('direction');
    expect(normalizeAssessmentType('color-recognition')).toBe('color-recognition');
    expect(normalizeAssessmentType('block-memory')).toBe('block-memory');
    expect(normalizeAssessmentType('number-memory')).toBe('number-memory');
  });

  it('preserves legitimate aliases', () => {
    expect(normalizeAssessmentType('reaction-test')).toBe('visual-reaction');
    expect(normalizeAssessmentType('direction-test')).toBe('direction');
    expect(normalizeAssessmentType('color-test')).toBe('color-recognition');
    expect(normalizeAssessmentType('colour-recognition')).toBe('color-recognition');
  });

  it('rejects unknown or malformed types by returning null instead of defaulting to visual-reaction', () => {
    expect(normalizeAssessmentType('invalid-type')).toBeNull();
    expect(normalizeAssessmentType('unknown')).toBeNull();
    expect(normalizeAssessmentType('')).toBeNull();
    // @ts-ignore - testing runtime behavior
    expect(normalizeAssessmentType(null)).toBeNull();
    // @ts-ignore
    expect(normalizeAssessmentType(undefined)).toBeNull();
  });
});
