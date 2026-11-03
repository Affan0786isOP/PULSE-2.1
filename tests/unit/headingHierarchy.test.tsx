import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { GuidePage } from '../../src/components/guides/GuidePage';
import { GuidesHub } from '../../src/components/guides/GuidesHub';

describe('Heading Hierarchy in Rendered Guides and Hub', () => {
  it.each([
    ['/guides/visual-reaction-time'],
    ['/guides/stroop-effect-speed'],
    ['/benchmarks/cognitive-percentiles'],
  ])('renders valid H1 heading for %s', (path) => {
    const { container } = render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/guides/*" element={<GuidePage surface="desktop" />} />
          <Route path="/benchmarks/*" element={<GuidePage surface="desktop" />} />
        </Routes>
      </MemoryRouter>
    );

    const h1 = container.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1?.textContent?.trim().length).toBeGreaterThan(0);

    const headings = Array.from(container.querySelectorAll('h1, h2'));
    expect(headings.length).toBeGreaterThan(1);
    expect(headings[0].tagName.toLowerCase()).toBe('h1');
  });

  it('renders valid H1 heading for Guides Hub', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/guides']}>
        <Routes>
          <Route path="/guides" element={<GuidesHub surface="desktop" />} />
        </Routes>
      </MemoryRouter>
    );

    const h1 = container.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1?.textContent?.trim().length).toBeGreaterThan(0);
  });
});
