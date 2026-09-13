import React, { useEffect, useRef } from 'react';

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('orientationchange', resize, { passive: true });

    const isReducedMotion = () => {
      return (
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.getAttribute('data-reduced-motion') === 'true'
      );
    };

    let scanY = 0;
    let scanSpeed = 0.45;
    let frame = 0;

    const render = () => {
      if (!ctx) return;
      frame++;

      ctx.clearRect(0, 0, width, height);

      const isDark =
        document.documentElement.getAttribute('data-theme') !== 'light' &&
        !document.documentElement.classList.contains('light');

      // Grid dimensions
      const gridSize = 48;
      const primaryLineColor = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.035)';
      const crossColor = isDark ? 'rgba(34, 199, 214, 0.25)' : 'rgba(2, 132, 199, 0.22)';
      const sweepColor = isDark ? 'rgba(34, 199, 214, 0.04)' : 'rgba(2, 132, 199, 0.03)';
      const scanLineColor = isDark ? 'rgba(34, 199, 214, 0.18)' : 'rgba(2, 132, 199, 0.15)';

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

    // 3. Subtle horizontal telemetry scanline removed per anti-slop rules

      // No continuous render loop
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      id="pulse-technical-background"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      {/* Crisp Solid Surface */}
      <div className="absolute inset-0 bg-[var(--surface-0)]" />

      {/* Subtle Technical Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
      />
    </div>
  );
}
