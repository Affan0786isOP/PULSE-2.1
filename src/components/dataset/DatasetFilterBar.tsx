import React from 'react';
import { Filter, X } from 'lucide-react';
import { DatasetFilters } from '../../lib/dataset/types';

interface DatasetFilterBarProps {
  filters: DatasetFilters;
  setFilters: React.Dispatch<React.SetStateAction<DatasetFilters>>;
  resetFilters: () => void;
  activeFilterCount: number;
  isFiltered: boolean;
  availableMonths?: string[];
  filteredCount: number;
  totalCount: number;
}

export function DatasetFilterBar({
  filters,
  setFilters,
  resetFilters,
  activeFilterCount,
  isFiltered,
  filteredCount,
  totalCount,
}: DatasetFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-3">
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-[var(--accent)]" />
        <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">Filters:</span>

        <select
          value={filters.assessmentType || 'all'}
          onChange={(e) => setFilters((prev) => ({ ...prev, assessmentType: e.target.value }))}
          className="bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1 text-xs font-mono text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-1)] cursor-pointer"
        >
          <option value="all">All Protocols</option>
          <option value="visual-reaction">Visual Reaction</option>
          <option value="direction">Direction</option>
          <option value="colour-recognition">Colour Recognition</option>
          <option value="block-memory">Block Memory</option>
          <option value="number-memory">Number Memory</option>
        </select>

        {isFiltered && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs font-mono text-[var(--danger)] hover:opacity-90 active:scale-95 active:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] rounded-xs ml-1 cursor-pointer transition-[opacity,transform]"
          >
            <X size={12} />
            <span>Reset ({activeFilterCount})</span>
          </button>
        )}
      </div>

      <div className="text-xs font-mono text-[var(--text-muted)]">
        Showing <strong className="text-[var(--text-primary)]">{filteredCount.toLocaleString()}</strong> of{' '}
        {totalCount.toLocaleString()}
      </div>
    </div>
  );
}
