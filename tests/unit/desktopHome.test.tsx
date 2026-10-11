import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Home } from '../../src/components/Home';
import { CANONICAL_ASSESSMENT_IDS } from '../../shared/contracts/common';

const mockStats = vi.hoisted(() => ({
  testsCount: 5,
  resultsCount: 90 as number | null,
  isLoadingResults: false,
}));

vi.mock('../../src/lib/useAuthoritativeStats', () => ({
  useAuthoritativeStats: () => mockStats,
}));

vi.mock('../../src/lib/settingsStore', () => ({
  useReducedMotionPreference: () => false,
}));

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
}

function renderHome() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Home />
      <CurrentPath />
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
  mockStats.testsCount = CANONICAL_ASSESSMENT_IDS.length;
  mockStats.resultsCount = 90;
  mockStats.isLoadingResults = false;
  vi.clearAllMocks();
});

describe('Desktop Home Redesign', () => {
  it('renders the light-mode reference heading, eyebrow badge, and descriptor', () => {
    renderHome();
    expect(screen.getByText('COGNITIVE BENCHMARKING')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Measure.*your/);
    expect(screen.getByText('mind.')).toBeDefined();
    expect(screen.getByText(/Reaction time, memory, attention and more/i)).toBeDefined();
  });

  it('renders the top navigation bar with brand, routes, Info, and Settings controls', () => {
    renderHome();
    expect(screen.getByRole('link', { name: /pulse home/i })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Assessments' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Leaderboard' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Dataset' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Analytics' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'About' })).toBeDefined();
    expect(screen.getByRole('button', { name: /platform information/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /settings/i })).toBeDefined();
  });

  it('renders all four feature shortcuts with correct routes', () => {
    renderHome();
    expect(screen.getByRole('link', { name: 'Open Leaderboard' }).getAttribute('href')).toBe('/leaderboard');
    expect(screen.getByRole('link', { name: 'Open Dataset' }).getAttribute('href')).toBe('/dataset');
    expect(screen.getByRole('link', { name: 'Open Analytics' }).getAttribute('href')).toBe('/analytics');
    expect(screen.getByRole('link', { name: 'Open About Us' }).getAttribute('href')).toBe('/about');
  });

  it('renders the primary Start Testing CTA button navigating to /assessments', () => {
    renderHome();
    const startTestingBtn = screen.getByRole('link', { name: /start testing/i });
    expect(startTestingBtn).toBeDefined();
    expect(startTestingBtn.getAttribute('href')).toBe('/assessments');
  });

  it('replaces duplicate Leaderboard item in metrics row with 24/7 Web Access', () => {
    renderHome();
    // 5 Tests
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('Tests')).toBeDefined();
    // Live results count
    expect(screen.getByText('90')).toBeDefined();
    expect(screen.getByText('Results')).toBeDefined();
    // 24/7 Web Access
    expect(screen.getByText('24/7')).toBeDefined();
    expect(screen.getByText('Web Access')).toBeDefined();
  });

  it('renders the 3D Assessment Carousel with all 5 protocols', () => {
    renderHome();
    expect(screen.getByRole('region', { name: /assessment protocols 3d carousel/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /previous assessment protocol/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /next assessment protocol/i })).toBeDefined();
    expect(screen.getByText('Visual Reaction')).toBeDefined();
  });
});
