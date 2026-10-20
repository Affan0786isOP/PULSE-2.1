import React from 'react';

import { useSystemTheme } from '../../lib/useSystemTheme';

export const LeaderboardSideWaves: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme }) => {
  const { activeTheme } = useSystemTheme();
  const isDark = (theme || activeTheme) === 'dark';
  return (
    <div
      className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Background Subtle Dot-Matrix Grid identical to Home */}
      <div 
        className="absolute inset-0 pointer-events-none select-none opacity-40"
        style={{
          backgroundImage: isDark ? 'radial-gradient(rgba(34, 199, 214, 0.08) 1.2px, transparent 1.2px)' : 'radial-gradient(rgba(0, 102, 255, 0.12) 1.2px, transparent 1.2px)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* Left Fluid Wave Graphic */}
      <div className="absolute left-0 bottom-0 top-0 w-[280px] lg:w-[360px] xl:w-[440px] h-full overflow-hidden">
        <svg
          viewBox="0 0 440 900"
          preserveAspectRatio="none"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lbLeftWaveGradPrimary" x1="0" y1="400" x2="350" y2="700" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#0284C7" stopOpacity="0.9" />
              <stop offset="80%" stopColor="#0066FF" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.7" />
            </linearGradient>

            <linearGradient id="lbLeftWaveGradSecondary" x1="0" y1="350" x2="420" y2="750" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.85" />
              <stop offset="45%" stopColor="#7DD3FC" stopOpacity="0.65" />
              <stop offset="80%" stopColor="#0284C7" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0066FF" stopOpacity="0.25" />
            </linearGradient>

            <linearGradient id="lbLeftAmbientFill" x1="0" y1="300" x2="300" y2="900" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#E0F2FE" stopOpacity="0.6" />
              <stop offset="100%" stopColor={isDark ? "#0B0D10" : "#FFFFFF"} stopOpacity={isDark ? "0.9" : "0.95"} />
            </linearGradient>
          </defs>

          {/* Ambient Base Wave */}
          <path
            d="M -50 950
               L -50 380
               C 120 400, 260 480, 220 640
               C 180 800, 260 860, 320 950
               Z"
            fill="url(#lbLeftAmbientFill)"
          />

          {/* Secondary Ribbon Layer */}
          <path
            d="M -50 950
               L -50 430
               C 140 430, 290 510, 230 670
               C 180 810, 220 890, 260 950
               Z"
            fill="url(#lbLeftWaveGradSecondary)"
            opacity="0.85"
          />

          {/* Main Electric Blue Ribbon Wave */}
          <path
            d="M -50 950
               L -50 490
               C 100 480, 220 540, 190 690
               C 160 820, 100 880, 180 950
               Z"
            fill="url(#lbLeftWaveGradPrimary)"
            opacity="0.9"
          />

          {/* Crest Highlight Line */}
          <path
            d="M -50 490
               C 100 480, 220 540, 190 690
               C 160 820, 100 880, 180 950"
            stroke={isDark ? "#22C7D6" : "#E0F2FE"}
            strokeWidth={isDark ? "1.5" : "2.5"}
            strokeLinecap="round"
            opacity={isDark ? "0.45" : "0.95"}
          />
        </svg>
      </div>

      {/* Right Fluid Wave Graphic */}
      <div className="absolute right-0 bottom-0 top-0 w-[280px] lg:w-[360px] xl:w-[440px] h-full overflow-hidden">
        <svg
          viewBox="0 0 440 900"
          preserveAspectRatio="none"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lbRightWaveGradPrimary" x1="440" y1="350" x2="90" y2="700" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="35%" stopColor="#0284C7" stopOpacity="0.9" />
              <stop offset="75%" stopColor="#0066FF" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.75" />
            </linearGradient>

            <linearGradient id="lbRightWaveGradSecondary" x1="440" y1="300" x2="20" y2="750" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#7DD3FC" stopOpacity="0.65" />
              <stop offset="75%" stopColor="#0284C7" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0066FF" stopOpacity="0.25" />
            </linearGradient>

            <linearGradient id="lbRightAmbientFill" x1="440" y1="250" x2="140" y2="900" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#E0F2FE" stopOpacity="0.55" />
              <stop offset="100%" stopColor={isDark ? "#0B0D10" : "#FFFFFF"} stopOpacity={isDark ? "0.9" : "0.95"} />
            </linearGradient>
          </defs>

          {/* Ambient Base Wave */}
          <path
            d="M 490 950
               L 490 320
               C 320 350, 180 440, 210 600
               C 240 760, 160 830, 100 950
               Z"
            fill="url(#lbRightAmbientFill)"
          />

          {/* Secondary Ribbon Layer */}
          <path
            d="M 490 950
               L 490 380
               C 300 400, 150 490, 190 640
               C 230 780, 180 870, 140 950
               Z"
            fill="url(#lbRightWaveGradSecondary)"
            opacity="0.85"
          />

          {/* Main Electric Blue Ribbon Wave */}
          <path
            d="M 490 950
               L 490 440
               C 340 450, 220 520, 240 670
               C 260 810, 310 880, 230 950
               Z"
            fill="url(#lbRightWaveGradPrimary)"
            opacity="0.9"
          />

          {/* Crest Highlight Line */}
          <path
            d="M 490 440
               C 340 450, 220 520, 240 670
               C 260 810, 310 880, 230 950"
            stroke={isDark ? "#22C7D6" : "#E0F2FE"}
            strokeWidth={isDark ? "1.5" : "2.5"}
            strokeLinecap="round"
            opacity={isDark ? "0.45" : "0.95"}
          />
        </svg>
      </div>
    </div>
  );
};
