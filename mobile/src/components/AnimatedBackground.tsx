import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { isReducedMotionActive } from '../lib/settingsStore';

const READING_ROUTES = [
  '/privacy',
  '/research-privacy',
  '/privacy-policy',
  '/dataset',
  '/analytics',
  '/improve',
  '/mobile/privacy',
  '/mobile/research-privacy',
  '/mobile/privacy-policy',
  '/mobile/dataset',
  '/mobile/analytics',
  '/mobile/improve'
];

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const location = useLocation();
  const isReadingRoute = READING_ROUTES.some(p => location.pathname.startsWith(p));
  const isReducedMotion = isReducedMotionActive();

  useEffect(() => {
    if (isReadingRoute || isReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const render = () => {
      if (!ctx || !canvas) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, width, height);

      const isDark =
        document.documentElement.getAttribute('data-theme') !== 'light' &&
        !document.documentElement.classList.contains('light');

      // Grid dimensions
      const gridSize = 48;
      const primaryLineColor = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.035)';
      const crossColor = isDark ? 'rgba(34, 199, 214, 0.25)' : 'rgba(2, 132, 199, 0.22)';

      // 1. Draw crisp grid lines
      ctx.strokeStyle = primaryLineColor;
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }

      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
      }
      ctx.stroke();

      // 2. Precision crosshairs (+) at grid intersections
      const crossSize = 3;
      ctx.strokeStyle = crossColor;
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let x = gridSize * 2; x < width; x += gridSize * 2) {
        for (let y = gridSize * 2; y < height; y += gridSize * 2) {
          ctx.moveTo(x - crossSize, y);
          ctx.lineTo(x + crossSize, y);
          ctx.moveTo(x, y - crossSize);
          ctx.lineTo(x, y + crossSize);
        }
      }
      ctx.stroke();
    };

    render();

    const handleResize = () => {
      render();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        render();
      });
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isReadingRoute, isReducedMotion]);

  return (
    <div
      aria-hidden="true"
      id="mobile-technical-background"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      <div className="absolute inset-0 bg-[var(--surface-0)]" />
      {!isReadingRoute && !isReducedMotion && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
        />
      )}
    </div>
  );
}
