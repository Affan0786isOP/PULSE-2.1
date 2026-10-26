import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { submitLeaderboardResult as submitDesktop } from '../../src/lib/firestore';
import { submitLeaderboardResult as submitMobile } from '../../mobile/src/lib/firestore';
import { LeaderboardOptIn as DesktopLeaderboardOptIn } from '../../src/components/LeaderboardOptIn';
import { LeaderboardOptIn as MobileLeaderboardOptIn } from '../../mobile/src/components/LeaderboardOptIn';

vi.mock('../../src/lib/firestore', () => ({ submitLeaderboardResult: vi.fn(), getLeaderboardResults: vi.fn().mockResolvedValue([]) }));
vi.mock('../../mobile/src/lib/firestore', () => ({ submitLeaderboardResult: vi.fn(), getLeaderboardResults: vi.fn().mockResolvedValue([]) }));

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


describe('leaderboard publication status', () => {
  afterEach(() => {
    cleanup();
    vi.mocked(submitDesktop).mockReset();
    vi.mocked(submitMobile).mockReset();
  });

  it('claims publication only when the attempt is the visible entry', async () => {
    vi.mocked(submitDesktop).mockResolvedValue({ success: true, syncedToCloud: true, docId: 'attempt-1', attemptId: 'attempt-1', leaderboardDocId: 'attempt-1', leaderboardEntryId: 'attempt-1', receiptAvailable: true, entryAvailable: true, pendingReview: false, scoreMetric: 240 });
    render(<DesktopLeaderboardOptIn {...{ ...commonProps, scoreMetric: 240 }} sessionId="session-public" />);
    fireEvent.click(screen.getByRole('button', { name: /Add Score/i }));
    fireEvent.change(screen.getByPlaceholderText('Display name'), { target: { value: 'Player One' } });
    fireEvent.click(screen.getByRole('button', { name: /^Submit$/i }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/on the public leaderboard/i));
  });

  it('reports accepted submission when the prior best remains public', async () => {
    vi.mocked(submitDesktop).mockResolvedValue({ success: true, syncedToCloud: true, docId: 'attempt-2', attemptId: 'attempt-2', leaderboardDocId: 'prior-best', leaderboardEntryId: 'prior-best', receiptAvailable: true, entryAvailable: true, pendingReview: false, scoreMetric: 300 });
    render(<DesktopLeaderboardOptIn {...{ ...commonProps, scoreMetric: 300 }} sessionId="session-recorded" />);
    fireEvent.click(screen.getByRole('button', { name: /Add Score/i }));
    fireEvent.change(screen.getByPlaceholderText('Display name'), { target: { value: 'Player One' } });
    fireEvent.click(screen.getByRole('button', { name: /^Submit$/i }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/existing public best remains/i));
  });

  it('reports pending moderation on mobile', async () => {
    vi.mocked(submitMobile).mockResolvedValue({ success: true, syncedToCloud: true, docId: 'attempt-3', attemptId: 'attempt-3', leaderboardDocId: null, leaderboardEntryId: null, receiptAvailable: true, entryAvailable: false, pendingReview: true, scoreMetric: 150 });
    render(<MobileLeaderboardOptIn {...{ ...commonProps, scoreMetric: 150 }} />);
    fireEvent.click(screen.getByRole('button', { name: /^Publish$/i }));
    fireEvent.change(screen.getByPlaceholderText(/Callsign/i), { target: { value: 'Player One' } });
    fireEvent.click(screen.getByRole('button', { name: /^Submit$/i }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/pending review/i));
  });
});
