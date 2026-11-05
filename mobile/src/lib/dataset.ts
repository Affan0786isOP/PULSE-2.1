import type { RawTrialObservation } from './trialStore';
import { unrollTrialsFromDatasetDocs as unrollSharedTrialsFromDatasetDocs } from '@shared/dataset/transform';
import type { DatasetObservation } from '@shared/dataset/types';
export type { DatasetObservation, DatasetStats } from '@shared/dataset/types';

/**
 * Unrolls trials from the anonymized publicDataset archive.
 * The shared transformer keeps desktop and mobile interpretation identical.
 */
export function unrollTrialsFromDatasetDocs(
  datasetDocs: DatasetObservation[],
  selectedGameId?: string,
): RawTrialObservation[] {
  return unrollSharedTrialsFromDatasetDocs(datasetDocs, selectedGameId);
}

type DatasetFetchResult = {
  observations: DatasetObservation[];
  totalCount: number | null;
  error?: string;
  isSampleLimited: boolean;
};

type PendingDatasetRequest = {
  key: string;
  controller: AbortController;
  promise: Promise<DatasetFetchResult>;
  consumers: number;
  settled: boolean;
};

const DATASET_CACHE_TTL_MS = 60_000;
const DATASET_CACHE_MAX_ENTRIES = 10;
const completedDatasetCache = new Map<string, { expiresAt: number; value: DatasetFetchResult }>();
const pendingDatasetRequests = new Map<string, PendingDatasetRequest>();

function createAbortError(): Error {
  const error = new Error('Dataset request was cancelled.');
  error.name = 'AbortError';
  return error;
}

function getSafeObservationLimit(observationLimit: number): number {
  const requestedLimit = Number(observationLimit);
  return Number.isFinite(requestedLimit)
    ? Math.min(5000, Math.max(1, Math.floor(requestedLimit)))
    : 1000;
}

function normalizeDatasetFilter(value?: string): string | null {
  const normalized = value?.trim();
  return normalized && normalized.toLowerCase() !== 'all' ? normalized : null;
}

function subscribeToDatasetRequest(
  entry: PendingDatasetRequest,
  signal?: AbortSignal
): Promise<DatasetFetchResult> {
  if (signal?.aborted) return Promise.reject(createAbortError());

  entry.consumers += 1;
  return new Promise((resolve, reject) => {
    let released = false;
    const release = (abortWhenUnused: boolean) => {
      if (released) return;
      released = true;
      signal?.removeEventListener('abort', onAbort);
      entry.consumers = Math.max(0, entry.consumers - 1);
      if (abortWhenUnused && entry.consumers === 0 && !entry.settled) {
        // Remove the abandoned entry before aborting. React StrictMode can run
        // the next effect setup immediately after cleanup, before this promise
        // settles; that setup must create a fresh network request.
        if (pendingDatasetRequests.get(entry.key) === entry) {
          pendingDatasetRequests.delete(entry.key);
        }
        entry.controller.abort();
      }
    };
    const onAbort = () => {
      release(true);
      reject(createAbortError());
    };

    signal?.addEventListener('abort', onAbort, { once: true });
    entry.promise.then(
      value => {
        release(false);
        resolve(value);
      },
      error => {
        release(false);
        reject(error);
      }
    );
  });
}

/** Clears only ephemeral in-memory data; Firestore remains authoritative. */
export function clearDatasetObservationsCache(): void {
  completedDatasetCache.clear();
  // Abort older in-flight snapshots too; otherwise they could repopulate the
  // cache with a pre-submission dataset response after this invalidation.
  for (const request of pendingDatasetRequests.values()) {
    request.controller.abort();
  }
  pendingDatasetRequests.clear();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pulse:research-submitted', clearDatasetObservationsCache);
}

const fetchDatasetObservationsUncached = async (
  filters: { assessmentType?: string; ageGroup?: string },
  observationLimit: number,
  signal: AbortSignal
): Promise<DatasetFetchResult> => {
  const safeLimit = getSafeObservationLimit(observationLimit);
  const pageSize = 250;
  const observations: DatasetObservation[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  let hasMore = true;

  const assessmentType = normalizeDatasetFilter(filters.assessmentType);
  const ageGroup = normalizeDatasetFilter(filters.ageGroup);

  try {
    while (observations.length < safeLimit && hasMore) {
      const requestedPageSize = Math.min(pageSize, safeLimit - observations.length);
      const params = new URLSearchParams();
      if (assessmentType) params.set('assessmentType', assessmentType);
      if (ageGroup) params.set('ageGroup', ageGroup);
      params.set('limit', String(requestedPageSize));
      if (forceRefresh) params.set('fresh', '1');
      if (cursor) params.set('cursor', cursor);

      const response = await fetch(`/api/research/dataset?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        ...(forceRefresh ? { cache: 'no-store' as RequestCache } : {}),
        signal,
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
      if (payload.records.length > requestedPageSize) {
        throw new Error('Dataset API returned more records than requested.');
      }
      if (payload.records.some(record =>
        !record || typeof record.id !== 'string' || !record.id.trim() ||
        typeof record.assessmentType !== 'string' || !record.assessmentType.trim()
      )) {
        throw new Error('Dataset API returned a record without a valid identity or assessment type.');
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
        const summaryResponse = await fetch(
          forceRefresh ? '/api/research/dataset/summary?fresh=1' : '/api/research/dataset/summary',
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
            ...(forceRefresh ? { cache: 'no-store' as RequestCache } : {}),
            signal,
          }
        );
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
      } catch (summaryError: unknown) {
        if (signal.aborted || (summaryError instanceof Error && summaryError.name === 'AbortError')) {
          throw createAbortError();
        }
        // A summary failure must not hide successfully fetched dataset records.
      }
    }

    const isSampleLimited = hasMore && observations.length >= safeLimit;
    if (totalCount === null && !isSampleLimited) totalCount = observations.length;
    if (totalCount !== null && totalCount < observations.length) totalCount = observations.length;

    observations.sort((a, b) => {
      const monthA = typeof a.completedAtMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(a.completedAtMonth)
        ? a.completedAtMonth
        : '';
      const monthB = typeof b.completedAtMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(b.completedAtMonth)
        ? b.completedAtMonth
        : '';
      return monthB.localeCompare(monthA) || a.id.localeCompare(b.id);
    });

    return { observations, totalCount, isSampleLimited };
  } catch (error: unknown) {
    if (signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw createAbortError();
    }
    console.warn('Dataset API fetch failed:', error instanceof Error ? error.message : error);
    return {
      observations: [],
      totalCount: null,
      error: error instanceof Error && error.message.includes('Dataset was refreshed recently')
        ? error.message
        : 'Research data could not be loaded. Refresh the page to try again.',
      isSampleLimited: false,
    };
  }
};

/**
 * Session-scoped cache + in-flight deduplication. Independent callers share
 * the same network operation, but one caller cancelling does not abort it for
 * other active consumers. The underlying request is cancelled when everyone
 * has left the request.
 */
export const fetchDatasetObservations = (
  filters: { assessmentType?: string; ageGroup?: string },
  observationLimit: number = 1000,
  signal?: AbortSignal,
  options: { forceRefresh?: boolean } = {}
): Promise<DatasetFetchResult> => {
  if (signal?.aborted) return Promise.reject(createAbortError());

  const forceRefresh = options.forceRefresh === true;
  if (forceRefresh) clearDatasetObservationsCache();

  const safeLimit = getSafeObservationLimit(observationLimit);
  const assessmentType = normalizeDatasetFilter(filters.assessmentType);
  const ageGroup = normalizeDatasetFilter(filters.ageGroup);
  const key = JSON.stringify([assessmentType, ageGroup, safeLimit]);
  const now = Date.now();
  const cached = completedDatasetCache.get(key);

  if (cached && cached.expiresAt > now) {
    // Refresh insertion order so this entry behaves as the most-recently-used.
    completedDatasetCache.delete(key);
    completedDatasetCache.set(key, cached);
    return Promise.resolve(cached.value);
  }
  if (cached) completedDatasetCache.delete(key);

  let pending = pendingDatasetRequests.get(key);
  if (pending && (pending.settled || pending.controller.signal.aborted)) {
    if (pendingDatasetRequests.get(key) === pending) {
      pendingDatasetRequests.delete(key);
    }
    pending = undefined;
  }
  if (!pending) {
    const controller = new AbortController();
    let entry: PendingDatasetRequest;
    const promise = fetchDatasetObservationsUncached(
      { assessmentType: assessmentType ?? undefined, ageGroup: ageGroup ?? undefined },
      safeLimit,
      controller.signal
    ).then(value => {
      if (!value.error && !controller.signal.aborted) {
        if (!completedDatasetCache.has(key) && completedDatasetCache.size >= DATASET_CACHE_MAX_ENTRIES) {
          const oldestKey = completedDatasetCache.keys().next().value;
          if (oldestKey !== undefined) completedDatasetCache.delete(oldestKey);
        }
        completedDatasetCache.set(key, {
          expiresAt: Date.now() + DATASET_CACHE_TTL_MS,
          value
        });
      }
      return value;
    }).finally(() => {
      entry.settled = true;
      if (pendingDatasetRequests.get(key) === entry) {
        pendingDatasetRequests.delete(key);
      }
    });

    entry = { key, controller, promise, consumers: 0, settled: false };
    pendingDatasetRequests.set(key, entry);
    pending = entry;
  }

  return subscribeToDatasetRequest(pending, signal);
};
