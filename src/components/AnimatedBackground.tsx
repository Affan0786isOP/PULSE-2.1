import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { isReducedMotionActive } from '../lib/settingsStore';

const READING_ROUTES = [
  '/privacy',
  '/research-privacy',
  '/privacy-policy',
  '/dataset',
  '/analytics',
  '/improve'
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
      if (typeof document !== 'undefined' && document.hidden) return;

      width = window.innerWidth;
      height = window.innerHeight;
      const maxDim = 2560;
      const naturalDpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.min(1, maxDim / Math.max(width * naturalDpr, height * naturalDpr, 1));
      const effectiveDpr = naturalDpr * scale;
      canvas.width = Math.round(width * effectiveDpr);
      canvas.height = Math.round(height * effectiveDpr);
      ctx.setTransform(effectiveDpr, 0, 0, effectiveDpr, 0, 0);

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

      // 2. Draw precision crosshairs (+) at grid intersections
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

    let rafId: number | null = null;
    const scheduleRender = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        render();
      });
    };

    window.addEventListener('resize', scheduleRender, { passive: true });
    window.addEventListener('orientationchange', scheduleRender, { passive: true });

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        scheduleRender();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Theme-safe: redraw when data-theme or class on <html> changes
    let themeObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      themeObserver = new MutationObserver(() => {
        scheduleRender();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class']
      });
    }

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        scheduleRender();
      });
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleRender);
      window.removeEventListener('orientationchange', scheduleRender);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (themeObserver) {
        themeObserver.disconnect();
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isReadingRoute, isReducedMotion]);

  return (
    <div
      aria-hidden="true"
      id="pulse-technical-background"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* Crisp Solid Surface */}
      <div className="absolute inset-0 bg-[var(--surface-0)]" />

      {/* Subtle Technical Canvas */}
      {!isReadingRoute && !isReducedMotion && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
        />
      )}
    </div>
  );
}
