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
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricStatVisual label="Inhibitory Control Cost" value={stats.interferenceCost} unit="ms" subtext="Latency penalty for incongruency" />
        <MetricStatVisual label="Congruent Reflex RT" value={stats.congruentMeanRt} unit="ms" subtext="Mean semantic matching latency" />
        <MetricStatVisual label="Incongruent Semantic RT" value={stats.incongruentMeanRt} unit="ms" subtext="Mean semantic interference latency" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HistogramDistribution
          bins={stats.histogram}
          mean={stats.overallMeanRt}
          median={stats.overallMedianRt}
          title="Semantic Interference Latency Density"
          subtitle="Combined density distribution of both congruent and incongruent trials"
          unit="ms"
          height={300}
        />

        <div className="flex flex-col gap-4">
          <GroupedComparisonChart
            title="Stroop Effect Latency Delta"
            subtitle="Mean reaction processing delay segmented by stimulus congruency"
            data={stroopComparisonData}
            series={[{ key: 'meanLatency', label: 'Mean RT (ms)', color: CHART_PALETTE.primary }]}
            categoryKey="category"
            height={200}
          />
          <GroupedComparisonChart
            title="Inhibitory Control Accuracy"
            subtitle="Correct decision probability segmented by stimulus congruency"
            data={stroopComparisonData}
            series={[{ key: 'accuracy', label: 'Accuracy (%)', color: CHART_PALETTE.success }]}
            categoryKey="category"
            height={200}
            unit="%"
          />
        </div>
      </div>
    </div>
  );
}
