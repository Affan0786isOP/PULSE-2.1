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

  it('keeps backdrop accessible and dismisses drawer on backdrop click', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" />
      </MemoryRouter>
    );

    const toggleBtn = screen.getByRole('button', { name: /open navigation menu/i });
    fireEvent.click(toggleBtn);

    const backdrop = screen.getByTestId('navbar-backdrop');
    expect(backdrop).toBeDefined();
    // Backdrop MUST NOT be marked inert
    expect(backdrop.hasAttribute('inert')).toBe(false);
    expect(screen.getByRole('dialog', { name: /navigation menu/i })).toBeDefined();
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

    // Clicking the backdrop closes the drawer
    fireEvent.click(backdrop);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(document.body.style.overflow).toBe('');
  });

  it('traps tab focus within the drawer across both boundaries and restores focus on close', async () => {
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

    // Query all focusable items within the drawer
    const focusables = Array.from(
      drawer.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    expect(focusables.length).toBeGreaterThan(1);
    const firstElement = focusables[0];
    const lastElement = focusables[focusables.length - 1];

    // Boundary 1: Tab on last element cycles forward to first element
    lastElement.focus();
    expect(document.activeElement).toBe(lastElement);
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(firstElement);

    // Boundary 2: Shift+Tab on first element cycles backward to last element
    firstElement.focus();
    expect(document.activeElement).toBe(firstElement);
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastElement);

    // Boundary 3: Tab when focus is outside drawer brings focus to first element
    toggleBtn.focus();
    expect(document.activeElement).toBe(toggleBtn);
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(firstElement);

    // Press Escape to close and verify focus returns to trigger
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

  it('closes mobile drawer automatically and disallows navigation when isAssessmentActive becomes true', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" isAssessmentActive={false} />
      </MemoryRouter>
    );

    const toggleBtn = screen.getByRole('button', { name: /open navigation menu/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('dialog', { name: /navigation menu/i })).toBeDefined();

    // Rerender with assessment becoming active
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" isAssessmentActive={true} />
      </MemoryRouter>
    );

    // Mobile drawer dialog is no longer rendered
    expect(screen.queryByRole('dialog', { name: /navigation menu/i })).toBeNull();
    // Hamburger trigger is also hidden
    expect(screen.queryByRole('button', { name: /navigation menu/i })).toBeNull();
    // Body overflow is restored
    expect(document.body.style.overflow).toBe('');
  });
});
