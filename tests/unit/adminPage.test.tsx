import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminPage } from '../../src/components/admin/AdminPage';
import * as adminActions from '../../src/lib/adminActions';

vi.mock('../../src/lib/adminActions', () => ({
  fetchAdminLeaderboardPage: vi.fn(),
  hideLeaderboardEntry: vi.fn(),
  unhideLeaderboardEntry: vi.fn(),
  deleteLeaderboardEntry: vi.fn(),
  updateLeaderboardAlias: vi.fn(),
  adminLogin: vi.fn(),
  adminLogout: vi.fn()
}));

describe('AdminPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem('pulse_admin_token', 'valid-test-token');

    vi.mocked(adminActions.fetchAdminLeaderboardPage).mockResolvedValue({
      success: true,
      entries: [
        {
          id: 'test-entry-1',
          displayName: 'SpeedyUser',
          assessmentType: 'visual-reaction',
          scoreMetric: 198.4,
          ageGroup: 'Young adults (18–25)',
          createdAt: 1700000000000,
          hidden: false,
          publicEntry: true
        },
        {
          id: 'test-entry-2',
          displayName: 'HiddenUser',
          assessmentType: 'direction',
          scoreMetric: 240.0,
          ageGroup: 'Young adults (18–25)',
          createdAt: 1700000001000,
          hidden: true,
          publicEntry: true
        }
      ],
      nextCursor: null,
      hasMore: false
    });
  });

  it('renders the moderation console and displays entries in table', async () => {
    render(<AdminPage />);

    expect(screen.getByText('PULSE Moderation Console')).toBeDefined();
    expect(screen.getByText('Staff Only')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('SpeedyUser')).toBeDefined();
      expect(screen.getByText('HiddenUser')).toBeDefined();
      expect(screen.getByText('198.4')).toBeDefined();
    });
  });

  it('filters by protocol when selector changes', async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('SpeedyUser')).toBeDefined();
    });

    const protocolSelect = screen.getByRole('combobox');
    fireEvent.change(protocolSelect, { target: { value: 'direction' } });

    await waitFor(() => {
      expect(adminActions.fetchAdminLeaderboardPage).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentType: 'direction'
        })
      );
    });
  });

  it('opens and submits edit alias modal successfully', async () => {
    vi.mocked(adminActions.updateLeaderboardAlias).mockResolvedValueOnce({
      success: true,
      entry: {
        id: 'test-entry-1',
        displayName: 'RenamedSpeedy',
        assessmentType: 'visual-reaction',
        scoreMetric: 198.4,
        ageGroup: 'Young adults (18–25)',
        createdAt: 1700000000000,
        hidden: false,
        publicEntry: true
      }
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('SpeedyUser')).toBeDefined();
    });

    const editButtons = screen.getAllByTitle('Edit Alias');
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Correct Display Name')).toBeDefined();
    const input = screen.getByLabelText(/New Display Name/i);
    fireEvent.change(input, { target: { value: 'RenamedSpeedy' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(adminActions.updateLeaderboardAlias).toHaveBeenCalledWith({
        id: 'test-entry-1',
        displayName: 'RenamedSpeedy',
        reason: undefined
      });
      expect(screen.getByText('RenamedSpeedy')).toBeDefined();
    });
  });

  it('triggers soft-hide when clicking eye-off on visible row', async () => {
    vi.mocked(adminActions.hideLeaderboardEntry).mockResolvedValueOnce({
      success: true,
      found: true
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('SpeedyUser')).toBeDefined();
    });

    const hideButton = screen.getByTitle('Soft-Hide Entry');
    fireEvent.click(hideButton);

    await waitFor(() => {
      expect(adminActions.hideLeaderboardEntry).toHaveBeenCalledWith('test-entry-1', 'Moderated by admin');
    });
  });

  it('triggers unhide when clicking eye on hidden row', async () => {
    vi.mocked(adminActions.unhideLeaderboardEntry).mockResolvedValueOnce({
      success: true,
      found: true,
      notBest: false
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('HiddenUser')).toBeDefined();
    });

    const unhideButton = screen.getByTitle('Unhide Entry');
    fireEvent.click(unhideButton);

    await waitFor(() => {
      expect(adminActions.unhideLeaderboardEntry).toHaveBeenCalledWith('test-entry-2', 'Un-hidden by admin');
    });
  });

  it('opens confirmation modal and deletes row permanently', async () => {
    vi.mocked(adminActions.deleteLeaderboardEntry).mockResolvedValueOnce({
      success: true,
      found: true
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('SpeedyUser')).toBeDefined();
    });

    const deleteButtons = screen.getAllByTitle('Delete Entry');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Permanently Delete Entry?')).toBeDefined();
    const confirmButton = screen.getByText('Confirm Delete');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(adminActions.deleteLeaderboardEntry).toHaveBeenCalledWith(
        'test-entry-1',
        'Permanently purged by admin'
      );
      expect(screen.queryByText('SpeedyUser')).toBeNull();
    });
  });
});
