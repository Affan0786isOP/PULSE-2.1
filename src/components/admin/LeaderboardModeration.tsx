import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  EyeOff, 
  RefreshCw, 
  CheckSquare, 
  Square, 
  MinusSquare,
  AlertTriangle, 
  Sparkles,
  Flag,
  ArrowUpDown,
  CheckCircle2,
  Trash2,
  X
} from 'lucide-react';
import { 
  getLeaderboardResults, 
  LeaderboardEntry, 
  AssessmentType, 
  VALID_AGE_GROUPS 
} from '../../lib/firestore';
import { hideLeaderboardEntry, deleteLeaderboardEntryPermanently, fetchAllAdminLeaderboard } from '../../lib/adminActions';
import { useAdminAuth } from '../../lib/useAdminAuth';

const PROFANITY_REGEX = /\b(fuck|shit|bitch|asshole|nigger|faggot|dick|pussy|cunt|bastard|porn|sex|penis|vagina|retard|idiot|loser|hacker|bot|cheater|cheat|admin)\b/i;

const ASSESSMENT_OPTIONS: { id: string; label: string }[] = [
  { id: 'All', label: 'All Protocols' },
  { id: 'visual-reaction', label: 'Visual Reaction' },
  { id: 'direction', label: 'Direction' },
  { id: 'color-recognition', label: 'Colour Recognition' },
  { id: 'block-memory', label: 'Block Memory' },
  { id: 'number-memory', label: 'Number Memory' }
];

export function LeaderboardModeration() {
  const { email, user } = useAdminAuth();
  const currentAdminEmail = email || user?.email || 'admin@pulse-research.org';
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [filterAssessment, setFilterAssessment] = useState<string>('All');
  const [filterAgeGroup, setFilterAgeGroup] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFlaggedOnly, setFilterFlaggedOnly] = useState(false);
  const [sortField, setSortField] = useState<'score' | 'displayName' | 'createdAt'>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Active moderation modal state
  const [moderatingEntry, setModeratingEntry] = useState<LeaderboardEntry | null>(null);
  const [modReason, setModReason] = useState('Offensive Display Name');
  const [isBulkModerating, setIsBulkModerating] = useState(false);

  const fetchAllLeaderboardEntries = async () => {
    setIsLoading(true);
    try {
      const results = await fetchAllAdminLeaderboard();
      const all: LeaderboardEntry[] = [];
      const seen = new Set<string>();

      results.forEach(e => {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          all.push(e as LeaderboardEntry);
        }
      });

      setEntries(all);
    } catch (err) {
      console.warn("Failed to fetch leaderboard for moderation:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLeaderboardEntries();
  }, []);

  const showToast = (msg: string, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Compute Cohort Statistics in-memory for Outlier Detection (>2.5 SD)
  const cohortStats = useMemo(() => {
    const cohorts: Record<string, { scores: number[]; mean: number; std: number; n: number }> = {};

    entries.forEach(e => {
      const key = `${e.assessmentType}__${e.ageGroup}`;
      if (!cohorts[key]) {
        cohorts[key] = { scores: [], mean: 0, std: 0, n: 0 };
      }
      if (typeof e.scoreMetric === 'number' && Number.isFinite(e.scoreMetric)) {
        cohorts[key].scores.push(e.scoreMetric);
      }
    });

    Object.values(cohorts).forEach(c => {
      c.n = c.scores.length;
      if (c.n > 0) {
        c.mean = c.scores.reduce((a, b) => a + b, 0) / c.n;
        const variance = c.scores.reduce((sum, val) => sum + Math.pow(val - c.mean, 2), 0) / c.n;
        c.std = Math.sqrt(variance);
      }
    });

    return cohorts;
  }, [entries]);

  // Compute flags for each entry
  const enrichedEntries = useMemo(() => {
    return entries.map(entry => {
      const isProfane = PROFANITY_REGEX.test(entry.displayName);
      const cohortKey = `${entry.assessmentType}__${entry.ageGroup}`;
      const cohort = cohortStats[cohortKey];

      let isOutlier = false;
      let outlierReason = '';

      const isSpeed = entry.assessmentType === 'visual-reaction' || entry.assessmentType === 'direction' || entry.assessmentType === 'color-recognition';

      // Physical impossibility check
      if (isSpeed && entry.scoreMetric < 80) {
        isOutlier = true;
        outlierReason = `< 80ms (Biologically Infeasible)`;
      } else if (!isSpeed && entry.scoreMetric > 30) {
        isOutlier = true;
        outlierReason = `Level ${entry.scoreMetric} (> Human Span Benchmark)`;
      } else if (cohort && cohort.n >= 3 && cohort.std > 0) {
        const zScore = Math.abs(entry.scoreMetric - cohort.mean) / cohort.std;
        if (zScore > 2.5) {
          isOutlier = true;
          outlierReason = `Z-score ${zScore.toFixed(1)} (> 2.5 SD from cohort mean)`;
        }
      }

      return {
        ...entry,
        isProfane,
        isOutlier,
        outlierReason,
        isFlagged: isProfane || isOutlier
      };
    });
  }, [entries, cohortStats]);

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    return enrichedEntries
      .filter(e => !hiddenIds.has(e.id))
      .filter(e => {
        if (filterAssessment !== 'All' && e.assessmentType !== filterAssessment) return false;
        if (filterAgeGroup !== 'All' && e.ageGroup !== filterAgeGroup) return false;
        if (filterFlaggedOnly && !e.isFlagged) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            e.displayName.toLowerCase().includes(q) ||
            e.ageGroup.toLowerCase().includes(q) ||
            e.assessmentType.toLowerCase().includes(q) ||
            e.id.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === 'score') {
          return sortAsc ? a.scoreMetric - b.scoreMetric : b.scoreMetric - a.scoreMetric;
        }
        if (sortField === 'displayName') {
          return sortAsc ? a.displayName.localeCompare(b.displayName) : b.displayName.localeCompare(a.displayName);
        }
        // default createdAt
        const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val === 'string' || typeof val === 'number') return new Date(val).getTime();
          if (typeof val === 'object' && 'toDate' in val && typeof val.toDate === 'function') return val.toDate().getTime();
          if (typeof val === 'object' && 'seconds' in val && typeof val.seconds === 'number') return val.seconds * 1000;
          return 0;
        };
        const tA = getTime(a.createdAt);
        const tB = getTime(b.createdAt);
        return sortAsc ? tA - tB : tB - tA;
      });
  }, [enrichedEntries, hiddenIds, filterAssessment, filterAgeGroup, filterFlaggedOnly, searchQuery, sortField, sortAsc]);

  // Selection handlers
  const allFilteredSelected = useMemo(() => {
    return filteredEntries.length > 0 && filteredEntries.every(e => selectedIds.has(e.id));
  }, [filteredEntries, selectedIds]);

  const someFilteredSelected = useMemo(() => {
    return !allFilteredSelected && filteredEntries.some(e => selectedIds.has(e.id));
  }, [allFilteredSelected, filteredEntries, selectedIds]);

  const handleToggleSelectAll = () => {
    if (filteredEntries.length === 0) return;
    if (allFilteredSelected) {
      const next = new Set(selectedIds);
      filteredEntries.forEach(e => next.delete(e.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filteredEntries.forEach(e => next.add(e.id));
      setSelectedIds(next);
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Moderation execution
  const handleExecuteHide = async () => {
    if (!moderatingEntry) return;
    const entryId = moderatingEntry.id;
    const entryName = moderatingEntry.displayName;

    try {
      await hideLeaderboardEntry(entryId, modReason, currentAdminEmail);
      setHiddenIds(prev => new Set(prev).add(entryId));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
      setModeratingEntry(null);
      showToast(`Entry "${entryName}" hidden and logged to audit trail.`);
    } catch (err: any) {
      console.error("Moderation action failed:", err);
      showToast(err?.message || `Failed to hide entry "${entryName}" in cloud database.`, true);
    }
  };

  const handleExecutePermanentDelete = async () => {
    if (!moderatingEntry) return;
    const entryId = moderatingEntry.id;
    const entryName = moderatingEntry.displayName;

    if (!window.confirm(`Are you absolutely sure you want to PERMANENTLY DELETE "${entryName}" from the Firestore database? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteLeaderboardEntryPermanently(entryId, `Permanent Deletion: ${modReason}`, currentAdminEmail);
      setHiddenIds(prev => new Set(prev).add(entryId));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
      setEntries(prev => prev.filter(e => e.id !== entryId));
      setModeratingEntry(null);
      showToast(`Entry "${entryName}" permanently deleted and logged to audit trail.`);
    } catch (err: any) {
      console.error("Permanent deletion failed:", err);
      showToast(err?.message || `Failed to permanently delete entry "${entryName}".`, true);
    }
  };

  const handleExecuteBulkHide = async () => {
    if (selectedIds.size === 0) return;
    const idsArray = Array.from(selectedIds) as string[];

    const results = await Promise.allSettled(
      idsArray.map(async (id) => {
        await hideLeaderboardEntry(id, `Bulk Moderation: ${modReason}`, currentAdminEmail);
        return id;
      })
    );

    const successfulIds: string[] = [];
    const failedIds: string[] = [];

    results.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        successfulIds.push(res.value);
      } else {
        console.error(`Failed to hide leaderboard entry "${idsArray[index]}":`, res.reason);
        failedIds.push(idsArray[index]);
      }
    });

    // Incremental reconciliation: successful IDs disappear from visible list
    if (successfulIds.length > 0) {
      setHiddenIds(prev => {
        const next = new Set<string>(prev);
        successfulIds.forEach(id => next.add(id));
        return next;
      });
      setSelectedIds(prev => {
        const next = new Set(prev);
        successfulIds.forEach(id => next.delete(id));
        return next;
      });
    }

    if (failedIds.length === 0) {
      setIsBulkModerating(false);
      showToast(`Successfully hidden ${successfulIds.length} entries and logged to audit trail.`);
    } else if (successfulIds.length > 0) {
      setIsBulkModerating(false);
      showToast(`Partially completed: Hid ${successfulIds.length} entries, but ${failedIds.length} failed.`, true);
    } else {
      showToast(`Failed to hide ${failedIds.length} entries in cloud database.`, true);
    }
  };

  return (
    <div className="space-y-6" id="leaderboard-moderation">
      {/* TOAST CONFIRMATION / ERROR */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border text-xs font-mono flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 ${
          toastMessage.isError 
            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
        }`}>
          {toastMessage.isError ? (
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button type="button" 
            onClick={() => setToastMessage(null)} 
            className={`ml-2 hover:text-white ${toastMessage.isError ? 'text-rose-400' : 'text-emerald-400'}`}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* HEADER & ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Community Moderation
            </span>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              Automated Flagging & Soft-Delete Queue
            </span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2.5">
            <ShieldAlert className="text-cyan-400" size={26} />
            Leaderboard Moderation
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {selectedIds.size > 0 && (
            <button type="button"
              onClick={() => setIsBulkModerating(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white font-heading font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Trash2 size={14} />
              Hide Selected ({selectedIds.size})
            </button>
          )}

          <button type="button"
            onClick={fetchAllLeaderboardEntries}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] active:scale-95 border border-white/10 text-xs font-mono text-[var(--text-main)] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-cyan-400' : ''} />
            <span>Reload Entries</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-[var(--bg-surface)] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* SEARCH INPUT */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
            <input
              type="text"
              placeholder="Search display name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#090d16] border border-white/10 text-xs text-[var(--text-main)] placeholder-white/30 focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:border-cyan-500/50 font-mono"
            />
          </div>

          {/* ASSESSMENT FILTER */}
          <div>
            <select
              value={filterAssessment}
              onChange={(e) => setFilterAssessment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-white/10 text-xs text-[var(--text-main)] focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:border-cyan-500/50 font-mono"
            >
              {ASSESSMENT_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* AGE GROUP FILTER */}
          <div>
            <select
              value={filterAgeGroup}
              onChange={(e) => setFilterAgeGroup(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-white/10 text-xs text-[var(--text-main)] focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:border-cyan-500/50 font-mono"
            >
              <option value="All">All Age Cohorts</option>
              {VALID_AGE_GROUPS.map(ag => (
                <option key={ag} value={ag}>{ag}</option>
              ))}
            </select>
          </div>

          {/* FLAGGED ANOMALIES TOGGLE */}
          <div className="flex items-center">
            <button type="button"
              onClick={() => setFilterFlaggedOnly(!filterFlaggedOnly)}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-mono transition-colors active:scale-95 cursor-pointer ${
                filterFlaggedOnly 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' 
                  : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-white border border-white/5'
              }`}
            >
              <Flag size={13} className={filterFlaggedOnly ? 'text-amber-400' : 'text-white/40'} />
              <span>Flagged Anomalies Only</span>
            </button>
          </div>
        </div>

        {/* STATS SUMMARY STRIP */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/5 text-xs font-mono text-[var(--text-muted)]">
          <div className="flex items-center gap-4">
            <span>Showing {filteredEntries.length} of {entries.length} records</span>
            <span className="text-amber-400">
              ● {enrichedEntries.filter(e => e.isFlagged && !hiddenIds.has(e.id)).length} flagged anomalies
            </span>
          </div>
          <div className="text-[11px]">
            Tip: Soft-deletes invoke optimistic removal and create immutable audit logs.
          </div>
        </div>
      </div>

      {/* SORTABLE / FILTERABLE DATA TABLE */}
      <div className="bg-[var(--bg-surface)] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead className="bg-[#090d16] text-[var(--text-muted)] sticky top-0 z-10 border-b border-white/10 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button type="button" 
                    onClick={handleToggleSelectAll}
                    disabled={filteredEntries.length === 0}
                    className="cursor-pointer text-[var(--text-muted)] hover:text-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={allFilteredSelected ? "Deselect all" : "Select all"}
                  >
                    {allFilteredSelected ? (
                      <CheckSquare size={16} className="text-cyan-400" />
                    ) : someFilteredSelected ? (
                      <MinusSquare size={16} className="text-cyan-400/80" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th 
                  onClick={() => {
                    if (sortField === 'displayName') setSortAsc(!sortAsc);
                    else { setSortField('displayName'); setSortAsc(true); }
                  }}
                  className="p-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Display Name</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3">Protocol</th>
                <th 
                  onClick={() => {
                    if (sortField === 'score') setSortAsc(!sortAsc);
                    else { setSortField('score'); setSortAsc(true); }
                  }}
                  className="p-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Score Metric</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3">Age Cohort</th>
                <th className="p-3">Automated Flags</th>
                <th 
                  onClick={() => {
                    if (sortField === 'createdAt') setSortAsc(!sortAsc);
                    else { setSortField('createdAt'); setSortAsc(false); }
                  }}
                  className="p-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Timestamp</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => {
                  const isSelected = selectedIds.has(entry.id);
                  const isSpeed = entry.assessmentType === 'visual-reaction' || entry.assessmentType === 'direction' || entry.assessmentType === 'color-recognition';

                  return (
                    <tr 
                      key={entry.id} 
                      className={`hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-cyan-500/[0.04]' : ''}`}
                    >
                      <td className="p-3 text-center">
                        <button type="button" 
                          onClick={() => handleToggleSelect(entry.id)}
                          className="cursor-pointer text-[var(--text-muted)] hover:text-cyan-400"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-cyan-400" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>

                      <td className="p-3 font-semibold text-[var(--text-main)]">
                        <div className="flex items-center gap-2">
                          <span className={entry.isProfane ? 'text-rose-400 underline decoration-rose-500/50' : ''}>
                            {entry.displayName}
                          </span>
                        </div>
                      </td>

                      <td className="p-3 text-cyan-400">
                        {entry.assessmentType}
                      </td>

                      <td className="p-3 font-bold text-emerald-400">
                        {isSpeed ? `${entry.scoreMetric.toFixed(1)} ms` : `Level ${entry.scoreMetric}`}
                      </td>

                      <td className="p-3 text-[var(--text-secondary)]">
                        {entry.ageGroup}
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {entry.isProfane && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                              <AlertTriangle size={11} /> Profanity Match
                            </span>
                          )}
                          {entry.isOutlier && (
                            <span 
                              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 cursor-help"
                              title={entry.outlierReason}
                            >
                              <Flag size={11} /> Outlier (&gt;2.5 SD)
                            </span>
                          )}
                          {!entry.isFlagged && (
                            <span className="text-[10px] text-[var(--text-muted)]">
                              Valid Baseline
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-[var(--text-muted)] whitespace-nowrap">
                        {entry.createdAt ? new Date(typeof entry.createdAt === 'object' && 'toDate' in (entry.createdAt as any) ? (entry.createdAt as any).toDate() : entry.createdAt as any).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Recent'}
                      </td>

                      <td className="p-3 text-right">
                        <button type="button"
                          onClick={() => {
                            setModeratingEntry(entry);
                            setModReason(
                              entry.isProfane ? 'Profanity / Inappropriate Name' : 
                              entry.isOutlier ? 'Statistically Infeasible Score (> 2.5 SD)' : 'Moderator Discretion'
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-[11px] font-mono transition-colors cursor-pointer"
                        >
                          Hide Entry
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-sm font-sans text-[var(--text-muted)]">
                    No leaderboard submissions match active filter parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INDIVIDUAL MODERATION MODAL */}
      {moderatingEntry && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-rose-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-rose-400 font-heading font-bold text-sm">
                <ShieldAlert size={18} />
                Moderate Leaderboard Submission
              </div>
              <button type="button" 
                onClick={() => setModeratingEntry(null)}
                className="text-[var(--text-muted)] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#090d16] border border-white/5 space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Display Name:</span>
                <span className="font-bold text-[var(--text-main)]">{moderatingEntry.displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Score Metric:</span>
                <span className="text-emerald-400 font-bold">{moderatingEntry.scoreMetric}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Assessment:</span>
                <span className="text-cyan-400">{moderatingEntry.assessmentType}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-[var(--text-muted)] mb-1.5">
                Moderation Justification / Reason
              </label>
              <select
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-white/10 text-xs text-[var(--text-main)] font-mono focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-1 focus-visible:border-rose-500/50"
              >
                <option value="Profanity / Inappropriate Name">Profanity / Inappropriate Name</option>
                <option value="Statistically Infeasible Score (> 2.5 SD)">Statistically Infeasible Score (&gt; 2.5 SD)</option>
                <option value="Suspected Scripting / Hardware Macro">Suspected Scripting / Hardware Macro</option>
                <option value="Data Sanitization Policy">Data Sanitization Policy</option>
                <option value="Manual Administrator Discretion">Manual Administrator Discretion</option>
              </select>
            </div>

            <div className="text-[11px] font-mono text-[var(--text-muted)]">
              This triggers a soft-delete and logs an immutable record with administrator ID into the audit log.
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleExecutePermanentDelete}
                className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 active:scale-95 border border-red-500/40 text-red-300 font-heading text-xs tracking-wider uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Permanently remove document from Firestore database"
              >
                <Trash2 size={13} />
                Permanent Delete
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModeratingEntry(null)}
                  className="px-3.5 py-2 rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] active:scale-95 border border-white/10 text-xs font-mono text-[var(--text-secondary)] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteHide}
                  className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 active:bg-rose-800 active:scale-95 text-white font-heading font-bold text-xs tracking-wider uppercase transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <EyeOff size={13} />
                  Soft-Hide Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK MODERATION MODAL */}
      {isBulkModerating && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-rose-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-rose-400 font-heading font-bold text-sm">
                <Trash2 size={18} />
                Bulk Hide Selected Entries ({selectedIds.size})
              </div>
              <button type="button" 
                onClick={() => setIsBulkModerating(false)}
                className="text-[var(--text-muted)] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs font-sans text-[var(--text-secondary)]">
              You are about to soft-delete <span className="font-bold text-white">{selectedIds.size}</span> leaderboard entries.
            </p>

            <div>
              <label className="block text-xs font-mono text-[var(--text-muted)] mb-1.5">
                Bulk Moderation Justification
              </label>
              <select
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#090d16] border border-white/10 text-xs text-[var(--text-main)] font-mono focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-1 focus-visible:border-rose-500/50"
              >
                <option value="Batch Anomaly Scrub">Batch Anomaly Scrub</option>
                <option value="Profanity & Abusive Display Names">Profanity & Abusive Display Names</option>
                <option value="Outlier Purge (>2.5 SD)">Outlier Purge (&gt;2.5 SD)</option>
                <option value="Routine Hygiene Pass">Routine Hygiene Pass</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsBulkModerating(false)}
                className="px-3.5 py-2 rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] active:scale-95 border border-white/10 text-xs font-mono text-[var(--text-secondary)] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkHide}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 active:bg-rose-800 active:scale-95 text-white font-heading font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                Hide {selectedIds.size} Entries
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
