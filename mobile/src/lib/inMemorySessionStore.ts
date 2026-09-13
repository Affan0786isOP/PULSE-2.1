export interface RawTrialObservation {
  experimentId: string;
  trialNumber: number;
  timestamp: number;
  [key: string]: any;
}

const inMemorySessionTrials = new Map<string, RawTrialObservation[]>();

export function getInMemorySessionTrials(experimentId: string): RawTrialObservation[] {
  if (!experimentId) return [];
  return [...(inMemorySessionTrials.get(experimentId) || [])];
}

export function recordInMemoryTrial(obs: RawTrialObservation): void {
  if (!obs.experimentId) return;
  const list = inMemorySessionTrials.get(obs.experimentId) || [];
  list.push(obs);
  inMemorySessionTrials.set(obs.experimentId, list);
}
