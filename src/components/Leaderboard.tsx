import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './Navbar';
import { getLeaderboardResults, LeaderboardEntry, AssessmentType, isOptedInLeaderboardUser } from '../lib/firestore';
import { Trophy, Award, Zap, Compass, Palette, Grid, Hash, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Play, Inbox } from 'lucide-react';
import { SkeletonTable } from './ui/Skeleton';
import { SEO } from './SEO';

const PROTOCOLS: { id: AssessmentType; route: string; name: string; icon: React.ElementType; unit: string }[] = [
  { id: 'visual-reaction', route: 'reaction-test', name: 'VISUAL REACTION', icon: Zap, unit: 'ms' },
  { id: 'direction', route: 'direction-test', name: 'DIRECTION', icon: Compass, unit: 'ms' },
  { id: 'color-recognition', route: 'colour-recognition', name: 'COLOUR RECOGNITION', icon: Palette, unit: 'ms' },
  { id: 'block-memory', route: 'block-memory', name: 'BLOCK MEMORY', icon: Grid, unit: 'Blocks' },
  { id: 'number-memory', route: 'number-memory', name: 'NUMBER MEMORY', icon: Hash, unit: 'Digits' },
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
        "Cloud leaderboard could not be reached. Please verify your connection."
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
    const prevIdx = (currentIndex - 1 + PROTOCOLS.length) % PROTOCOLS.length;
    setSelectedProtocol(PROTOCOLS[prevIdx].id);
  };

  const handleNextProtocol = () => {
    const nextIdx = (currentIndex + 1) % PROTOCOLS.length;
    setSelectedProtocol(PROTOCOLS[nextIdx].id);
  };

  return (
    <div className="bg-transparent text-[var(--text-main)] font-sans min-h-[100dvh] w-full flex flex-col selection:bg-cyan-500/30">
      <SEO 
        title="Verified Leaderboard & Cohort Rankings | PULSE"
        description="Compare your cognitive performance results against our global anonymous cohort rankings in real-time."
      />
      <Navbar currentView="leaderboard" onNavigate={onNavigate} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--cyan-badge-bg)] border border-[var(--cyan-badge-border)] flex items-center justify-center text-[var(--cyan-primary)]">
                <Trophy size={22} />
              </div>
              <h1 className="font-heading font-black text-2xl md:text-3xl text-[var(--text-main)] tracking-wide uppercase">
                PUBLIC LEADERBOARD
              </h1>
            </div>
            <p className="text-[var(--text-secondary)] text-sm max-w-xl">
              Global public rankings for PULSE reaction speed and memory tests.
            </p>
          </div>
          <button type="button"
            id="leaderboard-refresh-btn"
            onClick={() => fetchLeaderboard()}
            disabled={loading}
            aria-label="Refresh Leaderboard"
            title="Refresh Leaderboard Data"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--cyan-primary)] hover:border-[var(--cyan-primary)] active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] transition-colors cursor-pointer disabled:opacity-50 self-start md:self-auto"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[var(--cyan-primary)]' : ''} />
            <span className="font-mono text-xs uppercase tracking-wider">Refresh</span>
          </button>
        </div>

        {/* Protocol Selector with Left & Right Arrows */}
        <div 
          className="flex items-center justify-between gap-4 mb-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-2.5"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') handlePrevProtocol();
            if (e.key === 'ArrowRight') handleNextProtocol();
          }}
          tabIndex={0}
          aria-label="Protocol Selector - Use left and right arrow keys to switch"
        >
          <button type="button"
            id="leaderboard-prev-btn"
            onClick={handlePrevProtocol}
            aria-label="Previous Protocol"
            title="Previous Protocol (Left Arrow)"
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
            <div className="flex items-center gap-2 mt-2" role="tablist" aria-label="Protocols">
              {PROTOCOLS.map((p) => (
                <button type="button"
                  key={p.id}
                  onClick={() => setSelectedProtocol(p.id)}
                  aria-label={`Select ${p.name}`}
                  title={p.name}
                  role="tab"
                  aria-selected={p.id === selectedProtocol}
                  className={`h-2.5 rounded-full transition-[background-color,transform] cursor-pointer active:scale-90 focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] ${
                    p.id === selectedProtocol 
                      ? 'w-6 bg-[var(--cyan-primary)]' 
                      : 'w-2.5 bg-[var(--border-strong)] hover:bg-[var(--text-muted)]'
                  }`}
                />
              ))}
            </div>
          </div>

          <button type="button"
            id="leaderboard-next-btn"
            onClick={handleNextProtocol}
            aria-label="Next Protocol"
            title="Next Protocol (Right Arrow)"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] border border-[var(--border-subtle)] active:scale-95 focus-visible:ring-2 focus-visible:ring-[var(--cyan-primary)] transition-colors cursor-pointer shrink-0"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Leaderboard Table / Content */}
        <div className="pulse-card rounded-lg p-4 sm:p-6 flex-1">
          {loading ? (
            <div className="py-4">
              <SkeletonTable rows={7} cols={5} />
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-main)] mb-1">
                Unable to Load Leaderboard
              </h3>
              <p className="text-xs font-mono text-[var(--text-muted)] mb-5">
                {error}
              </p>
              <button
                type="button"
                onClick={() => fetchLeaderboard()}
                className="pulse-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-xs font-mono transition-colors cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Try Again</span>
              </button>
            </div>
          ) : displayedEntries.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--cyan-primary)] mb-4">
                <Inbox size={24} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-main)] mb-1">
                No Scores Submitted Yet
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-5">
                Be the first participant to complete the {currentProto.name} assessment and publish your score to the global demographic ranking!
              </p>
              <button
                type="button"
                onClick={() => onNavigate(currentProto.route)}
                className="pulse-btn-primary cursor-pointer text-xs font-semibold"
              >
                <Play size={14} className="fill-current" />
                <span>Take {currentProto.name} Test</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
                    <th className="py-3 px-4 w-16">Rank</th>
                    <th className="py-3 px-4">Display Name</th>
                    <th className="py-3 px-4">Protocol</th>
                    <th className="py-3 px-4 text-right">Performance</th>
                    <th className="py-3 px-4 text-right">Age Group</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-sm">
                  {displayedEntries.map((entry, idx) => {
                    const rank = idx + 1;
                    const proto = PROTOCOLS.find(p => p.id === entry.assessmentType);
                    const unit = proto?.unit || '';
                    const formattedScore = formatLeaderboardScore(entry.scoreMetric, unit, allScores);

                    return (
                      <motion.tr 
                        key={entry.id ? `${entry.id}-${idx}` : `entry-${idx}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                        className="hover:bg-[var(--bg-card-hover)] transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                            rank === 1
                              ? 'bg-amber-400/20 text-amber-600 dark:text-amber-300 border border-amber-400/40'
                              : rank === 2
                              ? 'bg-slate-300/20 text-slate-700 dark:text-slate-200 border border-slate-300/40'
                              : rank === 3
                              ? 'bg-amber-700/20 text-amber-800 dark:text-amber-500 border border-amber-700/40'
                              : 'text-[var(--text-muted)]'
                          }`}>
                            {rank <= 3 ? <Award size={14} /> : `#${rank}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[var(--text-main)]">
                          {entry.displayName}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[var(--text-muted)] uppercase">
                          {proto?.name || entry.assessmentType}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[var(--accent)] pulse-tabular">
                          {formattedScore} <span className="text-xs text-[var(--text-muted)] font-normal">{unit}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-[var(--text-muted)]">
                          {entry.ageGroup}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

