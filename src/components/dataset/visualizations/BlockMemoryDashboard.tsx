import React, { useMemo } from 'react';
import { DatasetObservation } from '../../../lib/dataset/types';
import { computeBlockMemoryStats } from '../../../lib/dataset/stats';
import { MetricStatVisual } from './MetricStatVisual';
import { LineTimeSeriesChart } from './LineTimeSeriesChart';
import { BarChartVisual } from './BarChartVisual';

interface BlockMemoryDashboardProps {
  observations: DatasetObservation[];
}

export function BlockMemoryDashboard({ observations }: BlockMemoryDashboardProps) {
  const stats = useMemo(() => computeBlockMemoryStats(observations), [observations]);
  
  const spanDistributionData = useMemo(() => {
    return stats.spanDistribution.map(d => ({
      label: `${d.span} Blocks`,
      value: d.percentage
    }));
  }, [stats]);

  const progressionData = useMemo(() => {
    return stats.progressionCurve.map(p => ({
      x: String(p.level),
      accuracy: p.accuracyRate
    }));
  }, [stats]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
      {/* Top Metrics Row */}
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Median Spatial Span"
          value={stats.medianSpan}
          unit="blocks"
        />
      </div>
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Maximum Span"
          value={stats.maxSpan}
          unit="blocks"
        />
      </div>
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Success Rate"
          value={stats.successRate}
          unit="%"
        />
      </div>

      {/* Progression & Span Distribution */}
      <div className="col-span-1 md:col-span-12 lg:col-span-7">
        <LineTimeSeriesChart
          title="Accuracy by Level"
          data={progressionData}
          series={[
            { key: 'accuracy', name: 'Recall Accuracy', color: 'var(--cyan-primary)' }
          ]}
          xAxisKey="x"
          unit="%"
          height={260}
        />
      </div>

      <div className="col-span-1 md:col-span-12 lg:col-span-5">
        <BarChartVisual
          data={spanDistributionData}
          title="Memory Span Distribution"
          unit="%"
          height={260}
          highlightHighest={true}
        />
      </div>
    </div>
  );
}
