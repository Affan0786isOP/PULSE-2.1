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

function formatRelativeTime(date: Date | null): string {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'Updated just now';
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return 'Updated 1m ago';
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'Updated 1h ago';
  return `Updated ${hours}h ago`;
}

export function Leaderboard({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProtocol = PROTOCOLS.find(p => p.id === searchParams.get('assessmentType'))?.id || 'visual-reaction';
  const [selectedProtocol, setSelectedProtocol] = useState<AssessmentType>(initialProtocol);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setRelativeTick] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeFetchIdRef = useRef(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

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

  const triggerToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Keep "Updated just now / Xm ago" relative time actively updating
  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => {
      setRelativeTick(t => t + 1);
    }, 10_000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

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

  const fetchLeaderboard = useCallback(async (protocolToFetch?: AssessmentType, options?: { bypassCache?: boolean }) => {
    const targetProtocol = protocolToFetch || selectedProtocol;
    const fetchId = ++activeFetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const data = options ? await getLeaderboardResults(targetProtocol, options) : await getLeaderboardResults(targetProtocol);
      // Guard against out-of-order resolution if user switched tabs
      if (fetchId !== activeFetchIdRef.current) return;
      const valid = (Array.isArray(data) ? data : []).filter(e => isOptedInLeaderboardUser(e?.displayName));
      setEntries(valid);
      setLastUpdated((data as any).fetchedAt || new Date());
      if ((data as any).warning) {
        setError((data as any).warning);
      }
    } catch (err: any) {
      if (fetchId !== activeFetchIdRef.current) return;
      console.error("Leaderboard fetch error:", err);
      // N3: If working entries already exist, do NOT wipe them on error or 429
      setEntries(prev => (prev.length > 0 ? prev : []));
      const is429 = err?.status === 429 || String(err?.message || '').includes('Too many');
      setError(
        is429
          ? "Too many refresh requests. Showing latest standings — please try again shortly."
          : (err?.message || "Cloud leaderboard could not be reached.")
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

  const handleManualRefresh = async () => {
    triggerHaptic('tap');
    await fetchLeaderboard(undefined, { bypassCache: true });
    triggerToast('Leaderboard updated • just now');
  };

  return (
    <div className="bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD] dark:from-[#0B0D10] dark:via-[#0B0D10] dark:to-[#0B0D10] text-[#090D1A] dark:text-[#F5F7FA] font-sans min-h-[100dvh] w-full overflow-x-hidden flex flex-col selection:bg-[#0066FF]/20">
      <SEO />
      <Navbar 
        currentView="leaderboard" 
        onNavigate={onNavigate} 
        onBack={() => onNavigate('home')} 
        title={
          <button
            type="button"
            onClick={handleTitleTap}
            className="font-heading font-bold text-sm tracking-tight text-[#090D1A] dark:text-[#F5F7FA] truncate bg-transparent border-none p-0 cursor-pointer select-none text-left"
          >
            LEADERBOARD
          </button>
        }
        rightContent={
          <button type="button"
            id="mobile-leaderboard-refresh-btn"
            onClick={handleManualRefresh}
            disabled={loading}
            aria-label="Refresh Leaderboard"
            title="Refresh Leaderboard"
            className="w-8 h-8 rounded-lg bg-white dark:bg-[#181D23] border border-slate-200/90 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#090D1A] dark:hover:text-white active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-2xs flex items-center justify-center shrink-0"
          >
            <RefreshCw size={15} strokeWidth={2.2} className={loading ? 'animate-spin text-[#0066FF]' : ''} />
          </button>
        }
      />

      <main className="flex-1 w-full max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
        {/* Horizontal Protocol Pill Tab Bar */}
        <div 
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-0.5 mb-3.5 shrink-0"
          role="tablist"
          aria-label="Protocol Selector - Use arrow keys to cycle between assessment batteries"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              handlePrevProtocol();
            }
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              handleNextProtocol();
            }
            if (e.key === 'Home') {
              e.preventDefault();
              selectProtocol(PROTOCOLS[0].id);
            }
            if (e.key === 'End') {
              e.preventDefault();
              selectProtocol(PROTOCOLS[PROTOCOLS.length - 1].id);
            }
          }}
        >
          {PROTOCOLS.map((p) => {
            const isSelected = p.id === selectedProtocol;
            return (
              <button
                type="button"
                key={p.id}
                id={`leaderboard-tab-${p.id}`}
                role="tab"
                aria-label={`Select ${p.name.toUpperCase()}`}
                aria-controls="leaderboard-panel"
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => {
                  triggerHaptic('tap');
                  selectProtocol(p.id);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
                  isSelected
                    ? 'bg-[#0066FF] text-white shadow-sm shadow-[#0066FF]/25'
                    : 'bg-white dark:bg-[#181D23] border border-slate-200/90 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white active:bg-slate-100 dark:active:bg-[#20262E] shadow-2xs'
                }`}
              >
                <img src={p.logo} alt="" className={`w-3.5 h-3.5 object-contain shrink-0 ${isSelected ? 'brightness-200 contrast-200' : ''}`} />
                <span>{p.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Leaderboard Table Card */}
        <div 
          id="leaderboard-panel" 
          role="tabpanel" 
          aria-labelledby={`leaderboard-tab-${selectedProtocol}`} 
          aria-busy={loading} 
          className="bg-white dark:bg-[#12161B] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-[0_4px_20px_rgba(0,102,255,0.03)] flex-1 min-w-0 flex flex-col"
        >
          {loading ? (
            <div className="py-2" role="status" aria-live="polite" aria-label="Loading leaderboard">
              <SkeletonTable rows={6} cols={3} />
            </div>
          ) : error ? (
            <div role="alert" className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-500 mb-3 shadow-2xs">
                <AlertCircle size={20} />
              </div>
              <h3 className="text-sm font-bold text-[#090D1A] dark:text-[#F5F7FA] mb-1">
                Unable to Load Leaderboard
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{error}</p>
              <button
                type="button"
                onClick={() => fetchLeaderboard()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-medium transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
            </div>
          ) : displayedEntries.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4 my-auto">
              <div className="w-11 h-11 rounded-2xl bg-[#EAF5FF] dark:bg-[#181D23] border border-[#D0E7FF] dark:border-slate-700 flex items-center justify-center text-[#0066FF] dark:text-[#22C7D6] mb-3 shadow-2xs">
                <Inbox size={20} />
              </div>
              <h3 className="text-sm font-bold text-[#090D1A] dark:text-[#F5F7FA] mb-1">
                No telemetry recorded
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 px-2">
                Be the first to complete the {currentProto?.name || 'test'} battery and submit your verified result.
              </p>
              <button
                type="button"
                onClick={() => onNavigate(currentProto.route)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-xs transition-all shadow-[0_2px_8px_rgba(0,102,255,0.25)] active:scale-95 cursor-pointer"
              >
                <Play size={13} className="fill-white" />
                <span>Take Test</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col">
              {/* Header labels */}
              <div className="grid grid-cols-12 items-center text-[10.5px] font-mono font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider pb-2.5 px-2 border-b border-slate-100 dark:border-slate-800">
                <span className="col-span-2">Rank</span>
                <span className="col-span-6">Name</span>
                <span className="col-span-4 text-right">Score</span>
              </div>

              {/* Rows — completely uniform without special user accents */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {displayedEntries.map((entry, idx) => {
                  const unit = PROTOCOLS.find(p => p.id === entry.assessmentType)?.unit || '';
                  const formattedScore = formatLeaderboardScore(entry.scoreMetric, unit);
                  const rank = getDisplayedLeaderboardRank(displayedEntries, entry);

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.2) }}
                      className="grid grid-cols-12 items-center py-3 px-2 hover:bg-slate-50/70 dark:hover:bg-[#181D23]/70 transition-colors rounded-lg"
                    >
                      {/* Rank badge */}
                      <div className="col-span-2 flex items-center">
                        <span
                          role="img"
                          aria-label={`Rank ${rank}`}
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold ${
                            rank === 1
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : rank === 2
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                              : rank === 3
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : 'text-slate-500 dark:text-slate-400 font-mono text-[12px]'
                          }`}
                        >
                          {rank <= 3 ? <Award size={13} /> : rank}
                        </span>
                      </div>

                      {/* Name & optional meta */}
                      <div className="col-span-6 flex flex-col justify-center min-w-0 pr-2">
                        <span className="font-semibold text-xs sm:text-[13.5px] text-[#090D1A] dark:text-[#F5F7FA] truncate">
                          {entry.displayName || 'Anonymous'}
                        </span>
                        {entry.ageGroup && (
                          <span className="text-[10px] text-slate-400 font-normal truncate">
                            {entry.ageGroup}
                          </span>
                        )}
                      </div>

                      {/* Score metric */}
                      <div className="col-span-4 flex items-baseline justify-end gap-1 text-right">
                        <span className="text-sm font-bold text-[#090D1A] dark:text-[#F5F7FA] tabular-nums">
                          {formattedScore}
                        </span>
                        <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
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

      {/* Auto-Dismiss Floating Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
            className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-white/95 dark:bg-[#181D23]/95 border border-slate-200/90 dark:border-slate-700 text-[#090D1A] dark:text-[#F5F7FA] text-xs font-mono font-semibold shadow-lg shadow-black/10 dark:shadow-black/50 backdrop-blur-md flex items-center gap-2 pointer-events-none whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

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

