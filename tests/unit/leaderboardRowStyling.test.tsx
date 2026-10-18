import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Leaderboard } from '../../src/components/Leaderboard';
import { getLeaderboardResults } from '../../src/lib/firestore';

vi.mock('../../src/lib/firestore', () => ({
  getLeaderboardResults: vi.fn(),
  isOptedInLeaderboardUser: (name: unknown) =>
    typeof name === 'string' &&
    name.trim().length > 0 &&
    !['anonymous', 'guest', 'unknown'].includes(name.trim().toLowerCase()) &&
    !name.trim().toLowerCase().startsWith('participant'),
}));

describe('Leaderboard Uniform Row Styling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not apply special highlight or background to any row in desktop Leaderboard', async () => {
    vi.mocked(getLeaderboardResults).mockResolvedValue([
      {
        id: 'entry-1',
        assessmentType: 'visual-reaction',
        scoreMetric: 180.5,
        displayName: 'Aria Stark',
        ageGroup: 'Young adults (18–25)',
        createdAt: new Date().toISOString()
      },
      {
        id: 'entry-2',
        assessmentType: 'visual-reaction',
        scoreMetric: 195.2,
        displayName: 'Jon Snow',
        ageGroup: 'Adults (26–40)',
        createdAt: new Date().toISOString()
      }
    ] as any);

    const { container } = render(
      <MemoryRouter initialEntries={['/leaderboard']}>
        <Leaderboard onNavigate={() => {}} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Aria Stark')).toBeInTheDocument();
    });

    expect(container.querySelectorAll('.bg-sky-50\\/50')).toHaveLength(0);
    expect(container.querySelectorAll('.bg-blue-50')).toHaveLength(0);
  });
});


