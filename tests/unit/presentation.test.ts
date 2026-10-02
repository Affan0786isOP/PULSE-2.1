import { describe, it, expect } from 'vitest';
import { CANONICAL_ASSESSMENT_IDS } from '@shared/contracts/common';
import { HOMEPAGE_ASSESSMENT_PRESENTATION } from '@shared/homepage/assessmentPresentation';

describe('Homepage Assessment Presentation Metadata', () => {
  it('contains valid presentation metadata for every canonical assessment ID', () => {
    const isComplete = CANONICAL_ASSESSMENT_IDS.every((id) => {
      const presentation = HOMEPAGE_ASSESSMENT_PRESENTATION[id];
      return (
        Boolean(presentation) &&
        presentation.assessmentId === id &&
        typeof presentation.protocolNumber === 'string' &&
        presentation.protocolNumber.length > 0 &&
        typeof presentation.category === 'string' &&
        presentation.category.length > 0 &&
        typeof presentation.heroDescription === 'string' &&
        presentation.heroDescription.length > 0 &&
        typeof presentation.logoPath === 'string' &&
        presentation.logoPath.length > 0
      );
    });

    expect(isComplete).toBe(true);
  });

  it('contains no unexpected keys outside canonical assessment IDs', () => {
    const keys = Object.keys(HOMEPAGE_ASSESSMENT_PRESENTATION);
    expect(keys).toHaveLength(CANONICAL_ASSESSMENT_IDS.length);
    keys.forEach((key) => {
      expect(CANONICAL_ASSESSMENT_IDS).toContain(key as any);
    });
  });
});
