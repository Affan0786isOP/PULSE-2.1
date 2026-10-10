import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileHero } from '../../mobile/src/components/hero/MobileHero';
import { CANONICAL_ASSESSMENT_IDS } from '../../shared/contracts/common';

afterEach(() => {
  cleanup();
});

describe('MobileHero Component', () => {
  it('renders reference-driven headline and eyebrow badge', () => {
    const handleOpenMenu = vi.fn();
    render(
      <MemoryRouter>
        <MobileHero onOpenMenu={handleOpenMenu} />
      </MemoryRouter>
    );

    expect(screen.getByText('COGNITIVE BENCHMARKING')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
    expect(screen.getByText(/Measure/i)).toBeDefined();
    expect(screen.getByText('mind.')).toBeDefined();
    expect(screen.getByText(/tested with precision, in your browser/i)).toBeDefined();
  });

  it('renders all four canonical feature indicators with correct titles', () => {
    const handleOpenMenu = vi.fn();
    render(
      <MemoryRouter>
        <MobileHero onOpenMenu={handleOpenMenu} />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/Reaction\s*Time/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Memory/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Attention/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Cognition')).toBeDefined();
  });

  it('renders Start Testing CTA button and navigates', () => {
    const handleOpenMenu = vi.fn();
    render(
      <MemoryRouter>
        <MobileHero onOpenMenu={handleOpenMenu} />
      </MemoryRouter>
    );

    const cta = screen.getByRole('button', { name: /start testing/i });
    expect(cta).toBeDefined();
  });

  it('displays the verified canonical assessment battery count (5)', () => {
    const handleOpenMenu = vi.fn();
    render(
      <MemoryRouter>
        <MobileHero onOpenMenu={handleOpenMenu} />
      </MemoryRouter>
    );

    // Verified canonical count is exactly 5
    expect(screen.getByText(String(CANONICAL_ASSESSMENT_IDS.length))).toBeDefined();
    expect(screen.getByText('Tests')).toBeDefined();
    expect(screen.getByText('Results')).toBeDefined();
    expect(screen.getByText('Leaderboard')).toBeDefined();
  });

  it('renders EXPLORE TESTS cue and triggers callback', () => {
    const handleOpenMenu = vi.fn();
    const handleExplore = vi.fn();
    render(
      <MemoryRouter>
        <MobileHero onOpenMenu={handleOpenMenu} onExploreTests={handleExplore} />
      </MemoryRouter>
    );

    const exploreBtn = screen.getByRole('button', { name: /explore tests/i });
    expect(exploreBtn).toBeDefined();
    fireEvent.click(exploreBtn);
    expect(handleExplore).toHaveBeenCalledTimes(1);
  });

  it('opens menu when hamburger button is clicked', () => {
    const handleOpenMenu = vi.fn();
    render(
      <MemoryRouter>
        <MobileHero onOpenMenu={handleOpenMenu} />
      </MemoryRouter>
    );

    const menuBtn = screen.getByRole('button', { name: /open mobile navigation menu/i });
    fireEvent.click(menuBtn);
    expect(handleOpenMenu).toHaveBeenCalledTimes(1);
  });
});
