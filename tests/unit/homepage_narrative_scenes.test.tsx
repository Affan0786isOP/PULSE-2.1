import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import * as fs from 'fs';
import * as path from 'path';

import { ProofScene } from '../../src/components/home/ProofScene';
import { AssessmentsScene } from '../../src/components/home/AssessmentsScene';
import { ProblemScene } from '../../src/components/home/ProblemScene';
import { ResultScene } from '../../src/components/home/ResultScene';
import { WhyPulseScene } from '../../src/components/home/WhyPulseScene';
import { HowItWorksScene } from '../../src/components/home/HowItWorksScene';
import { FAQScene } from '../../src/components/home/FAQScene';
import { FinalCTAScene } from '../../src/components/home/FinalCTAScene';
import { HomeFooter } from '../../src/components/home/HomeFooter';
import { Home as DesktopHome } from '../../src/components/Home';


// Mock authoritative stats and settingsStore hooks
vi.mock('../../src/lib/useAuthoritativeStats', () => ({
  useAuthoritativeStats: () => ({
    testsCount: 5,
    resultsCount: 15420,
    isLoadingResults: false,
  }),
}));

vi.mock('../../src/lib/settingsStore', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useReducedMotionPreference: () => false,
    triggerHaptic: () => {},
  };
});

vi.mock('../../mobile/src/lib/settingsStore', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useReducedMotionPreference: () => false,
    triggerHaptic: () => {},
  };
});

vi.mock('../../mobile/src/lib/usePwaInstall', () => ({
  usePwaInstall: () => ({
    isInstallable: false,
    isGuideOpen: false,
    isInstalled: false,
    promptInstall: vi.fn(),
    closeInstallGuide: vi.fn(),
  }),
}));

describe('Homepage Narrative Redesign Suite', () => {
  describe('File Presence on Disk', () => {
    it('verifies all desktop narrative scene components exist on disk', () => {
      const requiredFiles = [
        'src/components/home/ProofScene.tsx',
        'src/components/home/AssessmentsScene.tsx',
        'src/components/home/ProblemScene.tsx',
        'src/components/home/ResultScene.tsx',
        'src/components/home/WhyPulseScene.tsx',
        'src/components/home/HowItWorksScene.tsx',
        'src/components/home/FAQScene.tsx',
        'src/components/home/FinalCTAScene.tsx',
        'src/components/home/HomeFooter.tsx',
        'src/components/ui/DesktopAssessmentCarousel.tsx',
              ];

      for (const relPath of requiredFiles) {
        const fullPath = path.join(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    });
  });

  describe('Desktop Home Sequential Integration', () => {
    it('verifies desktop Home keeps the concise sections in conversion-focused order', () => {
      const desktopHomePath = path.join(process.cwd(), 'src/components/Home.tsx');
      const content = fs.readFileSync(desktopHomePath, 'utf-8');

      // Check hero elements preserved
      expect(content).toContain('id="hero"');
      expect(content).toContain('<AssessmentHero3D');
      expect(content).toContain('Measure');
      expect(content).toContain('your');

      // Check sequential scene tags
      const heroIdx = content.indexOf('id="hero"');
      const assessmentsIdx = content.indexOf('<AssessmentsScene');
      const resultIdx = content.indexOf('<ResultScene');
      const problemIdx = content.indexOf('<ProblemScene');
      const faqIdx = content.indexOf('<FAQScene');
      const ctaIdx = content.indexOf('<FinalCTAScene');
      const footerIdx = content.indexOf('<HomeFooter');

      expect(heroIdx).toBeGreaterThan(-1);
      expect(assessmentsIdx).toBeGreaterThan(heroIdx);
      expect(resultIdx).toBeGreaterThan(assessmentsIdx);
      expect(problemIdx).toBeGreaterThan(resultIdx);
      expect(faqIdx).toBeGreaterThan(problemIdx);
      expect(ctaIdx).toBeGreaterThan(faqIdx);
      expect(footerIdx).toBeGreaterThan(ctaIdx);
      expect(content).not.toContain('<ProofScene');
      expect(content).not.toContain('<WhyPulseScene');
      expect(content).not.toContain('<HowItWorksScene');
    });

    it('renders desktop Home into static markup containing live hero and narrative sections', () => {
      const html = renderToStaticMarkup(
        React.createElement(MemoryRouter, null, React.createElement(DesktopHome))
      );

      // Hero content
      expect(html).toContain('Measure');
      expect(html).toContain('Start Testing');

      // Narrative sections
      expect(html).toContain('Explore the five tests');
      expect(html).toContain('See your results');
      expect(html).toContain('How it works');
      expect(html).toContain('SAMPLE RESULT');
      expect(html).toContain('How browser timing works');
      expect(html).not.toContain('How the Assessment Flow Operates');
      expect(html).toContain('Frequently Asked Questions');
      expect(html).toContain('Ready to see how you perform?');
    });
  });
  describe('Token & Platform Styling Isolation Invariants', () => {
    it('verifies desktop components do not cross-import mobile components', () => {
      const desktopFiles = [
        'src/components/home/ProofScene.tsx',
        'src/components/home/AssessmentsScene.tsx',
        'src/components/home/ProblemScene.tsx',
        'src/components/home/ResultScene.tsx',
        'src/components/home/WhyPulseScene.tsx',
        'src/components/home/HowItWorksScene.tsx',
        'src/components/home/FAQScene.tsx',
        'src/components/home/FinalCTAScene.tsx',
        'src/components/home/HomeFooter.tsx',
        'src/components/ui/DesktopAssessmentCarousel.tsx',
      ];

      for (const relPath of desktopFiles) {
        const fullPath = path.join(process.cwd(), relPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(content).not.toMatch(/from\s+['"][.]{1,}\/mobile\//);
        expect(content).not.toMatch(/from\s+['"]mobile\//);
      }
    });
  });

  describe('Homepage copy credibility', () => {
    it('avoids unsupported precision and psychometric-standardization claims in shared assessment cards', () => {
      const presentation = fs.readFileSync(
        path.join(process.cwd(), 'shared/homepage/assessmentPresentation.ts'),
        'utf-8',
      );
      expect(presentation).not.toContain('sub-millisecond precision');
      expect(presentation).not.toContain('pure somatic');
      expect(presentation).not.toContain('cognitive bifurcation');
      expect(presentation).toContain('Device and browser timing can affect results.');
    });
  });

  describe('Accessibility & Route Registry Integration', () => {
    it('ensures Final CTA links use canonical getAssessmentLaunchRoute', async () => {
      const { getAssessmentLaunchRoute } = await import('../../shared/registries/routeRegistry');
      expect(getAssessmentLaunchRoute('visual-reaction')).toBe('/reaction-test');

      const desktopCtaHtml = renderToStaticMarkup(
        React.createElement(MemoryRouter, null, React.createElement(FinalCTAScene))
      );
      expect(desktopCtaHtml).toContain('href="/assessments"');
      expect(desktopCtaHtml).toContain('Start an assessment');
    });

    it('ensures FAQ accordions contain aria-expanded, aria-controls, and region semantics', () => {
      const html = renderToStaticMarkup(
        React.createElement(MemoryRouter, null, React.createElement(FAQScene))
      );
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain('aria-controls="faq-panel-faq-item-1"');
      expect(html).toContain('role="region"');
    });
  });
});
