import React, { useMemo } from 'react';
import { DatasetObservation } from '../../../lib/dataset/types';
import { computeDirectionStats } from '../../../lib/dataset/stats';
import { HistogramDistribution } from './HistogramDistribution';
import { BarChartVisual } from './BarChartVisual';
import { MetricStatVisual } from './MetricStatVisual';
import { CHART_PALETTE } from './tokens';
import { ScatterPlotVisual } from './ScatterPlotVisual';

interface DirectionDashboardProps {
  observations: DatasetObservation[];
}

export function DirectionDashboard({ observations }: DirectionDashboardProps) {
  const stats = useMemo(() => computeDirectionStats(observations), [observations]);
  
  const directionAccuracyData = useMemo(() => {
    return stats.directionBreakdown.map(d => ({
      label: d.direction,
      value: d.accuracy !== null ? d.accuracy : 0,
      count: d.count
    }));
  }, [stats]);

  const directionLatencyData = useMemo(() => {
    return stats.directionBreakdown.map(d => ({
      label: d.direction,
      value: d.medianRt !== null ? d.medianRt : 0,
      count: d.count
    }));
  }, [stats]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricStatVisual
          label="Median Choice RT"
          value={stats.medianRt}
          unit="ms"
          subtext="4-way spatial decision latency"
        />
        <MetricStatVisual
          label="Motor Reflex Accuracy"
          value={stats.accuracyRate}
          unit="%"
          subtext="Correct directional swipe/key"
        />
        <MetricStatVisual
          label="Directional Error Rate"
          value={stats.errorRate}
          unit="%"
          subtext="Incorrect spatial decisions"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Main Distribution Histogram */}
        <HistogramDistribution
          bins={stats.histogram}
          mean={stats.meanRt}
          median={stats.medianRt}
          title="Choice RT Density"
          subtitle="Continuous decision latency distribution across all 4 spatial targets"
          unit="ms"
          height={300}
        />

        <div className="flex flex-col gap-4">
          <BarChartVisual
            data={directionAccuracyData}
            title="Spatial Target Accuracy"
            subtitle="Successful choice reflex probability mapped by stimulus direction"
            unit="%"
            height={200}
            highlightHighest={false}
          />
          
          <BarChartVisual
            data={directionLatencyData}
            title="Spatial Target Latency"
            subtitle="Median decision processing delay mapped by stimulus direction"
            unit="ms"
            height={200}
            highlightHighest={false}
          />
        </div>
      </div>
    </div>
  );
}
