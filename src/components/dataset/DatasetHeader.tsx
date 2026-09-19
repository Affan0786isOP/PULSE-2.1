import React from 'react';
import { RefreshCw, Database, Layers } from 'lucide-react';

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
  onRefresh,
}: DatasetHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-4">
      <div>
        <h1 className="text-xl font-heading font-bold text-[var(--text-primary)]">
          PULSE Research Dataset
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Public, anonymized cognitive and chronometric trial records
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 font-mono text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <Layers size={14} className="text-[var(--accent)]" />
            <span>
              <strong className="text-[var(--text-primary)]">{totalObservations.toLocaleString()}</strong> trials
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database size={14} className="text-[var(--accent)]" />
            <span>
              <strong className="text-[var(--text-primary)]">{totalSessions.toLocaleString()}</strong> sessions
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh dataset"
          className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
}
