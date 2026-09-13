import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ChartErrorStateProps {
  title?: string;
  error?: string;
  onRetry?: () => void;
  height?: number | string;
}

export function ChartErrorState({
  title = 'Visualization Calculation Anomaly',
  error = 'An unexpected calculation discrepancy prevented chart generation.',
  onRetry,
  height = 240
}: ChartErrorStateProps) {
  return (
    <div 
      className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center rounded-xl bg-[var(--danger)]/5 border border-[var(--danger)]/20"
      style={{ minHeight: height }}
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 flex items-center justify-center text-[var(--danger)] mb-3">
        <AlertTriangle size={18} />
      </div>
      <h4 className="font-mono text-xs uppercase font-bold text-[var(--danger)] mb-1 tracking-wider">
        {title}
      </h4>
      <p className="text-[11px] font-mono text-[var(--text-muted)] max-w-sm mb-4 leading-relaxed">
        {error}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white transition-colors font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer"
        >
          <RefreshCw size={11} />
          <span>Recalculate Slice</span>
        </button>
      )}
    </div>
  );
}
