import React, { useMemo } from 'react';
import { RawTrialObservation } from '../lib/trialStore';
import { DatasetObservation } from '../lib/dataset';

import {
  Gauge,
  RadarChart,
  RadarGrid,
  RadarAxis,
  RadarArea,
  RadarLabels,
  BarChart,
  Bar,
  BarXAxis,
  XAxis,
  YAxis,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  RingChart,
  Ring,
  RingCenter,
  Grid
} from '../bklit-ui/charts';

interface DirectionDatasetProps {
  trials: RawTrialObservation[];
  datasetDocs: DatasetObservation[];
}

export function DirectionDataset({ trials, datasetDocs }: DirectionDatasetProps) {
  // 1. Median Reaction Time
  const medianRT = useMemo(() => {
    const validRTs = trials
      .filter((t) => !t.falseStart && t.accuracy === 1 && t.reactionTime > 80 && t.reactionTime < 2000)
      .map((t) => t.reactionTime);

    if (validRTs.length === 0) {
      const publicRTs = datasetDocs
        .map((d) => Number(d.medianReactionTime || d.averageReactionTime))
        .filter((rt) => rt > 80 && rt < 2000);
      
      if (publicRTs.length === 0) return 0;
      publicRTs.sort((a, b) => a - b);
      return Math.round(publicRTs[Math.floor(publicRTs.length / 2)]);
    }

    validRTs.sort((a, b) => a - b);
    return Math.round(validRTs[Math.floor(validRTs.length / 2)]);
  }, [trials, datasetDocs]);

  // 2. Directional Profile (Radar)
  const radarData = useMemo(() => {
    const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    const accByDir: Record<string, { correct: number; total: number }> = {
      UP: { correct: 0, total: 0 },
      DOWN: { correct: 0, total: 0 },
      LEFT: { correct: 0, total: 0 },
      RIGHT: { correct: 0, total: 0 },
    };

    trials.forEach((t) => {
      const dir = t.condition?.replace('arrow-', '').toUpperCase();
      if (directions.includes(dir)) {
        accByDir[dir].total++;
        if (t.accuracy === 1) accByDir[dir].correct++;
      }
    });

    const values: Record<string, number> = {};
    directions.forEach((dir) => {
      const { correct, total } = accByDir[dir];
      values[dir] = total > 0 ? (correct / total) * 100 : 0;
    });

    return [{
      label: 'Accuracy %',
      values
    }];
  }, [trials]);

  const radarMetrics = [
    { key: 'UP', label: 'UP' },
    { key: 'RIGHT', label: 'RIGHT' },
    { key: 'DOWN', label: 'DOWN' },
    { key: 'LEFT', label: 'LEFT' },
  ];

  // 3. Age Group Comparison (Bar)
  const ageGroupData = useMemo(() => {
    const groups: Record<string, number[]> = {};
    datasetDocs.forEach((d) => {
      if (!d.ageGroup || d.ageGroup === 'Unknown') return;
      if (!groups[d.ageGroup]) groups[d.ageGroup] = [];
      const rt = Number(d.medianReactionTime || d.averageReactionTime);
      if (rt > 0 && rt < 2000) groups[d.ageGroup].push(rt);
    });

    const sortedGroups = Object.keys(groups).sort();
    return sortedGroups.map((g) => {
      const rts = groups[g];
      rts.sort((a, b) => a - b);
      const median = rts.length > 0 ? rts[Math.floor(rts.length / 2)] : 0;
      return { ageGroup: g, medianRT: median };
    }).filter((d) => d.medianRT > 0);
  }, [datasetDocs]);

  // 4. Speed-Accuracy (Scatter)
  const scatterData = useMemo(() => {
    return trials
      .filter((t) => t.reactionTime > 0 && t.reactionTime < 2000)
      .map((t, i) => ({
        trial: t.trialNumber || i + 1,
        rt: t.reactionTime,
        accuracy: t.accuracy === 1 ? 1 : 0
      }));
  }, [trials]);

  // 5. Line (Trial Sequence)
  const lineData = useMemo(() => {
    return trials
      .filter((t) => !t.falseStart && t.accuracy === 1)
      .map((t, i) => ({
        trial: i + 1,
        reactionTime: t.reactionTime
      }));
  }, [trials]);

  // 6. Response Outcomes (Ring)
  const ringData = useMemo(() => {
    let correct = 0, incorrect = 0, falseStart = 0;
    trials.forEach((t) => {
      if (t.falseStart) falseStart++;
      else if (t.accuracy === 1) correct++;
      else incorrect++;
    });

    const total = correct + incorrect + falseStart;
    if (total === 0) return [];

    return [
      { label: 'Correct', value: correct, maxValue: total, color: 'var(--chart-2)' },
      { label: 'Incorrect', value: incorrect, maxValue: total, color: 'var(--chart-1)' },
      { label: 'False Start', value: falseStart, maxValue: total, color: 'var(--chart-3)' },
    ];
  }, [trials]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full min-w-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        
        {/* Median RT (Gauge) */}
        <div className="order-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col items-center justify-between shadow-sm relative overflow-hidden min-w-0">
          <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-4">
            <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Median Reaction Time
            </span>
          </div>
          <Gauge value={medianRT > 0 ? medianRT : 250} centerValue={medianRT} suffix="ms" />
        </div>

        {/* Directional Profile (Radar) */}
        <div className="order-2 lg:col-span-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col min-w-0 shadow-sm relative overflow-hidden">
          <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-4">
            <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Directional Profile
            </span>
          </div>
          <div className="flex-1 min-h-[250px] w-full flex items-center justify-center">
            {trials.length > 0 ? (
              <RadarChart data={radarData} metrics={radarMetrics}>
                <RadarGrid />
                <RadarAxis />
                <RadarArea index={0} />
                <RadarLabels />
              </RadarChart>
            ) : (
              <span className="text-[var(--text-muted)] font-mono text-sm">NO DATA</span>
            )}
          </div>
        </div>

        {/* Response Outcomes (Ring) */}
        <div className="order-3 lg:col-span-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col min-w-0 shadow-sm relative overflow-hidden">
          <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-4">
            <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Response Outcomes
            </span>
          </div>
          <div className="flex-1 min-h-[250px] w-full flex items-center justify-center">
             {ringData.length > 0 ? (
               <RingChart data={ringData} strokeWidth={16} ringGap={8}>
                 <RingCenter />
                 {ringData.map((r, i) => (
                   <Ring key={i} index={i} color={r.color} />
                 ))}
               </RingChart>
             ) : (
               <span className="text-[var(--text-muted)] font-mono text-sm">NO DATA</span>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        
        {/* Age Group Comparison (Bar) */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 shadow-sm min-w-0 overflow-hidden">
          <div className="pb-4 mb-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Age Cohort Medians
            </h3>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <BarChart data={ageGroupData} xDataKey="ageGroup">
              <Grid />
              <YAxis />
              <BarXAxis />
              <Bar dataKey="medianRT" fill="var(--cyan-primary)" />
            </BarChart>
          </div>
        </div>

        {/* Speed-Accuracy (Scatter) */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 shadow-sm min-w-0 overflow-hidden">
          <div className="pb-4 mb-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Speed vs Accuracy
            </h3>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ScatterChart data={scatterData} xDataKey="rt">
              <Grid />
              <YAxis />
              <XAxis />
              <Scatter dataKey="accuracy" fill="var(--chart-3)" radius={4} />
            </ScatterChart>
          </div>
        </div>

        {/* Trial Sequence (Line) */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 shadow-sm min-w-0 overflow-hidden lg:col-span-2">
          <div className="pb-4 mb-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Trial Sequence
            </h3>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <LineChart data={lineData} xDataKey="trial">
              <Grid />
              <YAxis />
              <XAxis />
              <Line dataKey="reactionTime" stroke="var(--cyan-primary)" strokeWidth={2} />
            </LineChart>
          </div>
        </div>
        
      </div>
    </div>
  );
}
