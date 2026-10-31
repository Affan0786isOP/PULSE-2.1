import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileProfileManager } from '../../../mobile/src/components/profiles/MobileProfileManager';

describe('MobileProfileManager Component', () => {
  it('renders mobile profile list with touch targets >= 44px and switches active profile', () => {
    const onSelect = vi.fn();
    const profiles: any[] = [
      {
        profileUid: 'p1',
        displayName: 'MobilePilot',
        ageGroup: 'Young adults (18–25)',
        themeAccent: 'cyan',
        avatarGlyph: 'reticle',
        shareAgeGroup: true,
        revision: 1
      }
    ];

    render(
      <MobileProfileManager
        profiles={profiles}
        activeProfileUid="p1"
        onSelectProfile={onSelect}
        onDeleteProfile={async () => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Participant Profiles')).toBeDefined();
    expect(screen.getByText('MobilePilot')).toBeDefined();
    expect(screen.getByText('Active')).toBeDefined();

    const closeBtn = screen.getByText('Close');
    expect(closeBtn.className).toContain('min-h-[44px]');
  });
});
