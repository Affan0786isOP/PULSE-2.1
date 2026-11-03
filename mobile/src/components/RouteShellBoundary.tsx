import React, { useLayoutEffect, useRef } from 'react';

interface RouteShellBoundaryProps {
  children: React.ReactNode;
}

/**
 * Route-level cleanup boundary that seamlessly unlinks the build-time static
 * SEO shell (`#pulse-seo-shell`) immediately after React has committed the route's
 * DOM to the screen, eliminating blank interval flashes during chunk loading.
 */
export const RouteShellBoundary: React.FC<RouteShellBoundaryProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      if (containerRef.current && containerRef.current.children.length > 0) {
        const shell = document.getElementById('pulse-seo-shell');
        if (shell) {
          shell.remove();
        }
      }
    }
  });

  return <div ref={containerRef} style={{ display: 'contents' }}>{children}</div>;
};
