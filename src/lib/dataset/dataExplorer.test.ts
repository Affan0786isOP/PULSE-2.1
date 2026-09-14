import { describe, it, expect } from 'vitest';
import { selectObservationsForSection } from './selectors';
import { DatasetObservation } from './types';

describe('Data Explorer Observation Integration', () => {
  const createMockObs = (id: number): DatasetObservation => ({
    obsId: `obs-${id}`,
    sessionId: `sess-${Math.floor(id / 5)}`,
    assessmentType: id % 2 === 0 ? 'visual-reaction' : 'direction',
    trialIndex: (id % 5) + 1,
    isValid: id % 10 !== 0,
    validityStatus: id % 10 === 0 ? 'FALSE_START' : 'VALID',
    latencyMs: 200 + id * 5,
    isCorrect: true,
    ageGroup: 'Young adults (18–25)',
    deviceCategory: 'desktop',
    inputModality: 'mouse',
    refreshRateHz: 144,
    completedAtMonth: '2026-03'
  });

  const sampleObservations: DatasetObservation[] = Array.from({ length: 60 }, (_, i) => createMockObs(i + 1));

  describe('selectObservationsForSection for data-explorer', () => {
    it('returns all filtered observations without protocol restriction', () => {
      const explorerObs = selectObservationsForSection(sampleObservations, 'data-explorer');
      expect(explorerObs).toHaveLength(60);
      expect(explorerObs[0].obsId).toBe('obs-1');
      expect(explorerObs[59].obsId).toBe('obs-60');
    });

    it('preserves the original observation order', () => {
      const explorerObs = selectObservationsForSection(sampleObservations, 'data-explorer');
      for (let i = 0; i < explorerObs.length; i++) {
        expect(explorerObs[i].obsId).toBe(`obs-${i + 1}`);
      }
    });

    it('receives only pre-filtered observations with no unfiltered leakage', () => {
      // Simulate pipeline: pre-filter the observations
      const filtered = sampleObservations.filter(o => o.assessmentType === 'direction');
      const explorerObs = selectObservationsForSection(filtered, 'data-explorer');
      
      expect(explorerObs).toHaveLength(30); // Half of the 60 mock obs
      explorerObs.forEach(obs => {
        expect(obs.assessmentType).toBe('direction');
      });
    });
  });

  describe('Pagination Calculation Semantics', () => {
    const pageSize = 25;

    it('calculates page 1 slice correctly', () => {
      const page = 1;
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, sampleObservations.length);
      const pageSlice = sampleObservations.slice(startIndex, endIndex);

      expect(pageSlice).toHaveLength(25);
      expect(pageSlice[0].obsId).toBe('obs-1');
      expect(pageSlice[24].obsId).toBe('obs-25');
    });

    it('calculates page 2 slice correctly', () => {
      const page = 2;
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, sampleObservations.length);
      const pageSlice = sampleObservations.slice(startIndex, endIndex);

      expect(pageSlice).toHaveLength(25);
      expect(pageSlice[0].obsId).toBe('obs-26');
      expect(pageSlice[24].obsId).toBe('obs-50');
    });

    it('calculates last page slice with remainder correctly', () => {
      const page = 3;
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, sampleObservations.length);
      const pageSlice = sampleObservations.slice(startIndex, endIndex);

      expect(pageSlice).toHaveLength(10);
      expect(pageSlice[0].obsId).toBe('obs-51');
      expect(pageSlice[9].obsId).toBe('obs-60');
    });

    it('clamps page index within [1, totalPages]', () => {
      const totalPages = Math.max(1, Math.ceil(sampleObservations.length / pageSize));
      expect(totalPages).toBe(3);

      const requestedPage = 5;
      const clampedPage = Math.min(requestedPage, totalPages);
      expect(clampedPage).toBe(3);
    });
  });
});
