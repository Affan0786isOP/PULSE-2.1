import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearDatasetObservationsCache,
  fetchDatasetObservations,
  unrollTrialsFromDatasetDocs
} from '../../src/lib/dataset';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response;
}

function datasetPage(start: number, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `session-${start + index}`,
    assessmentType: 'visual-reaction',
    ageGroup: 'Adults (26–40)',
    completedAtMonth: '2026-10',
    progressionTrials: []
  }));
}

describe('Dataset API client', () => {
  afterEach(() => {
    clearDatasetObservationsCache();
    vi.unstubAllGlobals();
  });


  it('clamps a zero observation cap to one record instead of the default cap', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        success: true, records: datasetPage(0, 1), count: 1, hasMore: false, nextCursor: null
      }))
      .mockResolvedValueOnce(jsonResponse({
        success: true, totalRecords: 1, counts: { 'visual-reaction': 1 }
      }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchDatasetObservations({ assessmentType: 'visual-reaction' }, 0);

    expect(result.observations).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('limit=1');
  });


  it('reuses completed results from the in-memory cache without another API request', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        success: true, records: datasetPage(0, 1), count: 1, hasMore: false, nextCursor: null
      }))
      .mockResolvedValueOnce(jsonResponse({
        success: true, totalRecords: 1, counts: { 'visual-reaction': 1 }
      }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchDatasetObservations({ assessmentType: 'visual-reaction' }, 1000);
    const second = await fetchDatasetObservations({ assessmentType: 'visual-reaction' }, 1000);

    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight request between callers with the same filters', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        success: true, records: datasetPage(0, 1), count: 1, hasMore: false, nextCursor: null
      }))
      .mockResolvedValueOnce(jsonResponse({
        success: true, totalRecords: 1, counts: { 'visual-reaction': 1 }
      }));
    vi.stubGlobal('fetch', fetchMock);

    const [first, second] = await Promise.all([
      fetchDatasetObservations({ assessmentType: 'visual-reaction' }, 1000),
      fetchDatasetObservations({ assessmentType: 'visual-reaction' }, 1000)
    ]);

    expect(first).toBe(second);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('cancels the shared network request when its only consumer aborts', async () => {
    let networkAborted = false;
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        networkAborted = true;
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    }));
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    const pending = fetchDatasetObservations({ assessmentType: 'visual-reaction' }, 1000, controller.signal);
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(networkAborted).toBe(true);
  });

  it('follows cursors and reports the filtered total', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        success: true, records: datasetPage(0, 250), count: 250, hasMore: true, nextCursor: 'cursor-250'
      }))
      .mockResolvedValueOnce(jsonResponse({
        success: true, records: datasetPage(250, 100), count: 100, hasMore: false, nextCursor: null
      }))
      .mockResolvedValueOnce(jsonResponse({
        success: true, totalRecords: 350, counts: { 'visual-reaction': 350 }
      }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchDatasetObservations({ assessmentType: 'visual-reaction' }, 1000);

    expect(result.error).toBeUndefined();
    expect(result.observations).toHaveLength(350);
    expect(result.totalCount).toBe(350);
    expect(result.isSampleLimited).toBe(false);
    expect(String(fetchMock.mock.calls[1][0])).toContain('cursor=cursor-250');
  });

  it('marks the dataset as sample-limited when the requested cap is reached', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        success: true, records: datasetPage(0, 250), count: 250, hasMore: true, nextCursor: 'cursor-250'
      }))
      .mockResolvedValueOnce(jsonResponse({
        success: true, records: datasetPage(250, 250), count: 250, hasMore: true, nextCursor: 'cursor-500'
      }))
      .mockResolvedValueOnce(jsonResponse({
        success: true, totalRecords: 1200, counts: { 'visual-reaction': 1200 }
      }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchDatasetObservations({ assessmentType: 'visual-reaction' }, 500);

    expect(result.observations).toHaveLength(500);
    expect(result.totalCount).toBe(1200);
    expect(result.isSampleLimited).toBe(true);
  });


  it('unrolls public trials without inventing dates, viewport data, or participant IDs', () => {
    const trials = unrollTrialsFromDatasetDocs([{
      id: 'public-assessment-1',
      assessmentType: 'direction',
      completedAtMonth: '2026-10',
      progressionTrials: [
        {
          trialNumber: 2,
          trialIndex: 1,
          sequenceNumber: 3,
          attemptNumber: 1,
          targetDirection: 'UP',
          reactionTime: 215,
          correct: true,
          valid: true,
          stimulusPresentedAtPerfMs: 100,
          responseDetectedAtPerfMs: 315
        },
        {
          trialNumber: 2,
          trialIndex: 1,
          sequenceNumber: 4,
          attemptNumber: 2,
          targetDirection: 'DOWN',
          reactionTime: 230,
          correct: false,
          valid: true
        }
      ]
    }], 'direction');

    expect(trials).toHaveLength(2);
    expect(trials[0].id).not.toBe(trials[1].id);
    expect(trials.map(trial => trial.attemptNumber)).toEqual([1, 2]);
    expect(trials[0].condition).toBe('arrow-up');
    expect(trials[0].participantId).toBe('');
    expect(trials[0].experimentId).toBe('public-assessment-1');
    expect(trials[0].timestamp).toBe('');
    expect(trials[0].completedAtMonth).toBe('2026-10');
    expect(trials[0].screenWidth).toBe(0);
    expect(trials[0].screenHeight).toBe(0);
    expect(Number.isNaN(trials[1].stimulusTimestamp)).toBe(true);
    expect(Number.isNaN(trials[1].responseTimestamp)).toBe(true);
  });

  it('does not convert non-direction conditions into arrow directions', () => {
    const [trial] = unrollTrialsFromDatasetDocs([{
      id: 'public-stroop-1',
      assessmentType: 'color-recognition',
      progressionTrials: [{ condition: 'congruent', reactionTime: 250, valid: true }]
    }]);
    expect(trial.condition).toBe('congruent');
  });

  it('returns an explicit error instead of silently reporting an empty dataset', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ success: false, error: 'Database service unavailable', records: [] }, 503)
    ));

    const result = await fetchDatasetObservations({ assessmentType: 'visual-reaction' });

    expect(result.observations).toEqual([]);
    expect(result.error).toMatch(/could not be loaded/i);
    expect(result.isSampleLimited).toBe(false);
  });
});
