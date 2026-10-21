import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { SEO } from '../../src/components/SEO';

function SEOTestHarness() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate('/reaction-test')}>Open reaction test</button>
      <SEO />
    </>
  );
}

function currentStructuredData(): Record<string, any> {
  const element = document.getElementById('pulse-seo-jsonld');
  if (!element?.textContent) throw new Error('Expected route-specific JSON-LD');
  return JSON.parse(element.textContent);
}

describe('client SEO lifecycle', () => {
  beforeEach(() => {
    document.head.innerHTML = `
      <title>Stale title</title>
      <meta name="description" content="old description one">
      <meta name="description" content="old description two">
      <meta name="robots" content="index, follow">
      <link rel="canonical" href="https://old.example/about">
      <link rel="canonical" href="https://old.example/about">
      <script id="pulse-seo-jsonld" type="application/ld+json">{"@type":"OldPage"}</script>
    `;
  });

  afterEach(() => {
    cleanup();
    document.head.innerHTML = '';
  });

  it('replaces stale head tags and updates JSON-LD when the route changes', async () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <SEOTestHarness />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.title).toBe('About PULSE — Cognitive Benchmarking Suite');
      expect(currentStructuredData()['@type']).toBe('AboutPage');
    });
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href)
      .toBe(window.location.origin + '/about');

    fireEvent.click(screen.getByRole('button', { name: 'Open reaction test' }));

    await waitFor(() => {
      expect(document.title).toBe('Reaction Time Test | Visual Reaction Test | PULSE');
      expect(currentStructuredData()['@type']).toBe('WebPage');
      expect(currentStructuredData().url).toBe(window.location.origin + '/reaction-test');
    });
    expect(currentStructuredData().name).toBe('Reaction Time Test | Visual Reaction Test | PULSE');
    expect(document.querySelectorAll('script#pulse-seo-jsonld')).toHaveLength(1);
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });

  it('cleans up owned JSON-LD when the SEO owner unmounts', async () => {
    const view = render(
      <MemoryRouter initialEntries={['/reaction-test']}>
        <SEO />
      </MemoryRouter>
    );

    await waitFor(() => expect(currentStructuredData().url).toBe(window.location.origin + '/reaction-test'));
    view.unmount();
    expect(document.getElementById('pulse-seo-jsonld')).toBeNull();
  });
});
