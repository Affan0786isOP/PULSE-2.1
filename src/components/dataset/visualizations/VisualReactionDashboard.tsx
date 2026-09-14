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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
      {/* Top Metrics Row */}
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Median Reaction Time"
          value={stats.medianRt}
          unit="ms"
        />
      </div>
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Anticipatory False Starts"
          value={stats.falseStartRate}
          unit="%"
          subtext={`< ${VRT_MIN_VALID_RT_MS}ms`}
        />
      </div>
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Wait-Time Effect"
          value={
            stats.longForeperiodMedianRt !== null && stats.shortForeperiodMedianRt !== null
              ? stats.longForeperiodMedianRt - stats.shortForeperiodMedianRt 
              : null
          }
          unit="ms"
          subtext="Long vs Short delta"
        />
      </div>

      {/* Distribution Histogram & Age Group Comparison */}
      <div className="col-span-1 md:col-span-7">
        <HistogramDistribution
          bins={stats.histogram}
          mean={stats.meanRt}
          median={stats.medianRt}
          title="Reaction Time Distribution"
          unit="ms"
          height={250}
        />
      </div>

      <div className="col-span-1 md:col-span-5">
        <GroupedComparisonChart
          title="Age Group Comparison"
          data={ageGroupComparison}
          series={[
            { key: 'medianLatency', label: 'Median RT (ms)', color: CHART_PALETTE.primary }
          ]}
          categoryKey="category"
          height={250}
        />
      </div>

      {/* Wait-Time Comparison & Percentiles */}
      <div className="col-span-1 md:col-span-5">
        <ChartContainer title="Wait-Time Comparison">
          {!hasForeperiodData ? (
            <ChartEmptyState
              title="No Wait-Time Data"
              message="No foreperiod observation data available."
              height={90}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Short Wait Block */}
              <div className="p-2.5 rounded-lg bg-[var(--bg-panel)]/40 border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-main)]">
                    Short Wait
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--cyan-badge-bg)] text-[var(--cyan-primary)] border border-[var(--cyan-badge-border)]">
                    100–500 ms
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center font-mono">
                  <div>
                    <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Trials</div>
                    <div className="text-xs font-bold text-[var(--text-main)] tabular-nums">
                      {shortWait ? formatCount(shortWait.count) : '0'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Median</div>
                    <div className="text-xs font-bold text-[var(--cyan-primary)] tabular-nums">
                      {shortWait && shortWait.medianRt !== null
                        ? formatMilliseconds(shortWait.medianRt, 0)
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Mean</div>
                    <div className="text-xs font-bold text-[var(--text-main)] tabular-nums">
                      {shortWait && shortWait.meanRt !== null
                        ? formatMilliseconds(shortWait.meanRt, 0)
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Long Wait Block */}
              <div className="p-2.5 rounded-lg bg-[var(--bg-panel)]/40 border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="font-heading font-bold text-[11px] uppercase tracking-wider text-[var(--text-main)]">
                    Long Wait
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--bg-panel)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                    501–3000 ms
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center font-mono">
                  <div>
                    <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Trials</div>
                    <div className="text-xs font-bold text-[var(--text-main)] tabular-nums">
                      {longWait ? formatCount(longWait.count) : '0'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Median</div>
                    <div className="text-xs font-bold text-[var(--cyan-primary)] tabular-nums">
                      {longWait && longWait.medianRt !== null
                        ? formatMilliseconds(longWait.medianRt, 0)
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Mean</div>
                    <div className="text-xs font-bold text-[var(--text-main)] tabular-nums">
                      {longWait && longWait.meanRt !== null
                        ? formatMilliseconds(longWait.meanRt, 0)
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ChartContainer>
      </div>

      <div className="col-span-1 md:col-span-7">
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
          title="Percentiles"
          unit="ms"
        />
      </div>
    </div>
  );
}
