import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
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
    expect(nav).toHaveClass('bg-white/90');
    expect(nav).toHaveClass('backdrop-blur-md');
  });

  it('switches to dark apparatus header and disables settings when assessment is active', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/reaction-test']}>
        <Navbar onNavigate={() => {}} isAssessmentActive={true} title="Visual Reaction" />
      </MemoryRouter>
    );
    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('bg-[#12161B]');
    const settingsBtn = screen.getByLabelText(/Settings/i);
    expect(settingsBtn).toBeDisabled();
  });
});
