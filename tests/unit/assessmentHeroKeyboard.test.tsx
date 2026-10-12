import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssessmentHero3D } from '../../src/components/ui/AssessmentHero3D';

vi.mock('../../src/lib/settingsStore', () => ({
  useReducedMotionPreference: () => true,
}));

afterEach(() => cleanup());

function activeCardLabel(region: HTMLElement): string | null {
  return region.querySelector('[aria-current="true"]')?.getAttribute('aria-label') ?? null;
}

describe('desktop assessment hero carousel keyboard scope', () => {
  it('does not hijack arrow keys pressed outside the carousel', () => {
    render(
      <MemoryRouter>
        <button type="button" data-testid="outside-control">Outside control</button>
        <AssessmentHero3D />
      </MemoryRouter>
    );

    const region = screen.getByRole('region', { name: 'Assessment Protocols 3D Carousel' });
    const before = activeCardLabel(region);
    expect(before).toBe('Launch Visual Reaction');

    fireEvent.keyDown(screen.getByTestId('outside-control'), { key: 'ArrowRight' });
    expect(activeCardLabel(region)).toBe(before);
  });

  it('supports arrow-key navigation when a carousel control has focus', () => {
    render(
      <MemoryRouter>
        <AssessmentHero3D />
      </MemoryRouter>
    );

    const region = screen.getByRole('region', { name: 'Assessment Protocols 3D Carousel' });
    const before = activeCardLabel(region);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Previous assessment protocol' }), { key: 'ArrowRight' });
    const after = activeCardLabel(region);

    expect(before).toBe('Launch Visual Reaction');
    expect(after).toBe('Launch Directional Choice');
  });
});
