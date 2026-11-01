import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { MobileHero } from '../../mobile/src/components/hero/MobileHero';
import { CANONICAL_ASSESSMENT_IDS } from '../../shared/contracts/common';

describe('MobileHero', () => {
  it('renders the reference-driven heading and descriptor', () => {
    renderHero();
    expect(screen.getByText('COGNITIVE BENCHMARKING')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Measure.*your/);
    expect(screen.getByText('mind.')).toBeDefined();
    expect(screen.getByText(/Test your reaction speed, memory, and attention right in your browser, with no account required\./i)).toBeDefined();
  });

  it('renders only supported feature shortcuts and navigates to their actual routes', () => {
    const featureRoutes = [
      { accessibleName: 'Open Leaderboard', path: '/leaderboard' },
      { accessibleName: 'Open About Us', path: '/about' },
    ];

    renderHero();
    const hero = within(screen.getByRole('region', { name: 'PULSE Mobile Hero' }));
    expect(hero.queryByRole('button', { name: /Open Dataset|Open Analytics/i })).toBeNull();

    for (const feature of featureRoutes) {
      cleanup();
      renderHero();
      const hero = within(screen.getByRole('region', { name: 'PULSE Mobile Hero' }));
      fireEvent.click(hero.getByRole('button', { name: feature.accessibleName }));
      expect(screen.getByTestId('current-path').textContent).toBe(feature.path);
    }
  });

  it('Start Testing navigates to the assessments route', () => {
    renderHero();
    fireEvent.click(screen.getByRole('button', { name: /start testing/i }));
    expect(screen.getByTestId('current-path').textContent).toBe('/assessments');
  });

  it('displays the canonical test count without exposing research record totals', () => {
    renderHero();
    expect(screen.getByText(String(CANONICAL_ASSESSMENT_IDS.length))).toBeDefined();
    expect(screen.getByText('Tests')).toBeDefined();
    expect(screen.getByText('Free')).toBeDefined();
    expect(screen.getByText('No sign-up')).toBeDefined();
    expect(screen.queryByText('Results')).toBeNull();
  });

  it('opens settings through the correctly labelled menu control', () => {
    const openSettings = vi.fn();
    renderHero(openSettings);
    fireEvent.click(screen.getByRole('button', { name: /open settings/i }));
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('fires the Explore Tests callback', () => {
    const onExploreTests = vi.fn();
    renderHero(vi.fn(), onExploreTests);
    fireEvent.click(screen.getByRole('button', { name: /explore tests/i }));
    expect(onExploreTests).toHaveBeenCalledTimes(1);
  });
});
