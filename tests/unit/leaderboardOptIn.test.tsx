import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LeaderboardOptIn as DesktopLeaderboardOptIn } from '../../src/components/LeaderboardOptIn';
import { LeaderboardOptIn as MobileLeaderboardOptIn } from '../../mobile/src/components/LeaderboardOptIn';

vi.mock('../../src/lib/firestore', () => ({ submitLeaderboardResult: vi.fn() }));
vi.mock('../../mobile/src/lib/firestore', () => ({ submitLeaderboardResult: vi.fn() }));

const commonProps = {
  assessmentType: 'visual-reaction' as any,
  scoreMetric: 49,
  idempotencyKey: 'unit-test-idempotency-key',
  ageGroup: 'Young adults (18–25)' as any,
  trials: [],
};

describe('leaderboard opt-in score eligibility guards', () => {
  afterEach(() => cleanup());

  it('does not offer submission for an ineligible desktop score', () => {
    render(<DesktopLeaderboardOptIn {...commonProps} sessionId="session-desktop" />);
    expect(screen.getByRole('note').textContent).toMatch(/does not meet the leaderboard score requirements/i);
    expect(screen.queryByRole('button', { name: /Add Score/i })).toBeNull();
  });

  it('does not offer submission for an ineligible mobile score', () => {
    render(<MobileLeaderboardOptIn {...commonProps} />);
    expect(screen.getByRole('note').textContent).toMatch(/does not meet the leaderboard score requirements/i);
    expect(screen.queryByRole('button', { name: /Publish/i })).toBeNull();
  });
});
