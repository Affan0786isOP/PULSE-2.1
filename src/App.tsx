import React, { Suspense, lazy } from 'react';
import { useViewportSurface } from './hooks/useViewportSurface';
import { ProfileProvider } from './lib/profiles/ProfileContext';

const DesktopApp = lazy(() => import('./DesktopApp').then(m => ({ default: m.DesktopApp || m.default })));
const MobileAppWrapper = lazy(() => import('@mobile/MobileAppWrapper').then(m => ({ default: m.MobileAppWrapper || m.default })));

function SurfaceFallback() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center font-sans bg-[#0B0D10] text-slate-400">
      <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mb-3" />
      <div className="text-xs font-mono uppercase tracking-widest opacity-80">Loading Experience...</div>
    </div>
  );
}

export function App() {
  const surface = useViewportSurface();

  return (
    <ProfileProvider>
      <Suspense fallback={<SurfaceFallback />}>
        {surface === 'mobile' ? <MobileAppWrapper /> : <DesktopApp />}
      </Suspense>
    </ProfileProvider>
  );
}

export default App;
