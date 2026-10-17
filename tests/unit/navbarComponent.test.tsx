import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../../src/components/Navbar';

vi.mock('../../src/lib/usePwaInstall', () => ({
  usePwaInstall: () => ({
    isInstallable: true,
    hasNativePrompt: true,
    promptInstall: vi.fn(),
    openInstallGuide: vi.fn(),
  })
}));

describe('Navbar Component', () => {
  it('renders brand lockup linking to home', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" />
      </MemoryRouter>
    );
    const brandLink = screen.getByLabelText(/PULSE Home/i);
    expect(brandLink).toBeDefined();
    expect(brandLink.getAttribute('href')).toBe('/');
  });

  it('renders navigation links for Assessments, Leaderboard, Dataset, Analytics, About', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /^assessments$/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /^leaderboard$/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /^dataset$/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /^analytics$/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /^about$/i })).toBeDefined();
  });

  it('renders Settings and Info action buttons', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /settings/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /platform information|app info|info/i })).toBeDefined();
  });

  it('disables settings, info, and navigation links during active assessment', () => {
    const handleExit = vi.fn();
    render(
      <MemoryRouter initialEntries={['/reaction-test']}>
        <Navbar currentView="reaction-test" isAssessmentActive={true} onBack={handleExit} />
      </MemoryRouter>
    );

    // Settings is disabled
    const settingsBtn = screen.getByRole('button', { name: /settings/i });
    expect(settingsBtn.hasAttribute('disabled')).toBe(true);

    // Info is disabled
    const infoBtn = screen.getByRole('button', { name: /platform information|app info|info/i });
    expect(infoBtn.hasAttribute('disabled')).toBe(true);

    // Install App button is hidden during active test
    expect(screen.queryByRole('button', { name: /install app/i })).toBeNull();

    // Mobile menu hamburger is hidden during active test
    expect(screen.queryByRole('button', { name: /navigation menu/i })).toBeNull();

    // Regular navigation links are replaced with inert/disabled spans
    expect(screen.queryByRole('link', { name: /^assessments$/i })).toBeNull();
    expect(screen.getByText('Assessments').getAttribute('aria-disabled')).toBe('true');

    // Logo link is not clickable / disabled
    expect(screen.queryByRole('link', { name: /PULSE Home$/i })).toBeNull();

    // Exit assessment button is rendered and functional
    const exitBtn = screen.getByRole('button', { name: /exit assessment/i });
    expect(exitBtn).toBeDefined();
    fireEvent.click(exitBtn);
    expect(handleExit).toHaveBeenCalledTimes(1);
  });

  it('renders and invokes onBack callback when supplied on sub-routes', () => {
    const handleBack = vi.fn();
    render(
      <MemoryRouter initialEntries={['/assessments']}>
        <Navbar currentView="assessments" onBack={handleBack} />
      </MemoryRouter>
    );
    const backBtn = screen.getByRole('button', { name: /go back/i });
    expect(backBtn).toBeDefined();
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('marks background elements inert and restores on close or unmount', () => {
    const siblingEl = document.createElement('div');
    siblingEl.id = 'page-content-sibling';
    document.body.appendChild(siblingEl);

    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" />
      </MemoryRouter>
    );

    const toggleBtn = screen.getByRole('button', { name: /open navigation menu/i });
    fireEvent.click(toggleBtn);

    // Sibling is now marked inert
    expect(siblingEl.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    // Close via escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(siblingEl.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');

    // Re-open and unmount to test cleanup
    fireEvent.click(toggleBtn);
    expect(siblingEl.hasAttribute('inert')).toBe(true);
    unmount();
    expect(siblingEl.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');

    document.body.removeChild(siblingEl);
  });

  it('traps tab focus within the drawer and restores focus on close', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" />
      </MemoryRouter>
    );

    const toggleBtn = screen.getByRole('button', { name: /open navigation menu/i });
    toggleBtn.focus();
    fireEvent.click(toggleBtn);

    const drawer = screen.getByRole('dialog', { name: /navigation menu/i });
    expect(drawer).toBeDefined();

    // Tab key cycling
    const links = screen.getAllByRole('link');
    const firstNavInDrawer = links.find(l => l.getAttribute('href') === '/assessments');
    expect(firstNavInDrawer).toBeDefined();

    // Press Escape to close and check focus restoration
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.activeElement).toBe(toggleBtn);
  });

  it('supports explicit dark theme styling without screen-size dependency', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" theme="dark" />
      </MemoryRouter>
    );
    const header = screen.getByRole('banner');
    expect(header).toBeDefined();
    // In dark mode, header has h-16 sm:h-20
    expect(header.className).toContain('h-16 sm:h-20');

    // Rerender with explicit light
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" theme="light" />
      </MemoryRouter>
    );
    expect(header.className).toContain('h-14 sm:h-16');
  });
});
