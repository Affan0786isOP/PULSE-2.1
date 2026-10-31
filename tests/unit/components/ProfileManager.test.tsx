import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileManager } from '../../../src/components/profiles/ProfileManager';

describe('ProfileManager Component', () => {
  it('renders list of profiles and shows limit capacity (1/5)', () => {
    const profiles: any[] = [
      {
        profileUid: 'p1',
        displayName: 'Nova',
        ageGroup: 'Adults (26–40)',
        themeAccent: 'cyan',
        avatarGlyph: 'reticle',
        shareAgeGroup: true,
        revision: 1
      }
    ];

    render(
      <ProfileManager
        profiles={profiles}
        activeProfileUid="p1"
        onSelectProfile={() => {}}
        onCreateProfile={async () => {}}
        onDeleteProfile={async () => {}}
      />
    );

    expect(screen.getByText('Participant Profiles')).toBeDefined();
    expect(screen.getByText('+ Create Profile (1/5)')).toBeDefined();
    expect(screen.getByText('Nova')).toBeDefined();
  });

  it('disables create button when 5 profiles exist', () => {
    const profiles: any[] = Array.from({ length: 5 }, (_, i) => ({
      profileUid: `p${i}`,
      displayName: `Pilot ${i}`,
      ageGroup: 'Adults (26–40)',
      themeAccent: 'cyan',
      avatarGlyph: 'reticle',
      shareAgeGroup: true,
      revision: 1
    }));

    render(
      <ProfileManager
        profiles={profiles}
        activeProfileUid="p0"
        onSelectProfile={() => {}}
        onCreateProfile={async () => {}}
        onDeleteProfile={async () => {}}
      />
    );

    const btn = screen.getByText('+ Create Profile (5/5)');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
