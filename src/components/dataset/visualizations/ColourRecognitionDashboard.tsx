import React, { useMemo } from 'react';
import { DatasetObservation } from '../../../lib/dataset/types';
import { computeColourStats } from '../../../lib/dataset/stats';
import { HistogramDistribution } from './HistogramDistribution';
import { MetricStatVisual } from './MetricStatVisual';
import { GroupedComparisonChart } from './GroupedComparisonChart';
import { CHART_PALETTE } from './tokens';

interface ColourRecognitionDashboardProps {
  observations: DatasetObservation[];
}

export function ColourRecognitionDashboard({ observations }: ColourRecognitionDashboardProps) {
  const stats = useMemo(() => computeColourStats(observations), [observations]);
  
  const stroopComparisonData = useMemo(() => {
    return stats.conditionBreakdown.map(c => ({
      category: c.condition,
      meanLatency: c.meanRt,
      accuracy: c.accuracy
    }));
  }, [stats]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
      {/* Top Metrics Row */}
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Inhibitory Control Cost"
          value={stats.interferenceCost}
          unit="ms"
          subtext="Incongruency delta"
        />
      </div>
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Congruent RT"
          value={stats.congruentMeanRt}
          unit="ms"
        />
      </div>
      <div className="md:col-span-4">
        <MetricStatVisual
          label="Incongruent RT"
          value={stats.incongruentMeanRt}
          unit="ms"
        />
      </div>

      {/* Main Distribution Histogram & Stroop Breakdown Comparisons */}
      <div className="col-span-1 md:col-span-12 lg:col-span-6">
        <HistogramDistribution
          bins={stats.histogram}
          mean={stats.overallMeanRt}
          median={stats.overallMedianRt}
          title="Reaction Time Distribution"
          unit="ms"
          height={260}
        />
      </div>

      <div className="col-span-1 md:col-span-6 lg:col-span-3">
        <GroupedComparisonChart
          title="Stroop Effect (RT)"
          data={stroopComparisonData}
          series={[
            { key: 'meanLatency', label: 'Mean RT (ms)', color: CHART_PALETTE.primary }
          ]}
          categoryKey="category"
          height={260}
        />
      </div>

      <div className="col-span-1 md:col-span-6 lg:col-span-3">
        <GroupedComparisonChart
          title="Stroop Effect (Accuracy)"
          data={stroopComparisonData}
          series={[
            { key: 'accuracy', label: 'Accuracy (%)', color: CHART_PALETTE.success }
          ]}
          categoryKey="category"
          height={260}
          unit="%"
        />
      </div>
    </div>
  );
}
