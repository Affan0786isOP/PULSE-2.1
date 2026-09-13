import React from 'react';
import { Database, Filter } from 'lucide-react';

interface ChartEmptyStateProps {
  title?: string;
  message?: string;
  onResetFilters?: () => void;
  height?: number | string;
}

export function ChartEmptyState({
  title = 'No Observational Telemetry',
  message = 'No records in the current dataset slice match this query. Try expanding the filter selection.',
  onResetFilters,
  height = 240
}: ChartEmptyStateProps) {
  return (
    <div 
      className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center rounded-xl bg-[var(--bg-panel)]/30 border border-dashed border-[var(--border-subtle)]"
      style={{ minHeight: height }}
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] mb-3">
        <Database size={18} />
      </div>
      <h4 className="font-mono text-xs uppercase font-bold text-[var(--text-secondary)] mb-1 tracking-wider">
        {title}
      </h4>
      <p className="text-[11px] font-mono text-[var(--text-muted)] max-w-sm mb-4 leading-relaxed">
        {message}
      </p>
      {onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--cyan-badge-bg)] border border-[var(--cyan-badge-border)] text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)] hover:text-black transition-colors font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer"
        >
          <Filter size={11} />
          <span>Reset Dataset Filters</span>
        </button>
      )}
    </div>
  );
}
