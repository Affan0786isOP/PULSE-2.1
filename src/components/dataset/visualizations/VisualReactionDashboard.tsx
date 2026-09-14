import React, { useMemo } from 'react';
import { DatasetObservation } from '../../../lib/dataset/types';
import { computeVrtStats, computeSubgroupStratification } from '../../../lib/dataset/stats';
import { VRT_MIN_VALID_RT_MS } from '../../../lib/protocolValidators';
import { HistogramDistribution } from './HistogramDistribution';
import { PercentileSummaryVisual } from './PercentileSummaryVisual';
import { GroupedComparisonChart } from './GroupedComparisonChart';
import { MetricStatVisual } from './MetricStatVisual';
import { ChartContainer } from './ChartContainer';
import { ChartEmptyState } from './ChartEmptyState';
import { formatMilliseconds, formatCount } from './formatting';
import { CHART_PALETTE } from './tokens';

interface VisualReactionDashboardProps {
  observations: DatasetObservation[];
}

export function VisualReactionDashboard({ observations }: VisualReactionDashboardProps) {
  const stats = useMemo(() => computeVrtStats(observations), [observations]);
  
  const ageGroupComparison = useMemo(() => {
    return computeSubgroupStratification(observations, 'ageGroup')
      .filter(g => g.medianLatency !== null)
      .map(g => ({
        category: g.groupLabel,
        medianLatency: g.medianLatency,
      }));
  }, [observations]);

  const shortWait = useMemo(() => {
    return stats.foreperiodBreakdown?.find(b => b.category.toLowerCase().includes('short')) ?? stats.foreperiodBreakdown?.[0];
  }, [stats.foreperiodBreakdown]);

  const longWait = useMemo(() => {
    return stats.foreperiodBreakdown?.find(b => b.category.toLowerCase().includes('long')) ?? stats.foreperiodBreakdown?.[1];
  }, [stats.foreperiodBreakdown]);

  const hasForeperiodData = useMemo(() => {
    return Boolean(
      (shortWait && (shortWait.count > 0 || shortWait.medianRt !== null || shortWait.meanRt !== null)) ||
      (longWait && (longWait.count > 0 || longWait.medianRt !== null || longWait.meanRt !== null))
    );
  }, [shortWait, longWait]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricStatVisual
          label="Median Reaction Time"
          value={stats.medianRt}
          unit="ms"
          subtext="p50 central tendency"
        />
        <MetricStatVisual
          label="Anticipatory False Starts"
          value={stats.falseStartRate}
          unit="%"
          subtext={`Responses < ${VRT_MIN_VALID_RT_MS}ms`}
        />
        <MetricStatVisual
          label="Wait-Time Effect"
          value={
            stats.longForeperiodMedianRt !== null && stats.shortForeperiodMedianRt !== null
              ? stats.longForeperiodMedianRt - stats.shortForeperiodMedianRt 
              : null
          }
          unit="ms"
          subtext="Difference in reaction time between short and long waits."
        />
      </div>

      {/* Short-vs-Long Foreperiod Comparison Section */}
      <ChartContainer
        title="Wait-Time Comparison"
        subtitle="Reaction latency stratified by preparatory foreperiod delay duration"
      >
        {!hasForeperiodData ? (
          <ChartEmptyState
            title="No Wait-Time Telemetry"
            message="No foreperiod observation data available in the current dataset slice."
            height={120}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Short Wait Card */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-panel)]/50 border border-[var(--border-subtle)] flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-heading font-bold text-xs uppercase tracking-wider text-[var(--text-main)]">
                  Short Wait
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[var(--cyan-badge-bg)] text-[var(--cyan-primary)] border border-[var(--cyan-badge-border)]">
                  100–500 ms
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                  <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Trials</div>
                  <div className="text-sm font-bold text-[var(--text-main)] tabular-nums">
                    {shortWait ? formatCount(shortWait.count) : '0'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                  <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Median RT</div>
                  <div className="text-sm font-bold text-[var(--cyan-primary)] tabular-nums">
                    {shortWait && shortWait.medianRt !== null
                      ? formatMilliseconds(shortWait.medianRt, shortWait.medianRt % 1 === 0 ? 0 : 1)
                      : '—'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                  <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Mean RT</div>
                  <div className="text-sm font-bold text-[var(--text-main)] tabular-nums">
                    {shortWait && shortWait.meanRt !== null
                      ? formatMilliseconds(shortWait.meanRt, shortWait.meanRt % 1 === 0 ? 0 : 1)
                      : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Long Wait Card */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-panel)]/50 border border-[var(--border-subtle)] flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-heading font-bold text-xs uppercase tracking-wider text-[var(--text-main)]">
                  Long Wait
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[var(--bg-panel)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  501–3000 ms
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                  <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Trials</div>
                  <div className="text-sm font-bold text-[var(--text-main)] tabular-nums">
                    {longWait ? formatCount(longWait.count) : '0'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                  <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Median RT</div>
                  <div className="text-sm font-bold text-[var(--cyan-primary)] tabular-nums">
                    {longWait && longWait.medianRt !== null
                      ? formatMilliseconds(longWait.medianRt, longWait.medianRt % 1 === 0 ? 0 : 1)
                      : '—'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                  <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Mean RT</div>
                  <div className="text-sm font-bold text-[var(--text-main)] tabular-nums">
                    {longWait && longWait.meanRt !== null
                      ? formatMilliseconds(longWait.meanRt, longWait.meanRt % 1 === 0 ? 0 : 1)
                      : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </ChartContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Main Distribution Histogram */}
        <HistogramDistribution
          bins={stats.histogram}
          mean={stats.meanRt}
          median={stats.medianRt}
          title="Empirical RT Density"
          subtitle="Continuous latency distribution segmented into 8 standardized research bins"
          unit="ms"
          height={300}
        />

        <div className="flex flex-col gap-4">
          <PercentileSummaryVisual
            stats={{
              count: stats.count,
              min: stats.minRt,
              max: stats.maxRt,
              mean: stats.meanRt,
              median: stats.medianRt,
              p10: stats.p10Rt,
              p25: stats.p25Rt,
              p75: stats.p75Rt,
              p90: stats.p90Rt,
              stdDev: stats.stdDevRt,
              iqr: stats.iqrRt
            }}
            title="Parametric Percentiles"
            subtitle="Whisker range with interquartile band (IQR) and median p50"
            unit="ms"
          />
          
          <GroupedComparisonChart
            title="Age Cohort Stratification"
            subtitle="Median reaction latency evaluated across demographic age bands"
            data={ageGroupComparison}
            series={[
              { key: 'medianLatency', label: 'Median RT (ms)', color: CHART_PALETTE.primary }
            ]}
            categoryKey="category"
            height={220}
          />
        </div>
      </div>
    </div>
  );
}
