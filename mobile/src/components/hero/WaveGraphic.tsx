import React from 'react';
import { useSystemTheme } from '../../lib/useSystemTheme';

export const WaveGraphic: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme }) => {
  const { activeTheme } = useSystemTheme();
  const isDark = (theme || activeTheme) === 'dark';
  return (
    <div 
      className="absolute bottom-0 left-0 right-0 w-full h-[220px] pointer-events-none select-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      <svg 
        viewBox="0 0 390 220" 
        preserveAspectRatio="none" 
        className="w-full h-full"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main Electric Blue Wave Gradient */}
          <linearGradient id="mainWaveGrad" x1="0" y1="50" x2="390" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity={isDark ? "0.7" : "0.85"} />
            <stop offset="28%" stopColor="#0284C7" stopOpacity={isDark ? "0.85" : "0.9"} />
            <stop offset="65%" stopColor="#0066FF" stopOpacity={isDark ? "0.8" : "0.85"} />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity={isDark ? "0.6" : "0.7"} />
          </linearGradient>

          {/* Secondary Cyan Ribbon Gradient */}
          <linearGradient id="secWaveGrad" x1="390" y1="20" x2="0" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={isDark ? "#0284C7" : "#E0F2FE"} stopOpacity={isDark ? "0.4" : "0.6"} />
            <stop offset="35%" stopColor={isDark ? "#0EA5E9" : "#7DD3FC"} stopOpacity={isDark ? "0.5" : "0.5"} />
            <stop offset="70%" stopColor="#0284C7" stopOpacity={isDark ? "0.35" : "0.4"} />
            <stop offset="100%" stopColor="#0066FF" stopOpacity={isDark ? "0.2" : "0.2"} />
          </linearGradient>

          {/* Subtle Ambient Bottom Fill */}
          <linearGradient id="ambientWaveFill" x1="195" y1="80" x2="195" y2="220" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={isDark ? "#0284C7" : "#BAE6FD"} stopOpacity={isDark ? "0.15" : "0.25"} />
            <stop offset="60%" stopColor={isDark ? "#0B0D10" : "#E0F2FE"} stopOpacity={isDark ? "0.45" : "0.5"} />
            <stop offset="100%" stopColor={isDark ? "#0B0D10" : "#FFFFFF"} stopOpacity={isDark ? "0.9" : "0.9"} />
          </linearGradient>

          <filter id="waveGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Under-Wave Flow */}
        <path
          d="M -20 110 
             C 60 70, 120 70, 180 120 
             C 240 170, 310 180, 410 110 
             L 410 230 L -20 230 Z"
          fill="url(#ambientWaveFill)"
        />

        {/* Upper Soft Ribbon Wave */}
        <path
          d="M -20 95 
             C 50 65, 110 60, 165 95 
             C 220 130, 275 165, 345 145 
             C 380 135, 400 115, 420 100 
             L 420 220 L -20 220 Z"
          fill="url(#secWaveGrad)"
          opacity={isDark ? "0.6" : "0.75"}
        />

        {/* Main Flowing Ribbon (Bold Sculpted Wave) */}
        <path
          d="M -10 120 
             C 45 75, 105 70, 150 95 
             C 205 125, 245 175, 310 185 
             C 350 190, 385 165, 410 135 
             L 410 220 L -10 220 Z"
          fill="url(#mainWaveGrad)"
          opacity={isDark ? "0.75" : "0.88"}
          filter="url(#waveGlow)"
        />

        {/* Highlight Crest Line on Wave Edge */}
        <path
          d="M -10 120 
             C 45 75, 105 70, 150 95 
             C 205 125, 245 175, 310 185 
             C 350 190, 385 165, 410 135"
          stroke={isDark ? "#22C7D6" : "#E0F2FE"}
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity={isDark ? "0.75" : "0.9"}
        />

        {/* Constellation Network Filaments & Nodes */}
        {/* Left Node & Line */}
        <line x1="20" y1="88" x2="65" y2="88" stroke="#38BDF8" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.6" />
        <circle cx="50" cy="88" r="3.5" fill="#0066FF" />
        <circle cx="50" cy="88" r="8" fill="#38BDF8" opacity="0.35" />

        {/* Lower Right Node & Line */}
        <line x1="285" y1="185" x2="335" y2="185" stroke="#38BDF8" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.6" />
        <circle cx="310" cy="185" r="3.5" fill="#0066FF" />
        <circle cx="310" cy="185" r="7.5" fill="#38BDF8" opacity="0.35" />
      </svg>
    </div>
  );
};
