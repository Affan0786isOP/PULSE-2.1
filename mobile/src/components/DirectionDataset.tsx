import React, { useMemo, useState } from 'react';
import type { RawTrialObservation } from '../lib/trialStore';
import { DatasetObservation } from '../lib/dataset';
import { VALID_AGE_GROUPS } from '../lib/firestore';
import { DatasetTooltip } from '@shared/dataset/DatasetTooltip';
import {
  medianValue,
  getAgeGroupShortLabel,
  calculateDirectionalProfile,
  calculateDirectionHeatmap,
  calculateDirectionAttemptOutcomes,
  calculateDirectionDerivedConsistency,
  calculateConsistencyDistribution,
  calculateDirectionTrialProgression,
  type DirectionSessionRecord,
} from '@shared/dataset/analytics';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Monitor, Smartphone } from 'lucide-react';

interface DirectionDatasetProps {
  trials: RawTrialObservation[];
  datasetDocs: DatasetObservation[];
}

export function DirectionDataset({ trials, datasetDocs }: DirectionDatasetProps) {
  const [radarMode, setRadarMode] = useState<'accuracy' | 'rt' | 'both'>('accuracy');

  const directionDocs = useMemo<DirectionSessionRecord[]>(() => {
    return datasetDocs.filter(
      (doc) => (doc.assessmentType ?? '').toLowerCase() === 'direction' || doc.assessmentType === undefined
    ) as DirectionSessionRecord[];
  }, [datasetDocs]);

  // ==========================================
  // ROW 1: UNIFIED 4-CARD OVERVIEW
  // ==========================================

  const medianRT = useMemo(() => {
    const sessionRTs = directionDocs
      .map((doc) => Number(doc.medianReactionTime ?? doc.averageReactionTime))
      .filter((v) => Number.isFinite(v) && v >= 80 && v < 3000);
    if (sessionRTs.length > 0) return Math.round(medianValue(sessionRTs));

    const validTrialRTs = trials
      .filter((t) => !t.falseStart && !t.timedOut && t.valid !== false && (t.accuracy === 1 || t.correct === true) && t.reactionTime >= 80 && t.reactionTime < 3000)
      .map((t) => t.reactionTime);
    return Math.round(medianValue(validTrialRTs));
  }, [directionDocs, trials]);

  const medianAccuracy = useMemo(() => {
    const sessionAccs = directionDocs
      .map((doc) => Number(doc.accuracy ?? doc.overallAccuracy))
      .filter((v) => Number.isFinite(v) && v >= 0 && v <= 100);
    if (sessionAccs.length > 0) return Math.round(medianValue(sessionAccs));

    const totalTrials = trials.length;
    const correctTrials = trials.filter((t) => t.accuracy === 1 || t.correct === true).length;
    return totalTrials > 0 ? Math.round((correctTrials / totalTrials) * 100) : 0;
  }, [directionDocs, trials]);

  const deviceData = useMemo(() => {
    const isMobile = (d?: string, dc?: string) =>
      (dc && dc.toLowerCase().includes('mobile')) || (d && d.toLowerCase().includes('mobile'));

    const desktopSessions = directionDocs.filter((doc) => !isMobile(doc.device, doc.deviceCategory));
    const mobileSessions = directionDocs.filter((doc) => isMobile(doc.device, doc.deviceCategory));

    const desktopRTs = desktopSessions
      .map((d) => Number(d.medianReactionTime ?? d.averageReactionTime))
      .filter((v) => Number.isFinite(v) && v >= 80 && v < 3000);
    const mobileRTs = mobileSessions
      .map((d) => Number(d.medianReactionTime ?? d.averageReactionTime))
      .filter((v) => Number.isFinite(v) && v >= 80 && v < 3000);

    const desktopAccs = desktopSessions
      .map((d) => Number(d.accuracy ?? d.overallAccuracy))
      .filter((v) => Number.isFinite(v) && v >= 0 && v <= 100);
    const mobileAccs = mobileSessions
      .map((d) => Number(d.accuracy ?? d.overallAccuracy))
      .filter((v) => Number.isFinite(v) && v >= 0 && v <= 100);

    return {
      desktopRT: desktopRTs.length > 0 ? Math.round(medianValue(desktopRTs)) : 0,
      mobileRT: mobileRTs.length > 0 ? Math.round(medianValue(mobileRTs)) : 0,
      desktopAcc: desktopAccs.length > 0 ? Math.round(medianValue(desktopAccs)) : 0,
      mobileAcc: mobileAccs.length > 0 ? Math.round(medianValue(mobileAccs)) : 0,
    };
  }, [directionDocs]);

  const attemptOutcomes = useMemo(() => {
    return calculateDirectionAttemptOutcomes(directionDocs, trials as unknown as DirectionSessionRecord['progressionTrials']);
  }, [directionDocs, trials]);

  const averageRT = useMemo(() => {
    const sessionAverages = directionDocs
      .map((doc) => Number(doc.averageReactionTime ?? doc.medianReactionTime))
      .filter((v) => Number.isFinite(v) && v >= 80 && v < 3000);
    if (sessionAverages.length === 0) return 0;
    return Math.round(sessionAverages.reduce((acc, v) => acc + v, 0) / sessionAverages.length);
  }, [directionDocs]);

  const averageAccuracy = useMemo(() => {
    const sessionAccs = directionDocs
      .map((doc) => Number(doc.accuracy ?? doc.overallAccuracy))
      .filter((v) => Number.isFinite(v) && v >= 0 && v <= 100);
    if (sessionAccs.length === 0) return 0;
    return Math.round(sessionAccs.reduce((acc, v) => acc + v, 0) / sessionAccs.length);
  }, [directionDocs]);

  // ==========================================
  // ROW 2: AGE COHORTS
  // ==========================================

  const ageCohortData = useMemo(() => {
    return VALID_AGE_GROUPS.map((group) => {
      const short = getAgeGroupShortLabel(group);
      const cohortDocs = directionDocs.filter((doc) => doc.ageGroup === group);

      const rts = cohortDocs
        .map((doc) => Number(doc.medianReactionTime ?? doc.averageReactionTime))
        .filter((v) => Number.isFinite(v) && v >= 80 && v < 3000);

      const accs = cohortDocs
        .map((doc) => Number(doc.accuracy ?? doc.overallAccuracy))
        .filter((v) => Number.isFinite(v) && v >= 0 && v <= 100);

      return {
        ageGroup: short,
        fullGroup: group,
        medianRT: rts.length > 0 ? Math.round(medianValue(rts)) : 0,
        medianAccuracy: accs.length > 0 ? Math.round(medianValue(accs)) : 0,
        n: cohortDocs.length,
      };
    }).filter((item) => item.n > 0);
  }, [directionDocs]);

  // ==========================================
  // ROW 3: DIRECTIONAL PROFILE & SPEED VS ACCURACY
  // ==========================================

  const directionalProfile = useMemo(() => {
    return calculateDirectionalProfile(directionDocs, trials as unknown as DirectionSessionRecord['progressionTrials']);
  }, [directionDocs, trials]);

  const radarAccuracyData = useMemo(() => {
    return directionalProfile.map((d) => ({
      direction: d.direction,
      value: d.accuracy,
    }));
  }, [directionalProfile]);

  const radarRTData = useMemo(() => {
    return directionalProfile.map((d) => ({
      direction: d.direction,
      value: d.medianRT,
    }));
  }, [directionalProfile]);

  const maxDirectionalRT = useMemo(() => {
    const vals = directionalProfile.map((d) => d.medianRT).filter((v) => v > 0);
    return vals.length > 0 ? Math.ceil(Math.max(...vals) / 100) * 100 + 100 : 1000;
  }, [directionalProfile]);

  // Combined radar data with normalized RT (0-100 scale) for single overlayed radar view
  const radarOverlayData = useMemo(() => {
    return directionalProfile.map((d) => ({
      direction: d.direction,
      accuracy: d.accuracy,
      // Normalize RT to 0-100% of maxDirectionalRT so both overlay symmetrically
      rtNormalized: maxDirectionalRT > 0 ? Math.round((d.medianRT / maxDirectionalRT) * 100) : 0,
      rtMs: d.medianRT,
    }));
  }, [directionalProfile, maxDirectionalRT]);

  const heatmapData = useMemo(() => {
    return calculateDirectionHeatmap(directionDocs);
  }, [directionDocs]);

  // ==========================================
  // ROW 4: CONSISTENCY DISTRIBUTION & ATTEMPT OUTCOMES
  // ==========================================

  const consistencyDistributionData = useMemo(() => {
    const derivedRecords = calculateDirectionDerivedConsistency(directionDocs);
    return calculateConsistencyDistribution(derivedRecords, 0);
  }, [directionDocs]);

  const ringOutcomesData = useMemo(() => {
    const list = [
      { name: 'Correct', value: attemptOutcomes.correct, color: '#00f0ff', percent: attemptOutcomes.correctPercent },
      { name: 'Incorrect', value: attemptOutcomes.incorrect, color: '#f59e0b', percent: attemptOutcomes.incorrectPercent },
      { name: 'Premature', value: attemptOutcomes.premature, color: '#ef4444', percent: attemptOutcomes.prematurePercent },
      { name: 'Timeout', value: attemptOutcomes.timeout, color: '#a78bfa', percent: attemptOutcomes.timeoutPercent },
    ].filter((item) => item.value > 0);
    return list;
  }, [attemptOutcomes]);

  // ==========================================
  // ROW 5: TRIAL SEQUENCE PROGRESSION (TRIALS 1–10)
  // ==========================================

  const trialProgressionData = useMemo(() => {
    return calculateDirectionTrialProgression(directionDocs, 10);
  }, [directionDocs]);

  const trialTicks = useMemo(() => {
    const validRTs = trialProgressionData.map((d) => d.overall).filter((v) => v > 0);
    if (validRTs.length === 0) return [400, 600, 800, 1000];
    const min = Math.min(...validRTs);
    const max = Math.max(...validRTs);
    const step = max - min > 300 ? 100 : 50;
    const yMin = Math.floor((min - 30) / step) * step;
    const yMax = Math.ceil((max + 30) / step) * step;
    const ticks: number[] = [];
    for (let t = yMin; t <= yMax; t += step) {
      ticks.push(t);
    }
    return ticks;
  }, [trialProgressionData]);

  const accRows: ('90–100%' | '80–90%' | '70–80%' | '<70%')[] = ['90–100%', '80–90%', '70–80%', '<70%'];
  const rtCols: ('<300ms' | '300–500ms' | '500–700ms' | '700–900ms' | '≥900ms')[] = ['<300ms', '300–500ms', '500–700ms', '700–900ms', '≥900ms'];

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full min-w-0">
      {/* ROW 1: 4-CARD OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 min-w-0">
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <span className="text-[11px] font-mono font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Median Performance
            </span>
            <span className="text-[10px] font-mono text-[var(--cyan-primary)] font-semibold tracking-wider uppercase">
              CRT
            </span>
          </div>
          <div className="my-auto py-2 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-mono text-[var(--text-primary)] font-bold tracking-tight">
                {medianRT > 0 ? medianRT : '—'}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)] uppercase">ms</span>
            </div>
            <div className="w-full max-w-[190px] h-1.5 bg-[var(--border-subtle)] rounded-full mt-2.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(10, ((medianRT - 250) / 600) * 100))}%`,
                  backgroundColor: 'var(--cyan-primary)',
                }}
              />
            </div>
            <div className="flex items-center justify-between w-full max-w-[190px] mt-1 text-[9px] font-mono text-[var(--text-muted)]">
              <span>250ms</span>
              <span>850ms</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
            <span>Median Accuracy</span>
            <span className="font-bold text-[var(--cyan-primary)]">{medianAccuracy > 0 ? `${medianAccuracy}%` : '—'}</span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs min-w-0">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <span className="text-[11px] font-mono font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Device Comparison
            </span>
            <span className="text-[10px] font-mono text-purple-400 font-semibold tracking-wider uppercase">
              RT / ACC
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 my-auto py-2 divide-x divide-[var(--border-subtle)] text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] mb-1">
                <Monitor className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span>Desktop</span>
              </div>
              <span className="text-2xl font-mono text-[#00f0ff] font-bold">
                {deviceData.desktopRT > 0 ? `${deviceData.desktopRT} ms` : '—'}
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                {deviceData.desktopAcc > 0 ? `${deviceData.desktopAcc}% acc` : '—'}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center pl-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] mb-1">
                <Smartphone className="w-3.5 h-3.5 text-[#a78bfa]" />
                <span>Mobile</span>
              </div>
              <span className="text-2xl font-mono text-[#a78bfa] font-bold">
                {deviceData.mobileRT > 0 ? `${deviceData.mobileRT} ms` : '—'}
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                {deviceData.mobileAcc > 0 ? `${deviceData.mobileAcc}% acc` : '—'}
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
            <span>Spatial Input</span>
            <span>Arrow / Touch</span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs min-w-0">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <span className="text-[11px] font-mono font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Total Attempts
            </span>
            <span className="text-[10px] font-mono text-[var(--cyan-primary)] font-semibold tracking-wider uppercase">
              RECORDED
            </span>
          </div>
          <div className="my-auto py-2 flex flex-col items-center justify-center text-center">
            <span className="text-3xl sm:text-4xl font-mono text-[var(--text-primary)] font-bold tracking-tight">
              {attemptOutcomes.totalAttempts.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase mt-1">Total Attempts</span>
          </div>
          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
            <span>Total Correct</span>
            <span className="font-bold text-[var(--color-success)]">{attemptOutcomes.correct.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs min-w-0">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <span className="text-[11px] font-mono font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Average Performance
            </span>
            <span className="text-[10px] font-mono text-[var(--color-success)] font-semibold tracking-wider uppercase">
              POPULATION
            </span>
          </div>
          <div className="my-auto py-2 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-mono text-[var(--color-success)] font-bold tracking-tight">
                {averageRT > 0 ? averageRT : '—'}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)] uppercase">ms</span>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase mt-1">Mean Reaction Time</span>
          </div>
          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
            <span>Average Accuracy</span>
            <span className="font-bold text-[var(--color-success)]">{averageAccuracy > 0 ? `${averageAccuracy}%` : '—'}</span>
          </div>
        </div>
      </div>

      {/* ROW 2: AGE COHORTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Median RT by Age Group
            </h3>
            <span className="text-[10px] font-mono text-[var(--cyan-primary)] font-semibold tracking-wider uppercase">
              MEDIAN RT (MS)
            </span>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageCohortData} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ageGroup" stroke="var(--chart-text)" fontSize={10} fontFamily="monospace" tickLine={false} />
                <YAxis stroke="var(--chart-text)" fontSize={10} fontFamily="monospace" tickLine={false} axisLine={false} unit="ms" />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={<DatasetTooltip variant="direction" />}
                  allowEscapeViewBox={{ x: false, y: true }}
                />
                <Bar dataKey="medianRT" name="Median RT" fill="var(--cyan-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Median Accuracy by Age Group
            </h3>
            <span className="text-[10px] font-mono text-[var(--color-success)] font-semibold tracking-wider uppercase">
              ACCURACY %
            </span>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageCohortData} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ageGroup" stroke="var(--chart-text)" fontSize={10} fontFamily="monospace" tickLine={false} />
                <YAxis domain={[0, 100]} stroke="var(--chart-text)" fontSize={10} fontFamily="monospace" tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={<DatasetTooltip variant="direction" />}
                  allowEscapeViewBox={{ x: false, y: true }}
                />
                <Bar dataKey="medianAccuracy" name="Median Accuracy" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 3: DIRECTIONAL PROFILE & SPEED VS ACCURACY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col min-w-0 shadow-xs relative overflow-hidden">
          <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-4">
            <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Directional Profile
            </span>
            <div className="flex items-center gap-1 bg-[var(--border-subtle)]/40 p-0.5 rounded-lg text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setRadarMode('accuracy')}
                className={`px-2 py-1 rounded transition-colors ${
                  radarMode === 'accuracy'
                    ? 'bg-[var(--cyan-primary)] text-black font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Accuracy %
              </button>
              <button
                type="button"
                onClick={() => setRadarMode('rt')}
                className={`px-2 py-1 rounded transition-colors ${
                  radarMode === 'rt'
                    ? 'bg-[#a78bfa] text-black font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Reaction Time
              </button>
              <button
                type="button"
                onClick={() => setRadarMode('both')}
                className={`px-2 py-1 rounded transition-colors ${
                  radarMode === 'both'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Both
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[260px] sm:min-h-[290px] w-full flex items-center justify-center">
            {radarMode === 'both' ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarOverlayData} outerRadius="72%">
                  <PolarGrid stroke="var(--border-strong)" strokeOpacity={0.4} />
                  <PolarAngleAxis dataKey="direction" tick={{ fill: 'var(--chart-text)', fontSize: 11, fontFamily: 'monospace' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload as { direction: string; accuracy: number; rtMs: number } | undefined;
                      if (!d) return null;
                      return (
                        <div className="bg-[var(--bg-surface-solid)] backdrop-blur-md border border-[var(--border-subtle)] rounded-lg p-3 shadow-xl font-mono text-xs z-50 text-[var(--text-primary)]">
                          <div className="text-[var(--text-muted)] font-semibold mb-1.5 border-b border-[var(--border-subtle)] pb-1">
                            {label}
                          </div>
                          <div className="flex items-center justify-between gap-4 py-0.5 text-[var(--cyan-primary)]">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[var(--cyan-primary)]" />
                              <span className="text-[var(--text-secondary)]">Accuracy:</span>
                            </div>
                            <span className="font-bold">{d.accuracy}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 py-0.5 text-[#a78bfa]">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#a78bfa]" />
                              <span className="text-[var(--text-secondary)]">Reaction Time:</span>
                            </div>
                            <span className="font-bold">{d.rtMs} ms</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    formatter={(value) => (
                      <span className="text-[10px] font-mono font-medium text-[var(--text-secondary)]">
                        {value === 'Accuracy' ? 'Accuracy (0–100%)' : `Reaction Time (0–${maxDirectionalRT}ms)`}
                      </span>
                    )}
                  />
                  <Radar
                    name="Accuracy"
                    dataKey="accuracy"
                    stroke="var(--cyan-primary)"
                    strokeWidth={2}
                    fill="var(--cyan-primary)"
                    fillOpacity={0.25}
                    dot={{ r: 3, fill: 'var(--cyan-primary)' }}
                    activeDot={{ r: 5 }}
                  />
                  <Radar
                    name="Reaction Time"
                    dataKey="rtNormalized"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    fill="#a78bfa"
                    fillOpacity={0.25}
                    dot={{ r: 3, fill: '#a78bfa' }}
                    activeDot={{ r: 5 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : radarMode === 'accuracy' ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarAccuracyData} outerRadius="72%">
                  <PolarGrid stroke="var(--border-strong)" strokeOpacity={0.4} />
                  <PolarAngleAxis dataKey="direction" tick={{ fill: 'var(--chart-text)', fontSize: 11, fontFamily: 'monospace' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--chart-text)', fontSize: 9 }} axisLine={false} />
                  <Tooltip content={<DatasetTooltip variant="direction" />} />
                  <Radar name="Accuracy" dataKey="value" stroke="var(--cyan-primary)" strokeWidth={2} fill="var(--cyan-primary)" fillOpacity={0.28} dot={{ r: 3, fill: 'var(--cyan-primary)' }} activeDot={{ r: 5 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarRTData} outerRadius="72%">
                  <PolarGrid stroke="var(--border-strong)" strokeOpacity={0.4} />
                  <PolarAngleAxis dataKey="direction" tick={{ fill: 'var(--chart-text)', fontSize: 11, fontFamily: 'monospace' }} />
                  <PolarRadiusAxis angle={30} domain={[0, maxDirectionalRT]} tick={{ fill: 'var(--chart-text)', fontSize: 9 }} axisLine={false} />
                  <Tooltip content={<DatasetTooltip variant="direction" />} />
                  <Radar name="Median RT" dataKey="value" stroke="#a78bfa" strokeWidth={2} fill="#a78bfa" fillOpacity={0.28} dot={{ r: 3, fill: '#a78bfa' }} activeDot={{ r: 5 }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col min-w-0 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Speed vs Accuracy Heatmap
            </h3>
            <span className="text-[10px] font-mono text-[var(--cyan-primary)] font-semibold tracking-wider uppercase">
              4 × 5 DENSITY MATRIX
            </span>
          </div>

          <div className="flex-1 w-full flex flex-col justify-between py-1 min-h-[260px] sm:min-h-[290px]">
            <div className="grid grid-cols-[68px_repeat(5,1fr)] gap-1.5 w-full text-center font-mono">
              <div className="text-[9px] text-[var(--text-muted)] self-end pb-1 text-left">ACC \ RT</div>
              {rtCols.map((rt) => (
                <div key={rt} className="text-[9px] text-[var(--text-muted)] truncate px-0.5 pb-1">
                  {rt}
                </div>
              ))}

              {accRows.map((acc) => (
                <React.Fragment key={acc}>
                  <div className="text-[10px] text-[var(--text-muted)] font-medium self-center text-left py-2 truncate">
                    {acc}
                  </div>
                  {rtCols.map((rt) => {
                    const cell = heatmapData.cells.find((c) => c.accuracyBand === acc && c.rtBand === rt);
                    const count = cell?.count || 0;
                    const max = heatmapData.maxCount > 0 ? heatmapData.maxCount : 1;
                    const alpha = count > 0 ? Math.max(0.18, (count / max) * 0.85) : 0.04;
                    return (
                      <div
                        key={`${acc}-${rt}`}
                        title={`${acc} accuracy • ${rt} latency: ${count} sessions`}
                        className="h-10 rounded-md border border-[var(--border-subtle)]/60 flex flex-col items-center justify-center transition-transform hover:scale-105 cursor-default relative group"
                        style={{
                          backgroundColor: count > 0 ? `rgba(0, 240, 255, ${alpha})` : 'rgba(255, 255, 255, 0.02)',
                        }}
                      >
                        <span className={`text-xs font-bold ${count > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]/40'}`}>
                          {count > 0 ? count : '·'}
                        </span>
                        <div className="hidden group-hover:flex flex-col absolute bottom-full mb-1.5 z-30 bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-primary)] p-1.5 rounded shadow-lg whitespace-nowrap pointer-events-none">
                          <span className="font-bold text-[var(--cyan-primary)]">{count} session{count === 1 ? '' : 's'}</span>
                          <span className="text-[var(--text-muted)]">{acc} acc • {rt}</span>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
              <span>Cell values: Contributing session counts</span>
              <div className="flex items-center gap-1.5">
                <span>Low</span>
                <div className="w-16 h-2 rounded bg-gradient-to-r from-[rgba(0,240,255,0.15)] to-[rgba(0,240,255,0.85)]" />
                <span>High</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 4: CONSISTENCY DISTRIBUTION & ATTEMPT OUTCOMES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 shadow-sm min-w-0 overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Consistency Distribution
            </h3>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
                <span className="text-[var(--text-muted)]">Desktop</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#a78bfa]" />
                <span className="text-[var(--text-muted)]">Mobile</span>
              </span>
            </div>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consistencyDistributionData} margin={{ top: 8, right: 12, left: -22, bottom: 4 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="var(--chart-text)" fontSize={10} fontFamily="monospace" tickLine={false} />
                <YAxis stroke="var(--chart-text)" fontSize={10} fontFamily="monospace" tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={<DatasetTooltip variant="standard" />}
                  allowEscapeViewBox={{ x: false, y: true }}
                />
                <Bar dataKey="desktop" name="Desktop" stackId="consistency" fill="#00f0ff" radius={[0, 0, 0, 0]} />
                <Bar dataKey="mobile" name="Mobile" stackId="consistency" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col min-w-0 shadow-xs relative overflow-hidden">
          <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-4">
            <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Attempt Outcomes
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)] font-semibold tracking-wider uppercase">
              {attemptOutcomes.totalAttempts} TOTAL ATTEMPTS
            </span>
          </div>

          <div className="flex-1 min-h-[220px] sm:min-h-[250px] w-full flex flex-col items-center justify-center">
            <div className="relative mx-auto aspect-square w-full max-w-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ringOutcomesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {ringOutcomesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload || !payload[0]) return null;
                      const d = payload[0].payload as { name: string; value: number; percent: number; color: string };
                      return (
                        <div className="bg-[var(--bg-surface-solid)] border border-[var(--border-subtle)] rounded-lg p-2.5 shadow-xl font-mono text-xs text-[var(--text-primary)]">
                          <div className="flex items-center gap-1.5 mb-1" style={{ color: d.color }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="font-bold">{d.name}</span>
                          </div>
                          <div className="text-[var(--text-muted)]">
                            {d.value.toLocaleString()} attempts ({d.percent}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                  {attemptOutcomes.correctPercent}%
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-success)] font-semibold">
                  Accuracy
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full pt-3 mt-2 border-t border-[var(--border-subtle)] text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
                <span className="text-[var(--text-muted)]">Correct: {attemptOutcomes.correct}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                <span className="text-[var(--text-muted)]">Incorrect: {attemptOutcomes.incorrect}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                <span className="text-[var(--text-muted)]">Premature: {attemptOutcomes.premature}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#a78bfa]" />
                <span className="text-[var(--text-muted)]">Timeout: {attemptOutcomes.timeout}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 5: TRIAL PROGRESSION */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 shadow-sm min-w-0 overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
          <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
            Trial Sequence Progression (Trials 1–10)
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
            <span className="text-[var(--cyan-primary)] font-semibold">Overall RT</span>
          </div>
        </div>
        <div className="h-64 sm:h-72 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trialProgressionData} margin={{ top: 10, right: 15, left: -18, bottom: 5 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="trialLabel"
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
                domain={['dataMin - 30', 'dataMax + 30']}
                ticks={trialTicks}
              />
              <Tooltip
                content={<DatasetTooltip variant="direction" />}
                allowEscapeViewBox={{ x: false, y: true }}
                wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
              />
              <Line
                type="monotone"
                dataKey="overall"
                name="Overall RT"
                stroke="#00f0ff"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#00f0ff', strokeWidth: 0 }}
                activeDot={{ r: 5.5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
