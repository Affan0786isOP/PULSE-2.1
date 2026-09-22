import React from 'react';

export type ReticleState = 'idle' | 'armed' | 'stimulus' | 'verified' | 'fault';

interface StimulusReticleProps {
  state?: ReticleState;
  size?: number | string;
  className?: string;
}

const stateColors: Record<ReticleState, string> = {
  idle: '#00F0FF',
  armed: '#F59E0B',
  stimulus: '#FFFFFF',
  verified: '#10B981',
  fault: '#EF4444',
};

export const StimulusReticle: React.FC<StimulusReticleProps> = ({
  state = 'idle',
  size = 48,
  className = '',
}) => {
  const fillColor = stateColors[state];

  return (
    <div 
      className={`inline-flex items-center justify-center relative transition-transform duration-100 shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* S1: Upper Loop / Arch */}
        <path 
          d="M 12 8 L 61 8 C 75.9 8 88 20.1 88 35 C 88 49.9 75.9 62 61 62 L 46 62 L 46 45 L 61 45 C 66.5 45 71 40.5 71 35 C 71 29.5 66.5 25 61 25 L 12 25 Z" 
          fill={fillColor} 
          className="transition-colors duration-150"
        />
        {/* S2: Lower Slanted Stem Parallelogram */}
        <path 
          d="M 12 55 L 36 38 L 36 75 L 12 92 Z" 
          fill={fillColor} 
          className="transition-colors duration-150"
        />
      </svg>
    </div>
  );
};
