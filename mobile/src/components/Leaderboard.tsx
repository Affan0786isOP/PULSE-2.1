import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './Navbar';
import { getLeaderboardResults, LeaderboardEntry, AssessmentType, isOptedInLeaderboardUser } from '../lib/firestore';
import { Award, Zap, Compass, Palette, Grid, Hash, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Play, Inbox } from 'lucide-react';
import { triggerHaptic } from '../lib/settingsStore';
import { SkeletonTable } from './ui/Skeleton';
import { SEO } from './SEO';

const PROTOCOLS: { id: AssessmentType; route: string; name: string; shortName: string; icon: React.ElementType; unit: string }[] = [
  { id: 'visual-reaction', route: 'reaction-test', name: 'VISUAL REACTION', shortName: 'Reaction', icon: Zap, unit: 'ms' },
  { id: 'direction', route: 'direction-test', name: 'DIRECTION', shortName: 'Direction', icon: Compass, unit: 'ms' },
  { id: 'color-recognition', route: 'colour-recognition', name: 'COLOUR RECOGNITION', shortName: 'Colour', icon: Palette, unit: 'ms' },
  { id: 'block-memory', route: 'block-memory', name: 'BLOCK MEMORY', shortName: 'Block Mem', icon: Grid, unit: 'Blocks' },
  { id: 'number-memory', route: 'number-memory', name: 'NUMBER MEMORY', shortName: 'Number Mem', icon: Hash, unit: 'Digits' },
];

function formatLeaderboardScore(score: number, unit: string, allScores: number[]): string {
  if (unit !== 'ms') {
    return String(score);
  }
  return score.toFixed(2);
}

export function Leaderboard({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [selectedProtocol, setSelectedProtocol] = useState<AssessmentType>('visual-reaction');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeFetchIdRef = useRef(0);

  const fetchLeaderboard = useCallback(async (protocolToFetch?: AssessmentType) => {
    const targetProtocol = protocolToFetch || selectedProtocol;
    const fetchId = ++activeFetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const data = await getLeaderboardResults(targetProtocol);
      // Guard against out-of-order resolution if user switched tabs
      if (fetchId !== activeFetchIdRef.current) return;
      const valid = (Array.isArray(data) ? data : []).filter(e => isOptedInLeaderboardUser(e?.displayName));
      setEntries(valid);
    } catch (err: any) {
      if (fetchId !== activeFetchIdRef.current) return;
      console.error("Leaderboard fetch error:", err);
      setEntries([]);
      setError(
        err?.message ||
        "Cloud leaderboard could not be reached."
      );
    } finally {
      if (fetchId === activeFetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [selectedProtocol]);

  useEffect(() => {
    fetchLeaderboard(selectedProtocol);
    return () => {
      // Invalidate on protocol unmount or re-render
      activeFetchIdRef.current++;
    };
  }, [selectedProtocol, fetchLeaderboard]);

  const currentIndex = PROTOCOLS.findIndex(p => p.id === selectedProtocol);
  const currentProto = PROTOCOLS[currentIndex] || PROTOCOLS[0];
  const CurrentIcon = currentProto.icon;
  const displayedEntries = useMemo(() => entries.filter(e => isOptedInLeaderboardUser(e?.displayName)), [entries]);
  const allScores = useMemo(() => displayedEntries.map(e => e.scoreMetric), [displayedEntries]);

  const handlePrevProtocol = () => {
    triggerHaptic('tap');
    const prevIdx = (currentIndex - 1 + PROTOCOLS.length) % PROTOCOLS.length;
    setSelectedProtocol(PROTOCOLS[prevIdx].id);
  };

  const handleNextProtocol = () => {
    triggerHaptic('tap');
    const nextIdx = (currentIndex + 1) % PROTOCOLS.length;
    setSelectedProtocol(PROTOCOLS[nextIdx].id);
  };

  return (
    <div className="bg-transparent text-[var(--text-main)] font-sans h-full max-h-full w-full overflow-hidden flex flex-col selection:bg-cyan-500/30">
      <SEO 
        title="Verified Leaderboard & Cohort Rankings | PULSE Mobile"
        description="Compare your cognitive performance results against our global anonymous cohort rankings in real-time."
      />
      <Navbar 
        currentView="leaderboard" 
        onNavigate={onNavigate} 
        onBack={() => onNavigate('home')} 
        title="PUBLIC LEADERBOARD"
        rightContent={
          <button type="button"
            id="mobile-leaderboard-refresh-btn"
            onClick={() => fetchLeaderboard()}
            disabled={loading}
            aria-label="Refresh Leaderboard"
            title="Refresh Leaderboard"
            className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--cyan-primary)] hover:border-[var(--cyan-primary)] active:scale-95 transition-colors transition-transform transition-opacity cursor-pointer disabled:opacity-50 shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-[var(--cyan-primary)]' : ''} />
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col pb-12 pb-safe">
        {/* Game Navigation Selector with Left & Right Arrows */}
        <div 
          className="flex items-center justify-between gap-2 mb-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-1.5 shadow-sm"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') handlePrevProtocol();
            if (e.key === 'ArrowRight') handleNextProtocol();
          }}
          tabIndex={0}
          aria-label="Protocol Selector"
        >
          <button type="button"
            id="mobile-leaderboard-prev-btn"
            onClick={handlePrevProtocol}
            aria-label="Previous Protocol"
            title="Previous Protocol"
            className="w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] border border-[var(--border-subtle)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] transition-colors transition-transform transition-opacity cursor-pointer shrink-0"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex flex-col items-center justify-center min-w-0 px-2 select-none">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentProto.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <CurrentIcon size={15} className="text-[var(--cyan-primary)] shrink-0" />
                <span className="font-heading font-black text-xs sm:text-sm text-[var(--cyan-primary)] uppercase tracking-wider truncate">
                  {currentProto.name}
                </span>
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center gap-1 mt-1.5 py-1" role="tablist" aria-label="Protocols">
              {PROTOCOLS.map((p) => (
                <button type="button"
                  key={p.id}
                  onClick={() => {
                    triggerHaptic('tap');
                    setSelectedProtocol(p.id);
                  }}
                  aria-label={`Select ${p.name}`}
                  title={p.name}
                  role="tab"
                  aria-selected={p.id === selectedProtocol}
                  className={`h-2.5 rounded-full transition-colors transition-transform transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] ${
                    p.id === selectedProtocol 
                      ? 'w-5 bg-[var(--cyan-primary)]' 
                      : 'w-2 bg-[var(--border-strong)] hover:bg-[var(--text-muted)]'
                  }`}
                />
              ))}
            </div>
          </div>

          <button type="button"
            id="mobile-leaderboard-next-btn"
            onClick={handleNextProtocol}
            aria-label="Next Protocol"
            title="Next Protocol"
            className="w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] border border-[var(--border-subtle)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] transition-colors transition-transform transition-opacity cursor-pointer shrink-0"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Leaderboard Entries List — Clean, Decluttered & 100% Mobile Fitting */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 sm:p-4 backdrop-blur-xl flex-1 min-w-0">
          {loading ? (
            <div className="py-2">
              <SkeletonTable rows={6} cols={3} />
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
                <AlertCircle size={20} />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-main)] mb-1">
                Unable to Load Leaderboard
              </h3>
              <p className="text-xs font-mono text-[var(--text-muted)] mb-4">{error}</p>
              <button
                type="button"
                onClick={() => fetchLeaderboard()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-[var(--cyan-primary)] text-xs font-mono text-[var(--text-main)] transition-colors cursor-pointer min-h-[38px]"
              >
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
            </div>
          ) : displayedEntries.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--cyan-primary)] mb-3">
                <Inbox size={20} />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                No public rankings yet for {currentProto?.name || 'this test'}.
              </p>
              <button
                type="button"
                onClick={() => onNavigate(currentProto.route)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--cyan-primary)] text-black font-bold text-xs uppercase tracking-wider transition-colors transition-transform transition-opacity shadow-sm active:scale-95 cursor-pointer min-h-[40px]"
              >
                <Play size={13} className="fill-black" />
                <span>Take Test</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col">
              {/* Header labels */}
              <div className="grid grid-cols-12 items-center text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider pb-2 px-2 border-b border-[var(--border-subtle)]">
                <span className="col-span-2">Rank</span>
                <span className="col-span-6">Name</span>
                <span className="col-span-4 text-right">Score</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[var(--border-subtle)] font-mono">
                {displayedEntries.map((entry, idx) => {
                  const rank = idx + 1;
                  const unit = currentProto?.unit || '';
                  const formattedScore = formatLeaderboardScore(entry.scoreMetric, unit, allScores);

                  return (
                    <motion.div
                      key={entry.id ? `${entry.id}-${idx}` : `entry-${idx}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: Math.min(idx * 0.025, 0.25) }}
                      className="grid grid-cols-12 items-center py-2.5 px-2 hover:bg-[var(--bg-card-hover)] transition-colors rounded-lg"
                    >
                      {/* Rank badge */}
                      <div className="col-span-2 flex items-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold ${
                            rank === 1
                              ? 'bg-amber-400/20 text-amber-500 dark:text-amber-300 border border-amber-400/40'
                              : rank === 2
                              ? 'bg-slate-300/20 text-slate-600 dark:text-slate-200 border border-slate-300/40'
                              : rank === 3
                              ? 'bg-amber-700/20 text-amber-700 dark:text-amber-500 border border-amber-700/40'
                              : 'text-[var(--text-muted)] bg-[var(--bg-panel)] border border-[var(--border-subtle)]'
                          }`}
                        >
                          {rank <= 3 ? <Award size={13} /> : rank}
                        </span>
                      </div>

                      {/* Name & optional meta */}
                      <div className="col-span-6 flex flex-col justify-center min-w-0 pr-2">
                        <span className="font-bold text-xs sm:text-sm text-[var(--text-main)] truncate">
                          {entry.displayName || 'Anonymous'}
                        </span>
                        {entry.ageGroup && (
                          <span className="text-[9px] text-[var(--text-muted)] font-normal truncate">
                            Age {entry.ageGroup}
                          </span>
                        )}
                      </div>

                      {/* Score metric */}
                      <div className="col-span-4 flex items-baseline justify-end gap-1 text-right">
                        <span className="text-sm font-bold text-[var(--cyan-primary)]">
                          {formattedScore}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-normal">
                          {unit}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

