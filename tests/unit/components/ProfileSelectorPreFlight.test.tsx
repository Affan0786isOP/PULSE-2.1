import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileSelectorPreFlight } from '../../../src/components/profiles/ProfileSelectorPreFlight';

describe('ProfileSelectorPreFlight Component', () => {
  it('preselects active profile and allows starting with bound profile', () => {
    const onStart = vi.fn();
    const profiles: any[] = [
      {
        profileUid: 'p1',
        displayName: 'Nova',
        ageGroup: 'Young adults (18–25)',
        themeAccent: 'cyan',
        avatarGlyph: 'reticle',
        shareAgeGroup: true,
        revision: 1
      }
    ];

    render(
      <ProfileSelectorPreFlight
        profiles={profiles}
        activeProfileUid="p1"
        onSelectAndStart={onStart}
        onManageProfiles={() => {}}
      />
    );

    expect(screen.getByText('Participant Confirmation')).toBeDefined();
    expect(screen.getByText('Start as Nova')).toBeDefined();

    fireEvent.click(screen.getByText('Start as Nova'));
    expect(onStart).toHaveBeenCalledWith(profiles[0]);
  });

  it('provides a prominent "Continue as Guest" bypass', () => {
    const onStart = vi.fn();
    render(
      <ProfileSelectorPreFlight
        profiles={[]}
        activeProfileUid={null}
        onSelectAndStart={onStart}
        onManageProfiles={() => {}}
      />
    );

    const guestBtn = screen.getByText('Continue as Guest (Manual Age Selection)');
    fireEvent.click(guestBtn);
    expect(onStart).toHaveBeenCalledWith(null);
  });
});
