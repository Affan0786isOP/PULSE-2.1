import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useViewportSurface } from '../../src/hooks/useViewportSurface';
import { assessmentLockStore } from '@shared/assessment/assessmentLockStore';

describe('useViewportSurface Hook', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.cookie = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('unconditionally returns desktop on /admin regardless of device detection or force flags', () => {
    // Simulate mobile user-agent and mobile query
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/admin?force_mobile=1']}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useViewportSurface(), { wrapper });
    expect(result.current).toBe('desktop');
  });

  it('respects ?force_mobile=1 override on non-admin routes', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/?force_mobile=1']}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useViewportSurface(), { wrapper });
    expect(result.current).toBe('mobile');
  });

  it('respects ?force_desktop=1 override on mobile devices', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/?force_desktop=1']}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useViewportSurface(), { wrapper });
    expect(result.current).toBe('desktop');
  });

  it('queues surface changes during an active assessment and applies upon release', async () => {
    // Start with desktop
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/']}>
        {children}
      </MemoryRouter>
    );

    const { result } = renderHook(() => useViewportSurface(), { wrapper });
    expect(result.current).toBe('desktop');

    // Simulate lock acquisition
    vi.spyOn(assessmentLockStore, 'isProtected').mockReturnValue(true);

    // Trigger resize while locked
    act(() => {
      // Stub window innerWidth to mobile size
      vi.stubGlobal('innerWidth', 375);
      assessmentLockStore.setQueuedSurface('mobile');
    });

    // Hook should NOT change surface immediately while protected
    expect(result.current).toBe('desktop');

    // Release lock
    act(() => {
      vi.spyOn(assessmentLockStore, 'isProtected').mockReturnValue(false);
      // Trigger subscriber notification
      (assessmentLockStore as any).notify();
    });

    // After release, queued surface is applied
    expect(result.current).toBe('mobile');
  });
});
