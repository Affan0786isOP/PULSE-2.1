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
          className="bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
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
            className="flex items-center gap-1 text-xs font-mono text-rose-400 hover:text-rose-300 ml-1 cursor-pointer"
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
