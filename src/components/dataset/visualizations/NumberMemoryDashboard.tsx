import React, { useMemo } from 'react';
import { DatasetObservation } from '../../../lib/dataset/types';
import { computeNumberMemoryStats } from '../../../lib/dataset/stats';
import { MetricStatVisual } from './MetricStatVisual';
import { LineTimeSeriesChart } from './LineTimeSeriesChart';
import { BarChartVisual } from './BarChartVisual';

interface NumberMemoryDashboardProps {
  observations: DatasetObservation[];
}

export function NumberMemoryDashboard({ observations }: NumberMemoryDashboardProps) {
  const stats = useMemo(() => computeNumberMemoryStats(observations), [observations]);
  
  const spanDistributionData = useMemo(() => {
    return stats.digitSpanDistribution.map(d => ({
      label: `${d.digitLength} Digits`,
      value: d.percentage
    }));
  }, [stats]);

  const progressionData = useMemo(() => {
    return stats.progressionCurve.map(p => ({
      x: String(p.digitLength),
      accuracy: p.accuracyRate
    }));
  }, [stats]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricStatVisual
          label="Median Digit Span"
          value={stats.medianDigitSpan}
          unit="digits"
          subtext="p50 working memory capacity"
        />
        <MetricStatVisual
          label="Maximum Span Reached"
          value={stats.maxDigitSpan}
          unit="digits"
          subtext="Highest recorded sequence limit"
        />
        <MetricStatVisual
          label="Recall Success Rate"
          value={stats.recallAccuracyRate}
          unit="%"
          subtext="Global numeric reproduction accuracy"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Main Progression Line */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] p-1 h-[320px]">
          <LineTimeSeriesChart
            title="Numeric Memory Degradation Curve"
            subtitle="Mean recall accuracy mapped continuously against digit sequence length"
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
            title="Numeric Digit Span Capacity Distribution"
            subtitle="Relative density of maximum digit sequence lengths reached across cohort"
            unit="%"
            height={320}
            highlightHighest={true}
          />
        </div>
      </div>
    </div>
  );
}
