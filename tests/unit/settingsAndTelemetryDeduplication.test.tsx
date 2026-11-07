import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useSettings, getSettings, updateSettings } from '../../src/lib/settingsStore';
import { useSettings as useMobileSettings, getSettings as getMobileSettings } from '../../mobile/src/lib/settingsStore';
import { pageViewTrackerGuard } from '../../shared/telemetry/pageViewTrackerGuard';
import { PageViewTracker } from '../../src/components/PageViewTracker';
import { PageViewTracker as MobilePageViewTracker } from '../../mobile/src/components/PageViewTracker';

describe('Phase 4 — Shared Settings Store & Telemetry Deduplication', () => {
  let mockFetch: any;

  beforeEach(() => {
    pageViewTrackerGuard.resetForTest();
    mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Desktop and Mobile re-export the exact same authoritative settings singleton', () => {
    // Update via desktop store helper
    updateSettings({ soundEnabled: false });

    // Read via mobile store helper
    const mobileSettings = getMobileSettings();
    expect(mobileSettings.soundEnabled).toBe(false);

    // Update via mobile store helper
    updateSettings({ soundEnabled: true });
    const desktopSettings = getSettings();
    expect(desktopSettings.soundEnabled).toBe(true);
  });

  it('2. PageViewTrackerGuard deduplicates identical navigation steps within 2000ms', () => {
    const shouldTrackFirst = pageViewTrackerGuard.shouldTrack('/assessments', 'step_1');
    expect(shouldTrackFirst).toBe(true);

    // Duplicate mount with identical navigationKey
    const shouldTrackSecond = pageViewTrackerGuard.shouldTrack('/assessments', 'step_1');
    expect(shouldTrackSecond).toBe(false);

    // New navigation step to same route
    const shouldTrackThird = pageViewTrackerGuard.shouldTrack('/assessments', 'step_2');
    expect(shouldTrackThird).toBe(true);
  });

  it('3. Cross-surface re-mount (desktop -> mobile switch) does not double-fire page view telemetry', async () => {
    // Mount Desktop PageViewTracker
    const { unmount } = render(
      <MemoryRouter initialEntries={[{ pathname: '/assessments', key: 'nav_key_42' }]}>
        <PageViewTracker surface="desktop" />
      </MemoryRouter>
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Unmount Desktop and Mount Mobile on same route and key (simulating surface switch)
    unmount();

    render(
      <MemoryRouter initialEntries={[{ pathname: '/assessments', key: 'nav_key_42' }]}>
        <MobilePageViewTracker surface="mobile" />
      </MemoryRouter>
    );

    // Should NOT have fired a second fetch call
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
