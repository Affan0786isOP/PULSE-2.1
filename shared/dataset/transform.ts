import type { DatasetObservation, UnrolledDatasetTrial } from './types';

/**
 * Converts canonical publicDataset progression trials to the shared trial shape.
 * Keep fallback precedence and normalization stable for historical research records.
 */
export function unrollTrialsFromDatasetDocs(
  datasetDocs: DatasetObservation[],
  selectedGameId?: string,
): UnrolledDatasetTrial[] {
  const unrolled: UnrolledDatasetTrial[] = [];

  datasetDocs.forEach((doc) => {
    if (selectedGameId && doc.assessmentType && doc.assessmentType !== selectedGameId) {
      return;
    }

    const trials = Array.isArray(doc.progressionTrials) ? doc.progressionTrials : [];
    trials.forEach((pt: any, idx: number) => {
      const rt = typeof pt.reactionTime === 'number'
        ? pt.reactionTime
        : (typeof pt.rawLatencyMs === 'number'
          ? pt.rawLatencyMs
          : (typeof pt.inputLatencyMs === 'number' ? pt.inputLatencyMs : 0));

      const numericAccuracy = typeof pt.accuracy === 'number'
        ? (pt.accuracy > 1 ? pt.accuracy / 100 : pt.accuracy)
        : null;
      const accuracy = typeof pt.correct === 'boolean'
        ? (pt.correct ? 1 : 0)
        : (numericAccuracy ?? Number.NaN);
      const valid = typeof pt.valid === 'boolean'
        ? pt.valid
        : (typeof pt.validity === 'string'
          ? pt.validity.toUpperCase() === 'VALID'
          : (!pt.falseStart && !pt.timedOut && rt > 80));

      const targetDir = pt.targetDirection
        ? String(pt.targetDirection).toUpperCase()
        : (pt.condition ? String(pt.condition).replace('arrow-', '').toUpperCase() : '');

      unrolled.push({
        id: `${doc.id}-tr-${pt.trialNumber || idx + 1}`,
        participantId: doc.participantId || doc.id,
        experimentId: doc.experimentId || doc.id,
        condition: targetDir ? `arrow-${targetDir.toLowerCase()}` : (pt.condition || 'standard'),
        test: doc.assessmentType || selectedGameId || 'visual-reaction',
        trialNumber: pt.trialNumber || idx + 1,
        stimulusTimestamp: pt.stimulusPresentedAtPerfMs || 0,
        responseTimestamp: pt.responseDetectedAtPerfMs || 0,
        reactionTime: rt,
        accuracy,
        correct: typeof pt.correct === 'boolean' ? pt.correct : undefined,
        valid,
        timedOut: Boolean(pt.timedOut),
        falseStart: Boolean(pt.falseStart),
        timestamp: doc.completedAtMonth || new Date().toISOString(),
        device: doc.deviceCategory || doc.device || 'Web Browser',
        screenWidth: typeof doc.screenWidth === 'number' ? doc.screenWidth : 1440,
        screenHeight: typeof doc.screenHeight === 'number' ? doc.screenHeight : 900,
        ageGroup: doc.ageGroup,
        foreperiodMs: pt.foreperiodMs,
      });
    });
  });

  return unrolled;
}
