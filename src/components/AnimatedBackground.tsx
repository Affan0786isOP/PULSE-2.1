import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const READING_ROUTES = ['/privacy', '/research-privacy', '/improve'];

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const location = useLocation();
  const isReadingRoute = READING_ROUTES.some(p => location.pathname.startsWith(p));

  useEffect(() => {
    if (isReadingRoute) return;

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

      // Vertical lines
      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }

      // Horizontal lines
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

      // Draw crosshairs at every 2nd intersection to keep it clean & minimalist
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
    window.addEventListener('resize', render, { passive: true });
    window.addEventListener('orientationchange', render, { passive: true });

    return () => {
      window.removeEventListener('resize', render);
      window.removeEventListener('orientationchange', render);
    };
  }, [isReadingRoute]);

  return (
    <div
      aria-hidden="true"
      id="pulse-technical-background"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* Crisp Solid Surface */}
      <div className="absolute inset-0 bg-[var(--surface-0)]" />

      {/* Subtle Technical Canvas */}
      {!isReadingRoute && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
        />
      )}
    </div>
  );
}
