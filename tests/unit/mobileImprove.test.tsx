import { afterEach, describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Improve } from '../../mobile/src/components/Improve';
import { resetSettingsToDefaults, updateSettings } from '../../mobile/src/lib/settingsStore';

vi.mock('../../mobile/src/components/Navbar', () => ({
  Navbar: ({ title }: { title?: React.ReactNode }) => <nav>{title}</nav>,
}));
vi.mock('../../mobile/src/components/SEO', () => ({ SEO: () => null }));

describe('Mobile Improve Guide Laboratory Light', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    resetSettingsToDefaults();
  });


  it('stops carousel autoplay when reduced motion is enabled while mounted', () => {
    vi.useFakeTimers();
    resetSettingsToDefaults();
    updateSettings({ reducedMotionEnabled: false });
    const intervalSpy = vi.spyOn(window, 'setInterval');
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    const { unmount } = render(
      <MemoryRouter>
        <Improve onNavigate={() => {}} />
      </MemoryRouter>
    );

    const autoplayCall = intervalSpy.mock.calls.find((call) => call[1] === 7000);
    expect(autoplayCall).toBeDefined();
    const autoplayId = intervalSpy.mock.results[intervalSpy.mock.calls.indexOf(autoplayCall!)].value;

    act(() => {
      updateSettings({ reducedMotionEnabled: true });
    });

    expect(clearIntervalSpy).toHaveBeenCalledWith(autoplayId);
    unmount();
  });

  it('renders factor sections and habit checklist cards in light theme', () => {
    const { container } = render(
      <MemoryRouter>
        <Improve onNavigate={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/PERFORMANCE GUIDE/i)).toBeDefined();
    expect(screen.getByText(/Biological & environmental factors/i)).toBeDefined();
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('bg-gradient-to-b');
    expect(root.className).toContain('text-[#090D1A]');
  });
});
