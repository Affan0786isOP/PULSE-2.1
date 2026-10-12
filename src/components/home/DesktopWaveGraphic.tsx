import React from 'react';

export const DesktopWaveGraphic: React.FC = () => {
  return (
    <div 
      className="absolute bottom-0 left-0 right-0 w-full h-[45px] sm:h-[55px] lg:h-[65px] min-[2560px]:h-[80px] pointer-events-none select-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      <svg 
        viewBox="0 0 1440 165" 
        preserveAspectRatio="none" 
        className="w-full h-full"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main Electric Blue Wave Gradient */}
          <linearGradient id="deskMainWaveGrad" x1="0" y1="40" x2="1440" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.88" />
            <stop offset="30%" stopColor="#0284C7" stopOpacity="0.92" />
            <stop offset="65%" stopColor="#0066FF" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.75" />
          </linearGradient>

          {/* Secondary Cyan Ribbon Gradient */}
          <linearGradient id="deskSecWaveGrad" x1="1440" y1="15" x2="0" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.75" />
            <stop offset="35%" stopColor="#7DD3FC" stopOpacity="0.65" />
            <stop offset="70%" stopColor="#0284C7" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0066FF" stopOpacity="0.25" />
          </linearGradient>

          {/* Subtle Ambient Bottom Fill */}
          <linearGradient id="deskAmbientWaveFill" x1="720" y1="50" x2="720" y2="165" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#E0F2FE" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
          </linearGradient>

          <filter id="deskWaveGlow" x="-5%" y="-10%" width="110%" height="120%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Under-Wave Flow (Dips on left, crests under carousel) */}
        <path
          d="M -40 142 
             C 240 142, 480 138, 720 102 
             C 980 68, 1220 82, 1480 78 
             L 1480 180 L -40 180 Z"
          fill="url(#deskAmbientWaveFill)"
        />

        {/* Upper Soft Ribbon Wave */}
        <path
          d="M -40 132 
             C 220 132, 460 122, 700 88 
             C 960 58, 1200 72, 1480 68 
             L 1480 175 L -40 175 Z"
          fill="url(#deskSecWaveGrad)"
          opacity="0.8"
        />

        {/* Main Flowing Ribbon (Low under left column, crests under carousel cards) */}
        <path
          d="M -20 136 
             C 200 136, 440 126, 680 92 
             C 940 60, 1180 76, 1460 72 
             L 1460 175 L -20 175 Z"
          fill="url(#deskMainWaveGrad)"
          opacity="0.9"
          filter="url(#deskWaveGlow)"
        />

        {/* Highlight Crest Line on Wave Edge */}
        <path
          d="M -20 136 
             C 200 136, 440 126, 680 92 
             C 940 60, 1180 76, 1460 72"
          stroke="#E0F2FE"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.95"
        />
      </svg>
    </div>
  );
};
