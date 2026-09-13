import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  Database, 
  Users, 
  Trophy, 
  Activity, 
  RefreshCw, 
  Calendar, 
  Layers, 
  TrendingUp,
  Clock,
  Sparkles
} from 'lucide-react';
import { getRawTrialObservations, fetchAllCloudTrialObservations, RawTrialObservation } from '../../lib/trialStore';
import { getLeaderboardResults, VALID_AGE_GROUPS, isFirestoreAvailable } from '../../lib/firestore';
import { collection, getDocs, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function AdminOverview() {
  const [trials, setTrials] = useState<RawTrialObservation[]>([]);
  const [leaderboardCount, setLeaderboardCount] = useState<number>(0);
  const [totalSessionsCount, setTotalSessionsCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch publicDataset sessions
      if (isFirestoreAvailable() && db) {
        try {
          const sessionsSnap = await getCountFromServer(query(collection(db, 'publicDataset')));
          setTotalSessionsCount(sessionsSnap.data().count);
        } catch {
          setTotalSessionsCount(0);
        }
      }

      // 2. Fetch raw trials (population cloud trials for admin only)
      const cloudTrials = await fetchAllCloudTrialObservations(500, Infinity);
      setTrials(cloudTrials);

      // 3. Fetch total leaderboard docs count without artificial caps or single-test filtering
      if (isFirestoreAvailable() && db) {
        try {
          const lbCountSnap = await getCountFromServer(query(collection(db, 'leaderboardResults'), where('hidden', '==', false)));
          setLeaderboardCount(lbCountSnap.data().count);
        } catch {
          try {
            const lbSnap = await getDocs(query(collection(db, 'leaderboardResults'), where('hidden', '==', false)));
            setLeaderboardCount(lbSnap.size);
          } catch {
            try {
              const res = await fetch('/api/leaderboard');
              if (res.ok) {
                const data = await res.json();
                setLeaderboardCount(Array.isArray(data.entries) ? data.entries.length : 0);
              } else {
                setLeaderboardCount(0);
              }
            } catch {
              setLeaderboardCount(0);
            }
          }
        }
      } else {
        try {
          const res = await fetch('/api/leaderboard');
          if (res.ok) {
            const data = await res.json();
            setLeaderboardCount(Array.isArray(data.entries) ? data.entries.length : 0);
          } else {
            setLeaderboardCount(0);
          }
        } catch {
          setLeaderboardCount(0);
        }
      }
    } catch (err) {
      console.warn("Failed to load admin overview telemetry:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute distinct participantId count from loaded trials + sessions without fabrication.
  // Displayed in KPI card 4 ("Distinct Participants").
  const distinctParticipants = useMemo(() => {
    const ids = new Set<string>();
    trials.forEach(t => {
      if (t.participantId) ids.add(t.participantId);
    });
    return ids.size;
  }, [trials]);

  // Compute 30-day submissions timeline
  const submissionsTimeline = useMemo(() => {
    const daysMap: Record<string, { date: string; displayDate: string; sessions: number; trials: number }> = {};
    
    // Initialize past 30 days
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const iso = d.toISOString().slice(0, 10);
      const displayDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      daysMap[iso] = { date: iso, displayDate, sessions: 0, trials: 0 };
    }

    // Bucket trials
    trials.forEach(t => {
      let ts = t.timestamp;
      if (ts) {
        const dateStr = new Date(ts).toISOString().slice(0, 10);
        if (daysMap[dateStr]) {
          daysMap[dateStr].trials += 1;
        }
      }
    });

    return Object.values(daysMap);
  }, [trials]);

  // Breakdown by assessmentType
  const assessmentBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      'visual-reaction': 0,
      'direction': 0,
      'color-recognition': 0,
      'block-memory': 0,
      'number-memory': 0
    };

    trials.forEach(t => {
      if (counts[t.test] !== undefined) {
        counts[t.test]++;
      }
    });

    const labels: Record<string, string> = {
      'visual-reaction': 'Visual Reaction',
      'direction': 'Direction',
      'color-recognition': 'Colour Recognition',
      'block-memory': 'Block Memory',
      'number-memory': 'Number Memory'
    };

    return Object.entries(counts).map(([key, count]) => ({
      key,
      name: labels[key] || key,
      count
    }));
  }, [trials]);

  // Breakdown by ageGroup
  const ageBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    VALID_AGE_GROUPS.forEach(ag => { counts[ag] = 0; });

    trials.forEach(t => {
      if (t.ageGroup && counts[t.ageGroup] !== undefined) {
        counts[t.ageGroup]++;
      }
    });

    return VALID_AGE_GROUPS.map(ag => ({
      name: ag.split(' ')[0],
      fullName: ag,
      count: counts[ag] || 0
    }));
  }, [trials]);

  return (
    <div className="space-y-8" id="admin-overview">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Administrative Telemetry
            </span>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              Real-time Ingest & Aggregations
            </span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)]">
            System Overview & Metrics
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button type="button"
            onClick={loadData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] active:bg-[var(--bg-panel-active)] active:scale-[0.98] border border-white/10 hover:border-cyan-500/40 text-xs font-mono text-[var(--text-main)] transition-[background-color,border-color,transform] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Metrics'}</span>
          </button>
        </div>
      </div>

      {/* 4 CORE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: publicDataset docs */}
        <div className="bg-[var(--bg-surface)] border border-white/10 hover:border-cyan-500/30 transition-colors rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
              publicDataset Docs
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Database size={16} />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-cyan-400">
            {isLoading ? (
              <div className="h-8 w-20 bg-[var(--surface-2)] rounded opacity-60" />
            ) : (
              (totalSessionsCount ?? 0).toLocaleString()
            )}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-secondary)] mt-1.5 flex items-center gap-1">
            <span className="text-emerald-400">●</span> Validated Sessions
          </p>
        </div>

        {/* KPI 2: trialObservations docs */}
        <div className="bg-[var(--bg-surface)] border border-white/10 hover:border-indigo-500/30 transition-colors rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
              trialObservations Docs
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Activity size={16} />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-indigo-400">
            {isLoading ? (
              <div className="h-8 w-20 bg-[var(--surface-2)] rounded opacity-60" />
            ) : (
              trials.length.toLocaleString()
            )}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-secondary)] mt-1.5 flex items-center gap-1">
            <span className="text-cyan-400">●</span> Raw Millisecond Trials
          </p>
        </div>

        {/* KPI 3: leaderboardResults docs */}
        <div className="bg-[var(--bg-surface)] border border-white/10 hover:border-amber-500/30 transition-colors rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
              leaderboardResults Docs
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Trophy size={16} />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-amber-400">
            {isLoading ? (
              <div className="h-8 w-20 bg-[var(--surface-2)] rounded opacity-60" />
            ) : (
              leaderboardCount.toLocaleString()
            )}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-secondary)] mt-1.5 flex items-center gap-1">
            <span className="text-amber-400">●</span> Public Community Scores
          </p>
        </div>

        {/* KPI 4: Distinct Participants */}
        <div className="bg-[var(--bg-surface)] border border-white/10 hover:border-emerald-500/30 transition-colors rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
              Distinct Participants
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-emerald-400">
            {isLoading ? (
              <div className="h-8 w-20 bg-[var(--surface-2)] rounded opacity-60" />
            ) : (
              distinctParticipants.toLocaleString()
            )}
          </div>
          <p className="text-[11px] font-mono text-[var(--text-secondary)] mt-1.5 flex items-center gap-1">
            <span className="text-emerald-400">●</span> Unique Anonymous Keys
          </p>
        </div>
      </div>

      {/* 30-DAY ACTIVITY TIMELINE CHART */}
      <div className="bg-[var(--bg-surface)] border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="font-heading text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
              <TrendingUp size={18} className="text-cyan-400" />
              Submissions Timeline (Last 30 Days)
            </h3>
            <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
              Client-side temporal bucketing by completed timestamp
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />
              <span className="text-[var(--text-secondary)]">Sessions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-400 inline-block" />
              <span className="text-[var(--text-secondary)]">Trials</span>
            </div>
          </div>
        </div>

        <div className="w-full h-72 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={submissionsTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="displayDate" 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
                interval={Math.ceil(submissionsTimeline.length / 10)}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ 
                  backgroundColor: '#090d16', 
                  borderColor: 'rgba(0, 240, 255, 0.2)', 
                  borderRadius: '12px', 
                  fontSize: '12px',
                  fontFamily: 'monospace' 
                }}
                formatter={(value: any, name: any) => [
                  `${value} entries`, 
                  name === 'sessions' ? 'Sessions' : 'Raw Trials'
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Bar dataKey="sessions" fill="#00f0ff" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="trials" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BREAKDOWN GRIDS: BY ASSESSMENT TYPE & BY AGE GROUP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Sessions by Assessment Type */}
        <div className="bg-[var(--bg-surface)] border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-heading text-base font-bold text-[var(--text-main)] flex items-center gap-2">
              <Layers size={16} className="text-cyan-400" />
              Observations by Assessment Type
            </h3>
            <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
              Protocol distribution across five cognitive paradigms
            </p>
          </div>

          <div className="w-full h-64 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assessmentBreakdown} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.6)" fontSize={11} tickLine={false} axisLine={false} width={100} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ 
                    backgroundColor: '#090d16', 
                    borderColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '10px', 
                    fontSize: '12px',
                    fontFamily: 'monospace' 
                  }}
                  formatter={(value: any) => [`${value} sessions`, 'Total']}
                />
                <Bar dataKey="count" fill="#00f0ff" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Sessions by Age Group */}
        <div className="bg-[var(--bg-surface)] border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-heading text-base font-bold text-[var(--text-main)] flex items-center gap-2">
              <Users size={16} className="text-sky-400" />
              Observations by Age Group
            </h3>
            <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
              Demographic distribution across 7 standardized cohorts
            </p>
          </div>

          <div className="w-full h-64 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ 
                    backgroundColor: '#090d16', 
                    borderColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '10px', 
                    fontSize: '12px',
                    fontFamily: 'monospace' 
                  }}
                  formatter={(value: any) => [`${value} sessions`, 'Count']}
                  labelFormatter={(label, payload: any) => payload?.[0]?.payload?.fullName || label}
                />
                <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
