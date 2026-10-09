import React, { useEffect } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { SEO } from './SEO';
import { useDatasetPipeline } from '../lib/dataset';
import { DatasetHeader } from './dataset/DatasetHeader';
import { DatasetFilterBar } from './dataset/DatasetFilterBar';
import { DatasetContentSlot } from './dataset/DatasetContentSlot';
import { SkeletonTable } from './ui/Skeleton';
import { AlertCircle, RefreshCw, Database, Play, ChevronLeft, ChevronRight, Table, RotateCcw } from 'lucide-react';
import { AssessmentId } from '../lib/dataset/types';
import { normalizeProtocolType } from '../lib/dataset/normalization';
import { AssessmentIcon } from './brand/AssessmentIcon';

const PROTOCOLS: { id: AssessmentId; name: string; unit: string }[] = [
  { id: 'visual-reaction', name: 'VISUAL REACTION', unit: 'ms' },
  { id: 'direction', name: 'DIRECTION', unit: 'ms' },
  { id: 'colour-recognition', name: 'COLOUR RECOGNITION', unit: 'ms' },
  { id: 'block-memory', name: 'BLOCK MEMORY', unit: 'Blocks' },
  { id: 'number-memory', name: 'NUMBER MEMORY', unit: 'Digits' },
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

  // Keep protocol tab and protocol filter in harmony
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
    <div className="bg-[var(--bg-base)] text-[var(--text-primary)] font-sans min-h-[100dvh] w-full flex flex-col selection:bg-[var(--accent-subtle)]">
      <SEO title="Dataset Coming Soon | PULSE" description="The public PULSE research dataset is being prepared for release." noindex />
      <Navbar currentView="dataset" onNavigate={onNavigate} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-4">
        {/* Dataset Header */}
        <DatasetHeader
          loading={loading}
          totalObservations={totalObservationsCount}
          totalSessions={totalSessionsCount}
          onRefresh={refresh}
        />

        {/* Global Filter Bar - rendered in Raw Data Explorer mode */}
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

        {/* Research Toolbar: Protocol Tabs + Mode Switch */}
        {!loading && !error && !isEmptyDataset && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-2 sm:p-2.5">
            {/* Protocol Tabs */}
            <div 
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
              role="tablist"
              aria-label="Assessment Protocols"
            >
              <button
                type="button"
                id="dataset-prev-btn"
                onClick={handlePrevProtocol}
                aria-label="Previous Assessment"
                title="Previous Assessment (Left Arrow)"
                className="w-7 h-7 flex sm:hidden items-center justify-center rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] active:scale-95 shrink-0"
              >
                <ChevronLeft size={14} />
              </button>

              {PROTOCOLS.map((p) => {
                const isActive = datasetMode === 'assessment' && p.id === activeAssessment;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => {
                      setActiveAssessment(p.id);
                      if (datasetMode !== 'assessment') {
                        setDatasetMode('assessment');
                      }
                    }}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Select ${p.name}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                      isActive
                        ? 'bg-[var(--accent)] text-slate-950 font-bold shadow-sm'
                        : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    <AssessmentIcon protocol={p.id} size={14} primaryColor={isActive ? '#020617' : '#00F0FF'} secondaryColor={isActive ? '#0f172a' : '#F8FAFC'} />
                    <span>{p.name}</span>
                  </button>
                );
              })}

              <button
                type="button"
                id="dataset-next-btn"
                onClick={handleNextProtocol}
                aria-label="Next Assessment"
                title="Next Assessment (Right Arrow)"
                className="w-7 h-7 flex sm:hidden items-center justify-center rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] active:scale-95 shrink-0"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Mode Toggle: Charts vs Raw Data Explorer */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setDatasetMode(datasetMode === 'data-explorer' ? 'assessment' : 'data-explorer')}
                aria-label={datasetMode === 'data-explorer' ? 'Return to Visualization' : 'Open Raw Data Explorer'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                  datasetMode === 'data-explorer'
                    ? 'bg-[var(--accent)] text-slate-950 font-bold shadow-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)]'
                }`}
              >
                <Table size={13} className={datasetMode === 'data-explorer' ? 'text-slate-950' : 'text-[var(--accent)]'} />
                <span>{datasetMode === 'data-explorer' ? 'Protocol Charts' : 'Raw Data Explorer'}</span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-6">
            <SkeletonTable rows={7} cols={5} />
          </div>
        ) : error ? (
          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-8 flex-1 flex flex-col items-center justify-center">
            <div className="py-10 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                Unable to Load Telemetry Dataset
              </h3>
              <p className="text-xs font-mono text-[var(--text-secondary)] mb-5">
                {error}
              </p>
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--accent)] text-xs font-mono text-[var(--text-primary)] transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw size={14} />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        ) : isEmptyDataset ? (
          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-8 flex-1 flex flex-col items-center justify-center">
            <div className="py-12 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] mb-4">
                <Database size={22} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                No Telemetry Recorded Yet
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed">
                The global research dataset is currently unpopulated. Complete an assessment protocol to register the inaugural verified benchmark.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('assessments')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-slate-950 font-semibold text-xs cursor-pointer active:scale-95 transition-all"
              >
                <Play size={14} className="fill-current" />
                <span>Begin Assessment</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {isSectionEmpty ? (
              <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-8 flex-1 flex flex-col items-center justify-center">
                <div className="py-10 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-amber-400 mb-4">
                    <Database size={22} />
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                    No Matching Observations
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-5">
                    {isFiltered
                      ? "Active cohort or hardware filters exclude all records for this assessment protocol."
                      : "No valid telemetry observations recorded for this section yet."}
                  </p>
                  {isFiltered && (
                    <button
                      type="button"
                      id="dataset-empty-reset-filters-btn"
                      onClick={resetFilters}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--accent)] text-xs font-mono text-[var(--text-primary)] transition-all cursor-pointer active:scale-95"
                    >
                      <RotateCcw size={14} />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <DatasetContentSlot
                activeAssessment={activeAssessment}
                datasetMode={datasetMode}
                sectionObservations={sectionObservations}
              />
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
