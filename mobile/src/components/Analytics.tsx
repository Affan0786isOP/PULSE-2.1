import React from 'react';
import { Activity, Database } from 'lucide-react';
import { Navbar } from './Navbar';
import { SEO } from './SEO';
import { useDatasetPipeline } from '../../../src/lib/dataset';

export function Analytics({ onNavigate }: { onNavigate: (view: string) => void }) {
  const pipeline = useDatasetPipeline('visual-reaction');
  const validCount = pipeline.sectionObservations.filter((observation) => observation.isValid).length;

  return (
    <div className="min-h-[100dvh] bg-transparent text-[var(--text-main)] font-sans">
      <SEO title="Analytics | PULSE" description="Review PULSE assessment telemetry." />
      <Navbar currentView="analytics" onNavigate={onNavigate} />
      <main className="px-4 py-5 space-y-4">
        <div className="flex items-center gap-2 text-[var(--accent)] text-xs font-mono uppercase tracking-widest"><Activity size={14} /> Telemetry view</div>
        <h1 className="font-heading text-2xl font-bold text-[var(--text-primary)]">Session analytics</h1>
        <p className="text-sm text-[var(--text-secondary)]">Valid observations for the current assessment protocol.</p>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
          <Database size={18} className="text-[var(--accent)] mb-3" />
          <div className="text-2xl font-mono font-bold text-[var(--text-primary)]">{validCount.toLocaleString()}</div>
          <div className="mt-1 text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Valid observations</div>
        </div>
        {pipeline.error && <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{pipeline.error}</div>}
      </main>
    </div>
  );
}
