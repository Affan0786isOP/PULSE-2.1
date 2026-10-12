import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LeaderboardModeration } from '../../src/components/admin/LeaderboardModeration';
import { fetchAllAdminLeaderboard } from '../../src/lib/adminActions';

vi.mock('../../src/lib/useAdminAuth', () => ({
  useAdminAuth: () => ({ email: 'moderator@example.test', user: { email: 'moderator@example.test' } }),
}));

vi.mock('../../src/lib/adminActions', () => ({
  hideLeaderboardEntry: vi.fn(),
  unhideLeaderboardEntry: vi.fn(),
  deleteLeaderboardEntryPermanently: vi.fn(),
  fetchAllAdminLeaderboard: vi.fn(),
}));

describe('leaderboard moderation UI error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAllAdminLeaderboard).mockRejectedValue(new Error('Admin session expired (401)'));
  });

  afterEach(() => cleanup());

  it('shows a visible queue error instead of presenting a failed request as an empty queue', async () => {
    render(<LeaderboardModeration />);
    expect(await screen.findByText(/Moderation queue unavailable: Admin session expired \(401\)/i)).toBeTruthy();
  });
});
