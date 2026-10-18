import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './Navbar';
import { getLeaderboardResults, LeaderboardEntry, AssessmentType, isOptedInLeaderboardUser } from '../lib/firestore';
import { Award, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Play, Inbox } from 'lucide-react';
import { triggerHaptic } from '../lib/settingsStore';
import { SkeletonTable } from './ui/Skeleton';
import { SEO } from './SEO';
import { getDisplayedLeaderboardRank } from '../../../shared/domain/leaderboardRanking';
import { AdminPasscodeModal } from '../../../src/components/admin/AdminPasscodeModal';
const PROTOCOLS: { id: AssessmentType; route: string; name: string; shortName: string; unit: string; logo: string }[] = [
  { id: 'visual-reaction', route: 'reaction-test', name: 'VISUAL REACTION', shortName: 'Reaction', unit: 'ms', logo: '/brand/assessments/visual-reaction.png' },
  { id: 'direction', route: 'direction-test', name: 'DIRECTION', shortName: 'Direction', unit: 'ms', logo: '/brand/assessments/directional-choice.png' },
  { id: 'color-recognition', route: 'colour-recognition', name: 'COLOUR RECOGNITION', shortName: 'Colour', unit: 'ms', logo: '/brand/assessments/colour-recognition.png' },
  { id: 'block-memory', route: 'block-memory', name: 'BLOCK MEMORY', shortName: 'Block Mem', unit: 'Blocks', logo: '/brand/assessments/block-memory.png' },
  { id: 'number-memory', route: 'number-memory', name: 'NUMBER MEMORY', shortName: 'Number Mem', unit: 'Digits', logo: '/brand/assessments/number-memory.png' },
];

function formatLeaderboardScore(score: number, unit: string): string {
  if (unit !== 'ms') {
    return String(score);
  }
  return score.toFixed(2);
}

export function Leaderboard({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProtocol = PROTOCOLS.find(p => p.id === searchParams.get('assessmentType'))?.id || 'visual-reaction';
  const [selectedProtocol, setSelectedProtocol] = useState<AssessmentType>(initialProtocol);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const activeFetchIdRef = useRef(0);

  const handleTitleTap = () => {
    const now = Date.now();
    if (now - lastTapTimeRef.current > 3000) {
      tapCountRef.current = 1;
    } else {
      tapCountRef.current += 1;
    }
    lastTapTimeRef.current = now;

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      triggerHaptic('tap');
      setShowAdminModal(true);
    }
  };

  useEffect(() => {
    const fromUrl = PROTOCOLS.find(p => p.id === searchParams.get('assessmentType'))?.id;
    if (!fromUrl) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('assessmentType', selectedProtocol);
      setSearchParams(nextParams, { replace: true });
    } else if (fromUrl !== selectedProtocol) {
      setEntries([]);
      setSelectedProtocol(fromUrl);
    }
  }, [searchParams, selectedProtocol, setSearchParams]);

  const selectProtocol = useCallback((protocol: AssessmentType) => {
    setEntries([]);
    setSelectedProtocol(protocol);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('assessmentType', protocol);
    setSearchParams(nextParams);
  }, [searchParams, setSearchParams]);

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
  const displayedEntries = useMemo(() => entries.filter(e => isOptedInLeaderboardUser(e?.displayName)), [entries]);

  const handlePrevProtocol = () => {
    triggerHaptic('tap');
    const prevIdx = (currentIndex - 1 + PROTOCOLS.length) % PROTOCOLS.length;
    selectProtocol(PROTOCOLS[prevIdx].id);
  };

  const handleNextProtocol = () => {
    triggerHaptic('tap');
    const nextIdx = (currentIndex + 1) % PROTOCOLS.length;
    selectProtocol(PROTOCOLS[nextIdx].id);
  };

  return (
    <div className="bg-transparent text-[var(--text-main)] font-sans min-h-[100dvh] w-full overflow-x-hidden flex flex-col selection:bg-cyan-500/30">
      <SEO 
        title="Verified Leaderboard & Cohort Rankings | PULSE"
        description="Compare participant-selected leaderboard aliases against age-cohort results across five cognitive assessments."
      />
      <Navbar 
        currentView="leaderboard" 
        onNavigate={onNavigate} 
        onBack={() => onNavigate('home')} 
        title={
          <span
            onClick={handleTitleTap}
            role="button"
            tabIndex={0}
            className="cursor-pointer select-none"
          >
            LEADERBOARD
          </span>
        }
        rightContent={
          <button type="button"
            id="mobile-leaderboard-refresh-btn"
            onClick={() => fetchLeaderboard()}
            disabled={loading}
            aria-label="Refresh Leaderboard"
            title="Refresh Leaderboard"
            className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--cyan-primary)] hover:border-[var(--cyan-primary)] active:scale-95 transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-50 shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-[var(--cyan-primary)]' : ''} />
          </button>
        }
      />

      <main className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
        {/* Game Navigation Selector with Left & Right Arrows */}
        <div 
          className="flex items-center justify-between gap-2 mb-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-1.5 shadow-sm max-[340px]:gap-0.5 max-[340px]:p-1"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              const nextIndex = (currentIndex - 1 + PROTOCOLS.length) % PROTOCOLS.length;
              handlePrevProtocol();
              document.getElementById(`leaderboard-tab-${PROTOCOLS[nextIndex].id}`)?.focus();
            }
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              const nextIndex = (currentIndex + 1) % PROTOCOLS.length;
              handleNextProtocol();
              document.getElementById(`leaderboard-tab-${PROTOCOLS[nextIndex].id}`)?.focus();
            }
            if (e.key === 'Home' || e.key === 'End') {
              e.preventDefault();
              const targetIndex = e.key === 'Home' ? 0 : PROTOCOLS.length - 1;
              selectProtocol(PROTOCOLS[targetIndex].id);
              document.getElementById(`leaderboard-tab-${PROTOCOLS[targetIndex].id}`)?.focus();
            }
          }}
          tabIndex={0}
          aria-label="Protocol Selector"
        >
          <button type="button"
            id="mobile-leaderboard-prev-btn"
            onClick={handlePrevProtocol}
            aria-label="Previous Protocol"
            title="Previous Protocol"
            className="w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] border border-[var(--border-subtle)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] transition-[color,background-color,border-color,opacity,transform] cursor-pointer shrink-0 max-[340px]:hidden"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex flex-col items-center justify-center min-w-0 px-2 select-none max-[340px]:flex-1 max-[340px]:px-0">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentProto.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 min-w-0 max-w-full"
              >
                <img src={currentProto.logo} alt={currentProto.name} className="w-5 h-5 object-contain shrink-0" />
                <span className="font-heading font-black text-xs sm:text-sm text-[var(--cyan-primary)] uppercase tracking-wider min-w-0 max-w-full truncate">
                  {currentProto.name}
                </span>
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center justify-center gap-1 mt-1.5 py-1 max-[340px]:gap-0" role="tablist" aria-label="Protocols">
              {PROTOCOLS.map((p) => (
                <button type="button"
                  key={p.id}
                  onClick={() => {
                    triggerHaptic('tap');
                    selectProtocol(p.id);
                  }}
                  aria-label={`Select ${p.name}`}
                  title={p.name}
                  id={`leaderboard-tab-${p.id}`}
                  role="tab"
                  aria-controls="leaderboard-panel"
                  tabIndex={p.id === selectedProtocol ? 0 : -1}
                  aria-selected={p.id === selectedProtocol}
                  className="min-w-[32px] min-h-[44px] flex items-center justify-center rounded-md bg-transparent p-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] max-[340px]:w-11 max-[340px]:min-w-[44px]">
                  <span aria-hidden="true" className={`block rounded-full transition-[color,background-color,transform] ${p.id === selectedProtocol ? 'h-2.5 w-5 bg-[var(--cyan-primary)]' : 'h-2.5 w-2 bg-[var(--border-strong)] hover:bg-[var(--text-muted)]'}`}/>
                </button>
              ))}
            </div>
          </div>

          <button type="button"
            id="mobile-leaderboard-next-btn"
            onClick={handleNextProtocol}
            aria-label="Next Protocol"
            title="Next Protocol"
            className="w-11 h-11 flex items-center justify-center rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] border border-[var(--border-subtle)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] transition-[color,background-color,border-color,opacity,transform] cursor-pointer shrink-0 max-[340px]:hidden"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Leaderboard Entries List — Clean, Decluttered & Full-Width Mobile Fitting */}
        <div id="leaderboard-panel" role="tabpanel" aria-labelledby={`leaderboard-tab-${selectedProtocol}`} aria-busy={loading} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 sm:p-4 backdrop-blur-xl flex-1 min-w-0">
          {loading ? (
            <div className="py-2" role="status" aria-live="polite" aria-label="Loading leaderboard">
              <SkeletonTable rows={6} cols={3} />
            </div>
          ) : error ? (
            <div role="alert" className="py-12 flex flex-col items-center justify-center text-center px-4">
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
              <h3 className="text-sm font-bold text-[var(--text-main)] mb-1">
                No telemetry recorded
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4 px-2">
                Be the first to complete the {currentProto?.name || 'test'} battery and submit your result.
              </p>
              <button
                type="button"
                onClick={() => onNavigate(currentProto.route)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--cyan-primary)] text-black font-bold text-xs uppercase tracking-wider transition-[color,background-color,border-color,opacity,transform] shadow-sm active:scale-95 cursor-pointer min-h-[40px]"
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
                  const unit = PROTOCOLS.find(p => p.id === entry.assessmentType)?.unit || '';
                  const formattedScore = formatLeaderboardScore(entry.scoreMetric, unit);
                  const rank = getDisplayedLeaderboardRank(displayedEntries, entry);

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: Math.min(idx * 0.025, 0.25) }}
                      className="grid grid-cols-12 items-center py-2.5 px-2 hover:bg-[var(--bg-card-hover)] transition-colors rounded-lg"
                    >
                      {/* Rank badge */}
                      <div className="col-span-2 flex items-center">
                        <span
                          role="img"
                          aria-label={`Rank ${rank}`}
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
                            {entry.ageGroup}
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

      <AdminPasscodeModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onSuccess={() => {
          setShowAdminModal(false);
          window.location.assign('/admin');
        }}
      />
    </div>
  );
}

