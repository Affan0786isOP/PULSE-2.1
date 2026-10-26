import React, { useState } from 'react';
import { runLeaderboardAccuracyBackfill, type LeaderboardAccuracyBackfillReport } from '../../lib/adminActions';

function countLabel(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function LeaderboardAccuracyBackfillPanel() {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<LeaderboardAccuracyBackfillReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previewCursor, setPreviewCursor] = useState<string | null>(null);
  const [hasPreview, setHasPreview] = useState(false);
  const [done, setDone] = useState(false);

  const execute = async (mode: 'dry-run' | 'apply', cursor: string | null) => {
    if (busy) return;
    if (mode === 'apply') {
      if (!hasPreview) {
        setError('Run a dry run first. Apply is available only for the batch you just previewed.');
        return;
      }
      const confirmed = window.confirm(
        'Apply this verified batch? This updates only the accuracy field on existing leaderboard records. No new entries are created.'
      );
      if (!confirmed) return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await runLeaderboardAccuracyBackfill({
        mode,
        cursor,
        limit: 10,
        confirmApply: mode === 'apply'
      });
      setReport(result);
      setDone(result.done);
      if (mode === 'dry-run') {
        setPreviewCursor(cursor);
        setNextCursor(result.nextCursor);
        setHasPreview(result.counts.scanned > 0);
      } else {
        setHasPreview(false);
        setNextCursor(result.nextCursor);
      }
    } catch (err) {
      setError(err instanceof Error
        ? err.message
        : 'Migration request failed. Check that the feature is enabled on the deployed Vercel environment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-amber-400/20 bg-slate-900/60 p-5 space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-white">Leaderboard accuracy backfill</h2>
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">Maintenance</span>
        </div>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">
          Recover missing accuracy fields on existing public entries. Dry run makes no writes.
          Apply is restricted to the batch shown in the latest dry-run report.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => { setNextCursor(null); setPreviewCursor(null); setHasPreview(false); setDone(false); void execute('dry-run', null); }}
          className="rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Dry Run'}
        </button>
        <button
          type="button"
          disabled={busy || done || !nextCursor}
          onClick={() => { if (nextCursor) void execute('dry-run', nextCursor); }}
          className="rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-700 disabled:opacity-50"
        >
          Continue Batch
        </button>
        <button
          type="button"
          disabled={busy || !hasPreview}
          onClick={() => void execute('apply', previewCursor)}
          className="rounded-xl border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/25 disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Apply Previewed Batch'}
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p>}

      {report && (
        <div className="space-y-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {report.mode === 'dry-run' ? 'Dry-run report — no records changed' : 'Apply report'}
            {' · '}
            {report.done ? 'End of collection' : 'More batches available'}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ['Scanned', report.counts.scanned],
              [report.mode === 'dry-run' ? 'Would update' : 'Updated', report.mode === 'dry-run' ? report.counts.wouldUpdate : report.counts.updated],
              ['Already correct', report.counts.alreadyCorrect],
              ['Skipped', report.counts.skipped],
              ['Failed', report.counts.failed],
              ['Eligible', report.counts.eligible]
            ] as Array<[string, number]>).map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-black/15 p-3">
                <div className="text-[10px] text-slate-400">{label}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-white">{countLabel(value)}</div>
              </div>
            ))}
          </div>
          {Object.keys(report.skipReasons).length > 0 && (
            <div className="rounded-xl border border-white/10 p-3">
              <h3 className="text-xs font-semibold text-slate-200">Skip reasons</h3>
              <dl className="mt-2 space-y-1">
                {Object.entries(report.skipReasons).map(([reason, value]) => (
                  <div key={reason} className="flex items-center justify-between gap-3 text-xs">
                    <dt className="text-slate-400">{reason}</dt>
                    <dd className="tabular-nums text-slate-200">{countLabel(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {report.mode === 'dry-run' && report.counts.failed > 0 && (
            <p className="text-xs text-amber-200">Some records could not be checked. Review the skip reasons before applying any batch.</p>
          )}
          {report.mode === 'apply' && report.counts.updated > 0 && (
            <p className="text-xs text-emerald-200">Updated existing records only. No new leaderboard entries were created.</p>
          )}
        </div>
      )}
    </section>
  );
}
