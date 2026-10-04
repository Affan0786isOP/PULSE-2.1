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
      className={`relative p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-sans overflow-hidden ${className}`}
    >
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <StimulusReticle size={18} state="idle" />
          <span className="font-mono text-xs tracking-wider text-[var(--text-muted)] uppercase">
            PULSE <span className="opacity-40">//</span> RUN #{runId} &bull; {refreshRate}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--accent)] font-semibold">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          <span>TELEMETRY SYNC</span>
        </div>
      </div>

      {/* Main Measurement Readout & Curve Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end pt-5 pb-4">
        <div>
          <div className="font-mono text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Active Reaction Time
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl sm:text-5xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
              {latencyMs}
            </span>
            <span className="text-lg font-mono text-[var(--accent)] font-semibold">ms</span>
          </div>
        </div>

        {/* Gaussian Latency Normal Distribution Curve */}
        <div className="h-16 w-full flex items-end">
          <svg viewBox="0 0 160 60" fill="none" className="w-full h-full">
            <defs>
              <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
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
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Median Stimulus Line */}
            <line
              x1="80"
              y1="12"
              x2="80"
              y2="55"
              stroke="var(--accent)"
              strokeWidth="1"
              strokeDasharray="2 2"
              strokeOpacity="0.6"
            />
            <circle cx="80" cy="12" r="3" fill="var(--accent)" />
          </svg>
        </div>
      </div>

      {/* Card Footer with Provenance Attestation */}
      <div className="pt-3.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <ProvenanceBadge verified={isVerified} />
        <span className="font-mono text-[10px] text-[var(--text-muted)]">&Delta;t = 0.00ms offset</span>
      </div>
    </div>
  );
};
