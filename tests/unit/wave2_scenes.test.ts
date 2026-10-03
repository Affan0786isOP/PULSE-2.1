import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeroScene } from '../../src/components/home/HeroScene';
import { ProofScene } from '../../src/components/home/ProofScene';
import { MobileHeroScene } from '../../mobile/src/components/home/MobileHeroScene';
import { MobileProofScene } from '../../mobile/src/components/home/MobileProofScene';

describe('Wave 2 Scenes — Desktop & Mobile Hero and Proof', () => {
  describe('Desktop HeroScene', () => {
    it('renders with stable #hero anchor and display headline', () => {
      const html = renderToStaticMarkup(React.createElement(HeroScene));
      expect(html).toContain('id="hero"');
      expect(html).toContain('PRECISION COGNITIVE BENCHMARKING');
      expect(html).toContain('MILLISECOND LATENCY');
      expect(html).toContain('STANDARDIZED TELEMETRY');
    });

    it('contains primary CTA leading to #assessments and secondary to #proof', () => {
      const html = renderToStaticMarkup(React.createElement(HeroScene));
      expect(html).toContain('href="#assessments"');
      expect(html).toContain('Explore Assessments');
      expect(html).toContain('href="#proof"');
      expect(html).toContain('Measurement Methodology');
    });
  });

  describe('Desktop ProofScene', () => {
    it('renders with stable #proof anchor and section title', () => {
      const html = renderToStaticMarkup(React.createElement(ProofScene));
      expect(html).toContain('id="proof"');
      expect(html).toContain('How PULSE Measures Client-Side Reaction Latency');
    });

    it('renders all 4 measurement pipeline stages', () => {
      const html = renderToStaticMarkup(React.createElement(ProofScene));
      expect(html).toContain('STAGE 01');
      expect(html).toContain('Stimulus Presentation');
      expect(html).toContain('STAGE 02');
      expect(html).toContain('Human Response Capture');
      expect(html).toContain('STAGE 03');
      expect(html).toContain('Trial Validation &amp; Correction');
      expect(html).toContain('STAGE 04');
      expect(html).toContain('Session Metrics &amp; Summary');
    });

    it('contains launcher link leading to #assessments', () => {
      const html = renderToStaticMarkup(React.createElement(ProofScene));
      expect(html).toContain('href="#assessments"');
    });
  });

  describe('Mobile HeroScene', () => {
    it('renders with stable #hero anchor and mobile typography', () => {
      const html = renderToStaticMarkup(React.createElement(MobileHeroScene));
      expect(html).toContain('id="hero"');
      expect(html).toContain('Precision telemetry');
      expect(html).toContain('Local timing');
    });

    it('contains accessible touch-target CTAs linking to #assessments and #proof', () => {
      const html = renderToStaticMarkup(React.createElement(MobileHeroScene));
      expect(html).toContain('href="#assessments"');
      expect(html).toContain('href="#proof"');
    });
  });

  describe('Mobile ProofScene', () => {
    it('renders with stable #proof anchor and sequential pipeline cards', () => {
      const html = renderToStaticMarkup(React.createElement(MobileProofScene));
      expect(html).toContain('id="proof"');
      expect(html).toContain('The 4-Stage Evaluation Pipeline');
      expect(html).toContain('STAGE 01');
      expect(html).toContain('Stimulus Presentation');
      expect(html).toContain('STAGE 02');
      expect(html).toContain('Touch Response');
      expect(html).toContain('STAGE 03');
      expect(html).toContain('Trial Validation');
      expect(html).toContain('STAGE 04');
      expect(html).toContain('Session Metrics');
      expect(html).toContain('href="#assessments"');
    });
  });
});
