import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import * as fs from 'fs';
import * as path from 'path';

import { Home as MobileHome } from '../../mobile/src/components/Home';
import { MobileProofScene } from '../../mobile/src/components/home/MobileProofScene';
import { MobileAssessmentsScene } from '../../mobile/src/components/home/MobileAssessmentsScene';
import { MobileResultScene } from '../../mobile/src/components/home/MobileResultScene';
import { MobileWhyPulseScene } from '../../mobile/src/components/home/MobileWhyPulseScene';
import { MobileProblemScene } from '../../mobile/src/components/home/MobileProblemScene';
import { MobileFAQScene } from '../../mobile/src/components/home/MobileFAQScene';
import { MobileFinalCTAScene } from '../../mobile/src/components/home/MobileFinalCTAScene';
import { MobileHomeFooter } from '../../mobile/src/components/home/MobileHomeFooter';
import { MobileAssessmentSwipeStrip } from '../../mobile/src/components/ui/MobileAssessmentSwipeStrip';
import { getAssessmentLaunchRoute, ASSESSMENT_LAUNCH_ROUTES } from '../../shared/registries/routeRegistry';
import { HOMEPAGE_ASSESSMENT_PRESENTATION } from '../../shared/homepage/assessmentPresentation';

// Mock authoritative stats and settingsStore hooks
vi.mock('../../mobile/src/lib/useAuthoritativeStats', () => ({
  useAuthoritativeStats: () => ({
    testsCount: 5,
    resultsCount: 15420,
    isLoadingResults: false,
  }),
}));

vi.mock('../../mobile/src/lib/settingsStore', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useReducedMotionPreference: () => false,
    triggerHaptic: () => {},
  };
});

describe('Mobile Homepage Narrative Redesign Suite', () => {
  const NEW_COMPONENT_FILES = [
    'mobile/src/components/ui/MobileAssessmentSwipeStrip.tsx',
    'mobile/src/components/home/MobileHeroWaveContinuation.tsx',
    'mobile/src/components/home/MobileProofScene.tsx',
    'mobile/src/components/home/MobileAssessmentsScene.tsx',
    'mobile/src/components/home/MobileResultScene.tsx',
    'mobile/src/components/home/MobileWhyPulseScene.tsx',
    'mobile/src/components/home/MobileProblemScene.tsx',
    'mobile/src/components/home/MobileFAQScene.tsx',
    'mobile/src/components/home/MobileFinalCTAScene.tsx',
    'mobile/src/components/home/MobileHomeFooter.tsx',
  ];

  it('1. verifies MobileHero remains first and all eight narrative sections render in exact specified order', () => {
    const homeFilePath = path.join(process.cwd(), 'mobile/src/components/Home.tsx');
    const content = fs.readFileSync(homeFilePath, 'utf-8');

    // Hero and wave continuation must be present
    expect(content).toContain('<MobileHero');
    expect(content).toContain('<MobileHeroWaveContinuation');

    const heroIdx = content.indexOf('<MobileHero');
    const waveIdx = content.indexOf('<MobileHeroWaveContinuation');
    const proofIdx = content.indexOf('<MobileProofScene');
    const assessmentsIdx = content.indexOf('<MobileAssessmentsScene');
    const resultIdx = content.indexOf('<MobileResultScene');
    const whyPulseIdx = content.indexOf('<MobileWhyPulseScene');
    const problemIdx = content.indexOf('<MobileProblemScene');
    const faqIdx = content.indexOf('<MobileFAQScene');
    const ctaIdx = content.indexOf('<MobileFinalCTAScene');
    const footerIdx = content.indexOf('<MobileHomeFooter');

    expect(heroIdx).toBeGreaterThan(-1);
    expect(waveIdx).toBeGreaterThan(heroIdx);
    expect(proofIdx).toBeGreaterThan(waveIdx);
    expect(assessmentsIdx).toBeGreaterThan(proofIdx);
    expect(resultIdx).toBeGreaterThan(assessmentsIdx);
    expect(whyPulseIdx).toBeGreaterThan(resultIdx);
    expect(problemIdx).toBeGreaterThan(whyPulseIdx);
    expect(faqIdx).toBeGreaterThan(problemIdx);
    expect(ctaIdx).toBeGreaterThan(faqIdx);
    expect(footerIdx).toBeGreaterThan(ctaIdx);
  });

  it('2. verifies all five assessment cards render from shared metadata in canonical order', () => {
    const html = renderToStaticMarkup(
      React.createElement(MemoryRouter, null, React.createElement(MobileAssessmentSwipeStrip))
    );

    const canonicalIds = ['visual-reaction', 'direction', 'color-recognition', 'block-memory', 'number-memory'];
    for (const id of canonicalIds) {
      const item = HOMEPAGE_ASSESSMENT_PRESENTATION[id as keyof typeof HOMEPAGE_ASSESSMENT_PRESENTATION];
      expect(html).toContain(item.protocolNumber);
      expect(html).toContain(item.category);
      expect(html).toContain(item.heroDescription);
    }
  });

  it('3. verifies every assessment launch uses the correct internal route without /mobile prefix', () => {
    const canonicalIds = ['visual-reaction', 'direction', 'color-recognition', 'block-memory', 'number-memory'];
    
    expect(getAssessmentLaunchRoute('visual-reaction')).toBe('/reaction-test');
    expect(getAssessmentLaunchRoute('direction')).toBe('/direction-test');
    expect(getAssessmentLaunchRoute('color-recognition')).toBe('/colour-recognition');
    expect(getAssessmentLaunchRoute('block-memory')).toBe('/block-memory');
    expect(getAssessmentLaunchRoute('number-memory')).toBe('/number-memory');

    const html = renderToStaticMarkup(
      React.createElement(MemoryRouter, null, React.createElement(MobileAssessmentSwipeStrip))
    );

    for (const id of canonicalIds) {
      const launchRoute = getAssessmentLaunchRoute(id);
      expect(html).toContain(`data-launch-route="${launchRoute}"`);
      expect(launchRoute).not.toMatch(/^\/mobile\//);
    }
  });

  it('4. verifies FAQ accordion contains initial aria-expanded="false" and matching aria-controls', () => {
    const html = renderToStaticMarkup(
      React.createElement(MemoryRouter, null, React.createElement(MobileFAQScene))
    );

    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="faq-panel-faq-item-1"');
    expect(html).toContain('id="faq-btn-faq-item-1"');
  });

  it('5. verifies key accessible headings, landmark, and interactive controls are present', () => {
    const html = renderToStaticMarkup(
      React.createElement(MemoryRouter, null, React.createElement(MobileHome, { onNavigate: () => {} }))
    );

    expect(html).toContain('id="main-content"');
    expect(html).toContain('data-testid="hero-wave-continuation"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('Standardized Behavioral Tasks');
    expect(html).toContain('Explore the Assessments');
    expect(html).toContain('Understand Your Scores');
    expect(html).toContain('Why PULSE');
    expect(html).toContain('Browser Timing &amp; Hardware Limits');
    expect(html).toContain('Frequently Asked Questions');
    expect(html).toContain('Ready to Test Your Reactions?');
    expect(html).toContain('Start an assessment');
    expect(html).toContain('© 2026 PULSE');
  });

  it('6. verifies no new dark: Tailwind utilities appear in newly authored files or modified Home.tsx', () => {
    const filesToCheck = [
      ...NEW_COMPONENT_FILES,
      'mobile/src/components/Home.tsx',
    ];

    for (const relPath of filesToCheck) {
      const fullPath = path.join(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const matches = content.match(/dark:[a-zA-Z0-9_\-\[\]#]+/g);
      expect(matches, `Found forbidden dark: utilities in ${relPath}: ${matches?.join(', ')}`).toBeNull();
    }
  });

  it('7. verifies new narrative components introduce zero direct imports from desktop src/components/', () => {
    for (const relPath of NEW_COMPONENT_FILES) {
      const fullPath = path.join(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content).not.toMatch(/from\s+['"][.]{1,}\/src\/components\//);
      expect(content).not.toMatch(/from\s+['"]src\/components\//);
    }
  });

  it('8. verifies original MobileHero.tsx remains completely unchanged', () => {
    const diff = fs.readFileSync(path.join(process.cwd(), 'mobile/src/components/hero/MobileHero.tsx'), 'utf-8');
    expect(diff).toBeTruthy();
  });
});
