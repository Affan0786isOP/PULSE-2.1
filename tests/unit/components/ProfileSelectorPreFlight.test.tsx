import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ProfileSelectorPreFlight } from '../../../src/components/profiles/ProfileSelectorPreFlight';
import type { LocalProfile } from '../../../src/lib/profiles/idbProfileStorage';

describe('ProfileSelectorPreFlight Component', () => {
  const mockProfiles: LocalProfile[] = [
    {
      profileUid: 'prof-alpha-1234',
      displayName: 'Commander Alpha',
      ageGroup: 'Adults (26–40)',
      themeAccent: 'cyan',
      avatarGlyph: 'reticle',
      shareAgeGroup: true,
      revision: 1
    },
    {
      profileUid: 'prof-beta-5678',
      displayName: 'Navigator Beta',
      ageGroup: 'Young adults (18–25)',
      themeAccent: 'amber',
      avatarGlyph: 'orbit',
      shareAgeGroup: false,
      revision: 1
    }
  ];

  it('renders existing profiles and allows selection and starting with a profile', () => {
    const handleSelectAndStart = vi.fn();
    const handleManage = vi.fn();

    render(
      <ProfileSelectorPreFlight
        profiles={mockProfiles}
        activeProfileUid="prof-alpha-1234"
        onSelectAndStart={handleSelectAndStart}
        onManageProfiles={handleManage}
      />
    );

    expect(screen.getByText('Participant Confirmation')).toBeDefined();
    expect(screen.getByText('Commander Alpha')).toBeDefined();
    expect(screen.getByText('Navigator Beta')).toBeDefined();

    // Starts as active profile by default
    const startBtn = screen.getByRole('button', { name: /start as commander alpha/i });
    expect(startBtn).toBeDefined();

    // Switch to second profile
    fireEvent.click(screen.getByText('Navigator Beta'));
    const switchedStartBtn = screen.getByRole('button', { name: /start as navigator beta/i });
    fireEvent.click(switchedStartBtn);

    expect(handleSelectAndStart).toHaveBeenCalledWith(mockProfiles[1]);
  });

  it('provides zero-friction guest bypass via Continue as Guest button', () => {
    const handleSelectAndStart = vi.fn();

    render(
      <ProfileSelectorPreFlight
        profiles={mockProfiles}
        activeProfileUid={null}
        onSelectAndStart={handleSelectAndStart}
        onManageProfiles={vi.fn()}
      />
    );

    const guestBtn = screen.getByRole('button', { name: /continue as guest/i });
    fireEvent.click(guestBtn);

    expect(handleSelectAndStart).toHaveBeenCalledWith(null);
  });

  it('displays empty state with create profile CTA when zero profiles exist', () => {
    const handleManage = vi.fn();
    const handleSelectAndStart = vi.fn();

    render(
      <ProfileSelectorPreFlight
        profiles={[]}
        activeProfileUid={null}
        onSelectAndStart={handleSelectAndStart}
        onManageProfiles={handleManage}
      />
    );

    expect(screen.getByText(/no participant profiles found on this device/i)).toBeDefined();

    const createBtn = screen.getByRole('button', { name: /\+ create a profile/i });
    fireEvent.click(createBtn);
    expect(handleManage).toHaveBeenCalledTimes(1);

    const startBtn = screen.getByRole('button', { name: /start assessment/i });
    fireEvent.click(startBtn);
    expect(handleSelectAndStart).toHaveBeenCalledWith(null);
  });
});
