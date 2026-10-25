import React from 'react';
import { ShieldCheck, Cpu, Database } from 'lucide-react';
import { useAuthoritativeStats } from '../../lib/useAuthoritativeStats';

export function MobileProofScene() {
  const { testsCount, resultsCount, isLoadingResults } = useAuthoritativeStats();

  return (
    <section
      id="proof"
      aria-label="Scientific Integrity & Live Telemetry"
      className="w-full py-6 border-b border-[var(--border-subtle)]"
    >
      <div className="mb-4">
        <span className="text-[10px] font-mono font-bold text-[var(--accent)] tracking-wider uppercase block mb-1">
          RELIABILITY & DATA
        </span>
        <h2 className="font-heading text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
          Standardized Behavioral Tasks
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--accent)]">
            <Cpu size={18} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary)] mb-0.5">
              Client-Side Monotonic Timers
            </h3>
            <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
              Stimulus intervals are recorded at the browser event boundary using <code className="font-mono text-[10.5px]">performance.now()</code>.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--accent)]">
            <Database size={18} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary)] mb-0.5">
              Transparent Research Datasets
            </h3>
            <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
              {isLoadingResults ? '15,000+' : resultsCount.toLocaleString()}+ verified anonymized trial records across {testsCount} standardized batteries.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--accent)]">
            <ShieldCheck size={18} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary)] mb-0.5">
              Descriptive, Non-Diagnostic
            </h3>
            <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
              PULSE measures task response latencies for exploratory self-testing, never clinical or medical diagnoses.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
