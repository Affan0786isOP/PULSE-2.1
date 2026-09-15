import { describe, it, expect } from 'vitest';
import { applyDatasetFilters, isFilterActive, countActiveFilters, DEFAULT_DATASET_FILTERS } from './filters';
import { DatasetObservation, DatasetFilters } from './types';

describe('Dataset Filter Engine Integration', () => {
  const sampleObservations: DatasetObservation[] = [
    {
      obsId: 'obs-1',
      sessionId: 'sess-1',
      assessmentType: 'visual-reaction',
      trialIndex: 1,
      isValid: true,
      validityStatus: 'VALID',
      latencyMs: 240,
      isCorrect: true,
      ageGroup: 'Young adults (18–25)',
      deviceCategory: 'desktop',
      inputModality: 'mouse',
      refreshRateHz: 144,
      completedAtMonth: '2026-03'
    },
    {
      obsId: 'obs-2',
      sessionId: 'sess-2',
      assessmentType: 'direction',
      trialIndex: 1,
      isValid: true,
      validityStatus: 'VALID',
      latencyMs: 310,
      isCorrect: true,
      ageGroup: 'Adults (26–40)',
      deviceCategory: 'mobile',
      inputModality: 'touch',
      refreshRateHz: 60,
      completedAtMonth: '2026-02'
    },
    {
      obsId: 'obs-3',
      sessionId: 'sess-3',
      assessmentType: 'colour-recognition',
      trialIndex: 1,
      isValid: true,
      validityStatus: 'VALID',
      latencyMs: 450,
      isCorrect: true,
      ageGroup: 'Middle-aged adults (41–60)',
      deviceCategory: 'desktop',
      inputModality: 'keyboard',
      refreshRateHz: 120,
      completedAtMonth: '2026-03'
    },
    {
      obsId: 'obs-4',
      sessionId: 'sess-4',
      assessmentType: 'block-memory',
      trialIndex: 1,
      isValid: true,
      validityStatus: 'VALID',
      latencyMs: null,
      isCorrect: true,
      ageGroup: 'Children (8–12)',
      deviceCategory: 'mobile',
      inputModality: 'touch',
      refreshRateHz: 60,
      completedAtMonth: '2026-01'
    },
    {
      obsId: 'obs-5',
      sessionId: 'sess-5',
      assessmentType: 'number-memory',
      trialIndex: 1,
      isValid: true,
      validityStatus: 'VALID',
      latencyMs: null,
      isCorrect: true,
      ageGroup: 'Seniors (76+)',
      deviceCategory: 'unknown',
      inputModality: 'unknown',
      refreshRateHz: null,
      completedAtMonth: '2026-02'
    }
  ];

  describe('Default Filter State', () => {
    it('returns all observations with DEFAULT_DATASET_FILTERS', () => {
      const result = applyDatasetFilters(sampleObservations, DEFAULT_DATASET_FILTERS);
      expect(result).toHaveLength(5);
      expect(isFilterActive(DEFAULT_DATASET_FILTERS)).toBe(false);
      expect(countActiveFilters(DEFAULT_DATASET_FILTERS)).toBe(0);
    });
  });

  describe('1. Assessment Protocol Filtering', () => {
    it('filters by visual-reaction', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, assessmentType: 'visual-reaction' };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('obs-1');
      expect(isFilterActive(filters)).toBe(true);
      expect(countActiveFilters(filters)).toBe(1);
    });

    it('filters by direction', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, assessmentType: 'direction' };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('obs-2');
    });

    it('filters by colour-recognition', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, assessmentType: 'colour-recognition' };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('obs-3');
    });
  });

  describe('2. Age Group Filtering', () => {
    it('filters by Young adults (18–25) authoritative group', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, ageGroup: 'Young adults (18–25)' as any };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('obs-1');
    });

    it('filters by Children (8–12) authoritative group', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, ageGroup: 'Children (8–12)' as any };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('obs-4');
    });

    it('filters by Seniors (76+) authoritative group', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, ageGroup: 'Seniors (76+)' as any };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('obs-5');
    });
  });

  describe('3. Device Category Filtering', () => {
    it('filters by desktop', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, deviceCategory: 'desktop' };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.obsId)).toEqual(['obs-1', 'obs-3']);
    });

    it('filters by mobile', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, deviceCategory: 'mobile' };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.obsId)).toEqual(['obs-2', 'obs-4']);
    });

    it('filters by unknown device', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, deviceCategory: 'unknown' };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('obs-5');
    });
  });

  describe('4. Input Modality Filtering', () => {
    it('filters by mouse', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, inputModality: 'mouse' };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('obs-1');
    });

    it('filters by touch', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, inputModality: 'touch' };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.obsId)).toEqual(['obs-2', 'obs-4']);
    });

    it('filters by keyboard', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, inputModality: 'keyboard' };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('obs-3');
    });
  });

  describe('5. Refresh Rate Filtering', () => {
    it('filters by 60 Hz', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, refreshRate: '60' };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.obsId)).toEqual(['obs-2', 'obs-4']);
    });

    it('filters by 120 Hz', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, refreshRate: '120' };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('obs-3');
    });

    it('filters by 144+ Hz', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, refreshRate: '144plus' };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('obs-1');
    });
  });

  describe('6. Completion Month Filtering', () => {
    it('filters by 2026-03', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, completedAtMonth: '2026-03' };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.obsId)).toEqual(['obs-1', 'obs-3']);
    });

    it('filters by 2026-01', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, completedAtMonth: '2026-01' };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('obs-4');
    });
  });

  describe('Multi-dimensional Combinations & Active Count', () => {
    it('combines multiple active filters correctly', () => {
      const filters: DatasetFilters = {
        assessmentType: 'visual-reaction',
        ageGroup: 'Young adults (18–25)' as any,
        deviceCategory: 'desktop',
        inputModality: 'mouse',
        refreshRate: '144plus',
        completedAtMonth: '2026-03'
      };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('obs-1');
      expect(isFilterActive(filters)).toBe(true);
      expect(countActiveFilters(filters)).toBe(6);
    });

    it('returns empty array when combined filters have no match', () => {
      const filters: DatasetFilters = {
        ...DEFAULT_DATASET_FILTERS,
        assessmentType: 'visual-reaction',
        deviceCategory: 'mobile'
      };
      const result = applyDatasetFilters(sampleObservations, filters);
      expect(result).toHaveLength(0);
      expect(countActiveFilters(filters)).toBe(2);
    });
  });

  describe('7. Validity Filtering', () => {
    const validityObservations: DatasetObservation[] = [
      { ...sampleObservations[0], obsId: 'v-1', validityStatus: 'VALID', isValid: true },
      { ...sampleObservations[0], obsId: 'v-2', validityStatus: 'INCORRECT', isValid: true },
      { ...sampleObservations[0], obsId: 'v-3', validityStatus: 'FALSE_START', isValid: false },
      { ...sampleObservations[0], obsId: 'v-4', validityStatus: 'TIMEOUT', isValid: false },
      { ...sampleObservations[0], obsId: 'v-5', validityStatus: 'ABORTED', isValid: false },
    ];

    it('returns all when validity is "all"', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, validity: 'all' };
      const result = applyDatasetFilters(validityObservations, filters);
      expect(result).toHaveLength(5);
      expect(isFilterActive(filters)).toBe(false);
    });

    it('filters by VALID', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, validity: 'VALID' };
      const result = applyDatasetFilters(validityObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('v-1');
      expect(isFilterActive(filters)).toBe(true);
    });

    it('filters by INCORRECT', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, validity: 'INCORRECT' };
      const result = applyDatasetFilters(validityObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('v-2');
    });

    it('filters by FALSE_START', () => {
      const filters: DatasetFilters = { ...DEFAULT_DATASET_FILTERS, validity: 'FALSE_START' };
      const result = applyDatasetFilters(validityObservations, filters);
      expect(result).toHaveLength(1);
      expect(result[0].obsId).toBe('v-3');
    });
  });
});
