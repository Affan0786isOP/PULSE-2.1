import { describe, it, expect } from 'vitest';
import guidesData from '../../shared/content/guides.json';
import { validateGuideContent } from '../../shared/content/guideValidator.mjs';
import {
  ALLOWED_REFERRAL_TOKENS,
  REFERRAL_TTL_MS,
  isValidReferralToken
} from '../../shared/contracts/referralContract';

describe('Guide Content Contracts & Scientific Disclosures', () => {
  it('passes pure ES module validation on guides.json', () => {
    expect(() => validateGuideContent(guidesData)).not.toThrow();
    expect(validateGuideContent(guidesData)).toBe(true);
  });

  it('includes required peer-reviewed literature citations with DOI/URL', () => {
    const vrt = guidesData['/guides/visual-reaction-time'];
    expect(vrt.citations.length).toBeGreaterThan(0);
    const woods = vrt.citations.find((c: any) => c.author.includes('Woods'));
    expect(woods).toBeDefined();
    expect(woods?.doi).toBe('10.3389/fnhum.2015.00131');
  });

  it('enforces statistical protocol publication criteria on benchmark distributions', () => {
    const benchmarks = guidesData['/benchmarks/cognitive-percentiles'];
    expect(benchmarks.statisticalProtocol).toBeDefined();
    expect(benchmarks.statisticalProtocol?.unitOfAnalysis).toBe('Verified Assessment Session');
    expect(benchmarks.statisticalProtocol?.publicationGates.medianTargetSessions).toBe(500);
    expect(benchmarks.statisticalProtocol?.publicationGates.extremeQuantileStatus).toContain('Unavailable in initial release');
  });

  it('strictly validates finite referral tokens and expiration constants', () => {
    expect(ALLOWED_REFERRAL_TOKENS).toContain('guide-vrt');
    expect(ALLOWED_REFERRAL_TOKENS).toContain('guide-stroop');
    expect(ALLOWED_REFERRAL_TOKENS).toContain('benchmarks-percentiles');

    expect(isValidReferralToken('guide-vrt')).toBe(true);
    expect(isValidReferralToken('invalid-tracking-id')).toBe(false);
    expect(isValidReferralToken('')).toBe(false);
    expect(isValidReferralToken(null)).toBe(false);

    expect(REFERRAL_TTL_MS).toBe(1800000); // 30 mins
  });
});
