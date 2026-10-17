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

  it('disables settings button when assessment is active', () => {
    render(
      <MemoryRouter initialEntries={['/reaction-test']}>
        <Navbar currentView="reaction-test" isAssessmentActive={true} />
      </MemoryRouter>
    );
    const settingsBtn = screen.getByRole('button', { name: /settings/i });
    expect(settingsBtn).toBeDefined();
    expect(settingsBtn.hasAttribute('disabled')).toBe(true);
    expect(settingsBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('opens mobile drawer and closes on escape key press', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" />
      </MemoryRouter>
    );
    const toggleBtn = screen.getByRole('button', { name: /open navigation menu/i });
    expect(toggleBtn).toBeDefined();
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

    // Open drawer
    fireEvent.click(toggleBtn);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('dialog', { name: /navigation menu/i })).toBeDefined();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
  });
});
