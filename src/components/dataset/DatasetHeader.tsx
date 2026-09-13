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
    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[var(--cyan-badge-bg)] border border-[var(--cyan-badge-border)] flex items-center justify-center text-[var(--cyan-primary)]">
            <Database size={22} />
          </div>
          <div>
            <h1 className="font-heading font-black text-2xl md:text-3xl text-[var(--text-main)] tracking-wide uppercase">
              OPEN RESEARCH DATASET
            </h1>
          </div>
        </div>
        <p className="text-[var(--text-secondary)] text-sm max-w-2xl leading-relaxed">
          Anonymized, standardized population observations and trial telemetry collected across PULSE cognitive protocols for research and normative baselines.
        </p>
      </div>

      <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
        {totalObservations > 0 && !loading && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)]">
            <Layers size={13} className="text-[var(--cyan-primary)]" />
            <span>
              <strong className="text-[var(--text-main)]">{totalObservations.toLocaleString()}</strong> obs
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
          title="Refresh Research Dataset"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--cyan-primary)] hover:border-[var(--cyan-primary)] active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-[var(--cyan-primary)]' : ''} />
          <span className="font-mono text-xs uppercase tracking-wider">Refresh</span>
        </button>
      </div>
    </div>
  );
}
