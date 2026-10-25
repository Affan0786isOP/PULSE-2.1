import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Leaderboard as DesktopLeaderboard } from '../../src/components/Leaderboard';
import { Leaderboard as MobileLeaderboard } from '../../mobile/src/components/Leaderboard';
import * as adminActions from '../../src/lib/adminActions';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../src/lib/adminActions', () => ({
  adminLogin: vi.fn(),
  adminLogout: vi.fn()
}));

vi.mock('../../src/lib/firestore', () => ({
  getLeaderboardResults: vi.fn(async () => []),
  isOptedInLeaderboardUser: vi.fn(() => true)
}));

vi.mock('../../mobile/src/lib/firestore', () => ({
  getLeaderboardResults: vi.fn(async () => []),
  isOptedInLeaderboardUser: vi.fn(() => true)
}));

describe('Admin Trigger & Authentication Modal Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('desktop: opens AdminPasscodeModal on Ctrl+Shift+A keypress and navigates on success', async () => {
    vi.mocked(adminActions.adminLogin).mockResolvedValueOnce({
      success: true,
      token: 'test-admin-token'
    });

    const mockNavigate = vi.fn();

    render(
      <MemoryRouter>
        <DesktopLeaderboard onNavigate={mockNavigate} />
      </MemoryRouter>
    );

    // Trigger keyboard shortcut
    fireEvent.keyDown(window, {
      key: 'A',
      ctrlKey: true,
      shiftKey: true
    });

    await waitFor(() => {
      expect(screen.getByText('Admin Access')).toBeDefined();
    });

    const input = screen.getByLabelText(/Passcode/i);
    fireEvent.change(input, { target: { value: '180611' } });

    const unlockButton = screen.getByRole('button', { name: 'Unlock' });
    fireEvent.click(unlockButton);

    await waitFor(() => {
      expect(adminActions.adminLogin).toHaveBeenCalledWith('180611');
      expect(mockNavigate).toHaveBeenCalledWith('admin');
    });
  });

  it('mobile: opens AdminPasscodeModal after 5 rapid taps on title and triggers full page assign', async () => {
    vi.mocked(adminActions.adminLogin).mockResolvedValueOnce({
      success: true,
      token: 'test-mobile-token'
    });

    // Mock window.location.assign
    const assignMock = vi.fn();
    delete (window as any).location;
    window.location = { assign: assignMock } as any;

    const mockNavigate = vi.fn();

    render(
      <MemoryRouter>
        <MobileLeaderboard onNavigate={mockNavigate} />
      </MemoryRouter>
    );

    const titleBtn = screen.getByRole('button', { name: 'LEADERBOARD' });

    // Tap 5 times
    for (let i = 0; i < 5; i++) {
      fireEvent.click(titleBtn);
    }

    await waitFor(() => {
      expect(screen.getByText('Admin Access')).toBeDefined();
    });

    const input = screen.getByLabelText(/Passcode/i);
    fireEvent.change(input, { target: { value: '180611' } });

    const unlockButton = screen.getByRole('button', { name: 'Unlock' });
    fireEvent.click(unlockButton);

    await waitFor(() => {
      expect(adminActions.adminLogin).toHaveBeenCalledWith('180611');
      expect(assignMock).toHaveBeenCalledWith('/admin');
    });
  });

  it('toggles passcode visibility when clicking the show/hide button', async () => {
    const mockNavigate = vi.fn();

    render(
      <MemoryRouter>
        <DesktopLeaderboard onNavigate={mockNavigate} />
      </MemoryRouter>
    );

    // Trigger keyboard shortcut to open modal
    fireEvent.keyDown(window, {
      key: 'A',
      ctrlKey: true,
      shiftKey: true
    });

    await waitFor(() => {
      expect(screen.getByText('Admin Access')).toBeDefined();
    });

    const input = screen.getByLabelText(/Passcode/i) as HTMLInputElement;
    expect(input.type).toBe('password');

    // Click show password toggle button
    const toggleBtn = screen.getByRole('button', { name: 'Show password' });
    fireEvent.click(toggleBtn);

    expect(input.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeDefined();

    // Click again to hide
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input.type).toBe('password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeDefined();
  });
});
