import React, { useMemo } from 'react';
import { DatasetObservation } from '../../../lib/dataset/types';
import { computeVrtStats, computeSubgroupStratification } from '../../../lib/dataset/stats';
import { VRT_MIN_VALID_RT_MS } from '../../../lib/protocolValidators';
import { HistogramDistribution } from './HistogramDistribution';
import { PercentileSummaryVisual } from './PercentileSummaryVisual';
import { GroupedComparisonChart } from './GroupedComparisonChart';
import { MetricStatVisual } from './MetricStatVisual';
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
          label="Preparatory Latency Decay"
          value={
            stats.longForeperiodMedianRt && stats.shortForeperiodMedianRt 
              ? stats.longForeperiodMedianRt - stats.shortForeperiodMedianRt 
              : null
          }
          unit="ms"
          subtext="Long vs short foreperiod RT delta"
        />
      </div>

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
              count: 0,
              min: 0,
              max: 0,
              mean: stats.meanRt,
              median: stats.medianRt,
              p10: stats.p10Rt,
              p25: null,
              p75: null,
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
