import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { CANONICAL_ASSESSMENT_IDS } from '../../shared/contracts/common';

const mockState = vi.hoisted(() => ({
  ready: true,
  authenticated: true,
  count: 90,
  failRead: false,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  getCountFromServer: vi.fn(async () => {
    if (mockState.failRead) throw new Error('Firestore unavailable');
    return { data: () => ({ count: mockState.count }) };
  }),
}));

vi.mock('../../mobile/src/lib/firebase', () => ({
  db: { id: 'mock-firestore' },
}));

vi.mock('../../mobile/src/lib/firestore', () => ({
  ensureFirebaseReady: vi.fn(async () => mockState.ready),
  ensureAuthenticatedUser: vi.fn(async () => mockState.authenticated),
}));

import { useAuthoritativeStats } from '../../mobile/src/lib/useAuthoritativeStats';

function StatsProbe() {
  const stats = useAuthoritativeStats();
  return (
    <div>
      <output data-testid="tests">{stats.testsCount}</output>
      <output data-testid="results">{stats.resultsCount === null ? 'null' : stats.resultsCount}</output>
      <output data-testid="loading">{String(stats.isLoadingResults)}</output>
    </div>
  );
}

afterEach(() => {
  cleanup();
  mockState.ready = true;
  mockState.authenticated = true;
  mockState.count = 90;
  mockState.failRead = false;
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('useAuthoritativeStats', () => {
  it('counts publicDataset from Firestore and uses the canonical assessment registry', async () => {
    render(<StatsProbe />);

    await waitFor(() => expect(screen.getByTestId('results').textContent).toBe('90'));
    expect(screen.getByTestId('tests').textContent).toBe(String(CANONICAL_ASSESSMENT_IDS.length));
    expect(collection).toHaveBeenCalledWith(expect.anything(), 'publicDataset');
    expect(getCountFromServer).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('does not query Firestore when authenticated access is unavailable', async () => {
    mockState.authenticated = false;
    render(<StatsProbe />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('results').textContent).toBe('null');
    expect(getCountFromServer).not.toHaveBeenCalled();
  });

  it('shows no count when the database read fails instead of fabricating a value', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockState.failRead = true;
    render(<StatsProbe />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('results').textContent).toBe('null');
    expect(warn).toHaveBeenCalled();
  });

  it('rejects an invalid negative count', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockState.count = -1;
    render(<StatsProbe />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('results').textContent).toBe('null');
    expect(warn).toHaveBeenCalled();
  });
});
