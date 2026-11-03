import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { MobileHero } from '../../mobile/src/components/hero/MobileHero';
import { CANONICAL_ASSESSMENT_IDS } from '../../shared/contracts/common';

const mockStats = vi.hoisted(() => ({
  testsCount: 5,
  resultsCount: 90 as number | null,
  isLoadingResults: false,
}));

vi.mock('../../mobile/src/lib/useAuthoritativeStats', () => ({
  useAuthoritativeStats: () => mockStats,
}));

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
}

function renderHero(onOpenMenu = vi.fn(), onExploreTests?: () => void) {
  render(
    <MemoryRouter initialEntries={['/']}>
      <MobileHero onOpenMenu={onOpenMenu} onExploreTests={onExploreTests} />
      <CurrentPath />
    </MemoryRouter>
  );
  return onOpenMenu;
}

afterEach(() => {
  cleanup();
  mockStats.testsCount = CANONICAL_ASSESSMENT_IDS.length;
  mockStats.resultsCount = 90;
  mockStats.isLoadingResults = false;
  vi.clearAllMocks();
});

describe('MobileHero', () => {
  it('renders the reference-driven heading and descriptor', () => {
    renderHero();
    expect(screen.getByText('COGNITIVE BENCHMARKING')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Measure.*your/);
    expect(screen.getByText('mind.')).toBeDefined();
    expect(screen.getByText(/Test your reaction speed, memory, and attention right in your browser, with no account required\./i)).toBeDefined();
  });

  it('renders all four feature shortcuts and navigates to their actual routes', () => {
    const featureRoutes = [
      { accessibleName: 'Open Leaderboard', path: '/leaderboard' },
      { accessibleName: 'Open Dataset', path: '/dataset' },
      { accessibleName: 'Open Analytics', path: '/analytics' },
      { accessibleName: 'Open About Us', path: '/about' },
    ];

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

  it('displays the canonical test count and a non-interactive result count with free metric', () => {
    renderHero();
    expect(screen.getByText(String(CANONICAL_ASSESSMENT_IDS.length))).toBeDefined();
    expect(screen.getByText('Tests')).toBeDefined();
    expect(screen.getByText('90')).toBeDefined();
    expect(screen.getByText('Results')).toBeDefined();
    expect(screen.getByText('Free')).toBeDefined();
    expect(screen.getByText('No sign-up')).toBeDefined();
    expect(screen.queryByRole('button', { name: /results/i })).toBeNull();
  });

  it('rounds abbreviated result counts down so the label never overstates the total', () => {
    mockStats.resultsCount = 1999;
    renderHero();
    expect(screen.getByText('1K+')).toBeDefined();
    expect(screen.queryByText('2K+')).toBeNull();
  });

  it('shows a neutral unavailable marker when the result count cannot be verified', () => {
    mockStats.resultsCount = null;
    renderHero();
    expect(screen.getByText('—')).toBeDefined();
  });

  it('marks the result count as loading while Firestore is queried', () => {
    mockStats.resultsCount = null;
    mockStats.isLoadingResults = true;
    renderHero();
    expect(screen.getByRole('status', { name: /loading result count/i })).toBeDefined();
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
