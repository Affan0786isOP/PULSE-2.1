import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { About } from '../../mobile/src/components/About';

vi.mock('../../mobile/src/lib/settingsStore', () => ({
  triggerHaptic: vi.fn(),
}));

vi.mock('../../mobile/src/components/Navbar', () => ({
  Navbar: ({ currentView }: { currentView?: string }) => <nav data-testid="mobile-navbar">{currentView}</nav>,
}));

vi.mock('../../mobile/src/components/SEO', () => ({
  SEO: () => null,
}));

describe('Mobile About Us Component', () => {
  it('renders header, version, and platform overview', () => {
    render(
      <MemoryRouter>
        <About onNavigate={() => {}} />
      </MemoryRouter>
    );

    expect(screen.getByText(/About Pulse Evaluator/i)).toBeDefined();
    expect(screen.getByText(/MOBILE SUITE/i)).toBeDefined();
    expect(screen.getByText(/What The Platform Does/i)).toBeDefined();
    expect(screen.getByText('±1ms')).toBeDefined();
    expect(screen.getByText('120/60Hz')).toBeDefined();
  });

  it('renders all 5 cognitive assessment protocol cards with numbers and metrics', () => {
    render(
      <MemoryRouter>
        <About onNavigate={() => {}} />
      </MemoryRouter>
    );

    expect(screen.getByText('PROTOCOL 01')).toBeDefined();
    expect(screen.getByText('PROTOCOL 02')).toBeDefined();
    expect(screen.getByText('PROTOCOL 03')).toBeDefined();
    expect(screen.getByText('PROTOCOL 04')).toBeDefined();
    expect(screen.getByText('PROTOCOL 05')).toBeDefined();

    expect(screen.getByText('Visual Reaction')).toBeDefined();
    expect(screen.getByText('Directional Choice')).toBeDefined();
    expect(screen.getByText('Colour Recognition')).toBeDefined();
    expect(screen.getByText('Block Memory')).toBeDefined();
    expect(screen.getByText('Number Memory')).toBeDefined();
  });

  it('triggers navigation and haptic feedback when launching a protocol', async () => {
    const onNavigate = vi.fn();
    const { triggerHaptic } = await import('../../mobile/src/lib/settingsStore');

    render(
      <MemoryRouter>
        <About onNavigate={onNavigate} />
      </MemoryRouter>
    );

    const visualReactionBtn = screen.getByText('Visual Reaction').closest('button');
    expect(visualReactionBtn).not.toBeNull();

    fireEvent.click(visualReactionBtn!);
    expect(onNavigate).toHaveBeenCalledWith('reaction-test');
    expect(triggerHaptic).toHaveBeenCalledWith('light');
  });

  it('renders privacy and participation sections with links to /privacy', async () => {
    const onNavigate = vi.fn();
    render(
      <MemoryRouter>
        <About onNavigate={onNavigate} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Data & Privacy Integrity/i)).toBeDefined();
    expect(screen.getByText(/How To Participate/i)).toBeDefined();

    const privacyBtn = screen.getByText(/Read Research Ethics & Privacy Policy/i).closest('button');
    expect(privacyBtn).not.toBeNull();

    fireEvent.click(privacyBtn!);
    expect(onNavigate).toHaveBeenCalledWith('/privacy');
  });
});
