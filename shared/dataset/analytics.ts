export interface DatasetAnalyticsTrial {
  id?: string;
  experimentId?: string;
  sessionId?: string;
  trialNumber?: number;
  reactionTime: number;
  falseStart?: boolean;
  valid?: boolean;
  timedOut?: boolean;
  device?: string;
}
export type DatasetSessionKey = string | undefined;
export type DatasetSessionKeyResolver<T extends DatasetAnalyticsTrial> = (trial: T) => DatasetSessionKey;
const REACTION_TIME_BINS = [
  { min: 80, max: 140, label: '80–140ms' },
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
  { min: 450, max: Number.POSITIVE_INFINITY, label: '450ms+' },
] as const;
export const AGE_GROUP_SHORT_LABELS: Readonly<Record<string, string>> = {
  'Children (8–12)': '8–12',
  'Adolescents (13–17)': '13–17',
  'Young adults (18–25)': '18–25',
  'Adults (26–40)': '26–40',
  'Middle-aged adults (41–60)': '41–60',
  'Older adults (61–75)': '61–75',
  'Seniors (76+)': '76+',
};
export function getAgeGroupShortLabel(ageGroup: string): string {
  return AGE_GROUP_SHORT_LABELS[ageGroup] ?? ageGroup;
}
export function medianValue(values: readonly number[]): number {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function percentileValue(values: readonly number[], p: number): number {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  if (p <= 0) return sorted[0];
  if (p >= 1) return sorted[sorted.length - 1];
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

export function calculateIqr(values: readonly number[]): { q1: number; q3: number; iqr: number } {
  const valid = values.filter((v) => Number.isFinite(v) && v > 0);
  if (!valid.length) return { q1: 0, q3: 0, iqr: 0 };
  const q1 = percentileValue(valid, 0.25);
  const q3 = percentileValue(valid, 0.75);
  return { q1: Math.round(q1), q3: Math.round(q3), iqr: Math.max(0, Math.round(q3 - q1)) };
}
export interface ReactionTimeDistributionBin {
  label: string;
  desktop: number;
  mobile: number;
  desktopN: number;
  mobileN: number;
  n: number;
}
/** One-pass RT histogram preserving the original bin, eligibility, device and session rules. */
export function calculateReactionTimeDistribution<T extends DatasetAnalyticsTrial>(
  trials: readonly T[],
  getSessionKey: DatasetSessionKeyResolver<T> = (trial) => trial.experimentId || trial.sessionId || trial.id,
): ReactionTimeDistributionBin[] {
  const bins = REACTION_TIME_BINS.map((bin) => ({
    label: bin.label, desktop: 0, mobile: 0,
    desktopSessions: new Set<DatasetSessionKey>(),
    mobileSessions: new Set<DatasetSessionKey>(),
  }));
  for (const trial of trials) {
    const rt = trial.reactionTime;
    if (trial.falseStart || trial.valid === false || trial.timedOut || !(rt > 80 && rt < 2000)) continue;
    let low = 0;
    let high = REACTION_TIME_BINS.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (rt < REACTION_TIME_BINS[middle].max) high = middle;
      else low = middle + 1;
    }
    const definition = REACTION_TIME_BINS[low];
    if (rt < definition.min || rt >= definition.max) continue;
    const bucket = bins[low];
    if (trial.device?.toLowerCase().includes('mobile')) {
      bucket.mobile++;
      bucket.mobileSessions.add(getSessionKey(trial));
    } else {
      bucket.desktop++;
      bucket.desktopSessions.add(getSessionKey(trial));
    }
  }
  return bins.map((bin) => {
    const desktopN = bin.desktopSessions.size;
    const mobileN = bin.mobileSessions.size;
    return { label: bin.label, desktop: bin.desktop, mobile: bin.mobile, desktopN, mobileN, n: desktopN + mobileN };
  });
}
export interface ConsistencyDistributionBin {
  label: string;
  count: number;
  desktop: number;
  mobile: number;
  n: number;
}

/**
 * Calculates consistency score distribution in bins, merging small bins (< 10)
 * to prevent small-cell re-identification while preserving aggregate counts.
 */
export function calculateConsistencyDistribution(
  records: readonly { consistency?: number; deviceCategory?: string; device?: string }[],
  minSubgroupSize = 10,
): ConsistencyDistributionBin[] {
  const initialBins = [
    { label: '0–50%', min: 0, max: 50, count: 0, desktop: 0, mobile: 0 },
    { label: '50–60%', min: 50, max: 60, count: 0, desktop: 0, mobile: 0 },
    { label: '60–70%', min: 60, max: 70, count: 0, desktop: 0, mobile: 0 },
    { label: '70–80%', min: 70, max: 80, count: 0, desktop: 0, mobile: 0 },
    { label: '80–90%', min: 80, max: 90, count: 0, desktop: 0, mobile: 0 },
    { label: '90–100%', min: 90, max: 100, count: 0, desktop: 0, mobile: 0 },
  ];

  records.forEach((r) => {
    const c = typeof r.consistency === 'number' && Number.isFinite(r.consistency) ? r.consistency : null;
    if (c === null || c < 0 || c > 100) return;
    const isMobile = Boolean((r.deviceCategory || r.device || '').toLowerCase().includes('mobile'));
    const bin = initialBins.find((b) => (b.max === 100 ? c >= b.min && c <= b.max : c >= b.min && c < b.max));
    if (bin) {
      bin.count++;
      if (isMobile) bin.mobile++; else bin.desktop++;
    }
  });

  // Only merge if bins actually have counts, and skip empty bins that are trailing
  const activeBins = initialBins.filter((b) => b.count > 0);
  if (!activeBins.length) return [];

  const merged: ConsistencyDistributionBin[] = [];
  let accumulator: { label: string; min: number; max: number; count: number; desktop: number; mobile: number } | null = null;

  for (let i = 0; i < activeBins.length; i++) {
    const current = activeBins[i];
    if (!accumulator) {
      accumulator = { ...current };
    } else {
      accumulator.max = current.max;
      accumulator.count += current.count;
      accumulator.desktop += current.desktop;
      accumulator.mobile += current.mobile;
      accumulator.label = `${accumulator.min}–${accumulator.max}%`;
    }

    if (accumulator.count >= minSubgroupSize || i === activeBins.length - 1) {
      if (accumulator.count < minSubgroupSize && merged.length > 0) {
        const prev = merged[merged.length - 1];
        prev.count += accumulator.count;
        prev.desktop += accumulator.desktop;
        prev.mobile += accumulator.mobile;
        prev.n = prev.count;
        prev.label = prev.label.startsWith('<') ? `<${accumulator.max}%` : `${prev.label.split('–')[0]}–${accumulator.max}%`;
      } else if (accumulator.count >= minSubgroupSize) {
        const label = accumulator.min === 0 ? `<${accumulator.max}%` : `${accumulator.min}–${accumulator.max}%`;
        merged.push({
          label,
          count: accumulator.count,
          desktop: accumulator.desktop,
          mobile: accumulator.mobile,
          n: accumulator.count,
        });
      }
      accumulator = null;
    }
  }

  return merged;
}

export interface ForeperiodIntervalResult {
  interval: string;
  minMs: number;
  maxMs: number;
  medianRT: number;
  n: number;
  suppressed: boolean;
}

export const FOREPERIOD_INTERVALS = [
  { label: '100–500ms', minMs: 100, maxMs: 500 },
  { label: '501–1000ms', minMs: 501, maxMs: 1000 },
  { label: '1001–1500ms', minMs: 1001, maxMs: 1500 },
  { label: '1501–2000ms', minMs: 1501, maxMs: 2000 },
  { label: '2001–2500ms', minMs: 2001, maxMs: 2500 },
  { label: '2501–3000ms', minMs: 2501, maxMs: 3000 },
] as const;

/**
 * Calculates Reaction Time vs Foreperiod over six standardized non-overlapping intervals:
 * 1. Uses valid attempts only.
 * 2. Selects latest valid attempt per logical trial per session.
 * 3. Calculates each session's median RT within the interval.
 * 4. Calculates population median from session-level medians.
 * 5. Suppresses intervals with fewer than minSessions (default 10).
 */
export function calculateForeperiodAggregation(
  docs: readonly {
    id?: string;
    progressionTrials?: readonly Record<string, unknown>[];
  }[],
  minSessions = 10,
): ForeperiodIntervalResult[] {
  const sessionMediansByInterval: number[][] = FOREPERIOD_INTERVALS.map(() => []);

  docs.forEach((doc) => {
    const trials = Array.isArray(doc.progressionTrials) ? doc.progressionTrials : [];
    const latestValidByTrial = new Map<number, { rt: number; fp: number }>();

    trials.forEach((t, idx) => {
      const trialNum = (typeof t.trialNumber === 'number' && Number.isInteger(t.trialNumber) && t.trialNumber > 0)
        ? t.trialNumber
        : idx + 1;
      const rt = typeof t.reactionTime === 'number' ? t.reactionTime : (typeof t.rawLatencyMs === 'number' ? t.rawLatencyMs : null);
      const fp = typeof t.foreperiodMs === 'number' ? t.foreperiodMs : null;
      const falseStart = t.falseStart === true;
      const timedOut = t.timedOut === true;
      const isValid = t.valid === true || (!falseStart && !timedOut && rt !== null && rt >= 80 && rt < 3000);

      if (isValid && rt !== null && fp !== null && fp >= 100 && fp <= 3000) {
        latestValidByTrial.set(trialNum, { rt, fp });
      }
    });

    FOREPERIOD_INTERVALS.forEach((inv, invIdx) => {
      const rtsInInterval: number[] = [];
      latestValidByTrial.forEach(({ rt, fp }) => {
        if (fp >= inv.minMs && fp <= inv.maxMs) {
          rtsInInterval.push(rt);
        }
      });
      if (rtsInInterval.length > 0) {
        sessionMediansByInterval[invIdx].push(medianValue(rtsInInterval));
      }
    });
  });

  return FOREPERIOD_INTERVALS.map((inv, idx) => {
    const sessionList = sessionMediansByInterval[idx];
    const n = sessionList.length;
    if (n < minSessions) {
      return {
        interval: inv.label,
        minMs: inv.minMs,
        maxMs: inv.maxMs,
        medianRT: 0,
        n,
        suppressed: true,
      };
    }
    return {
      interval: inv.label,
      minMs: inv.minMs,
      maxMs: inv.maxMs,
      medianRT: Math.round(medianValue(sessionList)),
      n,
      suppressed: false,
    };
  });
}

export interface TrialProgressionPopulationPoint {
  trialLabel: string;
  trialNumber: number;
  overall: number;
  overallN: number;
}

/**
 * Calculates Trial Progression (1-10) using latest valid attempt per logical trial per session,
 * weighting each session equally.
 */
export function calculatePopulationTrialProgression(
  docs: readonly {
    id?: string;
    progressionTrials?: readonly Record<string, unknown>[];
  }[],
  maxTrials = 10,
): TrialProgressionPopulationPoint[] {
  const trialSessionMedians: number[][] = Array.from({ length: maxTrials }, () => []);

  docs.forEach((doc) => {
    const trials = Array.isArray(doc.progressionTrials) ? doc.progressionTrials : [];
    const latestValidByTrial = new Map<number, number>();

    trials.forEach((t, idx) => {
      const trialNum = (typeof t.trialNumber === 'number' && Number.isInteger(t.trialNumber) && t.trialNumber > 0)
        ? t.trialNumber
        : idx + 1;
      if (trialNum < 1 || trialNum > maxTrials) return;
      const rt = typeof t.reactionTime === 'number' ? t.reactionTime : (typeof t.rawLatencyMs === 'number' ? t.rawLatencyMs : null);
      const falseStart = t.falseStart === true;
      const timedOut = t.timedOut === true;
      const isValid = t.valid === true || (!falseStart && !timedOut && rt !== null && rt >= 80 && rt < 3000);

      if (isValid && rt !== null) {
        latestValidByTrial.set(trialNum, rt);
      }
    });

    latestValidByTrial.forEach((rt, num) => {
      trialSessionMedians[num - 1].push(rt);
    });
  });

  return trialSessionMedians.map((rts, index) => ({
    trialLabel: `Trial ${index + 1}`,
    trialNumber: index + 1,
    overall: Math.round(medianValue(rts)),
    overallN: rts.length,
  }));
}

export interface TrialValidityBreakdown {
  valid: number;
  premature: number;
  anticipatory: number;
  timeout: number;
  unknown: number;
  totalAttempts: number;
  validPercent: number;
  prematurePercent: number;
  anticipatoryPercent: number;
  timeoutPercent: number;
}

/**
 * Classifies trial attempts into the 4 mutually exclusive categories:
 * - Valid: 80 <= RT < 3000 ms
 * - Premature: Response before stimulus (falseStart === true)
 * - Anticipatory: Response after stimulus but below 80 ms
 * - Timeout: No valid response within 3000 ms (timedOut === true or RT >= 3000 ms)
 */
export function calculateTrialValidityBreakdown(
  docs: readonly { progressionTrials?: readonly Record<string, unknown>[] }[],
): TrialValidityBreakdown {
  let valid = 0;
  let premature = 0;
  let anticipatory = 0;
  let timeout = 0;
  let unknown = 0;
  let totalAttempts = 0;

  docs.forEach((doc) => {
    const trials = Array.isArray(doc.progressionTrials) ? doc.progressionTrials : [];
    trials.forEach((t) => {
      totalAttempts++;
      const rt = typeof t.reactionTime === 'number'
        ? t.reactionTime
        : (typeof t.rawLatencyMs === 'number' ? t.rawLatencyMs : null);
      const fs = t.falseStart === true;
      const to = t.timedOut === true;
      const vStr = typeof t.validity === 'string' ? t.validity.toUpperCase() : '';

      if (fs || vStr === 'FALSE_START' || vStr === 'PREMATURE') {
        premature++;
      } else if (to || vStr === 'TIMEOUT' || (rt !== null && rt >= 3000)) {
        timeout++;
      } else if (rt !== null && rt >= 0 && rt < 80) {
        anticipatory++;
      } else if (rt !== null && rt >= 80 && rt < 3000) {
        valid++;
      } else {
        unknown++;
      }
    });
  });

  const validPercent = totalAttempts > 0 ? Math.round((valid / totalAttempts) * 100) : 0;
  const prematurePercent = totalAttempts > 0 ? Math.round((premature / totalAttempts) * 100) : 0;
  const anticipatoryPercent = totalAttempts > 0 ? Math.round((anticipatory / totalAttempts) * 100) : 0;
  const timeoutPercent = totalAttempts > 0 ? Math.round((timeout / totalAttempts) * 100) : 0;

  return {
    valid,
    premature,
    anticipatory,
    timeout,
    unknown,
    totalAttempts,
    validPercent,
    prematurePercent,
    anticipatoryPercent,
    timeoutPercent,
  };
}
export interface TrialProgressionPoint {
  trialLabel: string;
  desktop: number;
  mobile: number;
  overall: number;
  desktopN: number;
  mobileN: number;
  overallN: number;
}

/** One-pass trial progression up to maxTrials (default 10) retaining its deliberately broader original eligibility rule. */
export function calculateTrialProgression<T extends DatasetAnalyticsTrial>(
  trials: readonly T[],
  getSessionKey: DatasetSessionKeyResolver<T> = (trial) => trial.experimentId || trial.sessionId || trial.id,
  maxTrials: number = 10,
): TrialProgressionPoint[] {
  const groups = Array.from({ length: maxTrials }, () => ({
    desktopRTs: [] as number[], mobileRTs: [] as number[], allRTs: [] as number[],
    desktopSessions: new Set<DatasetSessionKey>(),
    mobileSessions: new Set<DatasetSessionKey>(),
    allSessions: new Set<DatasetSessionKey>(),
  }));
  for (const trial of trials) {
    const number = trial.trialNumber;
    if (!Number.isInteger(number) || (number as number) < 1 || (number as number) > maxTrials || trial.falseStart || !(trial.reactionTime > 80)) continue;
    const group = groups[(number as number) - 1];
    const key = getSessionKey(trial);
    group.allRTs.push(trial.reactionTime);
    group.allSessions.add(key);
    if (trial.device?.toLowerCase().includes('mobile')) {
      group.mobileRTs.push(trial.reactionTime);
      group.mobileSessions.add(key);
    } else {
      group.desktopRTs.push(trial.reactionTime);
      group.desktopSessions.add(key);
    }
  }
  return groups.map((group, index) => ({
    trialLabel: `Trial ${index + 1}`,
    desktop: Math.round(medianValue(group.desktopRTs)),
    mobile: Math.round(medianValue(group.mobileRTs)),
    overall: Math.round(medianValue(group.allRTs)),
    desktopN: group.desktopSessions.size,
    mobileN: group.mobileSessions.size,
    overallN: group.allSessions.size,
  }));
}
