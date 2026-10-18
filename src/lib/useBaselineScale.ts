import { useState, useEffect, CSSProperties } from 'react';

export interface BaselineScaleOptions {
  /** Baseline layout width in pixels (defaults to 1280) */
  baseWidth?: number;
  /** Baseline layout height in pixels (defaults to 720) */
  baseHeight?: number;
  /** Minimum viewport width breakpoint below which scaling reverts to 1 (defaults to 768) */
  minBreakpoint?: number;
}

export interface BaselineScaleResult {
  /** The calculated uniform scale factor */
  scale: number;
  /** Whether the current scale factor is not 1 */
  isScaled: boolean;
  /** Ready-to-apply style object for fixed-stage containers */
  style?: CSSProperties;
}

/**
 * Computes a uniform aspect-ratio scale factor based on a 1280x720 baseline.
 * Used for fixed-viewport desktop stages (e.g. Home hero, test stimulus stages)
 * to maintain invariant spatial geometry and eliminate vertical clipping across
 * 1366x768, 1080p, 1440p, 4K, and ultrawide resolutions.
 */
export function useBaselineScale({
  baseWidth = 1280,
  baseHeight = 720,
  minBreakpoint = 768,
}: BaselineScaleOptions = {}): BaselineScaleResult {
  const [scale, setScale] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w >= minBreakpoint) {
      return Math.min(w / baseWidth, h / baseHeight);
    }
    return 1;
  });

  useEffect(() => {
    const updateScale = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w >= minBreakpoint) {
        const calculatedScale = Math.min(w / baseWidth, h / baseHeight);
        setScale(calculatedScale);
      } else {
        setScale(1);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale, { passive: true });
    return () => window.removeEventListener('resize', updateScale);
  }, [baseWidth, baseHeight, minBreakpoint]);

  const isScaled = scale !== 1;
  const style: CSSProperties | undefined = isScaled
    ? {
        zoom: scale,
        minHeight: `calc(100dvh / ${scale})`,
      }
    : undefined;

  return {
    scale,
    isScaled,
    style,
  };
}
