import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDatasetObservations } from '../../src/lib/dataset';

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
    vi.unstubAllGlobals();
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
