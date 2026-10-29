import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navbar } from '../../mobile/src/components/Navbar';

describe('Mobile Navbar Laboratory Light & Apparatus Lockout', () => {
  it('renders translucent light laboratory header on standard routes', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/assessments']}>
        <Navbar onNavigate={() => {}} title="Assessments" />
      </MemoryRouter>
    );
    const nav = container.querySelector('nav');
    expect(nav?.className).toContain('bg-white/90');
    expect(nav?.className).toContain('backdrop-blur-md');
  });

  it('switches to dark apparatus header and disables settings when assessment is active', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/reaction-test']}>
        <Navbar onNavigate={() => {}} isAssessmentActive={true} title="Visual Reaction" />
      </MemoryRouter>
    );
    const nav = container.querySelector('nav');
    expect(nav?.className).toContain('bg-[#12161B]');
    const settingsBtn = screen.getByLabelText(/Settings/i) as HTMLButtonElement;
    expect(settingsBtn.disabled).toBe(true);
  });

  it('disables logo and requires confirmation before exiting active assessment', () => {
    const handleExit = vi.fn();
    render(
      <MemoryRouter initialEntries={['/reaction-test']}>
        <Navbar onNavigate={() => {}} isAssessmentActive={true} onBack={handleExit} title="Visual Reaction" />
      </MemoryRouter>
    );

    // PULSE Home logo link is disabled (not an anchor link)
    expect(screen.queryByRole('link', { name: /PULSE Home$/i })).toBeNull();
    expect(screen.getByLabelText(/PULSE Home \(Disabled during active assessment\)/i)).toBeDefined();

    // Info and Settings buttons are disabled
    const infoBtn = screen.getByRole('button', { name: /app info/i }) as HTMLButtonElement;
    const settingsBtn = screen.getByRole('button', { name: /settings/i }) as HTMLButtonElement;
    expect(infoBtn.disabled).toBe(true);
    expect(settingsBtn.disabled).toBe(true);

    // Clicking exit shows the confirmation modal
    const exitBtn = screen.getByRole('button', { name: /exit assessment/i });
    fireEvent.click(exitBtn);

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(/Exit Assessment\?/i)).toBeDefined();
    expect(handleExit).not.toHaveBeenCalled();

    // Clicking resume closes modal without exiting
    const resumeBtn = screen.getByRole('button', { name: /resume test/i });
    fireEvent.click(resumeBtn);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(handleExit).not.toHaveBeenCalled();

    // Re-open and confirm exit
    fireEvent.click(exitBtn);
    const confirmExitBtn = screen.getByRole('button', { name: /exit now/i });
    fireEvent.click(confirmExitBtn);
    expect(handleExit).toHaveBeenCalledTimes(1);
  });

  it('dispatches pulse_assessment_abort window event when exit confirm opens', () => {
    const abortListener = vi.fn();
    window.addEventListener('pulse_assessment_abort', abortListener);

    render(
      <MemoryRouter initialEntries={['/reaction-test']}>
        <Navbar onNavigate={() => {}} isAssessmentActive={true} onBack={() => {}} title="Visual Reaction" />
      </MemoryRouter>
    );

    const exitBtn = screen.getByRole('button', { name: /exit assessment/i });
    fireEvent.click(exitBtn);

    expect(abortListener).toHaveBeenCalled();
    window.removeEventListener('pulse_assessment_abort', abortListener);
  });
});
