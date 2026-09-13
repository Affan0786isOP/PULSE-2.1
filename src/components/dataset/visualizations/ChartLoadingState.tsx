import React from 'react';

interface ChartLoadingStateProps {
  height?: number | string;
  label?: string;
}

export function ChartLoadingState({
  height = 240,
  label = 'Computing telemetry visualization...'
}: ChartLoadingStateProps) {
  return (
    <div 
      className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center rounded-xl bg-[var(--bg-panel)]/30 border border-[var(--border-subtle)]"
      style={{ minHeight: height }}
    >
      <div className="relative w-8 h-8 mb-3">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--border-default)]" />
        <div className="absolute inset-0 rounded-full border-2 border-t-[var(--cyan-primary)] animate-spin" />
      </div>
      <span className="text-[11px] font-mono text-[var(--text-muted)] animate-pulse tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}
