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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
      {/* Top Metrics Row */}
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Median Digit Span"
          value={stats.medianDigitSpan}
          unit="digits"
        />
      </div>
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Maximum Span"
          value={stats.maxDigitSpan}
          unit="digits"
        />
      </div>
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Recall Success Rate"
          value={stats.recallAccuracyRate}
          unit="%"
        />
      </div>

      {/* Progression & Span Distribution */}
      <div className="col-span-1 md:col-span-12 lg:col-span-7">
        <LineTimeSeriesChart
          title="Accuracy by Digit Length"
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
          title="Digit Span Distribution"
          unit="%"
          height={260}
          highlightHighest={true}
        />
      </div>
    </div>
  );
}
