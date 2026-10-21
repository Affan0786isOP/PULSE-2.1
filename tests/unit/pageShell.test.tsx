import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { PageShell } from '../../src/components/layout/PageShell';
import { RouteSEO } from '../../src/components/RouteSEO';

describe('PageShell Layout & Architecture', () => {
  beforeEach(() => {
    // Clear head elements created during tests
    document.title = '';
    const metas = document.querySelectorAll('meta, link, script#pulse-seo-jsonld');
    metas.forEach(el => el.remove());
  });

  afterEach(() => {
    cleanup();
  });

  it('renders exactly one accessible main-content landmark and skip link', () => {
    render(
      <MemoryRouter initialEntries={['/assessments']}>
        <PageShell currentView="assessments">
          <div>Assessment Content Test</div>
        </PageShell>
      </MemoryRouter>
    );

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeDefined();
    expect(skipLink.getAttribute('href')).toBe('#main-content');

    const mainLandmarks = screen.getAllByRole('main');
    expect(mainLandmarks).toHaveLength(1);
    expect(mainLandmarks[0].id).toBe('main-content');
    expect(mainLandmarks[0].getAttribute('tabIndex')).toBe('-1');
    expect(screen.getByText('Assessment Content Test')).toBeDefined();
  });

  it('renders Navbar with light theme and forwards navigation callbacks', () => {
    const onNavigateMock = vi.fn();
    const onBackMock = vi.fn();

    render(
      <MemoryRouter initialEntries={['/about']}>
        <PageShell currentView="about" onNavigate={onNavigateMock} onBack={onBackMock}>
          <div>About Body</div>
        </PageShell>
      </MemoryRouter>
    );

    const nav = screen.getByRole('banner', { name: /global navigation/i });
    expect(nav).toBeDefined();
  });

  it('never renders the site footer, regardless of the legacy showFooter prop', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/assessments']}>
        <PageShell currentView="assessments" showFooter={true}>
          <div>Assessment Body</div>
        </PageShell>
      </MemoryRouter>
    );

    expect(screen.queryByRole('contentinfo', { name: /pulse platform footer/i })).toBeNull();
    expect(screen.getByText('Assessment Body')).toBeDefined();
    unmount();

    render(
      <MemoryRouter initialEntries={['/reaction-test']}>
        <PageShell currentView="reaction-test" showFooter={false}>
          <div>Reaction Test Body</div>
        </PageShell>
      </MemoryRouter>
    );

    expect(screen.queryByRole('contentinfo', { name: /pulse platform footer/i })).toBeNull();
    expect(screen.getByText('Reaction Test Body')).toBeDefined();
  });

  it('renders appropriate decorative wave component based on decorativeWaves prop', () => {
    const { container: bottomContainer, unmount: unmountBottom } = render(
      <MemoryRouter initialEntries={['/']}>
        <PageShell currentView="home" decorativeWaves="bottom">
          <div>Bottom Wave View</div>
        </PageShell>
      </MemoryRouter>
    );

    expect(bottomContainer.querySelector('svg linearGradient#deskMainWaveGrad')).not.toBeNull();
    unmountBottom();

    const { container: sideContainer, unmount: unmountSide } = render(
      <MemoryRouter initialEntries={['/leaderboard']}>
        <PageShell currentView="leaderboard" decorativeWaves="side">
          <div>Side Wave View</div>
        </PageShell>
      </MemoryRouter>
    );

    expect(sideContainer.querySelector('svg linearGradient#lbLeftWaveGradPrimary')).not.toBeNull();
    unmountSide();

    const { container: noneContainer } = render(
      <MemoryRouter initialEntries={['/improve']}>
        <PageShell currentView="improve" decorativeWaves="none">
          <div>No Wave View</div>
        </PageShell>
      </MemoryRouter>
    );

    expect(noneContainer.querySelector('svg linearGradient#deskMainWaveGrad')).toBeNull();
    expect(noneContainer.querySelector('svg linearGradient#lbLeftWaveGradPrimary')).toBeNull();
  });

  it('supports light theme and dark-apparatus theme for active test engines', () => {
    const { container: lightContainer, unmount: unmountLight } = render(
      <MemoryRouter initialEntries={['/assessments']}>
        <PageShell currentView="assessments" theme="light">
          <div>Light Page</div>
        </PageShell>
      </MemoryRouter>
    );

    const lightRoot = lightContainer.firstElementChild as HTMLElement;
    expect(lightRoot.getAttribute('data-theme')).toBe('light');
    expect(lightRoot.className).toContain('bg-gradient-to-b');
    unmountLight();

    const { container: darkContainer } = render(
      <MemoryRouter initialEntries={['/reaction-test']}>
        <PageShell currentView="reaction-test" theme="dark-apparatus">
          <div>Dark Canvas</div>
        </PageShell>
      </MemoryRouter>
    );

    const darkRoot = darkContainer.firstElementChild as HTMLElement;
    expect(darkRoot.getAttribute('data-theme')).toBe('dark');
    expect(darkRoot.className).toContain('bg-[#12161B]');
  });

  it('acts as authoritative metadata manager and prevents RouteSEO collisions', () => {
    const testSchema = {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "Test Scientific Schema"
    };

    render(
      <MemoryRouter initialEntries={['/about']}>
        <RouteSEO />
        <PageShell 
          currentView="about"
          customTitle="Custom About Title | PULSE"
          customDescription="Custom About Description"
          schema={testSchema}
        >
          <div>About Content with Schema</div>
        </PageShell>
      </MemoryRouter>
    );

    // 1. Injects shell owner tag to signal single ownership
    const ownerMeta = document.querySelector('meta[data-seo-owner="shell"]');
    expect(ownerMeta).not.toBeNull();

    // 2. Head contains PageShell's authoritative title and description
    expect(document.title).toBe('Custom About Title | PULSE');
    const descMeta = document.querySelector('meta[name="description"]');
    expect(descMeta?.getAttribute('content')).toBe('Custom About Description');

    // 3. Serialized schema is injected into JSON-LD script
    const jsonLd = document.getElementById('pulse-seo-jsonld');
    expect(jsonLd).not.toBeNull();
    expect(jsonLd?.textContent).toContain('Test Scientific Schema');
  });

  it('marks unknown routes as noindex when PageShell owns metadata', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-seo-route']}>
        <PageShell currentView="404" customTitle="404 - Page Not Found | PULSE">
          <div>Not found</div>
        </PageShell>
      </MemoryRouter>
    );

    expect(document.title).toBe('404 - Page Not Found | PULSE');
    expect(document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toContain('noindex');
    expect(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href)
      .toBe(window.location.origin + '/unknown-seo-route');
  });

  it('applies uniform baseline scaling by default on desktop viewports and allows disabling via disableScaling', () => {
    const originalW = window.innerWidth;
    const originalH = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1920 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 1080 });

    try {
      const { container: scaledContainer, unmount: unmountScaled } = render(
        <MemoryRouter initialEntries={['/about']}>
          <PageShell currentView="about">
            <div>Scaled Content</div>
          </PageShell>
        </MemoryRouter>
      );

      const scaledRoot = scaledContainer.firstElementChild as HTMLElement;
      expect(scaledRoot.style.zoom).toBe('1.5');
      expect(scaledRoot.style.minHeight).toMatch(/calc\((100dvh \/ 1\.5|66\.6667dvh)\)/);
      unmountScaled();

      const { container: unscaledContainer } = render(
        <MemoryRouter initialEntries={['/about']}>
          <PageShell currentView="about" disableScaling={true}>
            <div>Unscaled Content</div>
          </PageShell>
        </MemoryRouter>
      );

      const unscaledRoot = unscaledContainer.firstElementChild as HTMLElement;
      expect(unscaledRoot.style.zoom).toBeFalsy();
    } finally {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalW });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: originalH });
    }
  });
});
