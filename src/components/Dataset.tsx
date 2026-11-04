import React, { useEffect, useState, useMemo } from 'react';
import { PageShell } from './layout/PageShell';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import type { RawTrialObservation } from '../lib/trialStore';
import { fetchDatasetObservations, unrollTrialsFromDatasetDocs, DatasetObservation } from '../lib/dataset';
import { VALID_AGE_GROUPS, AssessmentType } from '../lib/firestore';
import { ChevronLeft, ChevronRight, Zap, Compass, Palette, Grid, Hash, Monitor, Smartphone } from 'lucide-react';
import { DirectionDataset } from './DirectionDataset';
import {
  calculateTrialProgression,
  calculateConsistencyDistribution,
  calculateForeperiodAggregation,
  calculatePopulationTrialProgression,
  calculateTrialValidityBreakdown,
  calculateIqr,
  getAgeGroupShortLabel, medianValue,
} from '@shared/dataset/analytics';
import { DatasetTooltip } from '@shared/dataset/DatasetTooltip';

export const MIN_COHORT_N = 5;

const DATASET_GAMES: { id: AssessmentType; name: string; icon: React.ElementType; unit: string }[] = [
  { id: 'visual-reaction', name: 'VISUAL REACTION', icon: Zap, unit: 'ms' },
  { id: 'direction', name: 'DIRECTION', icon: Compass, unit: 'ms' },
  { id: 'color-recognition', name: 'COLOR TEST', icon: Palette, unit: 'ms' },
  { id: 'block-memory', name: 'BLOCK MEMORY', icon: Grid, unit: 'Lvl' },
  { id: 'number-memory', name: 'NUMBER MEMORY', icon: Hash, unit: 'Lvl' },
];

interface DatasetProps {
  onNavigate: (view: string) => void;
}

// 1. Hero Latency Metric with Population Benchmark Reference Scale
interface HeroLatencyMetricProps {
  value: number; // median RT in ms
}

function HeroLatencyMetric({ value }: HeroLatencyMetricProps) {
  // Clamped between 150ms and 450ms for position indicator
  const clamped = Math.max(150, Math.min(450, value || 280));
  const percentage = Math.round(((clamped - 150) / 300) * 100);

  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] font-mono font-semibold tracking-wider text-[var(--text-muted)] uppercase">
          Median Reaction Time
        </span>
      </div>

      <div className="my-auto py-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-[var(--text-primary)]">
            {value > 0 ? value : '—'}
          </span>
          <span className="text-sm font-mono text-[var(--text-muted)]">ms</span>
        </div>

        {/* Reference scale bar */}
        <div className="mt-2.5 w-full">
          <div className="relative h-2 w-full rounded-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 transition-all duration-700"
              style={{
                width: `${value > 0 ? Math.min(100, Math.max(8, percentage)) : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-muted)] mt-1">
            <span>150ms</span>
            <span>450ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Dataset({ onNavigate }: DatasetProps) {
  const [selectedGameId, setSelectedGameId] = useState<AssessmentType>('visual-reaction');
  const [trials, setTrials] = useState<RawTrialObservation[]>([]);
  const [datasetDocs, setDatasetDocs] = useState<DatasetObservation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSampleLimited, setIsSampleLimited] = useState(false);
  const [totalDatasetCount, setTotalDatasetCount] = useState<number | null>(null);

  useEffect(() => {
    if (selectedGameId !== 'visual-reaction' && selectedGameId !== 'direction') {
      setIsLoading(false);
      setLoadError(null);
      setIsSampleLimited(false);
      setTotalDatasetCount(null);
      setTrials([]);
      setDatasetDocs([]);
      return;
    }

    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setLoadError(null);
      setIsSampleLimited(false);
      setTotalDatasetCount(null);
      try {
        const publicData = await fetchDatasetObservations({ assessmentType: selectedGameId }, 1000);
        if (!isMounted) return;

        if (publicData.error) {
          setDatasetDocs([]);
          setTrials([]);
          setLoadError(publicData.error);
          return;
        }

        setDatasetDocs(publicData.observations);
        setTrials(unrollTrialsFromDatasetDocs(publicData.observations, selectedGameId));
        setIsSampleLimited(publicData.isSampleLimited);
        setTotalDatasetCount(publicData.totalCount);
      } catch (error: unknown) {
        console.warn('Error loading dataset from API:', error);
        if (isMounted) {
          setDatasetDocs([]);
          setTrials([]);
          setLoadError('Research data could not be loaded. Refresh the page to try again.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedGameId]);

  // --- STATS CALCULATIONS ---

  // Median reaction time from trial-level observations only.
  const medianRT = useMemo(() => {
    const validRTs = trials
      .filter((t) => !t.falseStart && t.valid !== false && !t.timedOut && t.reactionTime > 80 && t.reactionTime < 2000)
      .map((t) => t.reactionTime);
    return Math.round(medianValue(validRTs));
  }, [trials]);

  const totalSessions = totalDatasetCount ?? datasetDocs.length;

  // Total recorded VRT attempts across all completed sessions (including false starts, anticipations, timeouts and retries)
  const totalAttemptsCount = useMemo(() => {
    let sum = 0;
    datasetDocs.forEach((doc) => {
      if (Array.isArray(doc.progressionTrials)) {
        sum += doc.progressionTrials.length;
      } else if (typeof doc.totalTrials === 'number' && Number.isFinite(doc.totalTrials) && doc.totalTrials > 0) {
        sum += doc.totalTrials;
      }
    });
    return sum > 0 ? sum : trials.length;
  }, [datasetDocs, trials]);

  // 1. Average Reaction Time: average of completed session-level average reaction times (equal session weight)
  const averageRT = useMemo(() => {
    const sessionAvgs = datasetDocs
      .map((d) => Number(d.averageReactionTime ?? d.medianReactionTime))
      .filter((v) => Number.isFinite(v) && v > 80 && v < 2000);
    if (!sessionAvgs.length) return 0;
    const sum = sessionAvgs.reduce((acc, v) => acc + v, 0);
    return Math.round(sum / sessionAvgs.length);
  }, [datasetDocs]);

  // 2. Reaction Time vs Foreperiod (Standardized 6 non-overlapping intervals, latest valid attempt, session-median first, min n=10)
  const foreperiodData = useMemo(() => {
    return calculateForeperiodAggregation(datasetDocs, 10).filter((res) => !res.suppressed);
  }, [datasetDocs]);

  // Clean, evenly-spaced 25ms or 50ms ticks for Reaction Time vs Foreperiod
  const foreperiodTicks = useMemo(() => {
    const validRTs = foreperiodData.map((d) => d.medianRT).filter((v) => v > 0);
    if (!validRTs.length) return [200, 250, 300, 350, 400];
    const min = Math.min(...validRTs);
    const max = Math.max(...validRTs);
    const step = max - min > 160 ? 50 : 25;
    const yMin = Math.floor((min - 15) / step) * step;
    const yMax = Math.ceil((max + 15) / step) * step;
    const ticks: number[] = [];
    for (let t = yMin; t <= yMax; t += step) {
      ticks.push(t);
    }
    return ticks;
  }, [foreperiodData]);

  // 3. Cohort comparisons: minimum 10 sessions per displayed cohort, with session counts (n) and IQR
  const ageGroupData = useMemo(() => {
    return VALID_AGE_GROUPS.map((group) => {
      const short = getAgeGroupShortLabel(group);
      const sessionRTs = datasetDocs
        .filter((doc) => doc.ageGroup === group)
        .map((doc) => Number(doc.medianReactionTime ?? doc.averageReactionTime))
        .filter((value) => Number.isFinite(value) && value > 80 && value < 2000);
      const { q1, q3, iqr } = calculateIqr(sessionRTs);
      return {
        day: short,
        value: Math.round(medianValue(sessionRTs)),
        n: sessionRTs.length,
        q1,
        q3,
        iqr,
      };
    }).filter((entry) => entry.n >= 10);
  }, [datasetDocs]);

  // 4. Trial Progression (Trials 1–10) using latest valid attempt per logical trial per session
  const trialProgressionData = useMemo(
    () => calculatePopulationTrialProgression(datasetDocs, 10),
    [datasetDocs],
  );

  // 5. Consistency Distribution (Aggregated count in score intervals, desktop/mobile breakdown, min 10 per bin)
  const consistencyData = useMemo(() => {
    return calculateConsistencyDistribution(datasetDocs, 10);
  }, [datasetDocs]);

  // 6. Trial Validity 4-category breakdown (Valid, Premature, Anticipatory, Timeout)
  const validityBreakdown = useMemo(() => {
    return calculateTrialValidityBreakdown(datasetDocs);
  }, [datasetDocs]);

  const ringData = useMemo(() => {
    const list = [
      { name: 'Valid', value: validityBreakdown.valid, color: '#00f0ff', percent: validityBreakdown.validPercent },
      { name: 'Premature', value: validityBreakdown.premature, color: '#ef4444', percent: validityBreakdown.prematurePercent },
      { name: 'Anticipatory', value: validityBreakdown.anticipatory, color: '#f59e0b', percent: validityBreakdown.anticipatoryPercent },
      { name: 'Timeout', value: validityBreakdown.timeout, color: '#a78bfa', percent: validityBreakdown.timeoutPercent },
    ].filter((item) => item.value > 0);
    return list;
  }, [validityBreakdown]);

  // 7. Desktop vs Mobile Reaction Time (Bar Chart)

  // 7. Desktop vs Mobile Reaction Time (Bar Chart)
  const deviceComparisonData = useMemo(() => {
    const desktopTrials = trials.filter(
      (t) =>
        !t.falseStart &&
        t.reactionTime > 80 &&
        (!t.device || !t.device.toLowerCase().includes('mobile'))
    );

    const mobileTrials = trials.filter(
      (t) =>
        !t.falseStart &&
        t.reactionTime > 80 &&
        t.device &&
        t.device.toLowerCase().includes('mobile')
    );

    const desktopDocs = datasetDocs.filter((d) => !d.device || !d.device.toLowerCase().includes('mobile'));
    const mobileDocs = datasetDocs.filter((d) => d.device && d.device.toLowerCase().includes('mobile'));

    const desktopGames = desktopDocs.length;
    const mobileGames = mobileDocs.length;

    const desktopRTs = desktopTrials.map((t) => t.reactionTime).sort((a, b) => a - b);
    const mobileRTs = mobileTrials.map((t) => t.reactionTime).sort((a, b) => a - b);

    const desktopVal =
      desktopRTs.length > 0
        ? Math.round(medianValue(desktopRTs))
        : 0;
    const mobileVal =
      mobileRTs.length > 0
        ? Math.round(medianValue(mobileRTs))
        : 0;

    return [
      { device: 'Desktop', value: desktopVal, fill: '#00f0ff', n: desktopGames },
      { device: 'Mobile', value: mobileVal, fill: '#a78bfa', n: mobileGames }
    ];
  }, [trials, datasetDocs]);

  const currentGameIndex = DATASET_GAMES.findIndex(g => g.id === selectedGameId);
  const currentGame = DATASET_GAMES[currentGameIndex] || DATASET_GAMES[0];
  const CurrentGameIcon = currentGame.icon;

  const handlePrevGame = () => {
    const prevIdx = (currentGameIndex - 1 + DATASET_GAMES.length) % DATASET_GAMES.length;
    setSelectedGameId(DATASET_GAMES[prevIdx].id);
  };

  const handleNextGame = () => {
    const nextIdx = (currentGameIndex + 1) % DATASET_GAMES.length;
    setSelectedGameId(DATASET_GAMES[nextIdx].id);
  };

  return (
    <PageShell
      currentView="dataset"
      onNavigate={onNavigate}
      maxWidth="6xl"
      contentClassName="flex flex-col gap-4 sm:gap-6 pb-12"
    >
      {/* Game Navigation with Left & Right Arrows */}
        <div className="flex items-center justify-between gap-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-2.5 shadow-sm">
          <button type="button"
            id="dataset-prev-btn"
            onClick={handlePrevGame}
            aria-label="Previous Game"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] border border-[var(--border-subtle)] active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex flex-col items-center justify-center min-w-0 px-4 select-none text-center">
            <div className="flex items-center gap-2.5">
              <CurrentGameIcon size={18} className="text-[var(--cyan-primary)] shrink-0" />
              <span className="font-heading font-black text-base sm:text-lg text-[var(--cyan-primary)] uppercase tracking-wider truncate">
                {currentGame.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              {DATASET_GAMES.map((g) => (
                <button type="button"
                  key={g.id}
                  onClick={() => setSelectedGameId(g.id)}
                  aria-label={`Select ${g.name}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    g.id === selectedGameId 
                      ? 'w-6 bg-[var(--cyan-primary)] shadow-[0_0_8px_var(--cyan-glow)]' 
                      : 'w-2 bg-[var(--border-strong)] hover:bg-[var(--text-muted)]'
                  }`}
                />
              ))}
            </div>
          </div>

          <button type="button"
            id="dataset-next-btn"
            onClick={handleNextGame}
            aria-label="Next Game"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] border border-[var(--border-subtle)] active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Dashboard Content */}
        {!isLoading && !loadError && isSampleLimited && (
          <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-[var(--text-secondary)]">
            Showing {datasetDocs.length.toLocaleString()} of {totalDatasetCount !== null ? totalDatasetCount.toLocaleString() : 'more than ' + datasetDocs.length.toLocaleString()} matching assessments. Charts use this limited sample and may not represent the full dataset.
          </div>
        )}
        {!isLoading && !loadError && (selectedGameId === 'visual-reaction' || selectedGameId === 'direction') && trials.length === 0 && datasetDocs.length > 0 && (
          <div role="status" className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            No trial-level observations were returned for these sessions. Trial-level charts will remain empty.
          </div>
        )}
        {!isLoading && !loadError && (selectedGameId === 'visual-reaction' || selectedGameId === 'direction') && datasetDocs.length === 0 && (
          <div role="status" className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
            NO DATA: no research observations are available for this protocol.
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-2 border-[var(--cyan-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div role="alert" className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
            <strong className="font-mono text-sm text-red-400">DATASET UNAVAILABLE</strong>
            <p className="mt-2 max-w-xl text-sm text-[var(--text-secondary)]">{loadError}</p>
          </div>
        ) : selectedGameId === 'direction' ? (
          <DirectionDataset trials={trials} datasetDocs={datasetDocs} />
        ) : selectedGameId !== 'visual-reaction' ? (
          <div className="flex flex-col items-center justify-center min-h-[420px] sm:min-h-[500px] w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-8 my-auto text-center">
            <span className="text-5xl sm:text-7xl font-heading font-black tracking-widest text-[var(--cyan-primary)] uppercase select-none">
              SOON
            </span>
            <p className="mt-3 font-mono text-xs sm:text-sm text-[var(--text-muted)] uppercase tracking-wider">
              Telemetry collection for this protocol begins in an upcoming release
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:gap-6 w-full min-w-0">
            {/* 1. UNIFIED TECHNICAL TOP GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 min-w-0">
              {/* Card 1: Hero Median Reaction Time with Benchmark Range */}
              <div
                id="chart-card-gauge"
                className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs relative overflow-hidden min-w-0"
              >
                <HeroLatencyMetric value={medianRT} />
              </div>

              {/* Card 2: Platform Comparison (Desktop vs Mobile) */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[11px] font-mono font-semibold tracking-wider text-[var(--text-muted)] uppercase">
                    Device Comparison
                  </span>
                  <span className="text-[10px] font-mono text-purple-400 font-semibold tracking-wider uppercase">
                    MEDIAN RT
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 my-auto py-2 divide-x divide-[var(--border-subtle)] text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] mb-1">
                      <Monitor className="w-3.5 h-3.5 text-[#00f0ff]" />
                      <span>Desktop</span>
                    </div>
                    <span className="text-2xl font-mono text-[#00f0ff] font-bold">
                      {deviceComparisonData[0]?.value ? `${deviceComparisonData[0].value} ms` : '—'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center pl-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] mb-1">
                      <Smartphone className="w-3.5 h-3.5 text-[#a78bfa]" />
                      <span>Mobile</span>
                    </div>
                    <span className="text-2xl font-mono text-[#a78bfa] font-bold">
                      {deviceComparisonData[1]?.value ? `${deviceComparisonData[1].value} ms` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Total Trials */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[11px] font-mono font-semibold tracking-wider text-[var(--text-muted)] uppercase">
                    Total Trials
                  </span>
                </div>
                <div className="my-auto py-2">
                  <span className="text-3xl sm:text-4xl font-mono text-[var(--text-primary)] font-bold">
                    {totalAttemptsCount.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-between">
                  <span>All recorded attempts</span>
                  <span>Includes retries</span>
                </div>
              </div>

              {/* Card 4: Average Reaction Time */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                  <span className="text-[11px] font-mono font-semibold tracking-wider text-[var(--text-muted)] uppercase">
                    Average Reaction Time
                  </span>
                </div>
                <div className="my-auto py-2 flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-mono text-emerald-400 font-bold">
                    {averageRT > 0 ? averageRT : '—'}
                  </span>
                  <span className="text-sm font-mono text-[var(--text-muted)]">ms</span>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-between">
                  <span>Equal session weight</span>
                  <span>Mean of session averages</span>
                </div>
              </div>
            </div>

            {/* 2. AREA & BAR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
              {/* Reaction Time vs Foreperiod */}
              <div
                id="chart-card-foreperiod"
                className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col shadow-xs relative overflow-hidden min-w-0"
              >
                <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)] mb-3 sm:mb-4">
                  <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
                    Reaction Time vs Foreperiod
                  </span>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-[#00f0ff]">
                      <span className="w-2 h-2 rounded-full bg-[#00f0ff]" /> Median RT
                    </span>
                  </div>
                </div>
                <div className="w-full h-[220px] sm:h-[250px] lg:h-[260px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={foreperiodData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="areaForeperiodGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="var(--chart-grid)"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="foreperiod"
                        stroke="var(--chart-text)"
                        fontSize={9}
                        fontFamily="monospace"
                        tickLine={false}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis
                        stroke="var(--chart-text)"
                        fontSize={10}
                        fontFamily="monospace"
                        tickLine={false}
                        axisLine={false}
                        unit="ms"
                        domain={[foreperiodTicks[0], foreperiodTicks[foreperiodTicks.length - 1]]}
                        ticks={foreperiodTicks}
                      />
                      <Tooltip 
                        content={<DatasetTooltip />} 
                        allowEscapeViewBox={{ x: false, y: true }}
                        wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="medianRT"
                        name="Median RT"
                        stroke="#00f0ff"
                        strokeWidth={2}
                        fill="url(#areaForeperiodGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Age Group */}
              <div
                id="chart-card-age-group"
                className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col shadow-xs relative overflow-hidden min-w-0"
              >
                <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-3 sm:mb-4">
                  <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
                    Median RT by Age Group
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider uppercase">
                    MIN 10 SESSIONS
                  </span>
                </div>
                <div className="w-full h-[220px] sm:h-[250px] lg:h-[260px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ageGroupData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        stroke="var(--chart-grid)"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
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
                      />
                      <Tooltip 
                        content={<DatasetTooltip />} 
                        allowEscapeViewBox={{ x: false, y: true }}
                        wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                      />
                      <Bar dataKey="value" name="Median RT" radius={[6, 6, 0, 0]}>
                        {ageGroupData.map((_, index) => (
                          <Cell
                            key={`cell-age-${index}`}
                            fill={index === 2 ? '#00f0ff' : '#0284c7'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 3. LINE */}
            <div
              id="chart-card-line-trials"
              className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col shadow-xs relative overflow-hidden min-w-0"
            >
              <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)] mb-3 sm:mb-4">
                <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
                  Trial Progression (Trials 1–10)
                </span>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-[#00f0ff]">
                    <span className="w-2 h-2 rounded-full bg-[#00f0ff]" /> Overall RT
                  </span>
                </div>
              </div>
              <div className="w-full h-[220px] sm:h-[250px] lg:h-[260px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trialProgressionData}
                    margin={{ top: 10, right: 25, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid
                      stroke="var(--chart-grid)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
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
                    />
                    <Tooltip 
                      content={<DatasetTooltip />} 
                      allowEscapeViewBox={{ x: false, y: true }}
                      wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="overall"
                      name="Overall RT"
                      stroke="#00f0ff"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#00f0ff', strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. CONSISTENCY DISTRIBUTION & TRIAL VALIDITY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
              {/* Consistency Distribution */}
              <div
                id="chart-card-consistency"
                className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col shadow-xs relative overflow-hidden min-w-0"
              >
                <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-3 sm:mb-4">
                  <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
                    Consistency Distribution
                  </span>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-[#00f0ff]">
                      <span className="w-2 h-2 rounded-full bg-[#00f0ff]" /> Desktop
                    </span>
                    <span className="flex items-center gap-1.5 text-[#a78bfa]">
                      <span className="w-2 h-2 rounded-full bg-[#a78bfa]" /> Mobile
                    </span>
                  </div>
                </div>
                <div className="w-full h-[220px] sm:h-[250px] lg:h-[260px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={consistencyData}
                      margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        stroke="var(--chart-grid)"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
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
                      />
                      <Tooltip
                        content={<DatasetTooltip />}
                        allowEscapeViewBox={{ x: false, y: true }}
                        wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                      />
                      <Bar dataKey="desktop" name="Desktop" stackId="consistencyStack" fill="#00f0ff" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="mobile" name="Mobile" stackId="consistencyStack" fill="#a78bfa" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Ring / Trial Validity */}
              <div
                id="chart-card-ring"
                className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col items-center justify-between min-h-[280px] sm:min-h-[320px] shadow-xs relative overflow-hidden min-w-0"
              >
                <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                  <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
                    Trial Validity
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider">
                    {validityBreakdown.totalAttempts.toLocaleString()} TOTAL ATTEMPTS
                  </span>
                </div>
                <div className="w-full h-[180px] sm:h-[190px] relative flex items-center justify-center my-auto min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ringData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {ringData.map((entry, index) => (
                          <Cell key={`ring-pie-cell-${entry.name}-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={<DatasetTooltip />} 
                        allowEscapeViewBox={{ x: false, y: true }}
                        wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Central Metric */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-mono text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                      {validityBreakdown.validPercent}%
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">
                      VALID RATE
                    </span>
                  </div>
                </div>
                <div className="w-full flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-2 border-t border-[var(--border-subtle)] text-[11px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
                    <span className="text-[var(--text-secondary)]">Valid ({validityBreakdown.valid.toLocaleString()})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                    <span className="text-[var(--text-secondary)]">Premature ({validityBreakdown.premature.toLocaleString()})</span>
                  </div>
                  {validityBreakdown.anticipatory > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                      <span className="text-[var(--text-secondary)]">Anticipatory ({validityBreakdown.anticipatory.toLocaleString()})</span>
                    </div>
                  )}
                  {validityBreakdown.timeout > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#a78bfa]" />
                      <span className="text-[var(--text-secondary)]">Timeout ({validityBreakdown.timeout.toLocaleString()})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </PageShell>
  );
}

export default Dataset;
