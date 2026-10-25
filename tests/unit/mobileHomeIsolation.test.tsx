import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '../../mobile/src/components/Home';

// Mock child components & dependencies
vi.mock('../../mobile/src/components/hero/MobileHero', () => ({
  MobileHero: () => <section aria-label="PULSE Mobile Hero">Mobile Hero Stub</section>,
}));

vi.mock('../../mobile/src/lib/usePwaInstall', () => ({
  usePwaInstall: () => ({
    isInstallable: false,
    promptInstall: vi.fn(),
    isGuideOpen: false,
    closeInstallGuide: vi.fn(),
  }),
}));

vi.mock('../../mobile/src/lib/welcomeStore', () => ({
  isMobileWelcomeSeen: () => true,
}));

describe('Mobile Home Layout Isolation', () => {
  it('preserves the mobile hero and clean styling while rendering the intended narrative footer', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Home onNavigate={vi.fn()} />
      </MemoryRouter>
    );

    // Preserve the existing hero and the new mobile narrative.
    expect(screen.getByRole('region', { name: 'PULSE Mobile Hero' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Available Assessment Batteries' })).toBeDefined();
    expect(screen.getByRole('contentinfo', { name: 'Mobile Navigation and Legal Footer' })).toBeDefined();

    // The retired desktop-style directory and legacy footer must remain absent.
    expect(screen.queryByText(/DIRECTORY/i)).toBeNull();
    expect(screen.queryByText(/Pulse Engineering • Built for scale/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Analytics/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Privacy Policy/i })).toBeNull();

    // The current mobile footer intentionally exposes one copy of each supported quick link.
    expect(screen.getAllByRole('button', { name: /Leaderboard/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Dataset/i })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /About & Privacy/i })).toBeDefined();

    // Verify the outer container stays transparent and does not impose a dark background.
    const homeRoot = document.querySelector('#root')?.firstElementChild as HTMLElement | null;
    // The render container is mounted by Testing Library, so fall back to the first app element.
    const appRoot = homeRoot ?? document.body.querySelector('div.bg-transparent');
    expect(appRoot).not.toBeNull();
    expect(appRoot?.className).toContain('bg-transparent');
    expect(appRoot?.className).not.toContain('bg-[#0B0B0E]');
  });
});
