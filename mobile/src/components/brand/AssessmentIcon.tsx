import React from 'react';

export type AssessmentProtocolId = 
  | 'visual-reaction' | 'reaction-test' | 'reaction' | 'vrt'
  | 'directional-choice' | 'direction-test' | 'direction' | 'choice'
  | 'colour-recognition' | 'color-recognition' | 'color-test' | 'color'
  | 'block-memory' | 'block-memory-test' | 'block'
  | 'number-memory' | 'number-memory-test' | 'number';

interface AssessmentIconProps {
  protocol: AssessmentProtocolId | string;
  size?: number | string;
  className?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export const AssessmentIcon: React.FC<AssessmentIconProps> = ({
  protocol,
  size = 24,
  className = '',
  primaryColor = '#00F0FF',
  secondaryColor = '#F8FAFC',
}) => {
  const norm = String(protocol).toLowerCase().trim();

  // Protocol 01 — Visual Reaction
  if (norm === 'visual-reaction' || norm === 'reaction-test' || norm === 'reaction' || norm === 'vrt') {
    return (
      <svg
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size, height: size }}
        className={`inline-block shrink-0 ${className}`}
        aria-hidden="true"
      >
        <circle cx="64" cy="64" r="47" stroke={primaryColor} strokeWidth="3" />
        <circle cx="64" cy="64" r="28" stroke={primaryColor} strokeWidth="2" opacity=".55" />
        <path d="M64 12v18M64 98v18M12 64h18M98 64h18" stroke={primaryColor} strokeWidth="3" strokeLinecap="square" />
        <path d="M44 64h14l6-18 7 36 6-18h11" stroke={secondaryColor} strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter" />
        <circle cx="64" cy="64" r="4" fill={primaryColor} />
        <path d="M24 38l9-9M95 29l9 9M24 90l9 9M95 99l9-9" stroke={primaryColor} strokeWidth="2" opacity=".45" />
      </svg>
    );
  }

  // Protocol 02 — Directional Choice
  if (norm === 'directional-choice' || norm === 'direction-test' || norm === 'direction' || norm === 'choice') {
    return (
      <svg
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size, height: size }}
        className={`inline-block shrink-0 ${className}`}
        aria-hidden="true"
      >
        <circle cx="64" cy="64" r="47" stroke={primaryColor} strokeWidth="3" />
        <path d="M64 19v22M64 87v22M19 64h22M87 64h22" stroke={primaryColor} strokeWidth="2" opacity=".45" />
        <path d="M58 42l6-7 6 7M58 86l6 7 6-7M42 58l-7 6 7 6M86 58l7 6-7 6" stroke={primaryColor} strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter" />
        <rect x="49" y="49" width="30" height="30" rx="2" stroke={secondaryColor} strokeWidth="3" />
        <path d="M58 64h12M64 58v12" stroke={primaryColor} strokeWidth="3" strokeLinecap="square" />
        <circle cx="64" cy="64" r="4" fill={primaryColor} />
      </svg>
    );
  }

  // Protocol 03 — Colour Recognition
  if (norm === 'colour-recognition' || norm === 'color-recognition' || norm === 'color-test' || norm === 'color') {
    return (
      <svg
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size, height: size }}
        className={`inline-block shrink-0 ${className}`}
        aria-hidden="true"
      >
        <circle cx="64" cy="64" r="47" stroke={primaryColor} strokeWidth="3" />
        <circle cx="64" cy="64" r="29" stroke={primaryColor} strokeWidth="2" />
        <path d="M64 17a47 47 0 0 1 47 47M111 64a47 47 0 0 1-47 47M64 111a47 47 0 0 1-47-47M17 64A47 47 0 0 1 64 17" stroke={primaryColor} strokeWidth="7" strokeLinecap="butt" />
        <path d="M64 35v58M35 64h58" stroke={secondaryColor} strokeWidth="2" />
        <circle cx="64" cy="64" r="13" stroke={primaryColor} strokeWidth="4" />
        <path d="M55 55l18 18M73 55L55 73" stroke={secondaryColor} strokeWidth="3" strokeLinecap="square" />
        <circle cx="64" cy="64" r="3" fill={primaryColor} />
      </svg>
    );
  }

  // Protocol 04 — Block Memory
  if (norm === 'block-memory' || norm === 'block-memory-test' || norm === 'block') {
    return (
      <svg
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size, height: size }}
        className={`inline-block shrink-0 ${className}`}
        aria-hidden="true"
      >
        <rect x="17" y="17" width="94" height="94" rx="4" stroke={primaryColor} strokeWidth="3" />
        <g stroke={primaryColor} strokeWidth="2" opacity=".4">
          <path d="M48 17v94M80 17v94M17 48h94M17 80h94" />
        </g>
        <path d="M32 32h14v14H32zM64 32h14v14H64zM64 64h14v14H64zM32 80h14v14H32zM80 80h14v14H80z" fill={primaryColor} opacity=".95" />
        <path d="M39 39L71 39L71 71L39 87L87 87" stroke={secondaryColor} strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" />
        <circle cx="39" cy="39" r="4" fill={secondaryColor} />
        <circle cx="87" cy="87" r="4" fill={primaryColor} />
      </svg>
    );
  }

  // Protocol 05 — Number Memory
  if (norm === 'number-memory' || norm === 'number-memory-test' || norm === 'number') {
    return (
      <svg
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: size, height: size }}
        className={`inline-block shrink-0 ${className}`}
        aria-hidden="true"
      >
        <rect x="17" y="21" width="94" height="86" rx="5" stroke={primaryColor} strokeWidth="3" />
        <path d="M31 39h18v12H31zM55 39h18v12H55zM79 39h18v12H79zM31 59h18v12H31zM55 59h18v12H55z" stroke={primaryColor} strokeWidth="2" opacity=".55" />
        <path d="M79 59h18v12H79zM31 79h18v12H31zM55 79h18v12H55zM79 79h18v12H79z" stroke={primaryColor} strokeWidth="2" opacity=".55" />
        <path d="M35 43v4h10v-4M59 47v-4h10v4M83 43v4h10M35 63h10M59 63h10v6H59M83 63v8M35 83h10v8M59 83v8h10M83 91h10v-8" stroke={secondaryColor} strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" />
        <path d="M23 14h18M87 14h18" stroke={primaryColor} strokeWidth="2" opacity=".45" />
      </svg>
    );
  }

  return null;
};
