import React, { useMemo } from 'react';
import { Activity, BarChart3, Database, Gauge, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Navbar } from './Navbar';
import { SEO } from './SEO';
import { useDatasetPipeline } from '../lib/dataset';

interface AnalyticsProps {
  onNavigate: (view: string) => void;
}

export function Analytics({ onNavigate }: AnalyticsProps) {
  const pipeline = useDatasetPipeline('visual-reaction');
  const observations = pipeline.sectionObservations.filter((observation) => observation.isValid);

  const metrics = useMemo(() => {
    const scores = observations.map((observation) => Number(observation.scoreMetric)).filter(Number.isFinite);
    const sorted = [...scores].sort((a, b) => a - b);
    const mean = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    const median = sorted.length ? Math.round(sorted[Math.floor(sorted.length / 2)]) : 0;
    return { count: scores.length, mean, median, best: sorted[0] || 0 };
  }, [observations]);

  const sequenceData = useMemo(() => observations.slice(0, 24).map((observation, index) => ({
    trial: index + 1,
    value: Number(observation.scoreMetric) || 0,
  })), [observations]);

  const cohortData = useMemo(() => {
    const grouped = new Map<string, number[]>();
    observations.forEach((observation) => {
      const group = observation.ageGroup || 'Unknown';
      const score = Number(observation.scoreMetric);
      if (!Number.isFinite(score)) return;
      grouped.set(group, [...(grouped.get(group) || []), score]);
    });
    return Array.from(grouped.entries()).map(([cohort, values]) => ({
      cohort: cohort.replace(/\s*\(.+\)/, '').slice(0, 14),
      median: Math.round([...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]),
    }));
  }, [observations]);

  return (
    <div className="min-h-[100dvh] bg-transparent text-[var(--text-main)] font-sans">
      <SEO title="Analytics | PULSE" description="Review PULSE assessment telemetry and cohort performance summaries." />
      <Navbar currentView="analytics" onNavigate={onNavigate} />
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[var(--accent)] text-xs font-mono uppercase tracking-widest mb-2">
              <Activity size={14} /> Live telemetry view
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">Session analytics</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-2xl">A compact readout of valid observations from the current assessment protocol.</p>
          </div>
          <button type="button" onClick={pipeline.refresh} className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-default)] text-xs font-mono hover:bg-[var(--surface-2)] active:scale-[0.98] transition-colors">
            Refresh telemetry
          </button>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Analytics summary">
          {[
            { label: 'Valid observations', value: metrics.count.toLocaleString(), icon: Database },
            { label: 'Mean result', value: metrics.mean ? `${metrics.mean} ms` : '—', icon: TrendingUp },
            { label: 'Median result', value: metrics.median ? `${metrics.median} ms` : '—', icon: Gauge },
            { label: 'Best result', value: metrics.best ? `${metrics.best} ms` : '—', icon: BarChart3 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
              <Icon size={16} className="text-[var(--accent)] mb-3" />
              <div className="text-xl font-mono font-bold text-[var(--text-primary)]">{value}</div>
              <div className="mt-1 text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
            </div>
          ))}
        </section>

        {pipeline.error && <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{pipeline.error}</div>}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-4"><h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">Observation sequence</h2><span className="text-[10px] font-mono text-[var(--text-muted)]">RESULT / TRIAL</span></div>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={sequenceData}><CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" /><XAxis dataKey="trial" stroke="var(--text-muted)" tick={{ fontSize: 10 }} /><YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /><Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-4"><h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">Cohort medians</h2><span className="text-[10px] font-mono text-[var(--text-muted)]">MEDIAN / MS</span></div>
            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={cohortData}><CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" /><XAxis dataKey="cohort" stroke="var(--text-muted)" tick={{ fontSize: 10 }} /><YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} /><Bar dataKey="median" fill="var(--accent)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </div>
        </section>
      </main>
    </div>
  );
}
