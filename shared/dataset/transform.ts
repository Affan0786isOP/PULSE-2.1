import type { DatasetObservation, UnrolledDatasetTrial } from './types';

function finiteNonNegative(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
}

function nonNegativeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

function normalizeDirection(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().replace(/^arrow-/i, '').toUpperCase();
  return ['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(normalized) ? normalized : '';
}

/**
 * Converts anonymized publicDataset progression trials into the shared UI shape.
 * It never derives participant identity, exact dates, or viewport measurements
 * from unavailable fields. Missing numeric measurements remain non-finite/unknown.
 */
export function unrollTrialsFromDatasetDocs(
  datasetDocs: DatasetObservation[],
  selectedGameId?: string,
): UnrolledDatasetTrial[] {
  const unrolled: UnrolledDatasetTrial[] = [];

  datasetDocs.forEach((doc) => {
    if (!doc || typeof doc.id !== 'string' || !doc.id.trim()) return;
    if (selectedGameId && doc.assessmentType && doc.assessmentType !== selectedGameId) return;

    const trials = Array.isArray(doc.progressionTrials) ? doc.progressionTrials : [];
    const usedIds = new Set<string>();
    const attemptsByTrial = new Map<number, number>();

    trials.forEach((value: unknown, index: number) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return;
      const trial = value as Record<string, unknown>;

      const trialNumber = positiveInteger(trial.trialNumber) ?? index + 1;
      const priorAttempts = attemptsByTrial.get(trialNumber) ?? 0;
      const attemptNumber = positiveInteger(trial.attemptNumber) ?? priorAttempts + 1;
      attemptsByTrial.set(trialNumber, Math.max(priorAttempts, attemptNumber));

      const baseId = `${doc.id}-tr-${trialNumber}`;
      let id = priorAttempts === 0 ? baseId : `${baseId}-attempt-${attemptNumber}`;
      let duplicateSuffix = 2;
      while (usedIds.has(id)) {
        id = `${baseId}-attempt-${attemptNumber}-${duplicateSuffix}`;
        duplicateSuffix += 1;
      }
      usedIds.add(id);

      const falseStart = trial.falseStart === true;
      const timedOut = trial.timedOut === true;
      const reactionTime =
        finiteNonNegative(trial.reactionTime) ??
        finiteNonNegative(trial.rawLatencyMs) ??
        finiteNonNegative(trial.inputLatencyMs) ??
        Number.NaN;

      const rawAccuracy = finiteNonNegative(trial.accuracy);
      const numericAccuracy = rawAccuracy !== undefined && rawAccuracy <= 100
        ? (rawAccuracy > 1 ? rawAccuracy / 100 : rawAccuracy)
        : undefined;
      const correct = typeof trial.correct === 'boolean' ? trial.correct : undefined;
      const accuracy = correct !== undefined
        ? (correct ? 1 : 0)
        : (numericAccuracy ?? Number.NaN);

      const valid = typeof trial.valid === 'boolean'
        ? trial.valid
        : (typeof trial.validity === 'string'
          ? trial.validity.toUpperCase() === 'VALID'
          : (!falseStart && !timedOut && Number.isFinite(reactionTime) && reactionTime > 80));

      const targetDirection = normalizeDirection(
        typeof trial.targetDirection === 'string'
          ? trial.targetDirection
          : trial.condition,
      );
      const condition = targetDirection
        ? `arrow-${targetDirection.toLowerCase()}`
        : (typeof trial.condition === 'string' ? trial.condition : 'standard');

      const month = typeof doc.completedAtMonth === 'string' &&
        /^\\d{4}-(0[1-9]|1[0-2])$/.test(doc.completedAtMonth)
        ? doc.completedAtMonth
        : undefined;

      unrolled.push({
        id,
        // Public archive records identify an assessment, not a participant.
        participantId: '',
        experimentId: doc.id,
        condition,
        test: typeof doc.assessmentType === 'string' && doc.assessmentType
          ? doc.assessmentType
          : (selectedGameId || 'unknown'),
        trialNumber,
        trialIndex: nonNegativeInteger(trial.trialIndex) ?? index + 1,
        sequenceNumber: nonNegativeInteger(trial.sequenceNumber) ?? index + 1,
        attemptNumber,
        stimulusTimestamp: finiteNonNegative(trial.stimulusPresentedAtPerfMs) ?? Number.NaN,
        responseTimestamp: finiteNonNegative(trial.responseDetectedAtPerfMs) ?? Number.NaN,
        reactionTime,
        accuracy,
        correct,
        valid,
        timedOut,
        falseStart,
        // Exact event time is not public; preserve only month precision separately.
        timestamp: '',
        completedAtMonth: month,
        device: (typeof doc.deviceCategory === 'string' && doc.deviceCategory) ||
          (typeof doc.device === 'string' && doc.device) || 'unknown',
        // Public documents do not provide viewport dimensions; zero means unknown.
        screenWidth: finiteNonNegative(doc.screenWidth) && (doc.screenWidth as number) > 0
          ? doc.screenWidth as number
          : 0,
        screenHeight: finiteNonNegative(doc.screenHeight) && (doc.screenHeight as number) > 0
          ? doc.screenHeight as number
          : 0,
        ageGroup: typeof doc.ageGroup === 'string' ? doc.ageGroup : undefined,
        foreperiodMs: finiteNonNegative(trial.foreperiodMs),
      });
    });
  });

  return unrolled;
}
