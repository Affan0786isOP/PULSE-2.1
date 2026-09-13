import React, { useMemo } from 'react';
import { NumericDistributionStats } from '../../../lib/dataset/types';
import { ChartContainer } from './ChartContainer';
import { ChartEmptyState } from './ChartEmptyState';
import { formatMilliseconds, formatValueWithUnit, formatCount } from './formatting';
import { CHART_PALETTE } from './tokens';

interface PercentileSummaryVisualProps {
  title: string;
  subtitle?: string;
  badge?: string;
  stats: NumericDistributionStats;
  unit?: string;
  id?: string;
  emptyMessage?: string;
}

export function PercentileSummaryVisual({
  title,
  subtitle,
  badge,
  stats,
  unit = 'ms',
  id,
  emptyMessage
}: PercentileSummaryVisualProps) {
  const hasData = stats && stats.count > 0 && stats.median !== null;

  // Normalized relative positions (0% to 100%) for whisker visualization
  const positions = useMemo(() => {
    if (!hasData || stats.min === null || stats.max === null) {
      return null;
    }
    const min = stats.min;
    const max = stats.max === min ? min + 1 : stats.max;
    const span = max - min;

    const calcPos = (val: number | null) => {
      if (val === null) return 0;
      return Math.max(0, Math.min(100, ((val - min) / span) * 100));
    };

    return {
      p10: calcPos(stats.p10),
      p25: calcPos(stats.p25),
      median: calcPos(stats.median),
      p75: calcPos(stats.p75),
      p90: calcPos(stats.p90),
      mean: calcPos(stats.mean),
    };
  }, [stats, hasData]);

  return (
    <ChartContainer
      title={title}
      subtitle={subtitle}
      badge={badge}
      id={id}
    >
      {!hasData ? (
        <ChartEmptyState
          title="No Parametric Distribution"
          message={emptyMessage || "No valid numerical trials available to compute percentile baselines."}
          height={200}
        />
      ) : (
        <div className="w-full flex flex-col gap-5 py-2">
          {/* Graphical Percentile Whisker Track */}
          <div className="bg-[var(--bg-panel)]/50 border border-[var(--border-subtle)] rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-6">
              <span>Min: {formatValueWithUnit(stats.min, unit)}</span>
              <span className="text-[var(--cyan-primary)] font-bold">
                Median (p50): {formatValueWithUnit(stats.median, unit)}
              </span>
              <span>Max: {formatValueWithUnit(stats.max, unit)}</span>
            </div>

            {/* Relative Range Track */}
            {positions && (
              <div className="relative w-full h-8 flex items-center mb-6">
                {/* Full span line (min to max) */}
                <div className="absolute left-0 right-0 h-1 bg-[var(--border-default)] rounded-full" />

                {/* 10th-to-90th percentile broad band */}
                <div
                  className="absolute h-2.5 bg-[var(--cyan-primary)]/15 border border-[var(--cyan-primary)]/30 rounded"
                  style={{
                    left: `${positions.p10}%`,
                    width: `${Math.max(2, positions.p90 - positions.p10)}%`
                  }}
                />

                {/* IQR (25th-to-75th percentile core box) */}
                <div
                  className="absolute h-5 bg-[var(--cyan-primary)]/30 border border-[var(--cyan-primary)]/70 rounded"
                  style={{
                    left: `${positions.p25}%`,
                    width: `${Math.max(2, positions.p75 - positions.p25)}%`
                  }}
                />

                {/* Median pin */}
                <div
                  className="absolute w-1.5 h-7 bg-[var(--cyan-primary)] rounded-full -translate-x-1/2 z-10 shadow-[0_0_8px_rgba(34,199,214,0.6)]"
                  style={{ left: `${positions.median}%` }}
                />

                {/* Mean marker if available */}
                {stats.mean !== null && (
                  <div
                    className="absolute w-2 h-2 bg-indigo-400 rotate-45 -translate-x-1/2 z-10"
                    style={{ left: `${positions.mean}%` }}
                    title={`Mean: ${stats.mean} ${unit}`}
                  />
                )}
              </div>
            )}

            {/* Legend for Whisker Diagram */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--cyan-primary)]" />
                <span>Median (p50)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400 rotate-45" />
                <span>Mean (μ)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-2 rounded-sm bg-[var(--cyan-primary)]/40 border border-[var(--cyan-primary)]" />
                <span>IQR (p25–p75)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1.5 rounded-sm bg-[var(--cyan-primary)]/15 border border-[var(--cyan-primary)]/30" />
                <span>p10–p90 Range</span>
              </div>
            </div>
          </div>

          {/* Precision Quantitative Data Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-[var(--bg-panel)]/40 border border-[var(--border-subtle)]">
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Obs Count</div>
              <div className="text-sm font-bold text-[var(--text-main)] tabular-nums">{formatCount(stats.count)}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--bg-panel)]/40 border border-[var(--border-subtle)]">
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Mean (μ)</div>
              <div className="text-sm font-bold text-[var(--text-main)] tabular-nums">{formatValueWithUnit(stats.mean, unit)}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--bg-panel)]/40 border border-[var(--border-subtle)]">
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Std Dev (σ)</div>
              <div className="text-sm font-bold text-[var(--text-main)] tabular-nums">{formatValueWithUnit(stats.stdDev, unit)}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--bg-panel)]/40 border border-[var(--border-subtle)]">
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">IQR</div>
              <div className="text-sm font-bold text-[var(--text-main)] tabular-nums">{formatValueWithUnit(stats.iqr, unit)}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--bg-panel)]/40 border border-[var(--border-subtle)]">
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">p10</div>
              <div className="text-sm font-bold text-[var(--text-main)] tabular-nums">{formatValueWithUnit(stats.p10, unit)}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--bg-panel)]/40 border border-[var(--border-subtle)]">
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">p25</div>
              <div className="text-sm font-bold text-[var(--text-main)] tabular-nums">{formatValueWithUnit(stats.p25, unit)}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--cyan-badge-bg)] border border-[var(--cyan-badge-border)]">
              <div className="text-[9px] text-[var(--cyan-primary)] font-bold uppercase tracking-wider mb-0.5">Median</div>
              <div className="text-sm font-bold text-[var(--cyan-primary)] tabular-nums">{formatValueWithUnit(stats.median, unit)}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--bg-panel)]/40 border border-[var(--border-subtle)]">
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">p90</div>
              <div className="text-sm font-bold text-[var(--text-main)] tabular-nums">{formatValueWithUnit(stats.p90, unit)}</div>
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
}
