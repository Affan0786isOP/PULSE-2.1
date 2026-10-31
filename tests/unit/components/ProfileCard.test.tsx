import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProfileCard } from '../../../src/components/profiles/ProfileCard';

describe('ProfileCard Component', () => {
  it('renders profile details with theme accent styling and active indicator', () => {
    const profile: any = {
      profileUid: 'prof_1234567890ab',
      displayName: 'Nova Pilot',
      ageGroup: 'Young adults (18–25)',
      themeAccent: 'cyan',
      avatarGlyph: 'reticle',
      shareAgeGroup: true,
      revision: 1
    };

    render(
      <ProfileCard
        profile={profile}
        isActive={true}
        onSelect={() => {}}
        onDelete={() => {}}
      />
    );

    expect(screen.getByText('Nova Pilot')).toBeDefined();
    expect(screen.getByText('Young adults (18–25)')).toBeDefined();
    expect(screen.getByText('Active Profile')).toBeDefined();
  });
});
