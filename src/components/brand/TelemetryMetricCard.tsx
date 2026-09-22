import React from 'react';
import { ProvenanceBadge } from './ProvenanceBadge';
import { StimulusReticle } from './StimulusReticle';

interface TelemetryMetricCardProps {
  runId?: string | number;
  refreshRate?: string;
  latencyMs?: number | string;
  isVerified?: boolean;
  className?: string;
}

export const TelemetryMetricCard: React.FC<TelemetryMetricCardProps> = ({
  runId = '1042',
  refreshRate = '144Hz',
  latencyMs = '142.4',
  isVerified = true,
  className = '',
}) => {
  return (
    <div
      className={`relative p-5 rounded-lg bg-[#12171F] border border-white/10 text-white font-sans overflow-hidden ${className}`}
    >
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <StimulusReticle size={18} state="idle" />
          <span className="font-mono text-xs tracking-wider text-[#7E808C] uppercase">
            PULSE <span className="text-white/20">//</span> RUN #{runId} · {refreshRate}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#00F0FF]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
          <span>TELEMETRY SYNC</span>
        </div>
      </div>

      {/* Main Measurement Readout & Curve Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end pt-5 pb-4">
        <div>
          <div className="font-mono text-[11px] text-[#7E808C] uppercase tracking-wider mb-1">
            Active Reaction Time
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl sm:text-5xl font-bold font-mono tracking-tight text-[#F8FAFC]">
              {latencyMs}
            </span>
            <span className="text-lg font-mono text-[#00F0FF] font-medium">ms</span>
          </div>
        </div>

        {/* Gaussian Latency Normal Distribution Curve */}
        <div className="h-16 w-full flex items-end">
          <svg viewBox="0 0 160 60" fill="none" className="w-full h-full">
            <defs>
              <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Filled Bell Curve */}
            <path
              d="M 10 55 C 45 55, 65 52, 80 12 C 95 52, 115 55, 150 55 Z"
              fill="url(#curveGradient)"
            />
            {/* Curve Line */}
            <path
              d="M 10 55 C 45 55, 65 52, 80 12 C 95 52, 115 55, 150 55"
              stroke="#00F0FF"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            {/* Median Stimulus Line */}
            <line
              x1="80"
              y1="12"
              x2="80"
              y2="55"
              stroke="#00F0FF"
              strokeWidth="1"
              strokeDasharray="2 2"
              strokeOpacity="0.5"
            />
            <circle cx="80" cy="12" r="2.5" fill="#00F0FF" />
          </svg>
        </div>
      </div>

      {/* Card Footer with Provenance Attestation */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
        <ProvenanceBadge verified={isVerified} />
        <span className="font-mono text-[10px] text-[#7E808C]">Δt = 0.00ms offset</span>
      </div>
    </div>
  );
};
