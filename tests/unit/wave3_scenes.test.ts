import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import * as fs from 'fs';
import * as path from 'path';
import { CANONICAL_ASSESSMENT_IDS } from '../../shared/contracts/common';
import { HOMEPAGE_ASSESSMENT_PRESENTATION } from '../../shared/homepage/assessmentPresentation';
import { AssessmentsScene } from '../../src/components/home/AssessmentsScene';
import { ProblemScene } from '../../src/components/home/ProblemScene';
import { ResultScene } from '../../src/components/home/ResultScene';
import { MobileAssessmentsScene } from '../../mobile/src/components/home/MobileAssessmentsScene';
import { MobileProblemScene } from '../../mobile/src/components/home/MobileProblemScene';
import { MobileResultScene } from '../../mobile/src/components/home/MobileResultScene';

describe('Wave 3 Scenes — Assessments, Problem, and Result', () => {
  describe('Canonical Assessment Definitions and Presentation Parity', () => {
    it('contains all 5 canonical assessment IDs with zero duplicates', () => {
      const ids = [...CANONICAL_ASSESSMENT_IDS];
      expect(ids).toHaveLength(5);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
      expect(ids).toEqual([
        'visual-reaction',
        'direction',
        'color-recognition',
        'block-memory',
        'number-memory',
      ]);
    });

    it('resolves presentation metadata for all 5 canonical assessments', () => {
      for (const id of CANONICAL_ASSESSMENT_IDS) {
        const pres = HOMEPAGE_ASSESSMENT_PRESENTATION[id];
        expect(pres).toBeDefined();
        expect(pres.assessmentId).toBe(id);
        expect(pres.protocolNumber).toMatch(/^PROTOCOL 0[1-5]$/);
        expect(pres.category).toBeTruthy();
        expect(pres.heroDescription).toBeTruthy();
        expect(pres.logoPath).toBeTruthy();
      }
    });
  });

  describe('Desktop Wave 3 Scenes', () => {
    it('renders AssessmentsScene with stable #assessments anchor and all 5 assessments', () => {
      const html = renderToStaticMarkup(
        React.createElement(MemoryRouter, null, React.createElement(AssessmentsScene))
      );
      expect(html).toContain('id="assessments"');
      expect(html).toContain('Standardized Cognitive Assessments');
      expect(html).toContain('VISUAL REACTION');
      expect(html).toContain('DIRECTIONAL CHOICE');
      expect(html).toContain('COLOR RECOGNITION');
      expect(html).toContain('BLOCK MEMORY');
      expect(html).toContain('NUMBER MEMORY');
    });

    it('renders ProblemScene with stable #problem anchor and factual latency decomposition', () => {
      const html = renderToStaticMarkup(React.createElement(ProblemScene));
      expect(html).toContain('id="problem"');
      expect(html).toContain('The Browser is an Uncalibrated Instrument');
      expect(html).toContain('Display Refresh Quantization');
      expect(html).toContain('Main-Thread &amp; Event Queue Latency');
      expect(html).toContain('Outlier &amp; False-Start Distortion');
      expect(html).toContain('Methodological Scope &amp; Limitations');
      // Verifies non-medical disclaimer exists
      expect(html).toContain('does not replace laboratory tachistoscopes');
    });

    it('renders ResultScene with stable #result anchor, illustrative telemetry, and non-diagnostic disclaimer', () => {
      const html = renderToStaticMarkup(React.createElement(ResultScene));
      expect(html).toContain('id="result"');
      expect(html).toContain('Interpretable Cognitive Telemetry');
      expect(html).toContain('142');
      expect(html).toContain('Consistency Index');
      expect(html).toContain('Sample Std Dev');
      expect(html).toContain('Illustrative Benchmark Telemetry // Not Medical or Diagnostic Data');
    });
  });

  describe('Mobile Wave 3 Scenes', () => {
    it('renders MobileAssessmentsScene with stable #assessments anchor and all 5 assessments', () => {
      const html = renderToStaticMarkup(
        React.createElement(MemoryRouter, null, React.createElement(MobileAssessmentsScene))
      );
      expect(html).toContain('id="assessments"');
      expect(html).toContain('Standardized Assessments');
      expect(html).toContain('Visual Reaction');
      expect(html).toContain('Directional Choice');
      expect(html).toContain('Color Recognition');
      expect(html).toContain('Block Memory');
      expect(html).toContain('Number Memory');
    });

    it('renders MobileProblemScene with stable #problem anchor and mobile decomposition cards', () => {
      const html = renderToStaticMarkup(React.createElement(MobileProblemScene));
      expect(html).toContain('id="problem"');
      expect(html).toContain('The Browser as an Instrument');
      expect(html).toContain('Display Frame Quantization');
      expect(html).toContain('Main-Thread Input Jitter');
      expect(html).toContain('Anticipation &amp; Outlier Skew');
      expect(html).toContain('does not provide medical evaluation or clinical diagnosis');
    });

    it('renders MobileResultScene with stable #result anchor and non-diagnostic disclaimer', () => {
      const html = renderToStaticMarkup(React.createElement(MobileResultScene));
      expect(html).toContain('id="result"');
      expect(html).toContain('Session Telemetry Output');
      expect(html).toContain('142');
      expect(html).toContain('Consistency');
      expect(html).toContain('Sample Std Dev');
      expect(html).toContain('Illustrative Telemetry // Not Medical Data');
    });
  });

  describe('Architectural Independence & Cross-Import Isolation', () => {
    it('verifies mobile components do not import from desktop src/ directory', () => {
      const mobileFiles = [
        'mobile/src/components/ui/MobileAssessmentCarousel.tsx',
        'mobile/src/components/home/MobileAssessmentsScene.tsx',
        'mobile/src/components/home/MobileProblemScene.tsx',
        'mobile/src/components/home/MobileResultScene.tsx',
        'mobile/src/components/Home.tsx',
      ];

      for (const relPath of mobileFiles) {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Ensure no imports pointing to desktop src/ (except @shared/ or relative within mobile/)
        expect(content).not.toMatch(/from\s+['"][.]{2,}\/src\//);
        expect(content).not.toMatch(/from\s+['"]src\//);
      }
    });

    it('verifies desktop components do not import from mobile/ directory', () => {
      const desktopFiles = [
        'src/components/ui/AssessmentHero3D.tsx',
        'src/components/home/AssessmentsScene.tsx',
        'src/components/home/ProblemScene.tsx',
        'src/components/home/ResultScene.tsx',
        'src/components/Home.tsx',
      ];

      for (const relPath of desktopFiles) {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(content).not.toMatch(/from\s+['"][.]{1,}\/mobile\//);
        expect(content).not.toMatch(/from\s+['"]mobile\//);
      }
    });
  });
});
