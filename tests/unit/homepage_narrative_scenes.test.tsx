import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { Home } from '../../src/components/Home';
import { Home as MobileHome } from '../../mobile/src/components/Home';
import { getAssessmentLaunchRoute } from '../../shared/registries/assessmentRegistry';

const mockStats = vi.hoisted(() => ({
  testsCount: 5,
  resultsCount: 90 as number | null,
  isLoadingResults: false,
}));

vi.mock('../../src/lib/useAuthoritativeStats', () => ({
  useAuthoritativeStats: () => mockStats,
}));

vi.mock('../../src/lib/settingsStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/settingsStore')>();
  return { ...actual, useReducedMotionPreference: () => false };
});

vi.mock('../../mobile/src/components/hero/MobileHero', () => ({
  MobileHero: () => <div data-testid="retained-mobile-hero">Existing mobile hero</div>,
}));
vi.mock('../../mobile/src/components/SEO', () => ({ SEO: () => null }));
vi.mock('../../mobile/src/lib/welcomeStore', () => ({ isMobileWelcomeSeen: () => true }));
vi.mock('../../mobile/src/lib/usePwaInstall', () => ({
  usePwaInstall: () => ({
    isInstallable: false,
    promptInstall: vi.fn(),
    isGuideOpen: false,
    closeInstallGuide: vi.fn(),
    isInstalled: false,
    isIos: false,
    isSafari: false,
    isIosSafari: false,
    isIosChrome: false,
    isIosOtherBrowser: false,
    hasNativePrompt: false,
    isInstallPromptSupported: false,
    isUnsupportedBrowser: false,
    isOffline: false,
  }),
}));

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
}

function sceneOrder(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[data-home-scene]')).map((element) => element.getAttribute('data-home-scene'));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PULSE homepage narrative', () => {
  it('keeps the desktop hero and appends the narrative scenes in canonical order', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Home />
      </MemoryRouter>
    );

    expect(container.querySelector('#hero')).not.toBeNull();
    expect(sceneOrder(container)).toEqual(['proof', 'assessments', 'problem', 'result', 'why-pulse', 'how-it-works', 'faq', 'final-cta', 'footer']);
  });

  it('scopes baseline viewport scaling to the desktop hero, not the narrative', () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });

    let unmount: (() => void) | undefined;
    try {
      const rendered = render(
        <MemoryRouter initialEntries={['/']}>
          <Home />
        </MemoryRouter>
      );
      unmount = rendered.unmount;
      const shell = rendered.container.querySelector<HTMLElement>('[data-theme]');
      const hero = rendered.container.querySelector<HTMLElement>('#hero');
      expect(shell?.style.zoom ?? '').toBe('');
      expect(hero?.style.zoom).toBe('0.8');
      expect(hero?.style.minHeight).toContain('125dvh');
    } finally {
      unmount?.();
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
    }
  });

  it('keeps the mobile hero and appends the same narrative order', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <MobileHome onNavigate={() => {}} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('retained-mobile-hero')).toBeDefined();
    expect(container.querySelector('#hero')).not.toBeNull();
    expect(sceneOrder(container)).toEqual(['proof', 'assessments', 'problem', 'result', 'why-pulse', 'how-it-works', 'faq', 'final-cta', 'footer']);
  });

  it('uses canonical assessment launch routes for every protocol', () => {
    expect(getAssessmentLaunchRoute('visual-reaction')).toBe('/reaction-test');
    expect(getAssessmentLaunchRoute('direction')).toBe('/direction-test');
    expect(getAssessmentLaunchRoute('color-recognition')).toBe('/colour-recognition');
    expect(getAssessmentLaunchRoute('block-memory')).toBe('/block-memory');
    expect(getAssessmentLaunchRoute('number-memory')).toBe('/number-memory');
  });

  it('supports accordion disclosure semantics on desktop and mobile', () => {
    const desktop = render(
      <MemoryRouter initialEntries={['/']}>
        <Home />
      </MemoryRouter>
    );
    const desktopQuestion = screen.getByRole('button', { name: /what does pulse measure/i });
    expect(desktopQuestion.getAttribute('aria-expanded')).toBe('false');
    expect(desktopQuestion.getAttribute('aria-controls')).toBe('faq-panel-0');
    fireEvent.click(desktopQuestion);
    expect(desktopQuestion.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('region', { name: /what does pulse measure/i })).toBeDefined();
    desktop.unmount();

    render(
      <MemoryRouter initialEntries={['/']}>
        <MobileHome onNavigate={() => {}} />
      </MemoryRouter>
    );
    const mobileQuestion = screen.getByRole('button', { name: /what does pulse measure/i });
    expect(mobileQuestion.getAttribute('aria-expanded')).toBe('false');
    expect(mobileQuestion.getAttribute('aria-controls')).toBe('mobile-faq-panel-0');
    fireEvent.click(mobileQuestion);
    expect(mobileQuestion.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('region', { name: /what does pulse measure/i })).toBeDefined();
  });

  it('moves the desktop carousel with arrow keys while it owns focus', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Home />
      </MemoryRouter>
    );
    const carousel = screen.getByRole('region', { name: /assessment protocol carousel/i });
    carousel.focus();
    fireEvent.keyDown(carousel, { key: 'ArrowRight' });
    expect(screen.getByRole('group', { name: /directional choice test/i })).toBeDefined();
    fireEvent.keyDown(carousel, { key: 'ArrowLeft' });
    expect(screen.getByRole('group', { name: /visual reaction test/i })).toBeDefined();
  });

  it('launches the active carousel protocol on desktop', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Home />
        <CurrentPath />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /start visual reaction test/i }));
    expect(screen.getByTestId('current-path').textContent).toBe('/reaction-test');
  });

  it('keeps mobile scene colors token-based and excludes desktop dark: classes', () => {
    const relativeFiles = [
      '../../mobile/src/components/home/MobileSceneFrame.tsx',
      '../../mobile/src/components/home/MobileProofScene.tsx',
      '../../mobile/src/components/home/MobileAssessmentsScene.tsx',
      '../../mobile/src/components/home/MobileProblemScene.tsx',
      '../../mobile/src/components/home/MobileResultScene.tsx',
      '../../mobile/src/components/home/MobileWhyPulseScene.tsx',
      '../../mobile/src/components/home/MobileHowItWorksScene.tsx',
      '../../mobile/src/components/home/MobileFAQScene.tsx',
      '../../mobile/src/components/home/MobileFinalCTAScene.tsx',
      '../../mobile/src/components/home/MobileHomeFooter.tsx',
      '../../mobile/src/components/ui/MobileAssessmentCarousel.tsx',
    ];

    let combinedSource = '';
    for (const relativeFile of relativeFiles) {
      const source = readFileSync(new URL(relativeFile, import.meta.url), 'utf8');
      expect(source).not.toMatch(/dark:/);
      expect(source).not.toMatch(/#[0-9a-f]{3,8}(?![0-9a-f])/i);
      combinedSource += source + '\n';
    }

    expect(combinedSource).toContain('var(--surface-1)');
    expect(combinedSource).toContain('var(--accent)');
    expect(combinedSource).toContain('var(--text-primary)');
    expect(combinedSource).toContain('var(--border-subtle)');
  });
});
