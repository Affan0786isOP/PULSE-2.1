import type { RawTrialObservation } from './trialStore';

export interface DatasetObservation {
  id: string;
  ageGroup?: string;
  assessmentType: string;
  completedAtMonth?: string;
  device?: string;
  deviceCategory?: string;
  progressionTrials?: any[];
  averageReactionTime?: number;
  medianReactionTime?: number;
  fastestReactionTime?: number;
  standardDeviation?: number;
  totalFalseStarts?: number;
  totalTrials?: number;
  errorRate?: number;
  [key: string]: any; // metrics
}

export interface DatasetStats {
  totalObservations: number;
}

/**
 * Unrolls granular trial observations from canonical Firestore publicDataset progressionTrials.
 * Treats Firestore publicDataset records as the authoritative single source of truth.
 */
export function unrollTrialsFromDatasetDocs(
  datasetDocs: DatasetObservation[],
  selectedGameId?: string
): RawTrialObservation[] {
  const unrolled: RawTrialObservation[] = [];

  datasetDocs.forEach((doc) => {
    if (selectedGameId && doc.assessmentType && doc.assessmentType !== selectedGameId) return;

    const trials = Array.isArray(doc.progressionTrials) ? doc.progressionTrials : [];
    trials.forEach((value: unknown, idx: number) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return;
      const pt = value as Record<string, unknown>;
      const finite = (candidate: unknown): candidate is number =>
        typeof candidate === 'number' && Number.isFinite(candidate);
      const rt = finite(pt.reactionTime)
        ? pt.reactionTime
        : (finite(pt.rawLatencyMs) ? pt.rawLatencyMs : (finite(pt.inputLatencyMs) ? pt.inputLatencyMs : Number.NaN));

      const numericAccuracy = finite(pt.accuracy)
        ? (pt.accuracy > 1 ? pt.accuracy / 100 : pt.accuracy)
        : null;
      const accuracy = typeof pt.correct === 'boolean'
        ? (pt.correct ? 1 : 0)
        : (numericAccuracy ?? Number.NaN);
      const valid = typeof pt.valid === 'boolean'
        ? pt.valid
        : (typeof pt.validity === 'string'
          ? pt.validity.toUpperCase() === 'VALID'
          : (!pt.falseStart && !pt.timedOut && finite(rt) && rt > 80));

      const rawDirection = typeof pt.targetDirection === 'string'
        ? pt.targetDirection
        : (typeof pt.condition === 'string' && /^arrow-/i.test(pt.condition)
          ? pt.condition.replace(/^arrow-/i, '')
          : '');
      const normalizedDirection = rawDirection.toUpperCase();
      const targetDirection = ['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(normalizedDirection)
        ? normalizedDirection
        : '';

      const trialNumber = finite(pt.trialNumber) && pt.trialNumber > 0
        ? Math.floor(pt.trialNumber)
        : idx + 1;
      const attemptNumber = finite(pt.attemptNumber) && pt.attemptNumber > 0
        ? Math.floor(pt.attemptNumber)
        : 1;

      unrolled.push({
        id: `${doc.id}-tr-${trialNumber}-attempt-${attemptNumber}-${idx + 1}`,
        // A public record ID groups trials within one anonymized assessment; it is not a participant ID.
        participantId: '',
        experimentId: doc.id,
        condition: targetDirection
          ? `arrow-${targetDirection.toLowerCase()}`
          : (typeof pt.condition === 'string' ? pt.condition : 'standard'),
        test: doc.assessmentType || selectedGameId || 'unknown',
        trialNumber,
        trialIndex: finite(pt.trialIndex) ? pt.trialIndex : idx + 1,
        sequenceNumber: finite(pt.sequenceNumber) ? pt.sequenceNumber : idx + 1,
        attemptNumber,
        stimulusTimestamp: finite(pt.stimulusPresentedAtPerfMs) ? pt.stimulusPresentedAtPerfMs : Number.NaN,
        responseTimestamp: finite(pt.responseDetectedAtPerfMs) ? pt.responseDetectedAtPerfMs : Number.NaN,
        reactionTime: rt,
        accuracy,
        correct: typeof pt.correct === 'boolean' ? pt.correct : undefined,
        valid,
        timedOut: pt.timedOut === true,
        falseStart: pt.falseStart === true,
        // Public records deliberately retain month precision; empty means unknown, not "now".
        timestamp: typeof doc.completedAtMonth === 'string' ? doc.completedAtMonth : '',
        device: typeof doc.deviceCategory === 'string'
          ? doc.deviceCategory
          : (typeof doc.device === 'string' ? doc.device : 'unknown'),
        // Public records do not include viewport dimensions. Zero is an unknown sentinel, not a measurement.
        screenWidth: finite(doc.screenWidth) && doc.screenWidth > 0 ? doc.screenWidth : 0,
        screenHeight: finite(doc.screenHeight) && doc.screenHeight > 0 ? doc.screenHeight : 0,
        ageGroup: doc.ageGroup,
        foreperiodMs: finite(pt.foreperiodMs) ? pt.foreperiodMs : undefined
      });
    });
  });

  return unrolled;
}

export const fetchDatasetObservations = async (
  filters: { assessmentType?: string; ageGroup?: string },
  observationLimit: number = 1000
): Promise<{ observations: DatasetObservation[]; totalCount: number | null; error?: string; isSampleLimited: boolean }> => {
  const safeLimit = Math.max(1, Math.min(5000, Math.floor(Number(observationLimit) || 1000)));
  const pageSize = 250;
  const observations: DatasetObservation[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  let hasMore = true;

  const assessmentType = filters.assessmentType && filters.assessmentType !== 'All' && filters.assessmentType !== 'all'
    ? filters.assessmentType
    : null;
  const ageGroup = filters.ageGroup && filters.ageGroup !== 'All' && filters.ageGroup !== 'all'
    ? filters.ageGroup
    : null;

  try {
    while (observations.length < safeLimit && hasMore) {
      const params = new URLSearchParams();
      if (assessmentType) params.set('assessmentType', assessmentType);
      if (ageGroup) params.set('ageGroup', ageGroup);
      params.set('limit', String(Math.min(pageSize, safeLimit - observations.length)));
      if (cursor) params.set('cursor', cursor);

      const response = await fetch(`/api/research/dataset?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const payload = await response.json() as {
        success?: boolean;
        error?: string;
        records?: DatasetObservation[];
        hasMore?: boolean;
        nextCursor?: string | null;
      };

      if (!response.ok || payload.success !== true || !Array.isArray(payload.records) ||
          typeof payload.hasMore !== 'boolean') {
        throw new Error(payload.error || `Dataset API request failed (HTTP ${response.status}).`);
      }
      const requestedPageSize = Math.min(pageSize, safeLimit - observations.length);
      if (payload.records.length > requestedPageSize) {
        throw new Error('Dataset API returned more records than requested.');
      }
      if (payload.records.some(record => !record || typeof record.id !== 'string' || !record.id.trim())) {
        throw new Error('Dataset API returned a record without a valid ID.');
      }

      observations.push(...payload.records);
      hasMore = payload.hasMore;
      if (hasMore && payload.records.length === 0) {
        throw new Error('Dataset API reported more pages without returning any records.');
      }

      if (hasMore) {
        const nextCursor = typeof payload.nextCursor === 'string' && payload.nextCursor.trim()
          ? payload.nextCursor.trim()
          : null;
        if (!nextCursor || seenCursors.has(nextCursor)) {
          throw new Error('Dataset API returned an invalid pagination cursor.');
        }
        seenCursors.add(nextCursor);
        cursor = nextCursor;
      }
    }

    let totalCount: number | null = null;
    if (!ageGroup) {
      try {
        const summaryResponse = await fetch('/api/research/dataset/summary', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store'
        });
        if (summaryResponse.ok) {
          const summary = await summaryResponse.json() as {
            success?: boolean;
            totalRecords?: number;
            counts?: Record<string, number>;
          };
          if (summary.success === true) {
            const candidate = assessmentType ? summary.counts?.[assessmentType] : summary.totalRecords;
            if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0) {
              totalCount = candidate;
            }
          }
        }
      } catch {
        // A summary failure must not hide successfully fetched dataset records.
      }
    }

    const isSampleLimited = hasMore && observations.length >= safeLimit;
    if (totalCount === null && !isSampleLimited) totalCount = observations.length;
    if (totalCount !== null && totalCount < observations.length) totalCount = observations.length;

    observations.sort((a, b) => {
      const monthA = typeof a.completedAtMonth === 'string' && /^\\d{4}-(0[1-9]|1[0-2])$/.test(a.completedAtMonth)
        ? a.completedAtMonth
        : '';
      const monthB = typeof b.completedAtMonth === 'string' && /^\\d{4}-(0[1-9]|1[0-2])$/.test(b.completedAtMonth)
        ? b.completedAtMonth
        : '';
      return monthB.localeCompare(monthA) || a.id.localeCompare(b.id);
    });

    return { observations, totalCount, isSampleLimited };
  } catch (error: unknown) {
    console.warn('Dataset API fetch failed:', error instanceof Error ? error.message : error);
    return {
      observations: [],
      totalCount: null,
      error: 'Research data could not be loaded. Refresh the page to try again.',
      isSampleLimited: false
    };
  }
};

