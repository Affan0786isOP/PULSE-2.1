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

import { MobileProofScene } from '../../mobile/src/components/home/MobileProofScene';
import { MobileAssessmentsScene } from '../../mobile/src/components/home/MobileAssessmentsScene';
import { MobileProblemScene } from '../../mobile/src/components/home/MobileProblemScene';
import { MobileResultScene } from '../../mobile/src/components/home/MobileResultScene';
import { MobileWhyPulseScene } from '../../mobile/src/components/home/MobileWhyPulseScene';
import { MobileHowItWorksScene } from '../../mobile/src/components/home/MobileHowItWorksScene';
import { MobileFAQScene } from '../../mobile/src/components/home/MobileFAQScene';
import { MobileFinalCTAScene } from '../../mobile/src/components/home/MobileFinalCTAScene';
import { MobileHomeFooter } from '../../mobile/src/components/home/MobileHomeFooter';
import { Home as MobileHome } from '../../mobile/src/components/Home';

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
    it('verifies all desktop and mobile narrative scene components exist on disk', () => {
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
        'mobile/src/components/home/MobileProofScene.tsx',
        'mobile/src/components/home/MobileAssessmentsScene.tsx',
        'mobile/src/components/home/MobileProblemScene.tsx',
        'mobile/src/components/home/MobileResultScene.tsx',
        'mobile/src/components/home/MobileWhyPulseScene.tsx',
        'mobile/src/components/home/MobileHowItWorksScene.tsx',
        'mobile/src/components/home/MobileFAQScene.tsx',
        'mobile/src/components/home/MobileFinalCTAScene.tsx',
        'mobile/src/components/home/MobileHomeFooter.tsx',
        'mobile/src/components/ui/MobileAssessmentCarousel.tsx',
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

  describe('Mobile Home Sequential Integration', () => {
    it('verifies mobile Home keeps the concise sections in conversion-focused order', () => {
      const mobileHomePath = path.join(process.cwd(), 'mobile/src/components/Home.tsx');
      const content = fs.readFileSync(mobileHomePath, 'utf-8');

      // Check hero preserved
      expect(content).toContain('<MobileHero');

      // Check sequential scene tags
      const heroIdx = content.indexOf('<MobileHero');
      const assessmentsIdx = content.indexOf('<MobileAssessmentsScene');
      const resultIdx = content.indexOf('<MobileResultScene');
      const problemIdx = content.indexOf('<MobileProblemScene');
      const faqIdx = content.indexOf('<MobileFAQScene');
      const ctaIdx = content.indexOf('<MobileFinalCTAScene');
      const footerIdx = content.indexOf('<MobileHomeFooter');

      expect(heroIdx).toBeGreaterThan(-1);
      expect(assessmentsIdx).toBeGreaterThan(heroIdx);
      expect(resultIdx).toBeGreaterThan(assessmentsIdx);
      expect(problemIdx).toBeGreaterThan(resultIdx);
      expect(faqIdx).toBeGreaterThan(problemIdx);
      expect(ctaIdx).toBeGreaterThan(faqIdx);
      expect(footerIdx).toBeGreaterThan(ctaIdx);
      expect(content).not.toContain('<MobileProofScene');
      expect(content).not.toContain('<MobileWhyPulseScene');
      expect(content).not.toContain('<MobileHowItWorksScene');
    });

    it('renders mobile Home into static markup containing live hero and narrative sections', () => {
      const html = renderToStaticMarkup(
        React.createElement(MemoryRouter, null, React.createElement(MobileHome, { onNavigate: () => {} }))
      );

      // Narrative sections
      expect(html).toContain('Explore the tests');
      expect(html).toContain('See your results');
      expect(html).toContain('How it works');
      expect(html).toContain('SAMPLE RESULT');
      expect(html).toContain('Browser timing &amp; its limits');
      expect(html).not.toContain('Core Measurement Standards');
      expect(html).toContain('Frequently Asked Questions');
      expect(html).toContain('Ready to see how you perform?');
    });
  });

  describe('Token & Platform Styling Isolation Invariants', () => {
    it('verifies mobile components do not use desktop Tailwind dark: utility prefixes', () => {
      const mobileFiles = [
        'mobile/src/components/home/MobileProofScene.tsx',
        'mobile/src/components/home/MobileAssessmentsScene.tsx',
        'mobile/src/components/home/MobileProblemScene.tsx',
        'mobile/src/components/home/MobileResultScene.tsx',
        'mobile/src/components/home/MobileWhyPulseScene.tsx',
        'mobile/src/components/home/MobileHowItWorksScene.tsx',
        'mobile/src/components/home/MobileFAQScene.tsx',
        'mobile/src/components/home/MobileFinalCTAScene.tsx',
        'mobile/src/components/home/MobileHomeFooter.tsx',
        'mobile/src/components/ui/MobileAssessmentCarousel.tsx',
      ];

      for (const relPath of mobileFiles) {
        const fullPath = path.join(process.cwd(), relPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(content).not.toMatch(/dark:[a-zA-Z0-9_\-\[\]#]+/);
      }
    });

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
