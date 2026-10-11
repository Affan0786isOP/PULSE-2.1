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
    expect(brandLink).toBeInTheDocument();
    expect(brandLink.getAttribute('href')).toBe('/');
  });

  it('renders navigation links for Assessments, Leaderboard, Dataset, Analytics, About', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /^assessments$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^leaderboard$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^dataset$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^analytics$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^about$/i })).toBeInTheDocument();
  });

  it('renders Settings and Info action buttons', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar currentView="home" />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /platform information|app info|info/i })).toBeInTheDocument();
  });

  it('renders back button when on sub-routes', () => {
    const handleBack = vi.fn();
    render(
      <MemoryRouter initialEntries={['/assessments']}>
        <Navbar currentView="assessments" onBack={handleBack} />
      </MemoryRouter>
    );
    const backBtn = screen.getByRole('button', { name: /go back/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
