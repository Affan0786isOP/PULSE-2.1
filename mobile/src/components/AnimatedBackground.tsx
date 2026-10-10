import React from 'react';
import { useLocation } from 'react-router-dom';
import { isReducedMotionActive } from '../lib/settingsStore';

const READING_ROUTES = [
  '/',
  '/mobile',
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
  const location = useLocation();
  const isReadingRoute = READING_ROUTES.some(p => 
    p === '/' ? location.pathname === '/' || location.pathname === '' :
    p === '/mobile' ? location.pathname === '/mobile' || location.pathname === '/mobile/' :
    location.pathname.startsWith(p)
  );
  const isReducedMotion = isReducedMotionActive();

  return (
    <div
      aria-hidden="true"
      id="mobile-technical-background"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
    >
      <div className="absolute inset-0 bg-[var(--surface-0)]" />
      {!isReadingRoute && !isReducedMotion && (
        <div
          className="absolute inset-0 w-full h-full opacity-100 transition-opacity duration-300"
          style={{
            backgroundImage: 'var(--bg-grid-pattern)',
            backgroundSize: '96px 96px',
            backgroundRepeat: 'repeat',
            backgroundPosition: '0 0'
          }}
        />
      )}
    </div>
  );
}
