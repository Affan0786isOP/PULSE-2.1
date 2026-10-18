import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBaselineScale } from '../../src/lib/useBaselineScale';

describe('useBaselineScale hook', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
  };

  afterEach(() => {
    setViewport(originalInnerWidth, originalInnerHeight);
  });

  it('reverts to scale = 1 and undefined style on mobile viewports (< 768px)', () => {
    setViewport(390, 844);
    const { result } = renderHook(() => useBaselineScale());

    expect(result.current.scale).toBe(1);
    expect(result.current.isScaled).toBe(false);
    expect(result.current.style).toBeUndefined();
  });

  it('computes exact 1:1 scale for canonical 1280x720 desktop baseline', () => {
    setViewport(1280, 720);
    const { result } = renderHook(() => useBaselineScale());

    expect(result.current.scale).toBe(1);
    expect(result.current.isScaled).toBe(false);
    expect(result.current.style).toBeUndefined();
  });

  it('computes uniform 1.5x scale for standard 1920x1080 resolution', () => {
    setViewport(1920, 1080);
    const { result } = renderHook(() => useBaselineScale());

    expect(result.current.scale).toBeCloseTo(1.5, 4);
    expect(result.current.isScaled).toBe(true);
    expect(result.current.style).toEqual({
      zoom: 1.5,
      minHeight: 'calc(100dvh / 1.5)',
    });
  });

  it('bounds scaling by height on ultrawide screens (e.g. 2560x1080)', () => {
    setViewport(2560, 1080);
    const { result } = renderHook(() => useBaselineScale());

    // min(2560/1280 = 2.0, 1080/720 = 1.5) => 1.5
    expect(result.current.scale).toBeCloseTo(1.5, 4);
    expect(result.current.isScaled).toBe(true);
  });

  it('bounds scaling by width on narrow desktop screens (e.g. 1024x768)', () => {
    setViewport(1024, 768);
    const { result } = renderHook(() => useBaselineScale());

    // min(1024/1280 = 0.8, 768/720 = 1.0667) => 0.8
    expect(result.current.scale).toBeCloseTo(0.8, 4);
    expect(result.current.isScaled).toBe(true);
    expect(result.current.style).toEqual({
      zoom: 0.8,
      minHeight: 'calc(100dvh / 0.8)',
    });
  });

  it('updates scale reactively upon window resize event', () => {
    setViewport(1280, 720);
    const { result } = renderHook(() => useBaselineScale());

    expect(result.current.scale).toBe(1);

    act(() => {
      setViewport(1920, 1080);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.scale).toBeCloseTo(1.5, 4);
    expect(result.current.isScaled).toBe(true);

    act(() => {
      setViewport(375, 667); // Resize to mobile
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.scale).toBe(1);
    expect(result.current.isScaled).toBe(false);
    expect(result.current.style).toBeUndefined();
  });
});
