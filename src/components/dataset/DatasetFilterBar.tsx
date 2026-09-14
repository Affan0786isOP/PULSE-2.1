import React from 'react';
import { RotateCcw, SlidersHorizontal, Layers } from 'lucide-react';
import { DatasetFilters, ProtocolType, DemographicCohort, InputModality } from '../../lib/dataset/types';

interface DatasetFilterBarProps {
  filters: DatasetFilters;
  setFilters: React.Dispatch<React.SetStateAction<DatasetFilters>>;
  resetFilters: () => void;
  activeFilterCount: number;
  isFiltered: boolean;
  availableMonths: string[];
  filteredCount?: number;
  totalCount?: number;
}

const PROTOCOL_OPTIONS: { value: ProtocolType; label: string }[] = [
  { value: 'all', label: 'All Protocols' },
  { value: 'visual-reaction', label: 'Visual Reaction' },
  { value: 'direction', label: 'Direction' },
  { value: 'colour-recognition', label: 'Colour Recognition' },
  { value: 'block-memory', label: 'Block Memory' },
  { value: 'number-memory', label: 'Number Memory' },
];

const AGE_GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Age Groups' },
  { value: 'Children (8–12)', label: 'Children (8–12)' },
  { value: 'Adolescents (13–17)', label: 'Adolescents (13–17)' },
  { value: 'Young adults (18–25)', label: 'Young adults (18–25)' },
  { value: 'Adults (26–40)', label: 'Adults (26–40)' },
  { value: 'Middle-aged adults (41–60)', label: 'Middle-aged adults (41–60)' },
  { value: 'Older adults (61–75)', label: 'Older adults (61–75)' },
  { value: 'Seniors (76+)', label: 'Seniors (76+)' },
];

const DEVICE_OPTIONS: { value: 'all' | 'desktop' | 'mobile' | 'unknown'; label: string }[] = [
  { value: 'all', label: 'All Devices' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'unknown', label: 'Unknown Device' },
];

const MODALITY_OPTIONS: { value: InputModality; label: string }[] = [
  { value: 'all', label: 'All Modalities' },
  { value: 'touch', label: 'Touch' },
  { value: 'mouse', label: 'Mouse' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'unknown', label: 'Unknown Modality' },
];

const REFRESH_RATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Refresh Rates' },
  { value: '60', label: '60 Hz' },
  { value: '120', label: '120 Hz' },
  { value: '144plus', label: '144+ Hz' },
];

export function DatasetFilterBar({
  filters,
  setFilters,
  resetFilters,
  activeFilterCount,
  isFiltered,
  availableMonths,
  filteredCount,
  totalCount
}: DatasetFilterBarProps) {
  const handleProtocolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, assessmentType: e.target.value as ProtocolType }));
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, ageGroup: e.target.value as DemographicCohort }));
  };

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, deviceCategory: e.target.value as 'all' | 'desktop' | 'mobile' | 'unknown' }));
  };

  const handleModalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, inputModality: e.target.value as InputModality }));
  };

  const handleRefreshChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, refreshRate: e.target.value }));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({
      ...prev,
      completedAtMonth: e.target.value,
      temporalBucket: e.target.value
    }));
  };

  const selectBaseClass =
    "w-full px-2.5 py-1.5 rounded-xl bg-[var(--bg-panel)] border text-xs font-mono transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)]";

  const getSelectStyle = (isActive: boolean) =>
    isActive
      ? `${selectBaseClass} border-[var(--cyan-primary)]/60 text-[var(--cyan-primary)] bg-[var(--cyan-primary)]/[0.04] font-semibold`
      : `${selectBaseClass} border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[var(--text-main)]`;

  return (
    <div
      className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3.5 sm:p-4 mb-6 backdrop-blur-xl"
      role="region"
      aria-label="Dataset Global Filter Controls"
    >
      {/* Filter Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[var(--cyan-badge-bg)] border border-[var(--cyan-badge-border)] flex items-center justify-center text-[var(--cyan-primary)] shrink-0">
            <SlidersHorizontal size={14} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-xs uppercase tracking-wider text-[var(--text-main)]">
              Filters
            </span>
            {activeFilterCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--cyan-badge-bg)] text-[var(--cyan-primary)] border border-[var(--cyan-badge-border)] animate-pulse">
                {activeFilterCount} Active
              </span>
            ) : (
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                (Global)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {typeof filteredCount === 'number' && typeof totalCount === 'number' && isFiltered && (
            <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1.5">
              <Layers size={12} className="text-[var(--cyan-primary)]" />
              <span>
                Matching: <strong className="text-[var(--text-main)]">{filteredCount.toLocaleString()}</strong> / {totalCount.toLocaleString()}
              </span>
            </div>
          )}

          {isFiltered && (
            <button
              type="button"
              id="dataset-reset-filters-btn"
              onClick={resetFilters}
              aria-label="Reset all active filters"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] border border-[var(--border-subtle)] hover:border-[var(--cyan-primary)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {/* 1. Protocol / Assessment Filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-protocol" className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] truncate">
            Protocol
          </label>
          <select
            id="filter-protocol"
            aria-label="Filter by Assessment Protocol"
            value={filters.assessmentType}
            onChange={handleProtocolChange}
            className={getSelectStyle(filters.assessmentType !== 'all')}
          >
            {PROTOCOL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[var(--bg-card)] text-[var(--text-main)]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Age Group Filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-age-group" className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] truncate">
            Age Cohort
          </label>
          <select
            id="filter-age-group"
            aria-label="Filter by Age Cohort"
            value={filters.ageGroup}
            onChange={handleAgeChange}
            className={getSelectStyle(filters.ageGroup !== 'all')}
          >
            {AGE_GROUP_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[var(--bg-card)] text-[var(--text-main)]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Device Category Filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-device" className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] truncate">
            Device
          </label>
          <select
            id="filter-device"
            aria-label="Filter by Device Category"
            value={filters.deviceCategory || 'all'}
            onChange={handleDeviceChange}
            className={getSelectStyle(Boolean(filters.deviceCategory) && filters.deviceCategory !== 'all')}
          >
            {DEVICE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[var(--bg-card)] text-[var(--text-main)]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Input Modality Filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-modality" className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] truncate">
            Input Modality
          </label>
          <select
            id="filter-modality"
            aria-label="Filter by Input Modality"
            value={filters.inputModality}
            onChange={handleModalityChange}
            className={getSelectStyle(filters.inputModality !== 'all')}
          >
            {MODALITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[var(--bg-card)] text-[var(--text-main)]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Refresh Rate Filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-refresh-rate" className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] truncate">
            Refresh Rate
          </label>
          <select
            id="filter-refresh-rate"
            aria-label="Filter by Display Refresh Rate"
            value={filters.refreshRate || 'all'}
            onChange={handleRefreshChange}
            className={getSelectStyle(Boolean(filters.refreshRate) && filters.refreshRate !== 'all')}
          >
            {REFRESH_RATE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[var(--bg-card)] text-[var(--text-main)]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 6. Temporal / Month Filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-month" className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] truncate">
            Month
          </label>
          <select
            id="filter-month"
            aria-label="Filter by Completion Month"
            value={filters.completedAtMonth || 'all'}
            onChange={handleMonthChange}
            className={getSelectStyle(Boolean(filters.completedAtMonth) && filters.completedAtMonth !== 'all')}
          >
            <option value="all" className="bg-[var(--bg-card)] text-[var(--text-main)]">
              All Time
            </option>
            {availableMonths.map(month => (
              <option key={month} value={month} className="bg-[var(--bg-card)] text-[var(--text-main)]">
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
