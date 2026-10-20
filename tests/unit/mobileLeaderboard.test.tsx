import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Leaderboard } from '../../mobile/src/components/Leaderboard';
import { getLeaderboardResults } from '../../mobile/src/lib/firestore';

vi.mock('../../mobile/src/lib/firestore', () => ({
  getLeaderboardResults: vi.fn(),
  isOptedInLeaderboardUser: (name: unknown) =>
    typeof name === 'string' &&
    name.trim().length > 0 &&
    !['anonymous', 'guest', 'unknown'].includes(name.trim().toLowerCase()) &&
    !name.trim().toLowerCase().startsWith('participant'),
}));

vi.mock('../../mobile/src/components/Navbar', () => ({
  Navbar: ({ title, rightContent }: { title?: React.ReactNode; rightContent?: React.ReactNode }) => (
    <nav>
      {title}
      {rightContent}
    </nav>
  ),
}));

vi.mock('../../mobile/src/components/SEO', () => ({ SEO: () => null }));
vi.mock('../../src/components/admin/AdminPasscodeModal', () => ({ AdminPasscodeModal: () => null }));

describe('Mobile Leaderboard Laboratory Light', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders protocol pill selector and clean light table card', async () => {
    vi.mocked(getLeaderboardResults).mockResolvedValue([
      {
        id: 'entry-1',
        assessmentType: 'visual-reaction',
        scoreMetric: 185.4,
        displayName: 'Elena Rostova',
        ageGroup: 'Young adults (18–25)',
        createdAt: new Date().toISOString()
      }
    ] as any);

    const { container } = render(
      <MemoryRouter initialEntries={['/leaderboard']}>
        <Leaderboard onNavigate={() => {}} />
      </MemoryRouter>
    );

    expect(screen.getByRole('tablist')).toBeDefined();
    
    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeDefined();
    });

    const panel = container.querySelector('#leaderboard-panel');
    expect(panel?.className).toContain('bg-white');
    expect(panel?.className).toContain('border-slate-200/80');
  });

  it('triggers an auto-dismissing toast pill on refresh instead of crowding the navbar', async () => {
    vi.mocked(getLeaderboardResults).mockResolvedValue([] as any);

    render(
      <MemoryRouter initialEntries={['/leaderboard']}>
        <Leaderboard onNavigate={() => {}} />
      </MemoryRouter>
    );

    // Verify timestamp string is NOT rendered in the navigation header
    expect(screen.queryByText(/Updated just now/i)).toBeNull();

    // Trigger refresh button after initial load finishes
    const refreshBtn = screen.getByRole('button', { name: /Refresh Leaderboard/i });
    await waitFor(() => {
      expect(refreshBtn.hasAttribute('disabled')).toBe(false);
    });

    await act(async () => {
      fireEvent.click(refreshBtn);
    });

    // Verify toast pill appears
    expect(await screen.findByText(/Leaderboard updated • just now/i)).toBeDefined();
  });
});
