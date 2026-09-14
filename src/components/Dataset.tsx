import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './Navbar';
import { SEO } from './SEO';
import { useDatasetPipeline } from '../lib/dataset';
import { DatasetHeader } from './dataset/DatasetHeader';
import { DatasetFilterBar } from './dataset/DatasetFilterBar';
import { DatasetContentSlot } from './dataset/DatasetContentSlot';
import { SkeletonTable } from './ui/Skeleton';
import { AlertCircle, RefreshCw, Database, FilterX, Play, RotateCcw, ChevronLeft, ChevronRight, Zap, Compass, Palette, Grid, Hash, Table } from 'lucide-react';
import { AssessmentId } from '../lib/dataset/types';

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
    filters,
    setFilters,
    isFiltered,
    activeFilterCount,
    resetFilters,
    availableMonths,
    activeAssessment,
    setActiveAssessment,
    datasetMode,
    setDatasetMode,
    sectionObservations,
    loading,
    error,
    isEmptyDataset,
    refresh
  } = pipeline;

  const currentIndex = PROTOCOLS.findIndex(p => p.id === activeAssessment);
  const currentProto = PROTOCOLS[currentIndex] || PROTOCOLS[0];
  const CurrentIcon = currentProto.icon;

  const handlePrevProtocol = () => {
    const prevIdx = (currentIndex - 1 + PROTOCOLS.length) % PROTOCOLS.length;
    setActiveAssessment(PROTOCOLS[prevIdx].id);
  };

  const handleNextProtocol = () => {
    const nextIdx = (currentIndex + 1) % PROTOCOLS.length;
    setActiveAssessment(PROTOCOLS[nextIdx].id);
  };

  const validSectionObservations = sectionObservations.filter(o => o.isValid);
  const isSectionEmpty = !loading && !error && !isEmptyDataset && 
    (datasetMode === 'data-explorer' ? sectionObservations.length === 0 : validSectionObservations.length === 0);

  return (
    <div className="bg-transparent text-[var(--text-main)] font-sans min-h-[100dvh] w-full flex flex-col selection:bg-cyan-500/30">
      <SEO
        title="Open Research Dataset & Telemetry Explorer | PULSE"
        description="Explore anonymized, standardized reaction latency and cognitive performance observations from the global PULSE research dataset."
      />
      <Navbar currentView="dataset" onNavigate={onNavigate} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {/* Dataset Header */}
        <DatasetHeader
          loading={loading}
          totalObservations={totalObservationsCount}
          totalSessions={totalSessionsCount}
          onRefresh={refresh}
        />

        {/* Global Dataset Filter Bar */}
        {!loading && !error && !isEmptyDataset && (
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

        {/* Protocol Selector with Left & Right Arrows (Only show if dataset is not empty/error and we are in assessment mode) */}
        {!loading && !error && !isEmptyDataset && datasetMode === 'assessment' && (
          <div 
            className="flex items-center justify-between gap-4 mb-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-2.5"
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') handlePrevProtocol();
              if (e.key === 'ArrowRight') handleNextProtocol();
            }}
            tabIndex={0}
            aria-label="Assessment Selector - Use left and right arrow keys to switch"
          >
            <button type="button"
              id="dataset-prev-btn"
              onClick={handlePrevProtocol}
              aria-label="Previous Assessment"
              title="Previous Assessment (Left Arrow)"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] border border-[var(--border-subtle)] active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] transition-colors cursor-pointer shrink-0"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex flex-col items-center justify-center min-w-0 px-4 select-none">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentProto.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2.5"
                >
                  <CurrentIcon size={18} className="text-[var(--cyan-primary)] shrink-0" />
                  <span className="font-heading font-black text-base sm:text-lg text-[var(--cyan-primary)] uppercase tracking-wider truncate">
                    {currentProto.name}
                  </span>
                </motion.div>
              </AnimatePresence>
              <div className="flex items-center gap-2 mt-2" role="tablist" aria-label="Assessments">
                {PROTOCOLS.map((p) => (
                  <button type="button"
                    key={p.id}
                    onClick={() => setActiveAssessment(p.id)}
                    aria-label={`Select ${p.name}`}
                    title={p.name}
                    role="tab"
                    aria-selected={p.id === activeAssessment}
                    className={`h-2.5 rounded-full transition-[background-color,transform] cursor-pointer active:scale-90 focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] ${
                      p.id === activeAssessment 
                        ? 'w-6 bg-[var(--cyan-primary)]' 
                        : 'w-2.5 bg-[var(--border-strong)] hover:bg-[var(--text-muted)]'
                    }`}
                  />
                ))}
              </div>
            </div>

            <button type="button"
              id="dataset-next-btn"
              onClick={handleNextProtocol}
              aria-label="Next Assessment"
              title="Next Assessment (Right Arrow)"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] border border-[var(--border-subtle)] active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] transition-colors cursor-pointer shrink-0"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {loading ? (
          /* Loading State: Skeletons matching Leaderboard */
          <div className="space-y-6">
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-6 backdrop-blur-xl">
              <SkeletonTable rows={7} cols={5} />
            </div>
          </div>
        ) : error ? (
          /* Error State: Matching Leaderboard error treatment */
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 backdrop-blur-xl flex-1 flex flex-col items-center justify-center">
            <div className="py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-main)] mb-1">
                Unable to Load Research Dataset
              </h3>
              <p className="text-xs font-mono text-[var(--text-muted)] mb-5">
                {error}
              </p>
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] border border-[var(--border-subtle)] hover:border-[var(--cyan-primary)] text-xs font-mono text-[var(--text-main)] transition-colors cursor-pointer active:scale-95"
              >
                <RefreshCw size={14} />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        ) : isEmptyDataset ? (
          /* Empty State: Entire dataset has no published observations */
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 backdrop-blur-xl flex-1 flex flex-col items-center justify-center">
            <div className="py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--cyan-primary)] mb-4">
                <Database size={24} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-main)] mb-1">
                No Research Observations In Repository
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-5 leading-relaxed">
                No standardized test observations have been published to the open research dataset yet. Complete a test protocol to record initial observations.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('assessments')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--cyan-primary)] hover:opacity-90 text-black font-bold text-xs uppercase tracking-wider transition-opacity active:scale-95 cursor-pointer"
              >
                <Play size={14} className="fill-black" />
                <span>Start an Assessment</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Populated Dataset View */
          <>
            {/* Section Content: Differentiating No-Filter-Results from Normal Content */}
            {isSectionEmpty ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 backdrop-blur-xl flex-1 flex flex-col items-center justify-center">
                <div className="py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-amber-400 mb-4">
                    <FilterX size={24} />
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-main)] mb-1">
                    {isFiltered
                      ? "No Observations Match Active Filters"
                      : "No Valid Observations Available"}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mb-5 leading-relaxed">
                    {isFiltered
                      ? `${totalObservationsCount.toLocaleString()} total observations exist, but none match the current active filters in this section.`
                      : "No valid observations match the data quality requirements for this section."}
                  </p>
                  {isFiltered && (
                    <button
                      type="button"
                      id="dataset-empty-reset-filters-btn"
                      onClick={resetFilters}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] border border-[var(--border-subtle)] hover:border-[var(--cyan-primary)] text-xs font-mono text-[var(--text-main)] transition-colors cursor-pointer active:scale-95"
                    >
                      <RotateCcw size={14} />
                      <span>Reset All Filters</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Active Section Slot */
              <DatasetContentSlot
                activeAssessment={activeAssessment}
                datasetMode={datasetMode}
                sectionObservations={sectionObservations}
              />
            )}
            
            {/* Data Explorer Secondary Entry (Only shown when not already in explorer) */}
            {datasetMode !== 'data-explorer' && (
              <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-main)] mb-1">Data Explorer</h4>
                  <p className="text-xs text-[var(--text-secondary)] max-w-md">Access raw observation telemetry, apply multi-dimensional filters, and export research data.</p>
                </div>
                <button type="button" onClick={() => setDatasetMode('data-explorer')} className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] border border-[var(--border-subtle)] hover:border-[var(--cyan-primary)] text-xs font-mono text-[var(--cyan-primary)] transition-colors cursor-pointer active:scale-95">
                  <Table size={14} />
                  <span>Open Data Explorer</span>
                </button>
              </div>
            )}
            
            {/* Return to Assessments (Only shown when in explorer) */}
            {datasetMode === 'data-explorer' && (
              <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-main)] mb-1">Return to Assessments</h4>
                  <p className="text-xs text-[var(--text-secondary)] max-w-md">View curated research statistics and visualizations per assessment protocol.</p>
                </div>
                <button type="button" onClick={() => setDatasetMode('assessment')} className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] border border-[var(--border-subtle)] hover:border-[var(--cyan-primary)] text-xs font-mono text-[var(--text-main)] transition-colors cursor-pointer active:scale-95">
                  <ChevronLeft size={14} />
                  <span>Back to Visualizations</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

