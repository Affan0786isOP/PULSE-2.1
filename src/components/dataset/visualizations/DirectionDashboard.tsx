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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
      {/* Top Metrics Row */}
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Median Choice RT"
          value={stats.medianRt}
          unit="ms"
        />
      </div>
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Accuracy Rate"
          value={stats.accuracyRate}
          unit="%"
        />
      </div>
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Error Rate"
          value={stats.errorRate}
          unit="%"
        />
      </div>

      {/* Main Distribution Histogram & Subgroup Breakdowns */}
      <div className="col-span-1 md:col-span-12 lg:col-span-6">
        <HistogramDistribution
          bins={stats.histogram}
          mean={stats.meanRt}
          median={stats.medianRt}
          title="Choice Reaction Time Distribution"
          unit="ms"
          height={260}
        />
      </div>

      <div className="col-span-1 md:col-span-6 lg:col-span-3">
        <BarChartVisual
          data={directionAccuracyData}
          title="Direction Accuracy"
          unit="%"
          height={260}
          highlightHighest={false}
        />
      </div>

      <div className="col-span-1 md:col-span-6 lg:col-span-3">
        <BarChartVisual
          data={directionLatencyData}
          title="Direction Reaction Time"
          unit="ms"
          height={260}
          highlightHighest={false}
        />
      </div>
    </div>
  );
}
