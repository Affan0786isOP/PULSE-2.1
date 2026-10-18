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
    <div className="bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD] text-[#090D1A] font-sans min-h-[100dvh] w-full overflow-x-hidden flex flex-col selection:bg-[#0066FF]/20">
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
            className="cursor-pointer select-none font-heading font-bold text-sm tracking-tight text-[#090D1A]"
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
            className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 text-slate-600 hover:text-[#090D1A] active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-2xs flex items-center justify-center"
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
                    : 'bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 active:bg-slate-100 shadow-2xs'
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
          className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-5 shadow-[0_4px_20px_rgba(0,102,255,0.03)] flex-1 min-w-0 flex flex-col"
        >
          {loading ? (
            <div className="py-2" role="status" aria-live="polite" aria-label="Loading leaderboard">
              <SkeletonTable rows={6} cols={3} />
            </div>
          ) : error ? (
            <div role="alert" className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mb-3 shadow-2xs">
                <AlertCircle size={20} />
              </div>
              <h3 className="text-sm font-bold text-[#090D1A] mb-1">
                Unable to Load Leaderboard
              </h3>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <button
                type="button"
                onClick={() => fetchLeaderboard()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Retry</span>
              </button>
            </div>
          ) : displayedEntries.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4 my-auto">
              <div className="w-11 h-11 rounded-2xl bg-[#EAF5FF] border border-[#D0E7FF] flex items-center justify-center text-[#0066FF] mb-3 shadow-2xs">
                <Inbox size={20} />
              </div>
              <h3 className="text-sm font-bold text-[#090D1A] mb-1">
                No telemetry recorded
              </h3>
              <p className="text-xs text-slate-500 mb-5 px-2">
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
              <div className="grid grid-cols-12 items-center text-[10.5px] font-mono font-bold text-slate-400 uppercase tracking-wider pb-2.5 px-2 border-b border-slate-100">
                <span className="col-span-2">Rank</span>
                <span className="col-span-6">Name</span>
                <span className="col-span-4 text-right">Score</span>
              </div>

              {/* Rows — completely uniform without special user accents */}
              <div className="divide-y divide-slate-100 font-sans">
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
                      className="grid grid-cols-12 items-center py-3 px-2 hover:bg-slate-50/70 transition-colors rounded-lg"
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
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : rank === 3
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : 'text-slate-500 font-mono text-[12px]'
                          }`}
                        >
                          {rank <= 3 ? <Award size={13} /> : rank}
                        </span>
                      </div>

                      {/* Name & optional meta */}
                      <div className="col-span-6 flex flex-col justify-center min-w-0 pr-2">
                        <span className="font-semibold text-xs sm:text-[13.5px] text-[#090D1A] truncate">
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
                        <span className="text-sm font-bold text-[#090D1A] tabular-nums">
                          {formattedScore}
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-medium">
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

