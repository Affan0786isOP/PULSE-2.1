import React from 'react';
import { Navbar } from './Navbar';
import { SEO } from './SEO';
import { useDatasetPipeline } from '../lib/dataset';
import { DatasetHeader } from './dataset/DatasetHeader';
import { DatasetContentSlot } from './dataset/DatasetContentSlot';
import { SkeletonTable } from './ui/Skeleton';
import { AlertCircle, RefreshCw, Database, Play, ChevronLeft, ChevronRight, Zap, Compass, Palette, Grid, Hash, Table } from 'lucide-react';
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

  const handlePrevProtocol = () => {
    const prevIdx = (currentIndex - 1 + PROTOCOLS.length) % PROTOCOLS.length;
    setActiveAssessment(PROTOCOLS[prevIdx].id);
    if (datasetMode !== 'assessment') {
      setDatasetMode('assessment');
    }
  };

  const handleNextProtocol = () => {
    const nextIdx = (currentIndex + 1) % PROTOCOLS.length;
    setActiveAssessment(PROTOCOLS[nextIdx].id);
    if (datasetMode !== 'assessment') {
      setDatasetMode('assessment');
    }
  };

  const validSectionObservations = sectionObservations.filter(o => o.isValid);
  const isSectionEmpty = !loading && !error && !isEmptyDataset && 
    (datasetMode === 'data-explorer' ? sectionObservations.length === 0 : validSectionObservations.length === 0);

  return (
    <div className="bg-transparent text-[var(--text-main)] font-sans min-h-[100dvh] w-full flex flex-col selection:bg-cyan-500/30">
      <SEO
        title="Dataset & Data Explorer | PULSE"
        description="Explore anonymized reaction time and cognitive performance data from the global PULSE dataset."
      />
      <Navbar currentView="dataset" onNavigate={onNavigate} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-5 flex flex-col gap-3">
        {/* Dataset Header */}
        <DatasetHeader
          loading={loading}
          totalObservations={totalObservationsCount}
          totalSessions={totalSessionsCount}
          onRefresh={refresh}
        />

        {/* Dense Research Toolbar: Protocol Tabs + Explorer Mode Switch */}
        {!loading && !error && !isEmptyDataset && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-1.5">
            {/* Protocol Tabs */}
            <div 
              className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5"
              role="tablist"
              aria-label="Assessment Protocols"
            >
              <button
                type="button"
                id="dataset-prev-btn"
                onClick={handlePrevProtocol}
                aria-label="Previous Assessment"
                title="Previous Assessment (Left Arrow)"
                className="w-7 h-7 flex sm:hidden items-center justify-center rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] border border-[var(--border-subtle)] active:scale-95 shrink-0"
              >
                <ChevronLeft size={14} />
              </button>

              {PROTOCOLS.map((p) => {
                const Icon = p.icon;
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
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[var(--cyan-primary)] text-black font-bold shadow-sm'
                        : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-panel-hover)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    <Icon size={13} className={isActive ? 'text-black' : 'text-[var(--cyan-primary)]'} />
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
                className="w-7 h-7 flex sm:hidden items-center justify-center rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] border border-[var(--border-subtle)] active:scale-95 shrink-0"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Mode Toggle: Charts vs Raw Data Explorer */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setDatasetMode('data-explorer')}
                aria-label="Open Data Explorer"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  datasetMode === 'data-explorer'
                    ? 'bg-[var(--cyan-primary)] text-black font-bold shadow-sm'
                    : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-panel-hover)] border border-[var(--border-subtle)]'
                }`}
              >
                <Table size={13} className={datasetMode === 'data-explorer' ? 'text-black' : 'text-[var(--cyan-primary)]'} />
                <span>Raw Data Explorer</span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          /* Loading State: Skeletons matching Leaderboard */
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-5 backdrop-blur-xl">
            <SkeletonTable rows={7} cols={5} />
          </div>
        ) : error ? (
          /* Error State */
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 backdrop-blur-xl flex-1 flex flex-col items-center justify-center">
            <div className="py-10 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
                <AlertCircle size={20} />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-main)] mb-1">
                Unable to Load Dataset
              </h3>
              <p className="text-xs font-mono text-[var(--text-muted)] mb-4">
                {error}
              </p>
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] border border-[var(--border-subtle)] hover:border-[var(--cyan-primary)] text-xs font-mono text-[var(--text-main)] transition-colors cursor-pointer active:scale-95"
              >
                <RefreshCw size={13} />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        ) : isEmptyDataset ? (
          /* Empty State */
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 backdrop-blur-xl flex-1 flex flex-col items-center justify-center">
            <div className="py-10 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--cyan-primary)] mb-3">
                <Database size={20} />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-main)] mb-1">
                No Data Recorded Yet
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                No test data has been recorded yet. Complete an assessment to record the first results.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('assessments')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--cyan-primary)] hover:opacity-90 text-black font-bold text-xs uppercase tracking-wider transition-opacity active:scale-95 cursor-pointer"
              >
                <Play size={13} className="fill-black" />
                <span>Start an Assessment</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Populated Dataset View */
          <>
            {isSectionEmpty ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6 backdrop-blur-xl flex-1 flex flex-col items-center justify-center">
                <div className="py-10 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-amber-400 mb-3">
                    <Database size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-main)] mb-1">
                    No Data Available
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    No valid data available for this section yet.
                  </p>
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
          </>
        )}
      </main>
    </div>
  );
}

