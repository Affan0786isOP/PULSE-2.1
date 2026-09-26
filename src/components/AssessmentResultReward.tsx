import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Trophy, ArrowRight, RotateCcw, Activity, AlertCircle } from 'lucide-react';
import { AssessmentType, getPersonalBest } from '../lib/firestore';
import { isReducedMotionActive } from '../lib/settingsStore';
import { RiveFeedback } from './RiveFeedback';

export interface SupportingMetric {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

export interface AssessmentResultRewardProps {
  score: number;
  unit: string;
  assessmentType: AssessmentType;
  title: string;
  isLowerBetter?: boolean;
  isNewPersonalBest?: boolean;
  supportingMetrics?: SupportingMetric[];
  submissionError?: string | null;
  riveAssetUrl?: string;
  onRetrySubmission?: () => void;
  isSubmitting?: boolean;
  onRetry: () => void;
  onNext: () => void;
  onViewAnalytics?: () => void;
  onViewLeaderboard?: () => void;
  nextAssessmentName?: string;
  children?: React.ReactNode;
}

/**
 * Subtle scientific count-up hook that respects prefers-reduced-motion
 */
function useCountUp(targetValue: number, durationMs = 500, decimals = 1): string {
  const [displayVal, setDisplayVal] = useState<number>(() => {
    if (typeof window !== 'undefined' && isReducedMotionActive()) {
      return targetValue;
    }
    return targetValue > 10 ? targetValue * 0.6 : 0;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && isReducedMotionActive()) {
      setDisplayVal(targetValue);
      return;
    }

    let startTimestamp: number | null = null;
    const startVal = targetValue > 10 ? targetValue * 0.6 : 0;
    let animId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (targetValue - startVal) * eased;
      setDisplayVal(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayVal(targetValue);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [targetValue, durationMs]);

  return decimals > 0 ? displayVal.toFixed(decimals) : Math.round(displayVal).toString();
}

export function AssessmentResultReward({
  score,
  unit,
  assessmentType,
  title,
  isLowerBetter = true,
  isNewPersonalBest: propIsNewPersonalBest,
  supportingMetrics = [],
  submissionError,
  riveAssetUrl,
  onRetrySubmission,
  isSubmitting = false,
  onRetry,
  onNext,
  onViewAnalytics,
  onViewLeaderboard = onViewAnalytics,
  nextAssessmentName = 'Next Assessment',
  children
}: AssessmentResultRewardProps) {
  const decimals = unit === 'ms' ? 1 : 0;
  const animatedScore = useCountUp(score, 500, decimals);

  const [historyStats, setHistoryStats] = useState<{ isNewPersonalBest: boolean; bestScore: number | null; pbError: string | null }>({
    isNewPersonalBest: propIsNewPersonalBest === true,
    bestScore: null,
    pbError: null
  });

  useEffect(() => {
    if (typeof propIsNewPersonalBest === 'boolean') {
      setHistoryStats({ isNewPersonalBest: propIsNewPersonalBest, bestScore: null, pbError: null });
      return;
    }

    let mounted = true;
    if (submissionError || isSubmitting) return;

    getPersonalBest(assessmentType, isLowerBetter).then(res => {
      if (!mounted) return;
      if (typeof res === 'object' && res !== null && 'success' in res) {
        if (!res.success) {
          setHistoryStats({ isNewPersonalBest: false, bestScore: null, pbError: res.error || 'Failed to fetch personal best' });
        } else {
          const isNewPB = res.value === null || (isLowerBetter ? (score <= res.value) : (score >= res.value));
          setHistoryStats({ isNewPersonalBest: isNewPB, bestScore: res.value, pbError: null });
        }
      }
    }).catch(err => {
      if (!mounted) return;
      setHistoryStats({ isNewPersonalBest: false, bestScore: null, pbError: err.message || 'Failed to fetch personal best' });
    });

    return () => { mounted = false; };
  }, [assessmentType, score, isLowerBetter, submissionError, isSubmitting, propIsNewPersonalBest]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-lg mx-auto bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col my-auto select-none"
    >
      {/* Top Header: Assessment Title & Real Personal Best Badge */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[var(--border-subtle)]">
        <span className="font-mono text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
          {title} • Session Outcome
        </span>
        {historyStats.isNewPersonalBest && (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
            <Trophy size={11} />
            Personal Best
          </span>
        )}
      </div>

      {historyStats.pbError && !submissionError && (
        <div className="w-full text-[10px] font-mono text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-center my-1 flex items-center justify-center gap-1.5">
          <AlertCircle size={11} className="shrink-0" />
          <span>Personal best history unavailable</span>
        </div>
      )}

      <RiveFeedback 
        state={historyStats.isNewPersonalBest ? 'NEW_BEST' : 'SUCCESS'} 
        assetUrl={riveAssetUrl}
      />

      {/* Primary Authoritative Score */}
      <div className="flex items-baseline justify-center gap-1.5 my-2 z-10 relative">
        <span className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-[var(--text-primary)]">
          {animatedScore}
        </span>
        <span className="text-base sm:text-lg font-mono font-semibold text-[var(--accent)]">
          {unit}
        </span>
      </div>

      {/* Authoritative Supporting Metrics Grid */}
      {supportingMetrics && supportingMetrics.length > 0 && (
        <div className={`grid ${supportingMetrics.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'} gap-2 w-full my-2`}>
          {supportingMetrics.map((m, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg p-2 text-center">
              <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
                {m.label}
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-[var(--text-primary)]">
                {m.value}{m.unit ? <span className="text-xs text-[var(--text-muted)] ml-0.5 font-normal">{m.unit}</span> : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Submission error notification if cloud sync failed */}
      {submissionError && (
        <div className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-400 p-2.5 rounded-lg my-2 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 min-w-0 mr-2">
            <AlertCircle size={14} className="shrink-0 text-rose-400" />
            <span className="truncate">{submissionError}</span>
          </div>
          {onRetrySubmission && (
            <button
              type="button"
              onClick={onRetrySubmission}
              disabled={isSubmitting}
              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 active:scale-[0.97] text-rose-200 border border-rose-500/40 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer shrink-0 transition-[background-color,transform]"
            >
              {isSubmitting ? '...' : 'Retry'}
            </button>
          )}
        </div>
      )}

      {/* Children content: e.g. LeaderboardOptIn rendered directly without nested card */}
      {children && (
        <div className="w-full my-1">
          {children}
        </div>
      )}

      {/* Standardized Actions Bar */}
      <div className="flex items-center gap-2 w-full mt-3 pt-3 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={onRetry}
          id="result-retry-button"
          className="flex-1 h-10 px-3 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--border-subtle)] active:bg-[var(--surface-3)] active:scale-[0.98] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-mono font-medium uppercase tracking-wider transition-[background-color,border-color,transform] inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw size={13} />
          <span>Try Again</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          id="result-next-button"
          className="flex-1 h-10 px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:opacity-90 active:scale-[0.98] text-slate-950 text-xs font-mono font-bold uppercase tracking-wider transition-[background-color,opacity,transform] inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
        >
          <span className="truncate">{nextAssessmentName}</span>
          <ArrowRight size={13} className="shrink-0" />
        </button>

        {onViewLeaderboard && (
          <button
            type="button"
            onClick={onViewLeaderboard}
            id="result-leaderboard-button"
            className="w-10 h-10 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--border-subtle)] active:bg-[var(--surface-3)] active:scale-[0.97] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center justify-center transition-[background-color,color,transform] cursor-pointer shrink-0"
            title="View Leaderboard & Benchmarks"
            aria-label="View Leaderboard & Benchmarks"
          >
            <Trophy size={15} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
