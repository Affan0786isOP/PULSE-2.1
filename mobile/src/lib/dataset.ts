import type { RawTrialObservation } from './trialStore';
import { unrollTrialsFromDatasetDocs as unrollSharedTrialsFromDatasetDocs } from '@shared/dataset/transform';
import type { DatasetObservation } from '@shared/dataset/types';
export type { DatasetObservation, DatasetStats } from '@shared/dataset/types';

/**
 * Unrolls granular trial observations from canonical Firestore publicDataset progressionTrials.
 * Treats Firestore publicDataset records as the authoritative single source of truth.
 */
export function unrollTrialsFromDatasetDocs(
  datasetDocs: DatasetObservation[],
  selectedGameId?: string,
): RawTrialObservation[] {
  return unrollSharedTrialsFromDatasetDocs(datasetDocs, selectedGameId);
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

      if (!response.ok || payload.success !== true || !Array.isArray(payload.records)) {
        throw new Error(payload.error || `Dataset API request failed (HTTP ${response.status}).`);
      }

      observations.push(...payload.records);
      hasMore = payload.hasMore === true;

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
      const timeA = Number(a.completedAtTimestamp || (a.completedAtMonth ? new Date(a.completedAtMonth).getTime() : 0));
      const timeB = Number(b.completedAtTimestamp || (b.completedAtMonth ? new Date(b.completedAtMonth).getTime() : 0));
      return timeB - timeA;
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

