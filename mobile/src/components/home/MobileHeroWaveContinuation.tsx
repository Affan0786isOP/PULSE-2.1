import React from 'react';
import { useSystemTheme } from '../../lib/useSystemTheme';

export const MobileHeroWaveContinuation: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme }) => {
  const { activeTheme } = useSystemTheme();
  const isDark = (theme || activeTheme) === 'dark';

  return (
    <div
      data-testid="hero-wave-continuation"
      className="absolute top-0 left-0 right-0 w-full h-[380px] pointer-events-none select-none -z-0 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 390 380"
        preserveAspectRatio="none"
        className="w-full h-full transition-opacity duration-300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="contWaveGrad" x1="0" y1="60" x2="390" y2="340" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity={isDark ? "0.35" : "0.45"} />
            <stop offset="35%" stopColor="#0284C7" stopOpacity={isDark ? "0.4" : "0.45"} />
            <stop offset="70%" stopColor="#0066FF" stopOpacity={isDark ? "0.25" : "0.3"} />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="contSecWaveGrad" x1="390" y1="40" x2="0" y2="340" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={isDark ? "#0284C7" : "#E0F2FE"} stopOpacity={isDark ? "0.2" : "0.35"} />
            <stop offset="40%" stopColor={isDark ? "#0EA5E9" : "#7DD3FC"} stopOpacity={isDark ? "0.25" : "0.3"} />
            <stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="contAmbientFill" x1="195" y1="0" x2="195" y2="380" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={isDark ? "#0284C7" : "#BAE6FD"} stopOpacity={isDark ? "0.08" : "0.15"} />
            <stop offset="50%" stopColor={isDark ? "#0066FF" : "#E0F2FE"} stopOpacity={isDark ? "0.05" : "0.1"} />
            <stop offset="100%" stopColor={isDark ? "#0B0D10" : "#FFFFFF"} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ambient Under-Wave Flow */}
        <path
          d="M -20 0 
             C 60 70, 140 60, 200 110 
             C 270 170, 320 150, 410 80 
             L 410 380 L -20 380 Z"
          fill="url(#contAmbientFill)"
        />

        {/* Secondary Cyan Ribbon continuation - softer, passing behind card body */}
        <path
          d="M -20 50 
             C 80 110, 160 100, 240 160 
             C 310 210, 360 180, 410 120"
          stroke="url(#contSecWaveGrad)"
          strokeWidth="36"
          strokeLinecap="round"
        />

        {/* Primary Electric Blue Ribbon continuation */}
        <path
          d="M -20 80 
             C 70 140, 150 130, 220 190 
             C 290 250, 340 220, 410 160"
          stroke="url(#contWaveGrad)"
          strokeWidth="20"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
