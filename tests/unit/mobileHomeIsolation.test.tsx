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
  it('renders only the MobileHero on the mobile landing page without dark directory or footer sections', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Home onNavigate={vi.fn()} />
      </MemoryRouter>
    );

    // Assert MobileHero is rendered
    expect(screen.getByRole('region', { name: 'PULSE Mobile Hero' })).toBeDefined();

    // Assert unwanted dark directory section is not rendered
    expect(screen.queryByText(/DIRECTORY/i)).toBeNull();
    expect(screen.queryByText(/Pulse Engineering • Built for scale/i)).toBeNull();

    // Assert no duplicate directory shortcut buttons in Home
    expect(screen.queryByRole('button', { name: /Leaderboard/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Analytics/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Dataset/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Privacy Policy/i })).toBeNull();

    // Verify outer container is transparent/clean and does not impose dark background
    const homeRoot = container.firstElementChild as HTMLElement;
    expect(homeRoot.className).toContain('bg-transparent');
    expect(homeRoot.className).not.toContain('bg-[#0B0B0E]');
  });
});
