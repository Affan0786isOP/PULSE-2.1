import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchDatasetSummaryAdminStatus,
  runDatasetSummaryReconciliation,
  type DatasetSummaryAdminStatus,
  type DatasetSummaryReconciliationReport
} from '../../lib/adminActions';

function countLabel(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function dateLabel(value: number | null): string {
  if (value === null) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}

export function DatasetSummaryMaintenancePanel() {
  const [status, setStatus] = useState<DatasetSummaryAdminStatus | null>(null);
  const [report, setReport] = useState<DatasetSummaryReconciliationReport | null>(null);
  const [busyMode, setBusyMode] = useState<'status' | 'dry-run' | 'apply' | null>('status');
  const [hasPreview, setHasPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setBusyMode(current => current === null ? 'status' : current);
    try {
      const nextStatus = await fetchDatasetSummaryAdminStatus();
      setStatus(nextStatus);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not retrieve Dataset summary status.');
    } finally {
      setBusyMode(current => current === 'status' ? null : current);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const execute = async (mode: 'dry-run' | 'apply') => {
    if (busyMode !== null || status?.migrationInProgress) return;
    if (mode === 'apply') {
      if (!hasPreview) {
        setError('Run a dry run before rebuilding the summary.');
        return;
      }
      const confirmed = window.confirm(
        'Rebuild the public Dataset summary from every publicDataset record? New research submissions will be temporarily paused during the scan. Individual research records will not be changed.'
      );
      if (!confirmed) return;
    }

    setBusyMode(mode);
    if (mode === 'dry-run') setHasPreview(false);
    setError(null);
    try {
      const nextReport = await runDatasetSummaryReconciliation(mode, mode === 'apply');
      setReport(nextReport);
      if (mode === 'dry-run') setHasPreview(true);
      else setHasPreview(false);
      const nextStatus = await fetchDatasetSummaryAdminStatus();
      setStatus(nextStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dataset summary reconciliation failed.');
    } finally {
      setBusyMode(null);
    }
  };

  const summary = status?.summary;

  return (
    <section className="rounded-2xl border border-sky-400/20 bg-slate-900/60 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Public Dataset summary</h2>
            <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">Maintenance</span>
          </div>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">
            Verify or rebuild the aggregate document used by public Dataset pages. Public visitors can read the aggregate, but only an authenticated admin can start a collection scan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadStatus()}
          disabled={busyMode !== null}
          className="rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700 disabled:opacity-50"
        >
          Refresh status
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          ['Summary document', status?.exists ? 'Present' : status ? 'Missing' : 'Loading'],
          ['Records', summary ? countLabel(summary.totalRecords) : '—'],
          ['Trials', summary ? countLabel(summary.totalTrials) : '—'],
          ['Last rebuilt', dateLabel(status?.lastReconciledAt ?? null)]
        ] as Array<[string, string]>).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-black/15 p-3 min-w-0">
            <div className="text-[10px] text-slate-400">{label}</div>
            <div className="mt-1 truncate text-sm font-semibold tabular-nums text-white">{value}</div>
          </div>
        ))}
      </div>

      {status?.migrationInProgress && (
        <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
          A reconciliation is marked in progress. New research submissions are paused until it finishes or an operator recovers an interrupted run.
        </p>
      )}
      {!status?.exists && status && (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
          No aggregate summary exists yet. Public record queries remain available; summary totals will be unavailable until the first reconciliation is applied.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busyMode !== null || status?.migrationInProgress || !status}
          onClick={() => void execute('dry-run')}
          className="rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700 disabled:opacity-50"
        >
          {busyMode === 'dry-run' ? 'Scanning…' : 'Verify summary (dry run)'}
        </button>
        <button
          type="button"
          disabled={busyMode !== null || status?.migrationInProgress || !hasPreview}
          onClick={() => void execute('apply')}
          className="rounded-xl border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-50"
        >
          {busyMode === 'apply' ? 'Rebuilding…' : 'Rebuild summary'}
        </button>
      </div>

      <p className="text-[11px] leading-5 text-slate-500">
        Dry run scans the source collection but writes nothing. Rebuild performs a fresh scan under a Firestore migration lock, briefly pausing new submissions. This updates only <code>publicDatasetMeta/summary</code>; individual research records are never rewritten.
      </p>

      {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p>}

      {report && (
        <div className="space-y-3 rounded-xl border border-white/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-slate-200">
              {report.mode === 'dry-run' ? 'Verification report — no writes made' : 'Reconciliation completed'}
            </h3>
            <span className="text-[10px] text-slate-400">{report.durationMs.toLocaleString()} ms</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {([
              ['Scanned records', report.scannedRecords],
              ['Total trials', report.summary.totalTrials],
              ...Object.entries(report.summary.counts).map(([key, value]) => [key, value] as [string, number])
            ] as Array<[string, number]>).map(([label, value]) => (
              <div key={label} className="rounded-lg bg-black/15 p-2.5">
                <div className="text-[10px] text-slate-400">{label.replace(/-/g, ' ')}</div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-white">{countLabel(value)}</div>
              </div>
            ))}
          </div>
          {report.mode === 'dry-run' && (
            <p className="text-xs text-slate-300">
              {report.matchesStoredSummary === null
                ? 'No valid stored summary exists yet. Rebuild to create it.'
                : report.matchesStoredSummary
                  ? 'The stored summary matches the source collection.'
                  : 'The stored summary differs from the source collection. Rebuild to correct it.'}
            </p>
          )}
          {report.mode === 'apply' && (
            <p className="text-xs text-emerald-200">The summary document was rebuilt. Public reads now use the one-document aggregate.</p>
          )}
        </div>
      )}
    </section>
  );
}
