import React, { useLayoutEffect } from 'react';

interface RouteShellBoundaryProps {
  children: React.ReactNode;
}

/**
 * Route-level cleanup boundary that seamlessly unlinks the build-time static
 * SEO shell (`#pulse-seo-shell`) immediately after React has committed the route's
 * DOM to the screen, eliminating blank interval flashes during chunk loading.
 */
export const RouteShellBoundary: React.FC<RouteShellBoundaryProps> = ({ children }) => {
  useLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      const shell = document.getElementById('pulse-seo-shell');
      if (shell) {
        shell.remove();
      }
    }
  }, []);

  return <>{children}</>;
};
