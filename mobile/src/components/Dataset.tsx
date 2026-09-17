import React, { useEffect } from 'react';
import { Navbar } from './Navbar';
import { SEO } from './SEO';
import { useDatasetPipeline } from '../../../src/lib/dataset';
import { DatasetHeader } from '../../../src/components/dataset/DatasetHeader';
import { DatasetFilterBar } from '../../../src/components/dataset/DatasetFilterBar';
import { DatasetContentSlot } from '../../../src/components/dataset/DatasetContentSlot';
import { AlertCircle, RefreshCw, Database, ChevronLeft, ChevronRight, Zap, Compass, Palette, Grid, Hash } from 'lucide-react';
import { AssessmentId } from '../../../src/lib/dataset/types';
import { normalizeProtocolType } from '../../../src/lib/dataset/normalization';

const PROTOCOLS: { id: AssessmentId; name: string; icon: React.ElementType; unit: string }[] = [
  { id: 'visual-reaction', name: 'VISUAL REACTION', icon: Zap, unit: 'ms' },
  { id: 'direction', name: 'DIRECTION', icon: Compass, unit: 'ms' },
  { id: 'colour-recognition', name: 'COLOUR RECOGNITION', icon: Palette, unit: 'ms' },
  { id: 'block-memory', name: 'BLOCK MEMORY', icon: Grid, unit: 'Blocks' },
  { id: 'number-memory', name: 'NUMBER MEMORY', icon: Hash, unit: 'Digits' },
];

interface DatasetProps {
  onNavigate: (view: string) => void;
}

export function Dataset({ onNavigate }: DatasetProps) {
  const pipeline = useDatasetPipeline('visual-reaction');
  const {
    totalObservationsCount,
    totalSessionsCount,
    filteredObservationsCount,
    activeAssessment,
    setActiveAssessment,
    datasetMode,
    setDatasetMode,
    sectionObservations,
    loading,
    error,
    isEmptyDataset,
    refresh,
    filters,
    setFilters,
    resetFilters,
    activeFilterCount,
    isFiltered,
    availableMonths
  } = pipeline;

  const currentIndex = PROTOCOLS.findIndex(p => p.id === activeAssessment);

  const handlePrevProtocol = () => {
    const prevIdx = (currentIndex - 1 + PROTOCOLS.length) % PROTOCOLS.length;
    const targetId = PROTOCOLS[prevIdx].id;
    setActiveAssessment(targetId);
    if (filters.assessmentType !== 'all' && normalizeProtocolType(filters.assessmentType) !== normalizeProtocolType(targetId)) {
      setFilters(prev => ({ ...prev, assessmentType: 'all' }));
    }
    if (datasetMode !== 'assessment') {
      setDatasetMode('assessment');
    }
  };

  const handleNextProtocol = () => {
    const nextIdx = (currentIndex + 1) % PROTOCOLS.length;
    const targetId = PROTOCOLS[nextIdx].id;
    setActiveAssessment(targetId);
    if (filters.assessmentType !== 'all' && normalizeProtocolType(filters.assessmentType) !== normalizeProtocolType(targetId)) {
      setFilters(prev => ({ ...prev, assessmentType: 'all' }));
    }
    if (datasetMode !== 'assessment') {
      setDatasetMode('assessment');
    }
  };

  useEffect(() => {
    if (filters.assessmentType !== 'all') {
      const normalized = normalizeProtocolType(filters.assessmentType);
      const match = PROTOCOLS.find(p => normalizeProtocolType(p.id) === normalized);
      if (match && match.id !== activeAssessment) {
        setActiveAssessment(match.id);
      }
    }
  }, [filters.assessmentType, activeAssessment, setActiveAssessment]);

  const validSectionObservations = sectionObservations.filter(o => o.isValid);
  const isSectionEmpty = !loading && !error && !isEmptyDataset && 
    (datasetMode === 'data-explorer' ? sectionObservations.length === 0 : validSectionObservations.length === 0);

  return (
    <div className="bg-transparent text-[var(--text-main)] font-sans min-h-[100dvh] w-full flex flex-col selection:bg-cyan-500/30">
      <SEO
        title="Dataset & Data Explorer | PULSE Mobile"
        description="Explore anonymized reaction time and cognitive performance data from the global PULSE research dataset."
      />
      <Navbar currentView="dataset" onNavigate={onNavigate} onBack={() => onNavigate('home')} title="DATASET" />

      <main 
        className="flex-1 w-full max-w-4xl mx-auto px-3 py-4 flex flex-col gap-3 overflow-y-auto"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <DatasetHeader
          loading={loading}
          totalObservations={totalObservationsCount}
          totalSessions={totalSessionsCount}
          onRefresh={refresh}
        />

        {!loading && !error && !isEmptyDataset && datasetMode === 'data-explorer' && (
          <DatasetFilterBar
            filters={filters}
            setFilters={setFilters}
            resetFilters={resetFilters}
            activeFilterCount={activeFilterCount}
            isFiltered={isFiltered}
            availableMonths={availableMonths}
            filteredCount={filteredObservationsCount}
            totalCount={totalObservationsCount}
          />
        )}

        <div className="flex flex-col gap-2 bg-[var(--surface-1)] border border-[var(--border-subtle)] p-2 rounded-lg">
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-1 bg-[var(--surface-2)] p-0.5 rounded-md border border-[var(--border-subtle)] flex-1">
              <button
                type="button"
                onClick={() => setDatasetMode('assessment')}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer text-center ${
                  datasetMode === 'assessment'
                    ? 'bg-[var(--accent)] text-slate-950 shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Protocols
              </button>
              <button
                type="button"
                onClick={() => setDatasetMode('data-explorer')}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  datasetMode === 'data-explorer'
                    ? 'bg-[var(--accent)] text-slate-950 shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Database size={13} />
                <span>Explorer</span>
              </button>
            </div>
          </div>

          {datasetMode === 'assessment' && (
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={handlePrevProtocol}
                aria-label="Previous protocol"
                className="w-7 h-7 flex items-center justify-center rounded bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
              >
                <ChevronLeft size={14} />
              </button>

              <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 scrollbar-none flex-1 justify-center">
                {PROTOCOLS.map((p) => {
                  const Icon = p.icon;
                  const isSelected = activeAssessment === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setActiveAssessment(p.id);
                        if (filters.assessmentType !== 'all' && normalizeProtocolType(filters.assessmentType) !== normalizeProtocolType(p.id)) {
                          setFilters(prev => ({ ...prev, assessmentType: 'all' }));
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-tight flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--accent-subtle)] border border-[var(--border-default)] text-[var(--accent)]'
                          : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon size={12} />
                      <span>{p.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleNextProtocol}
                aria-label="Next protocol"
                className="w-7 h-7 flex items-center justify-center rounded bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between gap-3 text-red-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={refresh}
              className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-200 font-mono text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
            >
              <RefreshCw size={11} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {isSectionEmpty && (
          <div className="p-6 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-lg text-center flex flex-col items-center justify-center gap-2">
            <Database size={24} className="text-[var(--text-muted)]" />
            <p className="text-xs font-semibold text-[var(--text-primary)]">No Records Match Active Criteria</p>
            <p className="text-[11px] text-[var(--text-secondary)] max-w-sm">
              Adjust filters or select another assessment protocol to inspect observations.
            </p>
            {isFiltered && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 px-3 py-1 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--accent)] border border-[var(--border-subtle)] rounded text-xs font-mono cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {!error && !isSectionEmpty && (
          <div className="flex flex-col gap-3 min-w-0">
            <DatasetContentSlot
              datasetMode={datasetMode}
              activeAssessment={activeAssessment}
              loading={loading}
              sectionObservations={sectionObservations}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </main>
    </div>
  );
}
