import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { PageShell } from './layout/PageShell';
import { getLeaderboardResults, LeaderboardEntry, AssessmentType, isOptedInLeaderboardUser } from '../lib/firestore';
import { Trophy, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Play, Inbox } from 'lucide-react';
import { getDisplayedLeaderboardRank } from '../../shared/domain/leaderboardRanking';
import { AdminPasscodeModal } from './admin/AdminPasscodeModal';

type ColumnKey = 'rank' | 'name' | 'time' | 'accuracy' | 'age';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  align?: 'left' | 'center' | 'right';
}

interface ProtocolDef {
  id: AssessmentType;
  canonicalId: AssessmentType;
  route: string;
  name: string;
  shortLabel: string;
  unit: string;
  logo: string;
  columns: ColumnDef[];
}

const PROTOCOLS: ProtocolDef[] = [
  {
    id: 'visual-reaction',
    canonicalId: 'visual-reaction',
    route: 'reaction-test',
    name: 'VISUAL REACTION',
    shortLabel: 'Visual Reaction',
    unit: 'ms',
    logo: '/brand/assessments/visual-reaction.png',
    columns: [
      { key: 'rank', label: 'Rank', align: 'left' },
      { key: 'name', label: 'Name', align: 'left' },
      { key: 'time', label: 'Time', align: 'right' },
      { key: 'age', label: 'Age', align: 'right' },
    ],
  },
  {
    id: 'direction',
    canonicalId: 'direction',
    route: 'direction-test',
    name: 'DIRECTION',
    shortLabel: 'Direction',
    unit: 'ms',
    logo: '/brand/assessments/directional-choice.png',
    columns: [
      { key: 'rank', label: 'Rank', align: 'left' },
      { key: 'name', label: 'Name', align: 'left' },
      { key: 'time', label: 'Time', align: 'right' },
      { key: 'accuracy', label: 'Accuracy', align: 'right' },
      { key: 'age', label: 'Age', align: 'right' },
    ],
  },
  {
    id: 'color-recognition',
    canonicalId: 'color-recognition',
    route: 'colour-recognition',
    name: 'COLOUR RECOGNITION',
    shortLabel: 'Colour Recognition',
    unit: 'ms',
    logo: '/brand/assessments/colour-recognition.png',
    columns: [
      { key: 'rank', label: 'Rank', align: 'left' },
      { key: 'name', label: 'Name', align: 'left' },
      { key: 'time', label: 'Time', align: 'right' },
      { key: 'accuracy', label: 'Accuracy', align: 'right' },
      { key: 'age', label: 'Age', align: 'right' },
    ],
  },
  {
    id: 'block-memory',
    canonicalId: 'block-memory',
    route: 'block-memory',
    name: 'BLOCK MEMORY',
    shortLabel: 'Block Memory',
    unit: 'Blocks',
    logo: '/brand/assessments/block-memory.png',
    columns: [
      { key: 'rank', label: 'Rank', align: 'left' },
      { key: 'name', label: 'Name', align: 'left' },
      { key: 'accuracy', label: 'Accuracy', align: 'right' },
      { key: 'age', label: 'Age', align: 'right' },
    ],
  },
  {
    id: 'number-memory',
    canonicalId: 'number-memory',
    route: 'number-memory',
    name: 'NUMBER MEMORY',
    shortLabel: 'Number Memory',
    unit: 'Digits',
    logo: '/brand/assessments/number-memory.png',
    columns: [
      { key: 'rank', label: 'Rank', align: 'left' },
      { key: 'name', label: 'Name', align: 'left' },
      { key: 'accuracy', label: 'Accuracy', align: 'right' },
      { key: 'age', label: 'Age', align: 'right' },
    ],
  },
];

function formatLeaderboardScore(score: number, unit: string): string {
  if (unit !== 'ms') {
    return String(score);
  }
  return score.toFixed(1);
}

const AVATAR_GRADIENTS = [
  'from-sky-400 to-blue-600',
  'from-indigo-400 to-indigo-600',
  'from-cyan-400 to-teal-600',
  'from-blue-400 to-sky-600',
  'from-violet-400 to-purple-600',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
];

function getAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || 'P').toUpperCase();
}

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Updated just now';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Last updated just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return 'Last updated 1 minute ago';
  if (minutes < 60) return `Last updated ${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'Last updated 1 hour ago';
  return `Last updated ${hours} hours ago`;
}

export function Leaderboard({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTypeParam = searchParams.get('assessmentType');

  // Handle canonical resolution and aliases like colour-recognition -> color-recognition
  const initialProtocol = useMemo(() => {
    if (!rawTypeParam) return 'visual-reaction';
    if (rawTypeParam === 'colour-recognition' || rawTypeParam === 'color-test') return 'color-recognition';
    return PROTOCOLS.find(p => p.id === rawTypeParam)?.id || 'visual-reaction';
  }, [rawTypeParam]);

  const [selectedProtocol, setSelectedProtocol] = useState<AssessmentType>(initialProtocol);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const activeFetchIdRef = useRef(0);

  // Moderator keyboard shortcut: Ctrl+Shift+A (or Cmd+Shift+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setShowAdminModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      if (fetchId !== activeFetchIdRef.current) return;
      const valid = (Array.isArray(data) ? data : []).filter(e => isOptedInLeaderboardUser(e?.displayName));
      setEntries(valid);
      setLastUpdated((data as any).fetchedAt || new Date());
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
  const currentProto = PROTOCOLS[currentIndex >= 0 ? currentIndex : 0];
  const displayedEntries = useMemo(() => entries.filter(e => isOptedInLeaderboardUser(e?.displayName)), [entries]);

  const handlePrevProtocol = () => {
    const prevIdx = (currentIndex - 1 + PROTOCOLS.length) % PROTOCOLS.length;
    selectProtocol(PROTOCOLS[prevIdx].id);
  };

  const handleNextProtocol = () => {
    const nextIdx = (currentIndex + 1) % PROTOCOLS.length;
    selectProtocol(PROTOCOLS[nextIdx].id);
  };

  return (
    <PageShell
      currentView="leaderboard"
      onNavigate={onNavigate}
      decorativeWaves="side"
      maxWidth="5xl"
      showFooter={false}
      contentClassName="pt-6 pb-16 max-w-[1040px] px-4 sm:px-6 lg:px-8"
    >
        {/* Header Section */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Trophy Icon Square Badge */}
            <div 
              aria-hidden="true"
              className="w-12 h-12 rounded-2xl bg-[#EAF5FF] border border-[#D0E7FF] flex items-center justify-center text-[#0066FF] shrink-0 shadow-sm"
            >
              <Trophy size={24} className="stroke-[2.2]" />
            </div>

            {/* Title & Description */}
            <div>
              <h1 className="font-sans font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
                Global Cohort Leaderboard
              </h1>
              <p className="text-slate-500 text-xs sm:text-[13px] leading-relaxed mt-1 max-w-xl">
                Verified, opted-in rankings across reaction, choice, and memory assessments.
                <br />
                Refresh to load the latest available results.
              </p>
            </div>
          </div>

          {/* Sync Button & Relative Timestamp */}
          <div className="flex flex-col items-start sm:items-end gap-1.5 self-start sm:self-auto shrink-0">
            <button 
              type="button"
              id="leaderboard-refresh-btn"
              onClick={() => fetchLeaderboard(undefined, { bypassCache: true })}
              disabled={loading}
              aria-label="Refresh Leaderboard"
              title="Refresh Leaderboard Data"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EAF5FF] hover:bg-[#DDF0FF] border border-[#CDE5FF] text-[#0066FF] font-semibold text-xs sm:text-[13px] active:scale-95 transition-all cursor-pointer disabled:opacity-60 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Sync Data</span>
            </button>
            <span className="text-[11.5px] text-slate-400 font-medium tracking-tight">
              {formatRelativeTime(lastUpdated)}
            </span>
          </div>
        </header>

        {/* Assessment Carousel / Protocol Selector */}
        <div 
          role="region"
          className="flex items-center justify-between gap-2 sm:gap-4 mb-6 bg-white/95 backdrop-blur-xs border border-slate-200/80 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 shadow-[0_4px_20px_rgba(0,102,255,0.03)]"
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
          aria-label="Protocol Selector - Use arrow keys to cycle between assessment batteries"
        >
          {/* Previous Arrow Button */}
          <button 
            type="button"
            id="leaderboard-prev-btn"
            onClick={handlePrevProtocol}
            aria-label="Previous Protocol"
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] transition-all cursor-pointer shrink-0"
          >
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>

          {/* Tab List */}
          <div 
            className="flex-1 flex items-center justify-around gap-1 sm:gap-2 px-1 select-none overflow-x-auto" 
            role="tablist" 
            aria-label="Protocols"
          >
            {PROTOCOLS.map((p, idx) => {
              const isSelected = p.id === selectedProtocol;
              return (
                <React.Fragment key={p.id}>
                  {idx > 0 && (
                    <div className="h-8 w-px bg-slate-200/60 hidden sm:block shrink-0" aria-hidden="true" />
                  )}
                  <button 
                    type="button"
                    onClick={() => selectProtocol(p.id)}
                    aria-label={`Select ${p.name}`}
                    id={`leaderboard-tab-${p.id}`}
                    role="tab"
                    aria-controls="leaderboard-panel"
                    tabIndex={isSelected ? 0 : -1}
                    aria-selected={isSelected}
                    className={`relative flex flex-col items-center justify-center py-2 px-3 sm:px-5 rounded-2xl cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] min-w-[72px] sm:min-w-[110px] ${
                      isSelected 
                        ? 'bg-[#EBF5FF] shadow-xs' 
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <img 
                      src={p.logo} 
                      alt="" 
                      className={`w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 mb-1 transition-transform ${
                        isSelected ? 'scale-105' : 'opacity-85'
                      }`}
                    />
                    <span className={`text-xs sm:text-[13px] font-medium tracking-tight whitespace-nowrap ${
                      isSelected ? 'text-slate-900 font-semibold' : 'text-slate-600'
                    }`}>
                      {p.shortLabel}
                    </span>
                    {isSelected && (
                      <span 
                        aria-hidden="true"
                        className="h-[2.5px] w-8 bg-[#0066FF] rounded-full mt-1.5 transition-all"
                      />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Next Arrow Button */}
          <button 
            type="button"
            id="leaderboard-next-btn"
            onClick={handleNextProtocol}
            aria-label="Next Protocol"
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] transition-all cursor-pointer shrink-0"
          >
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* Leaderboard Table Card */}
        <div 
          id="leaderboard-panel" 
          role="tabpanel" 
          aria-labelledby={`leaderboard-tab-${selectedProtocol}`} 
          aria-busy={loading} 
          className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-8 flex-1 flex flex-col shadow-[0_4px_24px_rgba(0,102,255,0.03)]"
        >
          {loading ? (
            <div className="py-8" role="status" aria-live="polite" aria-label="Loading leaderboard">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                {currentProto.columns.map((col) => (
                  <div key={col.key} className="h-4 bg-slate-200/70 rounded w-16 animate-pulse" />
                ))}
              </div>
              <div className="space-y-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100/60 last:border-none">
                    <div className="h-4 bg-slate-200/60 rounded w-6 animate-pulse" />
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200/60 animate-pulse" />
                      <div className="h-4 bg-slate-200/60 rounded w-28 animate-pulse" />
                    </div>
                    <div className="h-4 bg-slate-200/60 rounded w-16 animate-pulse" />
                    {currentProto.columns.length >= 4 && (
                      <div className="h-4 bg-slate-200/60 rounded w-12 animate-pulse" />
                    )}
                    {currentProto.columns.length >= 5 && (
                      <div className="h-4 bg-slate-200/60 rounded w-12 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div role="alert" className="py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mb-4 shadow-xs">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Unable to Load Leaderboard
              </h3>
              <p className="text-xs font-mono text-slate-500 mb-5 leading-relaxed">
                {error}
              </p>
              <button
                type="button"
                onClick={() => fetchLeaderboard()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw size={14} />
                <span>Retry</span>
              </button>
            </div>
          ) : displayedEntries.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF5FF] border border-[#D0E7FF] flex items-center justify-center text-[#0066FF] mb-4 shadow-xs">
                <Inbox size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                No telemetry recorded
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Be the first participant to complete the {currentProto.name} battery and submit your verified result to the public demographic dataset.
              </p>
              <button
                type="button"
                onClick={() => onNavigate(currentProto.route)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0066FF] hover:bg-[#0052CC] text-white font-semibold text-xs cursor-pointer active:scale-[0.98] transition-all shadow-[0_2px_8px_rgba(0,102,255,0.25)]"
              >
                <Play size={14} className="fill-current" />
                <span>Take Test</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium text-xs sm:text-[13px]">
                    {currentProto.columns.map((col) => (
                      <th 
                        key={col.key} 
                        className={`py-3 px-4 ${
                          col.align === 'right' 
                            ? 'text-right' 
                            : col.align === 'center' 
                            ? 'text-center' 
                            : 'text-left'
                        } ${col.key === 'rank' ? 'w-16' : ''}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70 font-sans text-sm">
                  {displayedEntries.map((entry, idx) => {
                    const rank = getDisplayedLeaderboardRank(displayedEntries, entry);
                    const formattedScore = formatLeaderboardScore(entry.scoreMetric, currentProto.unit);
                    const isFirst = rank === 1;

                    return (
                      <motion.tr 
                        key={entry.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: Math.min(idx * 0.015, 0.15) }}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        {currentProto.columns.map((col) => {
                          if (col.key === 'rank') {
                            return (
                              <td key={col.key} className="py-3.5 px-4 font-semibold text-slate-800 text-[14px]">
                                {rank}
                              </td>
                            );
                          }

                          if (col.key === 'name') {
                            const initials = getAvatarInitials(entry.displayName);
                            const gradient = getAvatarGradient(entry.displayName);

                            return (
                              <td key={col.key} className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  {/* Avatar Circle with pleasant deterministic gradient */}
                                  <div 
                                    aria-hidden="true"
                                    className={`w-9 h-9 rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs`}
                                  >
                                    {initials}
                                  </div>
                                  {/* Safely truncated Display Name with title tooltip */}
                                  <span 
                                    className="font-semibold text-slate-900 text-[14.5px] truncate max-w-[200px] lg:max-w-[300px]"
                                    title={entry.displayName}
                                  >
                                    {entry.displayName}
                                  </span>
                                </div>
                              </td>
                            );
                          }

                          if (col.key === 'time') {
                            return (
                              <td key={col.key} className="py-3.5 px-4 text-right font-semibold text-slate-900 tabular-nums text-[14.5px]">
                                {formattedScore}
                              </td>
                            );
                          }

                          if (col.key === 'accuracy') {
                            const rawAcc = (entry as any).accuracy;
                            if (typeof rawAcc === 'number' && Number.isFinite(rawAcc)) {
                              const pct = rawAcc <= 1 ? Math.round(rawAcc * 100) : Math.round(rawAcc);
                              return (
                                <td key={col.key} className="py-3.5 px-4 text-right">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                                    {pct}%
                                  </span>
                                </td>
                              );
                            }
                            // Safe missing-field representation without fabricating values
                            return (
                              <td key={col.key} className="py-3.5 px-4 text-right text-slate-400 font-normal">
                                —
                              </td>
                            );
                          }

                          if (col.key === 'age') {
                            return (
                              <td key={col.key} className="py-3.5 px-4 text-right text-slate-600 text-xs sm:text-[13px] font-medium">
                                {entry.ageGroup || '—'}
                              </td>
                            );
                          }

                          return null;
                        })}
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <AdminPasscodeModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          onSuccess={() => {
            setShowAdminModal(false);
            if (onNavigate) {
              onNavigate('admin');
            } else {
              window.location.assign('/admin');
            }
          }}
        />
    </PageShell>
  );
}
