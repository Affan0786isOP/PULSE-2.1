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

vi.mock('../../src/lib/settingsStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/settingsStore')>();
  return {
    ...actual,
    useReducedMotionPreference: () => false,
  };
});

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
    expect(screen.getByText(/Test your reaction speed, memory and attention/i)).toBeDefined();
  });

  it('renders the top navigation bar with brand, routes, Info, and Settings controls', () => {
    renderHome();
    expect(screen.getByRole('link', { name: /pulse home/i })).toBeDefined();
    expect(screen.getAllByRole('link', { name: 'Assessments' })[0]).toBeDefined();
    expect(screen.getAllByRole('link', { name: 'Leaderboard' })[0]).toBeDefined();
    expect(screen.getAllByRole('link', { name: 'Dataset' })[0]).toBeDefined();
    expect(screen.getByRole('link', { name: 'Analytics' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'About' })).toBeDefined();
    expect(screen.getByRole('button', { name: /platform information/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /settings/i })).toBeDefined();
  });

  it('renders the primary Start Testing CTA button navigating to /assessments', () => {
    renderHome();
    const startTestingBtn = screen.getByRole('link', { name: /start testing/i });
    expect(startTestingBtn).toBeDefined();
    expect(startTestingBtn.getAttribute('href')).toBe('/assessments');
  });

  it('renders the metrics row with Tests, live Results, and Free / No sign-up', () => {
    renderHome();
    // 5 Tests
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('Tests')).toBeDefined();
    // Live results count
    expect(screen.getByText('90')).toBeDefined();
    expect(screen.getByText('Results')).toBeDefined();
    // Free / No sign-up
    expect(screen.getByText('Free')).toBeDefined();
    expect(screen.getByText('No sign-up')).toBeDefined();
    // Objection remover
    expect(screen.getByText('Free, no sign-up required')).toBeDefined();
  });

  it('renders the 3D Assessment Carousel with all 5 protocols', () => {
    renderHome();
    expect(screen.getByRole('region', { name: /assessment protocols 3d carousel/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /previous assessment protocol/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /next assessment protocol/i })).toBeDefined();
    expect(screen.getAllByText('Visual Reaction').length).toBeGreaterThanOrEqual(1);
  });
});
