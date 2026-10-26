import React, { useEffect, useState, useMemo } from 'react';
import { Navbar } from './Navbar';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { fetchCloudTrialObservations, RawTrialObservation } from '../lib/trialStore';
import { fetchDatasetObservations, DatasetObservation } from '../lib/dataset';
import { VALID_AGE_GROUPS, AssessmentType } from '../lib/firestore';
import { ChevronLeft, ChevronRight, Zap, Compass, Palette, Grid, Hash, Monitor, Smartphone } from 'lucide-react';
import { triggerHaptic } from '../lib/settingsStore';
import { DirectionDataset } from './DirectionDataset';

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

// Custom Tooltip component matching PULSE cyber-scientific theme
interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  fill?: string;
  unit?: string;
  dataKey?: string | number;
  payload?: Record<string, any>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0a0f1d]/95 backdrop-blur-md border border-[var(--border-subtle)] rounded-lg p-3 shadow-[0_8px_24px_rgba(0,0,0,0.6)] font-mono text-xs z-50">
        {label !== undefined && (
          <div className="text-[var(--text-muted)] font-semibold mb-1.5 border-b border-white/10 pb-1">
            {String(label)}
          </div>
        )}
        {payload.map((entry, index) => (
          <div
            key={`tooltip-item-${index}`}
            className="flex items-center justify-between gap-4 py-0.5"
            style={{ color: entry.color || entry.fill || 'var(--cyan-primary)' }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color || entry.fill || 'var(--cyan-primary)' }}
              />
              <span className="text-slate-300">{entry.name || 'Value'}:</span>
            </div>
            <span className="font-bold">
              {entry.value} {entry.unit || ''}
              {entry.payload && entry.payload[`${entry.dataKey}N`] !== undefined ? (
                <span className="text-slate-500 ml-1 font-normal">(n={entry.payload[`${entry.dataKey}N`]})</span>
              ) : entry.payload && entry.payload.n !== undefined ? (
                <span className="text-slate-500 ml-1 font-normal">(n={entry.payload.n})</span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// 1. Semi-Circular SVG Speedometer Gauge for Median Reaction Time
interface RadialGaugeProps {
  value: number; // median RT in ms
  label?: string;
}

function RadialGauge({ value, label = 'Median RT' }: RadialGaugeProps) {
  // Map value (e.g. 150ms-450ms) into an angle on a 180° arc (from 180° to 360°)
  // 150ms -> 100% (fastest), 450ms -> 0% (slowest)
  const clamped = Math.max(150, Math.min(450, value || 250));
  const scoreRatio = Math.max(0, Math.min(1, 1 - (clamped - 150) / 300));
  const strokePercent = Math.round(scoreRatio * 100);

  const radius = 80;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Half-circle perimeter
  const strokeDashoffset = circumference - circumference * scoreRatio;

  return (
    <div className="flex flex-col items-center justify-center relative w-full">
      <svg viewBox="0 0 220 135" className="w-full max-w-[240px] overflow-visible">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#00f0ff" />
          </linearGradient>
          <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background track */}
        <path
          d="M 25 115 A 80 80 0 0 1 195 115"
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Dynamic active arc */}
        <path
          d="M 25 115 A 80 80 0 0 1 195 115"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          filter="url(#gaugeGlow)"
          className="transition-all duration-700 ease-out"
        />

        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
          const angle = Math.PI * (1 - tick);
          const x1 = 110 - Math.cos(angle) * (radius - 12);
          const y1 = 115 - Math.sin(angle) * (radius - 12);
          const x2 = 110 - Math.cos(angle) * (radius - 18);
          const y2 = 115 - Math.sin(angle) * (radius - 18);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Center Text */}
        <text
          x="110"
          y="95"
          textAnchor="middle"
          fill="var(--cyan-primary)"
          className="font-mono text-3xl font-bold tracking-tight"
        >
          {value > 0 ? `${value}` : '—'}
        </text>
        <text
          x="110"
          y="112"
          textAnchor="middle"
          fill="var(--text-muted)"
          className="font-mono text-[10px] uppercase tracking-widest font-semibold"
        >
          ms
        </text>
      </svg>
    </div>
  );
}

export function Dataset({ onNavigate }: DatasetProps) {
  const [selectedGameId, setSelectedGameId] = useState<AssessmentType>('visual-reaction');
  const [trials, setTrials] = useState<RawTrialObservation[]>([]);
  const [datasetDocs, setDatasetDocs] = useState<DatasetObservation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (selectedGameId !== 'visual-reaction' && selectedGameId !== 'direction') {
      setIsLoading(false);
      setTrials([]);
      setDatasetDocs([]);
      return;
    }

    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const [cloudTrials, publicData] = await Promise.allSettled([
          fetchCloudTrialObservations(1000),
          fetchDatasetObservations({ assessmentType: selectedGameId }, 1000)
        ]);

        if (!isMounted) return;

        if (cloudTrials.status === 'fulfilled') {
          const matchingTrials = cloudTrials.value.filter((t) => {
            if (selectedGameId === 'visual-reaction') {
              return !t.test || t.test === 'visual-reaction' || t.test === 'reaction-test';
            }
            return t.test === selectedGameId;
          });
          setTrials(matchingTrials);
        }

        if (publicData.status === 'fulfilled' && publicData.value.observations) {
          setDatasetDocs(publicData.value.observations);
        } else {
          setDatasetDocs([]);
        }
      } catch (err) {
        console.warn('Error loading dataset:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedGameId]);

  // --- STATS CALCULATIONS ---

  // 1. Median Reaction Time
  const medianRT = useMemo(() => {
    const validRTs = trials
      .filter((t) => !t.falseStart && t.reactionTime > 80 && t.reactionTime < 2000)
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

  // Total Participants
  const totalParticipants = useMemo(() => {
    const pSet = new Set<string>();
    trials.forEach((t) => {
      const id = t.participantId || t.experimentId || t.userId;
      if (id) pSet.add(id);
    });
    datasetDocs.forEach((d) => {
      const id = d.participantId || d.experimentId || d.id;
      if (id) pSet.add(id);
    });
    if (pSet.size > 0) return pSet.size;
    return Math.max(trials.length > 0 ? 1 : 0, datasetDocs.length);
  }, [trials, datasetDocs]);

  // Fastest Avg Reaction Time
  const fastestAvgRT = useMemo(() => {
    const sessionAvgs: number[] = [];

    const sessionMap = new Map<string, number[]>();
    trials.forEach((t) => {
      if (t.falseStart || t.reactionTime <= 80 || t.reactionTime >= 2000) return;
      const key = t.experimentId || t.participantId || t.id || 'default';
      const list = sessionMap.get(key) || [];
      list.push(t.reactionTime);
      sessionMap.set(key, list);
    });

    sessionMap.forEach((rts) => {
      if (rts.length > 0) {
        const avg = rts.reduce((sum, v) => sum + v, 0) / rts.length;
        if (avg >= 80 && avg < 2000) sessionAvgs.push(avg);
      }
    });

    datasetDocs.forEach((d) => {
      const avg = Number(d.averageReactionTime || d.medianReactionTime);
      if (avg >= 80 && avg < 2000) sessionAvgs.push(avg);
    });

    if (sessionAvgs.length === 0) return 0;
    return Math.round(Math.min(...sessionAvgs));
  }, [trials, datasetDocs]);

  // 2. Reaction Time Distribution Data (Area Chart)
  const distributionData = useMemo(() => {
    const bins = [
      { min: 140, max: 175, label: '140–175ms' },
      { min: 175, max: 200, label: '175–200ms' },
      { min: 200, max: 225, label: '200–225ms' },
      { min: 225, max: 250, label: '225–250ms' },
      { min: 250, max: 275, label: '250–275ms' },
      { min: 275, max: 300, label: '275–300ms' },
      { min: 300, max: 325, label: '300–325ms' },
      { min: 325, max: 350, label: '325–350ms' },
      { min: 350, max: 375, label: '350–375ms' },
      { min: 375, max: 400, label: '375–400ms' },
      { min: 400, max: 450, label: '400–450ms' },
      { min: 450, max: 550, label: '450ms+' }
    ];

    const validTrials = trials.filter((t) => !t.falseStart && t.reactionTime > 80);

    return bins.map((bin) => {
      let desktopCount = validTrials.filter(
        (t) =>
          t.reactionTime >= bin.min &&
          t.reactionTime < bin.max &&
          (!t.device || !t.device.toLowerCase().includes('mobile'))
      ).length;

      let mobileCount = validTrials.filter(
        (t) =>
          t.reactionTime >= bin.min &&
          t.reactionTime < bin.max &&
          t.device &&
          t.device.toLowerCase().includes('mobile')
      ).length;

      return {
        label: bin.label,
        desktop: desktopCount,
        mobile: mobileCount,
        desktopN: desktopCount,
        mobileN: mobileCount,
        n: desktopCount + mobileCount
      };
    });
  }, [trials]);

  // 3. Median Reaction Time by Age Group (Bar Chart)
  const ageGroupData = useMemo(() => {
    const ageShortLabels: Record<string, string> = {
      'Children (8–12)': '8–12',
      'Adolescents (13–17)': '13–17',
      'Young adults (18–25)': '18–25',
      'Adults (26–40)': '26–40',
      'Middle-aged adults (41–60)': '41–60',
      'Older adults (61–75)': '61–75',
      'Seniors (76+)': '76+'
    };

    return VALID_AGE_GROUPS.map((group) => {
      const short = ageShortLabels[group] || group;
      const matchingTrials = trials
        .filter((t) => t.ageGroup === group && !t.falseStart && t.reactionTime > 80)
        .map((t) => t.reactionTime);

      const matchingDataset = datasetDocs
        .filter((d) => d.ageGroup === group)
        .map((d) => Number(d.medianReactionTime || d.averageReactionTime))
        .filter((rt) => rt > 80);

      const allRTs = [...matchingTrials, ...matchingDataset];
      allRTs.sort((a, b) => a - b);
      const val =
        allRTs.length > 0
          ? Math.round(allRTs[Math.floor(allRTs.length / 2)])
          : 0;

      return {
        day: `${short} (n=${allRTs.length})`,
        value: val,
        n: allRTs.length
      };
    });
  }, [trials, datasetDocs]);

  // 4. Reaction Time Across Trials 1–5 (Line Chart)
  const trialProgressionData = useMemo(() => {
    return [1, 2, 3, 4, 5].map((trialNum, index) => {
      const matching = trials.filter(
        (t) => t.trialNumber === trialNum && !t.falseStart && t.reactionTime > 80
      );

      const desktopRTs = matching
        .filter((t) => !t.device || !t.device.toLowerCase().includes('mobile'))
        .map((t) => t.reactionTime)
        .sort((a, b) => a - b);

      const mobileRTs = matching
        .filter((t) => t.device && t.device.toLowerCase().includes('mobile'))
        .map((t) => t.reactionTime)
        .sort((a, b) => a - b);

      const allRTs = matching.map((t) => t.reactionTime).sort((a, b) => a - b);

      const dVal =
        desktopRTs.length > 0
          ? Math.round(desktopRTs[Math.floor(desktopRTs.length / 2)])
          : 0;
      const mVal =
        mobileRTs.length > 0
          ? Math.round(mobileRTs[Math.floor(mobileRTs.length / 2)])
          : 0;
      const overall =
        allRTs.length > 0
          ? Math.round(allRTs[Math.floor(allRTs.length / 2)])
          : 0;

      return {
        trialLabel: `Trial ${trialNum}`,
        desktop: dVal,
        mobile: mVal,
        overall,
        desktopN: desktopRTs.length,
        mobileN: mobileRTs.length,
        overallN: allRTs.length
      };
    });
  }, [trials]);

  // 5. Scatter Chart — Median RT vs Consistency (SD)
  const { scatterDesktop, scatterMobile } = useMemo(() => {
    const sessionsMap = new Map<string, { rts: number[]; isMobile: boolean }>();

    trials.forEach((t) => {
      if (t.falseStart || t.reactionTime <= 80) return;
      const key = t.experimentId || t.participantId || t.id;
      const isMobile = Boolean(t.device && t.device.toLowerCase().includes('mobile'));
      const entry = sessionsMap.get(key) || { rts: [], isMobile };
      entry.rts.push(t.reactionTime);
      sessionsMap.set(key, entry);
    });

    const sDesktop: Array<{ medianRT: number; sd: number }> = [];
    const sMobile: Array<{ medianRT: number; sd: number }> = [];

    sessionsMap.forEach(({ rts, isMobile }) => {
      if (rts.length < 2) return;
      rts.sort((a, b) => a - b);
      const sessionMedian = rts[Math.floor(rts.length / 2)];
      const mean = rts.reduce((acc, v) => acc + v, 0) / rts.length;
      const variance = rts.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / rts.length;
      const sd = Math.round(Math.sqrt(variance));

      if (sessionMedian > 120 && sessionMedian < 600 && sd >= 0 && sd < 200) {
        if (isMobile) {
          sMobile.push({ medianRT: sessionMedian, sd });
        } else {
          sDesktop.push({ medianRT: sessionMedian, sd });
        }
      }
    });

    return { scatterDesktop: sDesktop, scatterMobile: sMobile };
  }, [trials]);

  // 6. Ring Chart — Valid Trials vs False Starts
  const { ringData, validPercent, totalTrialsCount } = useMemo(() => {
    let validCount = trials.filter((t) => !t.falseStart).length;
    let falseStartCount = trials.filter((t) => t.falseStart).length;

    datasetDocs.forEach((d) => {
      const fs = Number(d.totalFalseStarts || 0);
      falseStartCount += fs;
      validCount += 5;
    });

    const total = validCount + falseStartCount;
    const vPct = total > 0 ? Math.round((validCount / total) * 100) : 100;

    return {
      ringData: [
        { name: 'Valid Trials', value: validCount, color: '#00f0ff' },
        { name: 'False Starts', value: falseStartCount, color: '#ef4444' }
      ],
      validPercent: vPct,
      totalTrialsCount: total
    };
  }, [trials, datasetDocs]);

  // 7. Desktop vs Mobile Reaction Time (Bar Chart)
  const deviceComparisonData = useMemo(() => {
    const desktopRTs = trials
      .filter(
        (t) =>
          !t.falseStart &&
          t.reactionTime > 80 &&
          (!t.device || !t.device.toLowerCase().includes('mobile'))
      )
      .map((t) => t.reactionTime)
      .sort((a, b) => a - b);

    const mobileRTs = trials
      .filter(
        (t) =>
          !t.falseStart &&
          t.reactionTime > 80 &&
          t.device &&
          t.device.toLowerCase().includes('mobile')
      )
      .map((t) => t.reactionTime)
      .sort((a, b) => a - b);

    const desktopVal =
      desktopRTs.length > 0
        ? Math.round(desktopRTs[Math.floor(desktopRTs.length / 2)])
        : 0;
    const mobileVal =
      mobileRTs.length > 0
        ? Math.round(mobileRTs[Math.floor(mobileRTs.length / 2)])
        : 0;

    return [
      { device: 'Desktop', value: desktopVal, fill: '#00f0ff', n: desktopRTs.length },
      { device: 'Mobile', value: mobileVal, fill: '#a78bfa', n: mobileRTs.length }
    ];
  }, [trials]);

  const currentGameIndex = DATASET_GAMES.findIndex(g => g.id === selectedGameId);
  const currentGame = DATASET_GAMES[currentGameIndex] || DATASET_GAMES[0];
  const CurrentGameIcon = currentGame.icon;

  const handlePrevGame = () => {
    triggerHaptic('tap');
    const prevIdx = (currentGameIndex - 1 + DATASET_GAMES.length) % DATASET_GAMES.length;
    setSelectedGameId(DATASET_GAMES[prevIdx].id);
  };

  const handleNextGame = () => {
    triggerHaptic('tap');
    const nextIdx = (currentGameIndex + 1) % DATASET_GAMES.length;
    setSelectedGameId(DATASET_GAMES[nextIdx].id);
  };

  return (
    <div className="bg-transparent text-[var(--text-main)] h-full max-h-[100dvh] w-full max-w-full overflow-hidden flex flex-col font-sans selection:bg-cyan-500/30 relative">
      <Navbar onNavigate={onNavigate} currentView="dataset" title="Dataset Explorer" />

      <main className="flex-1 w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6 min-w-0 overflow-y-auto pb-24 pb-safe">
        {/* Game Navigation with Left & Right Arrows */}
        <div className="flex items-center justify-between gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-1.5 shadow-sm">
          <button type="button"
            id="mobile-dataset-prev-btn"
            onClick={handlePrevGame}
            aria-label="Previous Game"
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] border border-[var(--border-subtle)] active:scale-90 transition-all cursor-pointer shrink-0"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex flex-col items-center justify-center min-w-0 px-2 select-none text-center">
            <div className="flex items-center gap-2">
              <CurrentGameIcon size={15} className="text-[var(--cyan-primary)] shrink-0" />
              <span className="font-heading font-black text-xs sm:text-sm text-[var(--cyan-primary)] uppercase tracking-wider truncate">
                {currentGame.name}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {DATASET_GAMES.map((g) => (
                <button type="button"
                  key={g.id}
                  onClick={() => {
                    triggerHaptic('tap');
                    setSelectedGameId(g.id);
                  }}
                  aria-label={`Select ${g.name}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    g.id === selectedGameId 
                      ? 'w-4 bg-[var(--cyan-primary)] shadow-[0_0_8px_var(--cyan-glow)]' 
                      : 'w-1.5 bg-[var(--border-strong)] hover:bg-[var(--text-muted)]'
                  }`}
                />
              ))}
            </div>
          </div>

          <button type="button"
            id="mobile-dataset-next-btn"
            onClick={handleNextGame}
            aria-label="Next Game"
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--cyan-primary)] border border-[var(--border-subtle)] active:scale-90 transition-all cursor-pointer shrink-0"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Dashboard Content */}
        {selectedGameId === 'direction' ? (
          <DirectionDataset trials={trials} datasetDocs={datasetDocs} />
        ) : selectedGameId !== 'visual-reaction' ? (
          <div className="flex flex-col items-center justify-center min-h-[380px] sm:min-h-[460px] w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-8 my-auto text-center">
            <span className="text-4xl sm:text-6xl font-heading font-black tracking-widest text-[var(--cyan-primary)] uppercase select-none">
              SOON
            </span>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-2 border-[var(--cyan-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          
          <div className="flex flex-col gap-4 sm:gap-6 w-full min-w-0">
            {/* 1. GAUGE & SUMMARY CONTEXT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
               {/* Context Stats */}
               <div className="order-2 lg:order-1 lg:col-span-1 flex flex-col justify-center gap-3 sm:gap-4">
                 <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3.5 sm:p-5 flex flex-col items-center justify-center text-center shadow-sm">
                   <span className="text-[10px] text-[var(--text-muted)] font-mono mb-1 tracking-widest uppercase">Total Participants</span>
                   <span className="text-2xl font-mono text-[var(--text-main)] font-bold">{totalParticipants.toLocaleString()}</span>
                 </div>
                 <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3.5 sm:p-4 flex flex-col justify-between shadow-sm">
                   <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[var(--border-subtle)]">
                     <span className="text-[10px] text-[var(--text-muted)] font-mono tracking-widest uppercase">Device Comparison</span>
                     <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                       MEDIAN RT
                     </span>
                   </div>
                   <div className="grid grid-cols-2 gap-2 text-center divide-x divide-[var(--border-subtle)]">
                     <div className="flex flex-col items-center justify-center">
                       <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] mb-0.5">
                         <Monitor className="w-3.5 h-3.5 text-[#00f0ff]" />
                         <span>Desktop</span>
                       </div>
                       <span className="text-xl font-mono text-[#00f0ff] font-bold">
                         {deviceComparisonData[0]?.value ? `${deviceComparisonData[0].value} ms` : '—'}
                       </span>
                     </div>
                     <div className="flex flex-col items-center justify-center pl-2">
                       <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] mb-0.5">
                         <Smartphone className="w-3.5 h-3.5 text-[#a78bfa]" />
                         <span>Mobile</span>
                       </div>
                       <span className="text-xl font-mono text-[#a78bfa] font-bold">
                         {deviceComparisonData[1]?.value ? `${deviceComparisonData[1].value} ms` : '—'}
                       </span>
                     </div>
                   </div>
                 </div>
                 <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3.5 sm:p-5 flex flex-col items-center justify-center text-center shadow-sm">
                   <span className="text-[10px] text-[var(--text-muted)] font-mono mb-1 tracking-widest uppercase">Fastest Avg RT</span>
                   <span className="text-2xl font-mono text-emerald-400 font-bold">{fastestAvgRT > 0 ? `${fastestAvgRT} ms` : '—'}</span>
                 </div>
               </div>

               {/* Gauge */}
               <div
                 id="chart-card-gauge"
                 className="order-1 lg:order-2 lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col items-center justify-between min-h-[280px] sm:min-h-[320px] shadow-sm relative overflow-hidden min-w-0"
               >
                 <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                   <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
                     Median Reaction Time
                   </span>
                   <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                     BENCHMARK
                   </span>
                 </div>
                 <div className="w-full flex items-center justify-center my-auto py-3 sm:py-4">
                   <RadialGauge value={medianRT} />
                 </div>
               </div>
            </div>

            {/* 2. AREA & BAR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
               {/* Area */}
               <div
                 id="chart-card-area"
                 className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col shadow-sm relative overflow-hidden min-w-0"
               >
                 <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)] mb-3 sm:mb-4">
                   <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
                     Reaction Time Distribution
                   </span>
                   <div className="flex items-center gap-3 text-xs font-mono">
                     <span className="flex items-center gap-1 text-[#00f0ff]">
                       <span className="w-2 h-2 rounded-full bg-[#00f0ff]" /> Desktop
                     </span>
                     <span className="flex items-center gap-1 text-[#a78bfa]">
                       <span className="w-2 h-2 rounded-full bg-[#a78bfa]" /> Mobile
                     </span>
                   </div>
                 </div>
                 <div className="w-full h-[220px] sm:h-[250px] lg:h-[260px] min-w-0">
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart
                       data={distributionData}
                       margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                     >
                       <defs>
                         <linearGradient id="areaDesktopGrad" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
                           <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                         </linearGradient>
                         <linearGradient id="areaMobileGrad" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                           <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.0} />
                         </linearGradient>
                       </defs>
                       <CartesianGrid
                         stroke="rgba(255,255,255,0.06)"
                         strokeDasharray="3 3"
                         vertical={false}
                       />
                       <XAxis
                         dataKey="label"
                         stroke="#64748b"
                         fontSize={9}
                         fontFamily="monospace"
                         tickLine={false}
                         angle={-25}
                         textAnchor="end"
                       />
                       <YAxis
                         stroke="#64748b"
                         fontSize={10}
                         fontFamily="monospace"
                         tickLine={false}
                         axisLine={false}
                       />
                       <Tooltip 
                         content={<CustomTooltip />} 
                         allowEscapeViewBox={{ x: false, y: true }}
                         wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                       />
                       <Area
                         type="monotone"
                         dataKey="desktop"
                         name="Desktop Cohort"
                         stroke="#00f0ff"
                         strokeWidth={2}
                         fill="url(#areaDesktopGrad)"
                       />
                       <Area
                         type="monotone"
                         dataKey="mobile"
                         name="Mobile Cohort"
                         stroke="#a78bfa"
                         strokeWidth={2}
                         fill="url(#areaMobileGrad)"
                       />
                     </AreaChart>
                   </ResponsiveContainer>
                 </div>
               </div>

               {/* Age Group */}
               <div
                 id="chart-card-age-group"
                 className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col shadow-sm relative overflow-hidden min-w-0"
               >
                 <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-3 sm:mb-4">
                   <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
                     Median RT by Age Group
                   </span>
                   <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                     AGE COHORTS
                   </span>
                 </div>
                 <div className="w-full h-[220px] sm:h-[250px] lg:h-[260px] min-w-0">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart
                       data={ageGroupData}
                       margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                     >
                       <CartesianGrid
                         stroke="rgba(255,255,255,0.06)"
                         strokeDasharray="3 3"
                         vertical={false}
                       />
                       <XAxis
                         dataKey="day"
                         stroke="#64748b"
                         fontSize={10}
                         fontFamily="monospace"
                         tickLine={false}
                       />
                       <YAxis
                         stroke="#64748b"
                         fontSize={10}
                         fontFamily="monospace"
                         tickLine={false}
                         axisLine={false}
                         unit="ms"
                       />
                       <Tooltip 
                         content={<CustomTooltip />} 
                         allowEscapeViewBox={{ x: false, y: true }}
                         wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                       />
                       <Bar dataKey="value" name="Median RT" radius={[4, 4, 0, 0]}>
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
              className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col shadow-sm relative overflow-hidden min-w-0"
            >
              <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)] mb-3 sm:mb-4">
                <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
                  Trial Progression (Trials 1–5)
                </span>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1 text-[#00f0ff]">
                    <span className="w-2 h-2 rounded-full bg-[#00f0ff]" /> Desktop
                  </span>
                  <span className="flex items-center gap-1 text-[#a78bfa]">
                    <span className="w-2 h-2 rounded-full bg-[#a78bfa]" /> Mobile
                  </span>
                  <span className="flex items-center gap-1 text-[#38bdf8]">
                    <span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> Overall
                  </span>
                </div>
              </div>
              <div className="w-full h-[220px] sm:h-[250px] lg:h-[260px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trialProgressionData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.06)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="trialLabel"
                      stroke="#64748b"
                      fontSize={10}
                      fontFamily="monospace"
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      fontFamily="monospace"
                      tickLine={false}
                      axisLine={false}
                      unit="ms"
                    />
                    <Tooltip 
                      content={<CustomTooltip />} 
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
                      dataKey="overall"
                      name="Overall RT"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. SCATTER & RING */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
               {/* Scatter */}
               <div
                 id="chart-card-scatter"
                 className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col shadow-sm relative overflow-hidden min-w-0"
               >
                 <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-3 sm:mb-4">
                   <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
                     Speed × Consistency
                   </span>
                   <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                     ALL SESSIONS
                   </span>
                 </div>
                 <div className="w-full h-[220px] sm:h-[250px] lg:h-[260px] min-w-0">
                   <ResponsiveContainer width="100%" height="100%">
                     <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                       <CartesianGrid
                         stroke="rgba(255,255,255,0.06)"
                         strokeDasharray="3 3"
                       />
                       <XAxis
                         dataKey="medianRT"
                         name="Median RT"
                         unit="ms"
                         stroke="#64748b"
                         fontSize={10}
                         fontFamily="monospace"
                         tickLine={false}
                         domain={['auto', 'auto']}
                       />
                       <YAxis
                         dataKey="sd"
                         name="SD"
                         unit="ms"
                         stroke="#64748b"
                         fontSize={10}
                         fontFamily="monospace"
                         tickLine={false}
                         axisLine={false}
                         domain={['auto', 'auto']}
                       />
                       <Tooltip
                         cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }}
                         content={<CustomTooltip />}
                         allowEscapeViewBox={{ x: false, y: true }}
                         wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                       />
                       <Scatter
                         name="Desktop Sessions"
                         data={scatterDesktop}
                         fill="#00f0ff"
                         opacity={0.8}
                       />
                       <Scatter
                         name="Mobile Sessions"
                         data={scatterMobile}
                         fill="#a78bfa"
                         opacity={0.8}
                       />
                     </ScatterChart>
                   </ResponsiveContainer>
                 </div>
               </div>

               {/* Ring */}
               <div
                 id="chart-card-ring"
                 className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-6 flex flex-col items-center justify-between min-h-[280px] sm:min-h-[320px] shadow-sm relative overflow-hidden min-w-0"
               >
                 <div className="w-full flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                   <span className="text-xs font-mono font-bold tracking-wider text-[var(--text-muted)] uppercase">
                     Trial Validity
                   </span>
                   <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                     {validPercent}% VALID
                   </span>
                 </div>
                 <div className="w-full h-[180px] sm:h-[190px] relative flex items-center justify-center my-auto min-w-0">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                         data={ringData}
                         cx="50%"
                         cy="50%"
                         innerRadius={50}
                         outerRadius={70}
                         paddingAngle={5}
                         dataKey="value"
                       >
                         {ringData.map((entry, index) => (
                           <Cell key={`ring-pie-cell-${entry.name}-${index}`} fill={entry.color} />
                         ))}
                       </Pie>
                       <Tooltip 
                         content={<CustomTooltip />} 
                         allowEscapeViewBox={{ x: false, y: true }}
                         wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                       />
                     </PieChart>
                   </ResponsiveContainer>
                   {/* Central Metric */}
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="font-mono text-xl sm:text-2xl font-bold text-white tracking-tight">
                       {totalTrialsCount.toLocaleString()}
                     </span>
                     <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)]">
                       TRIALS
                     </span>
                   </div>
                 </div>
                 <div className="w-full flex items-center justify-center gap-4 pt-2 border-t border-[var(--border-subtle)] text-xs font-mono">
                   <div className="flex items-center gap-1.5">
                     <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff]" />
                     <span className="text-slate-300">Valid</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                     <span className="text-slate-300">False Start</span>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dataset;
