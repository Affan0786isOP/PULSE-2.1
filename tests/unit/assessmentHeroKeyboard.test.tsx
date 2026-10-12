import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssessmentHero3D } from '../../src/components/ui/AssessmentHero3D';

const mockPreferences = vi.hoisted(() => ({ reduceMotion: true }));

vi.mock('../../src/lib/settingsStore', () => ({
  useReducedMotionPreference: () => mockPreferences.reduceMotion,
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  mockPreferences.reduceMotion = true;
});

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

  it('keeps autoplay paused while focus stays inside the carousel, even if the pointer leaves', () => {
    mockPreferences.reduceMotion = false;
    vi.useFakeTimers();

    render(
      <MemoryRouter>
        <button data-testid="outside-focus-target" type="button">Outside</button>
        <AssessmentHero3D />
      </MemoryRouter>
    );

    const region = screen.getByRole('region', { name: 'Assessment Protocols 3D Carousel' });
    const previousButton = screen.getByRole('button', { name: 'Previous assessment protocol' });
    expect(activeCardLabel(region)).toBe('Launch Visual Reaction');

    fireEvent.focus(previousButton);
    act(() => { vi.advanceTimersByTime(5500); });
    expect(activeCardLabel(region)).toBe('Launch Visual Reaction');

    fireEvent.mouseLeave(region);
    act(() => { vi.advanceTimersByTime(5500); });
    expect(activeCardLabel(region)).toBe('Launch Visual Reaction');

    fireEvent.blur(previousButton, { relatedTarget: screen.getByTestId('outside-focus-target') });
    act(() => { vi.advanceTimersByTime(5500); });
    expect(activeCardLabel(region)).toBe('Launch Directional Choice');
  });
});
