import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { getLeaderboardResults, LeaderboardEntry, AssessmentType, isOptedInLeaderboardUser } from '../lib/firestore';
import { Trophy, Award, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Play, Inbox } from 'lucide-react';
import { SkeletonTable } from './ui/Skeleton';
import { SEO } from './SEO';
import { AssessmentIcon } from './brand/AssessmentIcon';

const PROTOCOLS: { id: AssessmentType; route: string; name: string; unit: string }[] = [
  { id: 'visual-reaction', route: 'reaction-test', name: 'VISUAL REACTION', unit: 'ms' },
  { id: 'direction', route: 'direction-test', name: 'DIRECTION', unit: 'ms' },
  { id: 'color-recognition', route: 'colour-recognition', name: 'COLOUR RECOGNITION', unit: 'ms' },
  { id: 'block-memory', route: 'block-memory', name: 'BLOCK MEMORY', unit: 'Blocks' },
  { id: 'number-memory', route: 'number-memory', name: 'NUMBER MEMORY', unit: 'Digits' },
];

function formatLeaderboardScore(score: number, unit: string): string {
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
      activeFetchIdRef.current++;
    };
  }, [selectedProtocol, fetchLeaderboard]);

  const currentIndex = PROTOCOLS.findIndex(p => p.id === selectedProtocol);
  const currentProto = PROTOCOLS[currentIndex] || PROTOCOLS[0];
  const displayedEntries = useMemo(() => entries.filter(e => isOptedInLeaderboardUser(e?.displayName)), [entries]);

  const handlePrevProtocol = () => {
    const prevIdx = (currentIndex - 1 + PROTOCOLS.length) % PROTOCOLS.length;
    setSelectedProtocol(PROTOCOLS[prevIdx].id);
  };

  const handleNextProtocol = () => {
    const nextIdx = (currentIndex + 1) % PROTOCOLS.length;
    setSelectedProtocol(PROTOCOLS[nextIdx].id);
  };

  return (
    <div className="bg-[var(--bg-base)] text-[var(--text-primary)] font-sans min-h-[100dvh] w-full flex flex-col selection:bg-[var(--accent-subtle)]">
      <SEO 
        title="Verified Leaderboard & Cohort Rankings | PULSE"
        description="Compare your cognitive performance results against our global anonymous cohort rankings in real-time."
      />
      <Navbar currentView="leaderboard" onNavigate={onNavigate} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col">
        {/* Header Section */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
                <Trophy size={20} />
              </div>
              <h1 className="font-heading font-bold text-2xl md:text-3xl text-[var(--text-primary)] tracking-tight">
                Global Cohort Leaderboard
              </h1>
            </div>
            <p className="text-[var(--text-secondary)] text-xs sm:text-sm max-w-xl leading-relaxed">
              Standardized public telemetry rankings. Real-time millisecond benchmarks segmented by assessment battery.
            </p>
          </div>
          <button 
            type="button"
            id="leaderboard-refresh-btn"
            onClick={() => fetchLeaderboard()}
            disabled={loading}
            aria-label="Refresh Leaderboard"
            title="Refresh Leaderboard Data"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] transition-all cursor-pointer disabled:opacity-50 self-start md:self-auto"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[var(--accent)]' : ''} />
            <span className="font-mono text-xs uppercase tracking-wider font-medium">Sync Data</span>
          </button>
        </header>

        {/* Protocol Selector Tabs */}
        <div 
          className="flex items-center justify-between gap-3 mb-6 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-2 sm:p-2.5"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') handlePrevProtocol();
            if (e.key === 'ArrowRight') handleNextProtocol();
          }}
          tabIndex={0}
          aria-label="Protocol Selector - Use arrow keys to cycle between assessment batteries"
        >
          <button 
            type="button"
            id="leaderboard-prev-btn"
            onClick={handlePrevProtocol}
            aria-label="Previous Protocol"
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] transition-all cursor-pointer shrink-0"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex flex-col items-center justify-center min-w-0 px-2 sm:px-4 select-none">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentProto.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 sm:gap-2.5"
              >
                <AssessmentIcon protocol={currentProto.id} size={20} className="shrink-0" />
                <span className="font-heading font-bold text-sm sm:text-base text-[var(--text-primary)] tracking-wide uppercase truncate">
                  {currentProto.name}
                </span>
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-2" role="tablist" aria-label="Protocols">
              {PROTOCOLS.map((p) => (
                <button 
                  type="button"
                  key={p.id}
                  onClick={() => setSelectedProtocol(p.id)}
                  aria-label={`Select ${p.name}`}
                  role="tab"
                  aria-selected={p.id === selectedProtocol}
                  className={`h-1.5 sm:h-2 rounded-full transition-all cursor-pointer active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                    p.id === selectedProtocol 
                      ? 'w-7 sm:w-8 bg-[var(--accent)]' 
                      : 'w-2 sm:w-2.5 bg-[var(--border-strong)] hover:bg-[var(--text-muted)]'
                  }`}
                />
              ))}
            </div>
          </div>

          <button 
            type="button"
            id="leaderboard-next-btn"
            onClick={handleNextProtocol}
            aria-label="Next Protocol"
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] transition-all cursor-pointer shrink-0"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Leaderboard Table Slot */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 sm:p-6 flex-1 flex flex-col">
          {loading ? (
            <div className="py-6">
              <SkeletonTable rows={7} cols={5} />
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                Unable to Load Telemetry
              </h3>
              <p className="text-xs font-mono text-[var(--text-secondary)] mb-5">
                {error}
              </p>
              <button
                type="button"
                onClick={() => fetchLeaderboard()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Try Again</span>
              </button>
            </div>
          ) : displayedEntries.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
              <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] mb-4">
                <Inbox size={22} />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                No Cohort Telemetry Recorded
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6">
                Be the first participant to complete the {currentProto.name} battery and submit your verified result to the public demographic dataset.
              </p>
              <button
                type="button"
                onClick={() => onNavigate(currentProto.route)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-slate-950 font-semibold text-xs cursor-pointer active:scale-[0.98] transition-all"
              >
                <Play size={14} className="fill-current" />
                <span>Launch {currentProto.name} Battery</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
                    <th className="py-3 px-4 w-16">Rank</th>
                    <th className="py-3 px-4">Subject Alias</th>
                    <th className="py-3 px-4">Battery</th>
                    <th className="py-3 px-4 text-right">Metric</th>
                    <th className="py-3 px-4 text-right">Cohort</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-mono text-sm">
                  {displayedEntries.map((entry, idx) => {
                    const rank = idx + 1;
                    const proto = PROTOCOLS.find(p => p.id === entry.assessmentType);
                    const unit = proto?.unit || '';
                    const formattedScore = formatLeaderboardScore(entry.scoreMetric, unit);

                    return (
                      <motion.tr 
                        key={entry.id ? `${entry.id}-${idx}` : `entry-${idx}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2) }}
                        className="hover:bg-[var(--surface-2)]/60 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                            rank === 1
                              ? 'bg-amber-400/15 text-amber-500 border border-amber-400/30'
                              : rank === 2
                              ? 'bg-slate-300/15 text-slate-300 border border-slate-300/30'
                              : rank === 3
                              ? 'bg-amber-700/15 text-amber-600 border border-amber-700/30'
                              : 'text-[var(--text-muted)]'
                          }`}>
                            {rank <= 3 ? <Award size={14} /> : `#${rank}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                          {entry.displayName}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[var(--text-muted)] uppercase">
                          {proto?.name || entry.assessmentType}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[var(--accent)] tabular-nums">
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

      <Footer />
    </div>
  );
}
