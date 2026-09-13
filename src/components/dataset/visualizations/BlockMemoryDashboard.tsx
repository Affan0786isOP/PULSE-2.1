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
      label: `Lvl ${d.span}`,
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
    <div className="flex flex-col gap-4">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricStatVisual
          label="Median Spatial Span"
          value={stats.medianSpan}
          unit="blocks"
          subtext="p50 working memory capacity"
        />
        <MetricStatVisual
          label="Maximum Span Reached"
          value={stats.maxSpan}
          unit="blocks"
          subtext="Highest recorded sequence limit"
        />
        <MetricStatVisual
          label="Overall Success Rate"
          value={stats.successRate}
          unit="%"
          subtext="Global sequence reproduction accuracy"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Main Progression Line */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] p-1 h-[320px]">
          <LineTimeSeriesChart
            title="Spatial Memory Degradation Curve"
            subtitle="Mean recall accuracy mapped continuously against sequence progression length"
            data={progressionData}
            series={[
              { key: 'accuracy', name: 'Recall Accuracy', color: 'var(--cyan-primary)' }
            ]}
            xAxisKey="x"
            unit="%"
            height={310}
          />
        </div>

        <div className="flex flex-col gap-4">
          <BarChartVisual
            data={spanDistributionData}
            title="Corsi Block Span Capacity Distribution"
            subtitle="Relative density of maximum spatial sequence lengths reached across cohort"
            unit="%"
            height={320}
            highlightHighest={true}
          />
        </div>
      </div>
    </div>
  );
}
