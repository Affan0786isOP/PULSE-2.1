import React from 'react';

export const NeuralGraphic: React.FC = () => {
  return (
    <div 
      className="absolute top-0 right-0 w-[280px] h-[320px] pointer-events-none select-none z-0 overflow-visible"
      aria-hidden="true"
    >
      {/* Ambient Radial Glow */}
      <div 
        className="absolute top-10 right-0 w-[240px] h-[240px] rounded-full blur-[60px] opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(0, 153, 255, 0.35) 0%, rgba(56, 189, 248, 0.2) 45%, transparent 70%)'
        }}
      />

      <svg 
        viewBox="0 0 300 340" 
        className="w-full h-full drop-shadow-[0_0_25px_rgba(0,140,255,0.35)]"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="brainGrad" x1="120" y1="40" x2="280" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#0284C7" stopOpacity="0.75" />
            <stop offset="75%" stopColor="#0066FF" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id="brainGlowGrad" x1="150" y1="80" x2="280" y2="240" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#7DD3FC" stopOpacity="0.6" />
            <stop offset="80%" stopColor="#0284C7" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
          </linearGradient>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="1" />
            <stop offset="40%" stopColor="#0066FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Constellation lines extending out */}
        <path 
          d="M 175 60 C 185 30 200 20 205 18" 
          stroke="#38BDF8" 
          strokeWidth="0.8" 
          strokeDasharray="2 2"
          opacity="0.6"
        />
        <circle cx="205" cy="18" r="3" fill="#0066FF" />
        <circle cx="205" cy="18" r="6" fill="#38BDF8" opacity="0.35" />

        <path 
          d="M 230 140 C 255 160 270 170 285 175" 
          stroke="#38BDF8" 
          strokeWidth="0.8" 
          strokeDasharray="3 2"
          opacity="0.5"
        />
        <circle cx="285" cy="175" r="3" fill="#0066FF" />
        <circle cx="285" cy="175" r="7" fill="#38BDF8" opacity="0.3" />

        {/* Holographic 3D Brain Outer Silhouette */}
        <g opacity="0.95" filter="url(#softGlow)">
          {/* Main cerebral cortex shape */}
          <path
            d="M 195 55 
               C 225 50 260 68 275 98 
               C 290 128 292 165 285 198 
               C 280 220 265 240 248 255 
               C 235 265 220 272 205 272
               C 192 272 185 260 178 248
               C 172 238 162 232 152 234
               C 142 236 136 245 130 252
               C 120 262 108 262 98 252
               C 85 238 82 215 88 190
               C 92 170 102 152 118 138
               C 125 132 128 122 126 112
               C 124 98 132 82 145 70
               C 160 58 178 58 195 55 Z"
            fill="url(#brainGrad)"
            opacity="0.38"
          />

          {/* Internal Cortical Folds & Neural Pathways (Gyri & Sulci) */}
          <path
            d="M 155 78 C 170 70 190 72 205 82 C 220 92 225 110 215 125 C 205 140 185 142 175 155 C 165 168 170 185 185 195"
            stroke="#7DD3FC"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.75"
          />
          <path
            d="M 188 95 C 205 102 230 105 245 120 C 260 135 258 158 245 172 C 235 182 220 185 212 198 C 205 210 212 225 225 235"
            stroke="#BAE6FD"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />
          <path
            d="M 135 125 C 148 118 165 120 175 132 C 185 145 180 162 168 175 C 158 185 152 198 158 212"
            stroke="#38BDF8"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />
          <path
            d="M 215 120 C 235 125 255 140 262 162 C 268 182 260 205 245 220"
            stroke="#E0F2FE"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
          />
          <path
            d="M 170 148 C 190 152 215 158 225 175 C 232 188 228 202 218 215"
            stroke="#7DD3FC"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
          />

          {/* Temporal & Cerebellum Sub-structures */}
          <path
            d="M 115 178 C 125 168 140 170 148 182 C 155 195 148 210 138 222 C 128 232 120 242 125 250"
            stroke="#38BDF8"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M 180 238 C 192 235 210 240 220 252 C 230 262 225 272 210 272"
            stroke="#0284C7"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            opacity="0.65"
          />

          {/* Luminous Inner Core Highlight */}
          <ellipse 
            cx="210" 
            cy="145" 
            rx="50" 
            ry="40" 
            fill="url(#brainGlowGrad)" 
            opacity="0.45"
            transform="rotate(-15 210 145)"
          />

          {/* Neural Synapse Nodes (Luminous Points) */}
          <circle cx="188" cy="95" r="2.5" fill="#FFFFFF" />
          <circle cx="188" cy="95" r="5" fill="#38BDF8" opacity="0.6" />

          <circle cx="215" cy="120" r="2.5" fill="#FFFFFF" />
          <circle cx="215" cy="120" r="5" fill="#38BDF8" opacity="0.6" />

          <circle cx="245" cy="120" r="2.2" fill="#FFFFFF" />
          <circle cx="245" cy="120" r="4.5" fill="#0066FF" opacity="0.6" />

          <circle cx="175" cy="155" r="2.5" fill="#FFFFFF" />
          <circle cx="175" cy="155" r="5" fill="#38BDF8" opacity="0.6" />

          <circle cx="225" cy="175" r="3" fill="#FFFFFF" />
          <circle cx="225" cy="175" r="6" fill="#00F0FF" opacity="0.7" />

          <circle cx="262" cy="162" r="2.2" fill="#FFFFFF" />
          <circle cx="262" cy="162" r="5" fill="#38BDF8" opacity="0.5" />

          <circle cx="212" cy="198" r="2.5" fill="#FFFFFF" />
          <circle cx="212" cy="198" r="5" fill="#38BDF8" opacity="0.6" />

          <circle cx="158" cy="212" r="2.2" fill="#FFFFFF" />
          <circle cx="158" cy="212" r="4.5" fill="#38BDF8" opacity="0.5" />

          <circle cx="248" cy="225" r="2" fill="#FFFFFF" />
          <circle cx="248" cy="225" r="4" fill="#0066FF" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
};
