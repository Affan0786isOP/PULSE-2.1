import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatasetComingSoon } from '../../src/components/DatasetComingSoon';
import { resolveRoute } from '@shared/registries/routeRegistry';

afterEach(() => {
  cleanup();
  document.head
    .querySelectorAll('meta[name="robots"], link[rel="canonical"]')
    .forEach((element) => element.remove());
});

describe('Dataset Coming Soon', () => {
  it('renders the public deferred state without dataset explorer controls', () => {
    render(
      <MemoryRouter initialEntries={['/dataset']}>
        <DatasetComingSoon />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /COMING SOON/i })).not.toBeNull();
    expect(screen.getAllByText('Dataset').length).toBeGreaterThan(0);
    expect(
      screen.getByText(/verified PULSE research dataset for public release/i)
    ).not.toBeNull();

    expect(screen.queryByText(/raw data explorer/i)).toBeNull();
    expect(screen.queryByText(/no telemetry recorded yet/i)).toBeNull();
    expect(screen.queryByText(/unable to load telemetry dataset/i)).toBeNull();

    const cta = screen.getByRole('link', { name: /explore assessments/i });
    expect(cta.getAttribute('href')).toBe('/assessments');
  });

  it('emits noindex metadata for the deferred public page', async () => {
    render(
      <MemoryRouter initialEntries={['/dataset']}>
        <DatasetComingSoon />
      </MemoryRouter>
    );

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));

    expect(document.title).toBe('Dataset Coming Soon | PULSE');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
  });

  it('keeps the route definitions and mobile prefix pointing at the deferred state', () => {
    expect(resolveRoute('/dataset')?.seoBehavior.index).toBe(false);
    expect(resolveRoute('/analytics')?.seoBehavior.index).toBe(false);
    expect(resolveRoute('/mobile/dataset')?.routeId).toBe('dataset');
    expect(resolveRoute('/mobile/analytics')?.routeId).toBe('analytics');
  });

  it('does not depend on the old dataset pipeline or load the Dataset route module', () => {
    const componentSource = readFileSync(
      resolve(process.cwd(), 'src/components/DatasetComingSoon.tsx'),
      'utf8'
    );
    const desktopAppSource = readFileSync(
      resolve(process.cwd(), 'src/App.tsx'),
      'utf8'
    );
    const mobileAppSource = readFileSync(
      resolve(process.cwd(), 'mobile/src/App.tsx'),
      'utf8'
    );

    expect(componentSource).not.toContain('useDatasetPipeline');
    expect(componentSource).not.toContain("from '../lib/dataset'");

    expect(desktopAppSource).toContain(
      '<Route path="/dataset" element={<DatasetComingSoon />} />'
    );
    expect(desktopAppSource).toContain(
      '<Route path="/analytics" element={<DatasetComingSoon />} />'
    );
    expect(desktopAppSource).not.toContain(
      "const Dataset = React.lazy(() => import('./components/Dataset')"
    );

    expect(mobileAppSource).toContain(
      '<Route path="/dataset" element={<DatasetComingSoon />} />'
    );
    expect(mobileAppSource).toContain(
      '<Route path="/analytics" element={<DatasetComingSoon />} />'
    );
    expect(mobileAppSource).not.toContain(
      "const Dataset = React.lazy(() => import('./components/Dataset')"
    );
  });

  it('keeps deferred routes out of the production sitemap', () => {
    const sitemap = readFileSync(
      resolve(process.cwd(), 'public/sitemap.xml'),
      'utf8'
    );

    expect(sitemap).not.toContain('https://pulse-lab.in/dataset');
    expect(sitemap).not.toContain('https://pulse-lab.in/analytics');
  });
});
