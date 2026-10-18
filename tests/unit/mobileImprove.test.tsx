import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Improve } from '../../mobile/src/components/Improve';

vi.mock('../../mobile/src/components/Navbar', () => ({
  Navbar: ({ title }: { title?: React.ReactNode }) => <nav>{title}</nav>,
}));
vi.mock('../../mobile/src/components/SEO', () => ({ SEO: () => null }));

describe('Mobile Improve Guide Laboratory Light', () => {
  it('renders factor sections and habit checklist cards in light theme', () => {
    const { container } = render(
      <MemoryRouter>
        <Improve onNavigate={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/PERFORMANCE GUIDE/i)).toBeDefined();
    expect(screen.getByText(/Biological & environmental factors/i)).toBeDefined();
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('bg-gradient-to-b');
    expect(root.className).toContain('text-[#090D1A]');
  });
});
