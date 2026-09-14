import React from 'react';
import { Database, RefreshCw, Layers } from 'lucide-react';

interface DatasetHeaderProps {
  loading: boolean;
  totalObservations: number;
  totalSessions: number;
  onRefresh: () => void;
}

export function DatasetHeader({
  loading,
  totalObservations,
  totalSessions,
  onRefresh
}: DatasetHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[var(--cyan-badge-bg)] border border-[var(--cyan-badge-border)] flex items-center justify-center text-[var(--cyan-primary)] shrink-0">
          <Database size={18} />
        </div>
        <div>
          <h1 className="font-heading font-black text-lg sm:text-xl text-[var(--text-main)] tracking-wide uppercase">
            DATASET
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {totalObservations > 0 && !loading && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)]">
            <Layers size={12} className="text-[var(--cyan-primary)]" />
            <span>
              <strong className="text-[var(--text-main)]">{totalObservations.toLocaleString()}</strong> trials
              {' · '}
              <strong className="text-[var(--text-main)]">{totalSessions.toLocaleString()}</strong> sessions
            </span>
          </div>
        )}

        <button
          type="button"
          id="dataset-refresh-btn"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh Dataset"
          title="Refresh Dataset"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--cyan-primary)] hover:border-[var(--cyan-primary)] active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] transition-colors cursor-pointer disabled:opacity-50 text-xs font-mono"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-[var(--cyan-primary)]' : ''} />
          <span className="uppercase tracking-wider">Refresh</span>
        </button>
      </div>
    </div>
  );
}
