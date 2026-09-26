import { describe, it, expect } from 'vitest';
import {
  deriveForeperiodCategory,
  isValidBaseObservation,
  isValidVisualReactionObservation,
  isValidDirectionObservation,
  isValidColorObservation,
  isValidMemoryObservation,
  isValidProtocolObservation,
} from '@/lib/protocolValidators';

describe('Protocol Validators', () => {
  describe('deriveForeperiodCategory', () => {
    it('returns SHORT for 100-500ms', () => {
      expect(deriveForeperiodCategory(100)).toBe('SHORT');
      expect(deriveForeperiodCategory(500)).toBe('SHORT');
      expect(deriveForeperiodCategory(300)).toBe('SHORT');
    });

    it('returns LONG for 501-3000ms', () => {
      expect(deriveForeperiodCategory(501)).toBe('LONG');
      expect(deriveForeperiodCategory(3000)).toBe('LONG');
      expect(deriveForeperiodCategory(1500)).toBe('LONG');
    });

    it('returns null for out of bounds or invalid', () => {
      expect(deriveForeperiodCategory(99)).toBeNull();
      expect(deriveForeperiodCategory(3001)).toBeNull();
      expect(deriveForeperiodCategory(null)).toBeNull();
      expect(deriveForeperiodCategory(undefined)).toBeNull();
      expect(deriveForeperiodCategory(NaN)).toBeNull();
      expect(deriveForeperiodCategory(Infinity)).toBeNull();
    });
  });

  const baseValidObservation = {
    schemaVersion: 1,
    assessmentVersion: '1.0',
    protocolVersion: '1.0',
    datasetSchemaVersion: '1.0',
    metricsVersion: '1.0',
    ageGroup: 'Adults (26–40)',
    completedAtMonth: '2023-10',
    provenanceToken: 'a'.repeat(64),
    deviceCategory: 'desktop',
    device: 'desktop',
    progressionTrials: [
      { trialNumber: 1, reactionTime: 250, metricType: 'reaction_time', falseStart: false },
    ],
  };

  describe('isValidBaseObservation', () => {
    it('validates a correct base observation', () => {
      expect(isValidBaseObservation(baseValidObservation)).toBe(true);
    });

    it('rejects forbidden fields (privacy)', () => {
      expect(isValidBaseObservation({ ...baseValidObservation, userId: 'user123' })).toBe(false);
      expect(isValidBaseObservation({ ...baseValidObservation, email: 'test@example.com' })).toBe(false);
    });

    it('rejects malformed completedAtMonth', () => {
      expect(isValidBaseObservation({ ...baseValidObservation, completedAtMonth: '2023-13' })).toBe(false);
      expect(isValidBaseObservation({ ...baseValidObservation, completedAtMonth: '23-10' })).toBe(false);
    });
  });

  describe('isValidVisualReactionObservation', () => {
    const validVRT = {
      ...baseValidObservation,
      assessmentType: 'visual-reaction',
      averageReactionTime: 250,
      fastestReactionTime: 200,
      slowestReactionTime: 300,
      medianReactionTime: 240,
      consistency: 85,
      totalFalseStarts: 0,
    };

    it('validates a correct VRT observation', () => {
      expect(isValidVisualReactionObservation(validVRT)).toBe(true);
    });

    it('rejects if RT values are impossible', () => {
      // average < 80
      expect(isValidVisualReactionObservation({ ...validVRT, averageReactionTime: 79 })).toBe(false);
      // fastest > average
      expect(isValidVisualReactionObservation({ ...validVRT, fastestReactionTime: 260 })).toBe(false);
    });

    it('rejects missing keys', () => {
      const missing = { ...validVRT };
      // @ts-ignore
      delete missing.consistency;
      expect(isValidVisualReactionObservation(missing)).toBe(false);
    });
  });

  describe('isValidDirectionObservation', () => {
    const validDirection = {
      ...baseValidObservation,
      assessmentType: 'direction',
      accuracy: 90,
      totalCorrect: 9,
      totalTrials: 10,
      totalIncorrect: 1,
      totalFalseStarts: 0,
      averageReactionTime: 400,
      fastestReactionTime: 350,
      slowestReactionTime: 450,
      medianReactionTime: 400,
    };

    it('validates a correct Direction observation', () => {
      expect(isValidDirectionObservation(validDirection)).toBe(true);
    });

    it('rejects invalid trial counts', () => {
      expect(isValidDirectionObservation({ ...validDirection, totalTrials: 11 })).toBe(false);
      expect(isValidDirectionObservation({ ...validDirection, totalCorrect: 11 })).toBe(false);
    });
  });

  describe('isValidColorObservation', () => {
    const validColor = {
      ...baseValidObservation,
      assessmentType: 'color-recognition',
      accuracy: 80,
      correctCount: 12,
    };

    it('validates a correct Color observation (optional RTs omitted)', () => {
      expect(isValidColorObservation(validColor)).toBe(true);
    });
    
    it('validates a correct Color observation (RTs present)', () => {
      expect(isValidColorObservation({
        ...validColor,
        averageReactionTime: 500,
        fastestReactionTime: 400,
        slowestReactionTime: 600,
        medianReactionTime: 500,
      })).toBe(true);
    });
  });

  describe('isValidMemoryObservation', () => {
    const validMemory = {
      ...baseValidObservation,
      assessmentType: 'block-memory',
      highestLevel: 5,
      longestSeq: 5,
      totalCorrect: 10,
      totalAttempts: 15,
      overallAccuracy: 66.67,
      totalTimeMs: 15000,
    };

    it('validates a correct Memory observation', () => {
      expect(isValidMemoryObservation(validMemory)).toBe(true);
    });

    it('rejects highestLevel > longestSeq', () => {
      expect(isValidMemoryObservation({ ...validMemory, highestLevel: 6, longestSeq: 5 })).toBe(false);
    });

    it('rejects boundary conditions for highestLevel and longestSeq', () => {
      expect(isValidMemoryObservation({ ...validMemory, highestLevel: -1, longestSeq: 0 })).toBe(false);
    });
  });

  describe('isValidProtocolObservation', () => {
    it('validates a known protocol observation', () => {
      const validVRT = {
        schemaVersion: 1,
        assessmentVersion: '1.0',
        protocolVersion: '1.0',
        datasetSchemaVersion: '1.0',
        metricsVersion: '1.0',
        ageGroup: 'Adults (26–40)',
        completedAtMonth: '2023-10',
        provenanceToken: 'a'.repeat(64),
        deviceCategory: 'desktop',
        device: 'desktop',
        progressionTrials: [],
        assessmentType: 'visual-reaction',
        averageReactionTime: 250,
        fastestReactionTime: 200,
        slowestReactionTime: 300,
        medianReactionTime: 240,
        consistency: 85,
        totalFalseStarts: 0,
      };
      expect(isValidProtocolObservation(validVRT)).toBe(true);
    });

    it('rejects an unknown protocol observation', () => {
      const invalid = {
        schemaVersion: 1,
        assessmentVersion: '1.0',
        protocolVersion: '1.0',
        datasetSchemaVersion: '1.0',
        metricsVersion: '1.0',
        ageGroup: 'Adults (26–40)',
        completedAtMonth: '2023-10',
        provenanceToken: 'a'.repeat(64),
        deviceCategory: 'desktop',
        device: 'desktop',
        progressionTrials: [],
        assessmentType: 'unknown-protocol',
      };
      expect(isValidProtocolObservation(invalid)).toBe(false);
    });
  });
});
