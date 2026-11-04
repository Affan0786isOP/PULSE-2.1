import React, { useMemo } from 'react';
import type { RawTrialObservation } from '../lib/trialStore';
import { DatasetObservation } from '../lib/dataset';
import { VALID_AGE_GROUPS } from '../lib/firestore';
import { DatasetTooltip } from '@shared/dataset/DatasetTooltip';
import { medianValue, getAgeGroupShortLabel } from '@shared/dataset/analytics';
import { MedianRtGauge } from '@shared/dataset/MedianRtGauge';
import {
  ResponsiveContainer, ScatterChart, Scatter, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart as RechartsRadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart as RechartsBarChart, Bar, RadialBarChart, RadialBar, Cell,
} from 'recharts';


interface DirectionDatasetProps {
  trials: RawTrialObservation[];
  datasetDocs: DatasetObservation[];
}


export function DirectionDataset({ trials, datasetDocs }: DirectionDatasetProps) {
  // Use observed trial latencies; if trial-level records are unavailable, use real session summaries.
  const medianRT = useMemo(() => {
    const validRTs = trials
      .filter((t) => !t.falseStart && t.accuracy === 1 && t.valid !== false && !t.timedOut && t.reactionTime > 80 && t.reactionTime < 2000)
      .map((t) => t.reactionTime);
    if (validRTs.length > 0) return Math.round(medianValue(validRTs));

    const sessionRTs = datasetDocs
      .map((doc) => Number(doc.medianReactionTime ?? doc.averageReactionTime))
      .filter((value) => Number.isFinite(value) && value > 80 && value < 2000);
    return Math.round(medianValue(sessionRTs));
  }, [trials, datasetDocs]);

  // 2. Directional Profile (Radar)

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
      if (dir && directions.includes(dir)) {
        accByDir[dir].total++;
        if (t.accuracy === 1) accByDir[dir].correct++;
      }
    });

    const values: Record<string, number> = {};
    let hasTrialData = false;

    directions.forEach((dir) => {
      const { correct, total } = accByDir[dir];
      if (total > 0) {
        hasTrialData = true;
        values[dir] = Math.round((correct / total) * 100);
      }
    });



    return [{
      label: 'Accuracy %',
      color: 'var(--cyan-primary)',
      values
    }];
  }, [trials]);

  // Radar domain min dynamically calculated
  const radarDomain = useMemo<[number, number]>(() => {
    const vals = Object.values(radarData[0]?.values || {});
    if (vals.length === 0) return [0, 100];
    const minVal = Math.min(...vals);
    const domainMin = Math.max(0, Math.floor((minVal - 10) / 10) * 10);
    return [domainMin, 100];
  }, [radarData]);

  const radarMetrics = [
    { key: 'UP', label: 'UP' },
    { key: 'RIGHT', label: 'RIGHT' },
    { key: 'DOWN', label: 'DOWN' },
    { key: 'LEFT', label: 'LEFT' },
  ];

  const radarChartData = useMemo(() => {
    const values = radarData[0]?.values || {};
    return radarMetrics.map(({ key, label }) => ({
      direction: label,
      accuracy: values[key] ?? 0,
    }));
  }, [radarData]);

  // Cohort comparisons use one measured session summary per assessment.
  const ageGroupData = useMemo(() => {
    return VALID_AGE_GROUPS.map((fullGroup) => {
      const short = getAgeGroupShortLabel(fullGroup);
      const sessionRTs = datasetDocs
        .filter((doc) => doc.ageGroup === fullGroup)
        .map((doc) => Number(doc.medianReactionTime ?? doc.averageReactionTime))
        .filter((value) => Number.isFinite(value) && value > 80 && value < 2000);
      return {
        ageGroup: `${short} (n=${sessionRTs.length})`,
        medianRT: Math.round(medianValue(sessionRTs)),
        n: sessionRTs.length
      };
    }).filter((entry) => entry.n > 0);
  }, [datasetDocs]);

  // Speed-accuracy points come only from observed trials with a known accuracy value.
  const scatterData = useMemo(() => {
    return trials
      .filter((t) => !t.falseStart && t.reactionTime > 80 && t.reactionTime < 2000 && Number.isFinite(t.accuracy))
      .map((t, i) => ({
        trial: t.trialNumber || i + 1,
        rt: t.reactionTime,
        accuracy: t.accuracy === 1 ? 1 : 0
      }));
  }, [trials]);

  // Trial progression uses only measurements actually observed at each trial number.
  const lineData = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((trialNum) => {
      const matching = trials.filter((trial, index) =>
        (trial.trialNumber === trialNum || (trial.trialNumber === undefined && ((index % 10) + 1 === trialNum))) &&
        !trial.falseStart && trial.valid !== false && !trial.timedOut &&
        trial.reactionTime > 80 && trial.reactionTime < 3000
      );
      const desktopRTs = matching
        .filter((trial) => !trial.device || !trial.device.toLowerCase().includes('mobile'))
        .map((trial) => trial.reactionTime);
      const mobileRTs = matching
        .filter((trial) => trial.device && trial.device.toLowerCase().includes('mobile'))
        .map((trial) => trial.reactionTime);
      const allRTs = matching.map((trial) => trial.reactionTime);
      return {
        trial: trialNum,
        trialLabel: `Trial ${trialNum}`,
        desktop: desktopRTs.length ? Math.round(medianValue(desktopRTs)) : null,
        mobile: mobileRTs.length ? Math.round(medianValue(mobileRTs)) : null,
        reactionTime: allRTs.length ? Math.round(medianValue(allRTs)) : null,
        n: matching.length
      };
    }).filter((entry) => entry.n > 0);
  }, [trials]);

  // Response outcome counts are derived from measured trial records only.
  const ringData = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let falseStart = 0;
    trials.forEach((trial) => {
      if (trial.falseStart) falseStart++;
      else if (typeof trial.correct === 'boolean' ? trial.correct : Number.isFinite(trial.accuracy) && trial.accuracy === 1) correct++;
      else if (Number.isFinite(trial.accuracy)) incorrect++;
    });

    const total = correct + incorrect + falseStart;
    if (total === 0) return [];
    return [
      { label: 'Correct', value: correct, maxValue: total, color: 'var(--color-success)' },
      { label: 'Incorrect', value: incorrect, maxValue: total, color: 'var(--color-error)' },
      { label: 'False Start', value: falseStart, maxValue: total, color: 'var(--color-idle)' },
    ];
  }, [trials]);

  const ringChartData = useMemo(() => ringData.map((ring) => ({ ...ring, percent: ring.maxValue > 0 ? (ring.value / ring.maxValue) * 100 : 0 })), [ringData]);
  const ringTotal = useMemo(() => ringData.reduce((total, ring) => total + ring.value, 0), [ringData]);

  // Percentage gauge value mapped to 0-100% scale for notched meter  // Percentage gauge value mapped to 0-100% scale for notched meter
  const gaugePercent = medianRT > 0 ? Math.min(100, Math.max(10, Math.round((medianRT / 800) * 100))) : 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full min-w-0">
      {/* Top Row: Gauge, Radar, Ring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        
        {/* Median RT (Gauge) */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col items-center justify-between shadow-xs relative overflow-hidden min-w-0">
          <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-4">
            <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Median Reaction Time
            </span>
            <span className="text-[10px] font-mono text-[var(--cyan-primary)] font-semibold tracking-wider uppercase">
              DIRECTION
            </span>
          </div>
          <div className="w-full flex items-center justify-center my-auto py-2">
            {medianRT > 0 ? (
              <MedianRtGauge
                value={gaugePercent}
                centerValue={medianRT}
                activeFill="var(--cyan-primary)"
                inactiveFill="rgba(255, 255, 255, 0.1)"
              />
            ) : (
              <span className="font-mono text-sm text-[var(--text-muted)]">NO DATA</span>
            )}
          </div>
        </div>

        {/* Directional Profile (Radar) */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col min-w-0 shadow-xs relative overflow-hidden">
          <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-4">
            <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Directional Profile
            </span>
            <span className="text-[10px] font-mono text-[var(--color-success)] font-semibold tracking-wider uppercase">
              ACCURACY %
            </span>
          </div>
          <div className="flex-1 min-h-[220px] sm:min-h-[250px] w-full flex items-center justify-center">
            {Object.keys(radarData[0]?.values || {}).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsRadarChart data={radarChartData} outerRadius="72%">
                  <PolarGrid stroke="var(--border-strong)" strokeOpacity={0.4} />
                  <PolarAngleAxis dataKey="direction" tick={{ fill: 'var(--chart-text)', fontSize: 11, fontFamily: 'monospace' }} />
                  <PolarRadiusAxis angle={30} domain={radarDomain} tick={false} axisLine={false} />
                  <Radar name="Accuracy" dataKey="accuracy" stroke="var(--cyan-primary)" strokeWidth={2} fill="var(--cyan-primary)" fillOpacity={0.28} dot={{ r: 3, fill: "var(--cyan-primary)" }} activeDot={{ r: 5 }} />
                </RechartsRadarChart>
              </ResponsiveContainer>
            ) : (
              <span className="font-mono text-sm text-[var(--text-muted)]">NO DATA</span>
            )}
          </div>
        </div>

        {/* Response Outcomes (Ring) */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col min-w-0 shadow-xs relative overflow-hidden">
          <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-4">
            <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Response Outcomes
            </span>
            <span className="text-[10px] font-mono text-purple-400 font-semibold tracking-wider uppercase">
              DISTRIBUTION
            </span>
          </div>
          <div className="flex-1 min-h-[220px] sm:min-h-[250px] w-full flex items-center justify-center">
            <div className="relative mx-auto aspect-square w-full max-w-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart data={ringChartData} innerRadius="34%" outerRadius="86%" startAngle={-90} endAngle={270} barSize={14}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="percent" cornerRadius={7} background={{ fill: 'var(--border-subtle)' }}>
                    {ringChartData.map((ring, index) => <Cell key={`ring-${index}`} fill={ring.color} />)}
                  </RadialBar>
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-xl font-bold text-[var(--text-primary)]">{ringTotal.toLocaleString()}</span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">Total</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Bar, Scatter, Line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        
        {/* Age Group Comparison (Bar) */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Age Cohort Medians
            </h3>
            <span className="text-[10px] font-mono text-[var(--text-subtle)]">
              MEDIAN RT (MS)
            </span>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={ageGroupData} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ageGroup" stroke="var(--chart-text)" fontSize={10} fontFamily="monospace" tickLine={false} />
                <YAxis stroke="var(--chart-text)" fontSize={10} fontFamily="monospace" tickLine={false} axisLine={false} unit="ms" />
                <Bar dataKey="medianRT" name="Median RT" fill="var(--cyan-primary)" radius={[6, 6, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Speed-Accuracy (Scatter) */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Speed vs Accuracy
            </h3>
            <span className="text-[10px] font-mono text-[var(--text-subtle)]">
              1 = ACCURATE, 0 = ERROR
            </span>
          </div>
          <div className="h-64 sm:h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="rt"
                  name="Reaction Time"
                  unit="ms"
                  stroke="var(--chart-text)"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  domain={['auto', 'auto']}
                />
                <YAxis
                  dataKey="accuracy"
                  name="Accuracy"
                  ticks={[0, 1]}
                  tickFormatter={(val) => val === 1 ? '1.0' : '0.0'}
                  stroke="var(--chart-text)"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  axisLine={false}
                  domain={[-0.2, 1.2]}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }}
                  content={<DatasetTooltip variant="direction" />}
                  allowEscapeViewBox={{ x: false, y: true }}
                  wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                />
                <Scatter
                  name="Accuracy"
                  data={scatterData}
                  fill="var(--cyan-primary)"
                  opacity={0.85}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trial Sequence (Line) */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 shadow-sm min-w-0 overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Trial Sequence Progression
            </h3>
            <span className="text-[10px] font-mono text-[var(--cyan-primary)]">
              RT OVER TIME
            </span>
          </div>
          <div className="h-64 sm:h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="trial"
                  tickFormatter={(t) => 'Trial ' + t}
                  stroke="var(--chart-text)"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--chart-text)"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  axisLine={false}
                  unit="ms"
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={<DatasetTooltip variant="direction" />}
                  allowEscapeViewBox={{ x: false, y: true }}
                  wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                />
                <Line
                  type="monotone"
                  dataKey="desktop"
                  name="Desktop RT"
                  stroke="#00f0ff"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#00f0ff', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="mobile"
                  name="Mobile RT"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="reactionTime"
                  name="Overall RT"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
      </div>
    </div>
  );
}
