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
    if (trial.falseStart || trial.valid === false || trial.timedOut || rt <= 80 || rt >= 2000) continue;
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
export interface TrialProgressionPoint {
  trialLabel: string;
  desktop: number;
  mobile: number;
  overall: number;
  desktopN: number;
  mobileN: number;
  overallN: number;
}
/** One-pass five-trial progression retaining its deliberately broader original eligibility rule. */
export function calculateTrialProgression<T extends DatasetAnalyticsTrial>(
  trials: readonly T[],
  getSessionKey: DatasetSessionKeyResolver<T> = (trial) => trial.experimentId || trial.sessionId || trial.id,
): TrialProgressionPoint[] {
  const groups = Array.from({ length: 5 }, () => ({
    desktopRTs: [] as number[], mobileRTs: [] as number[], allRTs: [] as number[],
    desktopSessions: new Set<DatasetSessionKey>(),
    mobileSessions: new Set<DatasetSessionKey>(),
    allSessions: new Set<DatasetSessionKey>(),
  }));
  for (const trial of trials) {
    const number = trial.trialNumber;
    if (!Number.isInteger(number) || (number as number) < 1 || (number as number) > 5 || trial.falseStart || trial.reactionTime <= 80) continue;
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
