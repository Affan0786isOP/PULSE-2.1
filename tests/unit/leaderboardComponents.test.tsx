import React, { type ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Leaderboard as DesktopLeaderboard } from '../../src/components/Leaderboard';
import { Leaderboard as MobileLeaderboard } from '../../mobile/src/components/Leaderboard';
import { getLeaderboardResults as getDesktopLeaderboardResults } from '../../src/lib/firestore';
import { getLeaderboardResults as getMobileLeaderboardResults } from '../../mobile/src/lib/firestore';

vi.mock('../../src/lib/firestore', () => ({
  getLeaderboardResults: vi.fn(),
  isOptedInLeaderboardUser: (name: unknown) =>
    typeof name === 'string' &&
    name.trim().length > 0 &&
    !['anonymous', 'guest', 'unknown'].includes(name.trim().toLowerCase()) &&
    !name.trim().toLowerCase().startsWith('participant'),
}));

vi.mock('../../mobile/src/lib/firestore', () => ({
  getLeaderboardResults: vi.fn(),
  isOptedInLeaderboardUser: (name: unknown) =>
    typeof name === 'string' &&
    name.trim().length > 0 &&
    !['anonymous', 'guest', 'unknown'].includes(name.trim().toLowerCase()) &&
    !name.trim().toLowerCase().startsWith('participant'),
}));

vi.mock('../../src/components/Navbar', () => ({ Navbar: () => null }));
vi.mock('../../src/components/Footer', () => ({ Footer: () => null }));
vi.mock('../../src/components/SEO', () => ({ SEO: () => null }));
vi.mock('../../mobile/src/components/Navbar', () => ({
  Navbar: ({ rightContent }: { rightContent?: React.ReactNode }) => rightContent ?? null,
}));
vi.mock('../../mobile/src/components/SEO', () => ({ SEO: () => null }));
vi.mock('../../src/components/ui/Skeleton', () => ({ SkeletonTable: () => null }));
vi.mock('../../mobile/src/components/ui/Skeleton', () => ({ SkeletonTable: () => null }));

const makeEntries = (assessmentType: string) => [{
  id: `entry-${assessmentType}`,
  displayName: assessmentType === 'number-memory' ? 'Memory Winner' : 'Speed Winner',
  assessmentType,
  scoreMetric: assessmentType === 'number-memory' ? 8 : 205,
  ageGroup: 'Young adults (18–25)',
  createdAt: 1700000000000,
  source: 'cloud',
}] as any;

type BoardProps = { onNavigate: (view: string) => void };
type BoardComponent = ComponentType<BoardProps>;

async function verifyBoard(
  Component: BoardComponent,
  fetchMock: typeof getDesktopLeaderboardResults
) {
  const onNavigate = vi.fn();
  render(
    <MemoryRouter initialEntries={['/leaderboard?assessmentType=number-memory']}>
      <Routes>
        <Route path="/leaderboard" element={<Component onNavigate={onNavigate} />} />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText('Memory Winner')).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledWith('number-memory');

  const selectedMemoryTab = screen.getByRole('tab', { name: 'Select NUMBER MEMORY' });
  expect(selectedMemoryTab.getAttribute('aria-selected')).toBe('true');
  const panel = screen.getByRole('tabpanel');
  expect(panel.getAttribute('aria-labelledby')).toBe('leaderboard-tab-number-memory');

  // Home and End are supported alongside the left/right arrow keys.
  const selector = screen.getByLabelText(/Protocol Selector/i);
  fireEvent.keyDown(selector, { key: 'Home' });
  await waitFor(() => {
    expect(screen.getByRole('tab', { name: 'Select VISUAL REACTION' }).getAttribute('aria-selected')).toBe('true');
  });
  fireEvent.keyDown(selector, { key: 'End' });
  await waitFor(() => {
    expect(screen.getByRole('tab', { name: 'Select NUMBER MEMORY' }).getAttribute('aria-selected')).toBe('true');
  });
}

describe('desktop and mobile leaderboard components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDesktopLeaderboardResults).mockImplementation(async type => makeEntries(type));
    vi.mocked(getMobileLeaderboardResults).mockImplementation(async type => makeEntries(type));
  });

  afterEach(() => cleanup());

  it('loads the protocol specified in the URL and supports keyboard tab navigation on desktop', async () => {
    await verifyBoard(DesktopLeaderboard, getDesktopLeaderboardResults);
  });

  it('loads the protocol specified in the URL and supports keyboard tab navigation on mobile', async () => {
    await verifyBoard(MobileLeaderboard, getMobileLeaderboardResults as typeof getDesktopLeaderboardResults);
  });

  it('keeps narrow-phone protocol controls within the selector with 44px dot targets', async () => {
    render(
      <MemoryRouter initialEntries={['/leaderboard']}>
        <MobileLeaderboard onNavigate={vi.fn()} />
      </MemoryRouter>
    );
    expect(await screen.findByText('Speed Winner')).toBeTruthy();

    expect(document.getElementById('mobile-leaderboard-prev-btn')?.className).toContain('max-[340px]:hidden');
    expect(document.getElementById('mobile-leaderboard-next-btn')?.className).toContain('max-[340px]:hidden');

    const protocolTabs = Array.from(document.querySelectorAll('[role="tablist"][aria-label="Protocols"] [role="tab"]'));
    expect(protocolTabs).toHaveLength(5);
    for (const tab of protocolTabs) {
      expect(tab.className).toContain('max-[340px]:w-11');
      expect(tab.className).toContain('max-[340px]:min-w-[44px]');
      expect(tab.className).toContain('min-h-[44px]');
    }
  });
});
