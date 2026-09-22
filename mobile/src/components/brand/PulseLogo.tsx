import React from 'react';

interface PulseLogoProps {
  variant?: 'mark' | 'horizontal' | 'stacked';
  size?: number | string;
  className?: string;
  color?: string;
}

export const PulseLogo: React.FC<PulseLogoProps> = ({
  variant = 'horizontal',
  size,
  className = '',
  color = '#00F0FF',
}) => {
  const symbolPaths = (
    <>
      {/* S1: Upper Loop / Arch */}
      <path 
        d="M 12 8 L 61 8 C 75.9 8 88 20.1 88 35 C 88 49.9 75.9 62 61 62 L 46 62 L 46 45 L 61 45 C 66.5 45 71 40.5 71 35 C 71 29.5 66.5 25 61 25 L 12 25 Z" 
        fill={color} 
      />
      {/* S2: Lower Slanted Stem Parallelogram */}
      <path 
        d="M 12 55 L 36 38 L 36 75 L 12 92 Z" 
        fill={color} 
      />
    </>
  );

  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size ?? 32, height: size ?? 32 }}
        className={`inline-block shrink-0 ${className}`}
      >
        {symbolPaths}
      </svg>
    );
  }

  if (variant === 'stacked') {
    return (
      <div className={`inline-flex flex-col items-center select-none ${className}`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: size ?? 54, height: size ?? 54 }}
        >
          {symbolPaths}
        </svg>
        <span className="font-bold text-2xl tracking-[0.28em] text-[#F8FAFC] font-sans mt-3 pl-[0.28em]">
          PULSE
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size ?? 28, height: size ?? 28 }}
        className="shrink-0"
      >
        {symbolPaths}
      </svg>
      <span className="font-bold text-lg tracking-[0.26em] text-[#F8FAFC] font-sans leading-none pl-[0.26em]">
        PULSE
      </span>
    </div>
  );
};
