import React, { useMemo, useState } from 'react';
import { Activity, BarChart3, Database, Download, Gauge, RefreshCw, TrendingUp } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Navbar } from './Navbar';
import { SEO } from './SEO';
import { useDatasetPipeline } from '../lib/dataset';
import { VALID_AGE_GROUPS } from '../lib/firestore';
import { normalizeProtocolType } from '../lib/dataset/normalization';
import { median, metricSpec } from '../lib/analyticsMetrics';

interface AnalyticsProps { onNavigate: (view: string) => void; }
const PROTOCOLS = [
  ['visual-reaction', 'Visual reaction'], ['direction', 'Direction'],
  ['colour-recognition', 'Colour recognition'], ['block-memory', 'Block memory'], ['number-memory', 'Number memory'],
] as const;

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

export function Analytics({ onNavigate }: AnalyticsProps) {
  const pipeline = useDatasetPipeline('visual-reaction');
  const [protocol, setProtocol] = useState('visual-reaction');
  const metric = metricSpec(protocol as any);
  const [ageGroup, setAgeGroup] = useState('All');
  const [device, setDevice] = useState('All');

  const filtered = useMemo(() => pipeline.sectionObservations
    .filter((observation) => observation.isValid)
    .filter((observation) => normalizeProtocolType(observation.assessmentType) === normalizeProtocolType(protocol))
    .filter((observation) => ageGroup === 'All' || observation.ageGroup === ageGroup)
    .filter((observation) => device === 'All' || (observation.deviceType || 'Unknown') === device),
    [pipeline.sectionObservations, protocol, ageGroup, device]);

  const numeric = useMemo(() => filtered.map((observation) => Number(observation.scoreMetric)).filter(Number.isFinite), [filtered]);
  const metrics = useMemo(() => ({
    count: numeric.length,
    mean: numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : 0,
    median: median(numeric),
    best: numeric.length ? Math.min(...numeric) : 0,
  }), [numeric]);

  const sequenceData = useMemo(() => filtered
    .filter((observation) => Number.isFinite(Number(observation.scoreMetric)))
    .sort((a, b) => {
      const session = String(a.sessionId || '').localeCompare(String(b.sessionId || ''));
      if (session) return session;
      const trial = Number(a.trialNumber ?? a.trialIndex ?? 0) - Number(b.trialNumber ?? b.trialIndex ?? 0);
      if (trial) return trial;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    })
    .slice(0, 60)
    .map((observation, index) => ({ trial: index + 1, value: Number(observation.scoreMetric) })), [filtered]);

  const cohortData = useMemo(() => VALID_AGE_GROUPS.map((cohort) => {
    const values = filtered.filter((observation) => observation.ageGroup === cohort).map((observation) => Number(observation.scoreMetric)).filter(Number.isFinite);
    return { cohort, median: Math.round(median(values)), n: values.length };
  }).filter((entry) => entry.n > 0), [filtered]);

  const distributionData = useMemo(() => {
    if (!numeric.length) return [];
    const min = Math.floor(Math.min(...numeric) / 50) * 50;
    const max = Math.ceil(Math.max(...numeric) / 50) * 50;
    const width = Math.max(50, Math.ceil((max - min || 50) / 10 / 50) * 50);
    const bins = Array.from({ length: Math.max(1, Math.ceil((max - min + 1) / width)) }, (_, index) => ({
      range: `${min + index * width}–${min + (index + 1) * width - 1}`,
      count: 0,
    }));
    numeric.forEach((value) => { const index = Math.min(bins.length - 1, Math.max(0, Math.floor((value - min) / width))); bins[index].count++; });
    return bins;
  }, [numeric]);

  const devices = useMemo(() => Array.from(new Set(pipeline.sectionObservations.map((observation) => observation.deviceType || 'Unknown'))).sort(), [pipeline.sectionObservations]);
  const setProtocolFilter = (value: string) => {
    setProtocol(value);
    if (value !== 'all') pipeline.setActiveAssessment(value as any);
    pipeline.setDatasetMode('assessment');
    pipeline.setFilters((current) => ({ ...current, assessmentType: value }));
  };
  const exportJson = () => download(JSON.stringify({ exportedAt: new Date().toISOString(), protocol, metric, filters: { ageGroup, device }, observations: filtered }, null, 2), 'pulse-analytics.json', 'application/json');
  const exportCsv = () => {
    const rows = [['id', 'protocol', 'ageGroup', 'device', 'scoreMetric', 'sessionId', 'timestamp'], ...filtered.map((observation) => [observation.id, observation.assessmentType, observation.ageGroup || '', observation.deviceType || '', String(observation.scoreMetric), observation.sessionId || '', String(observation.timestamp)])];
    download(rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n'), 'pulse-analytics.csv', 'text/csv');
  };

  return (
    <div className="min-h-[100dvh] bg-transparent text-[var(--text-main)] font-sans">
      <SEO title="Analytics | PULSE" description="Explore PULSE cognitive assessment distributions, cohorts, and ordered observations." />
      <Navbar currentView="analytics" onNavigate={onNavigate} />
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div><div className="flex items-center gap-2 text-[var(--accent)] text-xs font-mono uppercase tracking-widest mb-2"><Activity size={14} /> Dataset analytics</div><h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">Research analytics</h1><p className="mt-2 text-sm text-[var(--text-secondary)] max-w-2xl">Protocol-aware summaries with cohort slicing, distributions, ordered observations, and exportable records.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={exportCsv} disabled={!filtered.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-default)] text-xs font-mono disabled:opacity-40"><Download size={14} /> CSV</button><button type="button" onClick={exportJson} disabled={!filtered.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border-default)] text-xs font-mono disabled:opacity-40"><Download size={14} /> JSON</button><button type="button" onClick={pipeline.refresh} disabled={pipeline.loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--accent)] text-black text-xs font-mono disabled:opacity-50"><RefreshCw size={14} className={pipeline.loading ? 'animate-spin' : ''} /> {pipeline.loading ? 'Syncing' : 'Refresh'}</button></div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4" aria-label="Analytics filters"><label className="text-[11px] font-mono uppercase text-[var(--text-muted)]">Protocol<select value={protocol} onChange={(event) => setProtocolFilter(event.target.value)} className="mt-1 block w-full rounded-lg bg-[var(--surface-2)] border border-[var(--border-default)] p-2 text-xs text-[var(--text-primary)]">{PROTOCOLS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-[11px] font-mono uppercase text-[var(--text-muted)]">Age cohort<select value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)} className="mt-1 block w-full rounded-lg bg-[var(--surface-2)] border border-[var(--border-default)] p-2 text-xs text-[var(--text-primary)]"><option>All</option>{VALID_AGE_GROUPS.map((group) => <option key={group}>{group}</option>)}</select></label><label className="text-[11px] font-mono uppercase text-[var(--text-muted)]">Device<select value={device} onChange={(event) => setDevice(event.target.value)} className="mt-1 block w-full rounded-lg bg-[var(--surface-2)] border border-[var(--border-default)] p-2 text-xs text-[var(--text-primary)]"><option>All</option>{devices.map((item) => <option key={item}>{item}</option>)}</select></label></section>

        {pipeline.loading ? <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-10 text-center text-sm font-mono text-[var(--text-muted)]">Loading research dataset…</div> : pipeline.error ? <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">Dataset unavailable: {pipeline.error}</div> : <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Analytics summary">{[{ label: 'Valid observations', value: metrics.count.toLocaleString(), icon: Database }, { label: `Mean ${metric.label}`, value: metrics.count ? `${Math.round(metrics.mean)} ${metric.unit}` : '—', icon: TrendingUp }, { label: `Median ${metric.label}`, value: metrics.count ? `${Math.round(metrics.median)} ${metric.unit}` : '—', icon: Gauge }, { label: `Best ${metric.label}`, value: metrics.count ? `${Math.round(metrics.best)} ${metric.unit}` : '—', icon: BarChart3 }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4"><Icon size={16} className="text-[var(--accent)] mb-3" /><div className="text-xl font-mono font-bold text-[var(--text-primary)]">{value}</div><div className="mt-1 text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">{label}</div></div>)}</section>
          {!filtered.length ? <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-10 text-center text-sm text-[var(--text-muted)]">No valid observations match the active filters.</div> : <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Ordered observation stream" suffix="SESSION / TRIAL ORDER"><LineChart data={sequenceData}><CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" /><XAxis dataKey="trial" stroke="var(--text-muted)" tick={{ fontSize: 10 }} /><YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }} /><Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} /></LineChart></ChartCard>
            <ChartCard title={`${metric.label} distribution`} suffix={`COUNT / ${metric.unit.toUpperCase()}`}><AreaChart data={distributionData}><CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" /><XAxis dataKey="range" stroke="var(--text-muted)" tick={{ fontSize: 9 }} /><YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} allowDecimals={false} /><Tooltip contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }} /><Area type="monotone" dataKey="count" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} /></AreaChart></ChartCard>
            <ChartCard title="Cohort medians" suffix={`MEDIAN / ${metric.unit.toUpperCase()} · N`}><BarChart data={cohortData}><CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" /><XAxis dataKey="cohort" stroke="var(--text-muted)" tick={{ fontSize: 9 }} interval={0} /><YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }} /><Bar dataKey="median" fill="var(--accent)" radius={[4, 4, 0, 0]} /></BarChart></ChartCard>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 sm:p-5"><div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-4"><h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">Cohort sample sizes</h2><span className="text-[10px] font-mono text-[var(--text-muted)]">N / VALID</span></div><div className="space-y-3">{cohortData.map((entry) => <div key={entry.cohort} className="flex items-center justify-between gap-3 text-xs font-mono"><span className="text-[var(--text-secondary)]">{entry.cohort}</span><span className="text-[var(--accent)]">n={entry.n} · {entry.median} {metric.unit}</span></div>)}</div></div>
          </section>}
        </>}
      </main>
    </div>
  );
}

function ChartCard({ title, suffix, children }: { title: string; suffix: string; children: React.ReactElement }) {
  return <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 sm:p-5"><div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-4"><h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">{title}</h2><span className="text-[10px] font-mono text-[var(--text-muted)]">{suffix}</span></div><div className="h-72"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></div>;
}
