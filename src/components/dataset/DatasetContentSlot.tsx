import React from 'react';
import { ObservationRecord } from '../../lib/dataset/types';
import { Activity, CheckCircle2, XCircle } from 'lucide-react';

interface DatasetContentSlotProps {
  activeAssessment: string;
  datasetMode: string;
  sectionObservations: ObservationRecord[];
}

export function DatasetContentSlot({
  activeAssessment,
  datasetMode,
  sectionObservations,
}: DatasetContentSlotProps) {
  const validObservations = sectionObservations.filter((o) => o.isValid);
  const scores = validObservations.map((o) => o.scoreMetric || 0);
  const count = scores.length;
  const mean = count > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / count) : 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = count > 0 ? sorted[Math.floor(count / 2)] : 0;
  const min = count > 0 ? sorted[0] : 0;
  const max = count > 0 ? sorted[count - 1] : 0;

  const unit =
    activeAssessment === 'block-memory'
      ? 'blocks'
      : activeAssessment === 'number-memory'
      ? 'digits'
      : 'ms';

  return (
    <div className="flex flex-col gap-4">
      {datasetMode === 'assessment' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-3.5">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase">Sample Size</span>
            <div className="text-xl font-mono font-bold text-[var(--text-primary)] mt-1">
              {count.toLocaleString()}
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] font-mono">Valid observations</span>
          </div>

          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-3.5">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase">Mean Result</span>
            <div className="text-xl font-mono font-bold text-[var(--accent)] mt-1">
              {count > 0 ? `${mean} ${unit}` : '—'}
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] font-mono">Arithmetic average</span>
          </div>

          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-3.5">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase">Median</span>
            <div className="text-xl font-mono font-bold text-[var(--text-primary)] mt-1">
              {count > 0 ? `${median} ${unit}` : '—'}
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] font-mono">50th percentile</span>
          </div>

          <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-3.5">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase">Range</span>
            <div className="text-xl font-mono font-bold text-[var(--text-primary)] mt-1">
              {count > 0 ? `${min} - ${max}` : '—'}
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] font-mono">Min to Max</span>
          </div>
        </div>
      )}

      {/* Observation Table */}
      <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        <div className="p-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-[var(--accent)]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {datasetMode === 'data-explorer' ? 'Global Observation Records' : `${activeAssessment} Observations`}
            </h2>
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            Showing top {Math.min(50, sectionObservations.length)} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/50 text-[var(--text-secondary)]">
                <th className="py-2.5 px-4 font-semibold">Record ID</th>
                <th className="py-2.5 px-4 font-semibold">Protocol</th>
                <th className="py-2.5 px-4 font-semibold">Result Metric</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold">Device</th>
                <th className="py-2.5 px-4 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
              {sectionObservations.slice(0, 50).map((obs, i) => (
                <tr key={obs.id || i} className="hover:bg-[var(--surface-2)]/40 active:bg-[var(--surface-2)]/60 transition-colors">
                  <td className="py-2.5 px-4 text-[var(--text-primary)] font-medium">
                    {obs.id.slice(0, 10)}...
                  </td>
                  <td className="py-2.5 px-4 capitalize">
                    {obs.assessmentType.replace('-', ' ')}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-[var(--accent)]">
                    {obs.scoreMetric} {obs.assessmentType.includes('memory') ? '' : 'ms'}
                  </td>
                  <td className="py-2.5 px-4">
                    {obs.isValid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                        <CheckCircle2 size={12} /> Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-400 text-[11px]">
                        <XCircle size={12} /> Excluded
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-[var(--text-muted)] capitalize">
                    {obs.deviceType || 'desktop'}
                  </td>
                  <td className="py-2.5 px-4 text-[var(--text-muted)]">
                    {typeof obs.timestamp === 'number'
                      ? new Date(obs.timestamp).toLocaleDateString()
                      : String(obs.timestamp).slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
