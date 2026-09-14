import { describe, it, expect } from 'vitest';
import { normalizeSessionToObservations } from './normalization';
import { computeVrtStats, computeBlockMemoryStats, computeNumberMemoryStats, computeColourStats } from './stats';
import { ResearchSessionRecord, DatasetObservation } from './types';
import { VRT_MIN_VALID_RT_MS } from '../protocolValidators';

describe('VRT Validity and Threshold Integrity (80ms canonical threshold)', () => {
  const baseSession: ResearchSessionRecord = {
    id: 'test-session-123',
    assessmentType: 'visual-reaction',
    ageGroup: 'Adults (26–40)',
    deviceCategory: 'desktop',
    device: 'desktop',
    completedAtMonth: '2026-09',
    completedAtTimestamp: 1789400000000,
    progressionTrials: []
  };

  describe('normalizeSessionToObservations validity classification', () => {
    it('should classify reaction time of exactly 80ms as VALID', () => {
      const session: ResearchSessionRecord = {
        ...baseSession,
        progressionTrials: [
          { trialNumber: 1, reactionTime: 80, falseStart: false, timedOut: false }
        ]
      };
      const [obs] = normalizeSessionToObservations(session);
      expect(obs.isValid).toBe(true);
      expect(obs.validityStatus).toBe('VALID');
      expect(obs.latencyMs).toBe(80);
    });

    it('should classify reaction time of 85ms (80-99ms range) as VALID, not FALSE_START', () => {
      const session: ResearchSessionRecord = {
        ...baseSession,
        progressionTrials: [
          { trialNumber: 1, reactionTime: 85, falseStart: false, timedOut: false }
        ]
      };
      const [obs] = normalizeSessionToObservations(session);
      expect(obs.isValid).toBe(true);
      expect(obs.validityStatus).toBe('VALID');
      expect(obs.latencyMs).toBe(85);
    });

    it('should classify reaction time below 80ms (e.g. 79ms) as FALSE_START and invalid', () => {
      const session: ResearchSessionRecord = {
        ...baseSession,
        progressionTrials: [
          { trialNumber: 1, reactionTime: 79, falseStart: false, timedOut: false }
        ]
      };
      const [obs] = normalizeSessionToObservations(session);
      expect(obs.isValid).toBe(false);
      expect(obs.validityStatus).toBe('FALSE_START');
      expect(obs.latencyMs).toBe(79);
    });

    it('should handle edge cases like null, undefined, and non-numeric without marking as false start', () => {
      const session: ResearchSessionRecord = {
        ...baseSession,
        progressionTrials: [
          { trialNumber: 1, reactionTime: null, falseStart: false, timedOut: false },
          { trialNumber: 2, reactionTime: undefined, falseStart: false, timedOut: true }
        ]
      };
      const [obs1, obs2] = normalizeSessionToObservations(session);
      expect(obs1.latencyMs).toBeNull();
      expect(obs1.isValid).toBe(true);
      expect(obs1.validityStatus).toBe('VALID');

      expect(obs2.latencyMs).toBeNull();
      expect(obs2.isValid).toBe(false);
      expect(obs2.validityStatus).toBe('TIMEOUT');
    });

    it('should preserve explicit falseStart=true regardless of reaction time', () => {
      const session: ResearchSessionRecord = {
        ...baseSession,
        progressionTrials: [
          { trialNumber: 1, reactionTime: 250, falseStart: true, timedOut: false }
        ]
      };
      const [obs] = normalizeSessionToObservations(session);
      expect(obs.isValid).toBe(false);
      expect(obs.validityStatus).toBe('FALSE_START');
    });
  });

  describe('computeVrtStats threshold inclusion', () => {
    it('should include 80ms and 85ms valid trials in computeVrtStats', () => {
      const observations: DatasetObservation[] = [
        {
          obsId: 'obs-1',
          sessionId: 's-1',
          assessmentType: 'visual-reaction',
          rawAssessmentType: 'visual-reaction',
          ageGroup: 'adults',
          completedAtMonth: '2026-09',
          deviceCategory: 'desktop',
          inputModality: 'mouse',
          refreshRateHz: 60,
          trialIndex: 1,
          latencyMs: 80,
          rawLatencyMs: 80,
          displayDelayOffsetMs: 0,
          isValid: true,
          isCorrect: null,
          validityStatus: 'VALID',
          qualityFlag: null,
          foreperiodMs: 250,
          foreperiodCategory: 'SHORT',
          targetDirection: null,
          chosenDirection: null,
          userResponse: null,
          targetColor: null,
          chosenColor: null,
          wordName: null,
          wordColor: null,
          condition: null,
          instruction: null,
          level: null,
          sequenceLength: null,
          interTapTimeMs: null,
          responseDurationMs: null,
          stimulusScheduledAtPerfMs: null,
          stimulusPresentedAtPerfMs: null,
          responseDetectedAtPerfMs: null,
          provenanceToken: null,
          trialsDigest: null
        },
        {
          obsId: 'obs-2',
          sessionId: 's-1',
          assessmentType: 'visual-reaction',
          rawAssessmentType: 'visual-reaction',
          ageGroup: 'adults',
          completedAtMonth: '2026-09',
          deviceCategory: 'desktop',
          inputModality: 'mouse',
          refreshRateHz: 60,
          trialIndex: 2,
          latencyMs: 90,
          rawLatencyMs: 90,
          displayDelayOffsetMs: 0,
          isValid: true,
          isCorrect: null,
          validityStatus: 'VALID',
          qualityFlag: null,
          foreperiodMs: 1000,
          foreperiodCategory: 'LONG',
          targetDirection: null,
          chosenDirection: null,
          userResponse: null,
          targetColor: null,
          chosenColor: null,
          wordName: null,
          wordColor: null,
          condition: null,
          instruction: null,
          level: null,
          sequenceLength: null,
          interTapTimeMs: null,
          responseDurationMs: null,
          stimulusScheduledAtPerfMs: null,
          stimulusPresentedAtPerfMs: null,
          responseDetectedAtPerfMs: null,
          provenanceToken: null,
          trialsDigest: null
        }
      ];

      const stats = computeVrtStats(observations);
      expect(stats.medianRt).toBe(85);
      expect(stats.meanRt).toBe(85);
      expect(stats.shortForeperiodMedianRt).toBe(80);
      expect(stats.longForeperiodMedianRt).toBe(90);
    });

    it('should exclude trials below VRT_MIN_VALID_RT_MS from valid RT statistics', () => {
      const observations: DatasetObservation[] = [
        {
          obsId: 'obs-1',
          sessionId: 's-1',
          assessmentType: 'visual-reaction',
          rawAssessmentType: 'visual-reaction',
          ageGroup: 'adults',
          completedAtMonth: '2026-09',
          deviceCategory: 'desktop',
          inputModality: 'mouse',
          refreshRateHz: 60,
          trialIndex: 1,
          latencyMs: 75,
          rawLatencyMs: 75,
          displayDelayOffsetMs: 0,
          isValid: false,
          isCorrect: null,
          validityStatus: 'FALSE_START',
          qualityFlag: null,
          foreperiodMs: 250,
          foreperiodCategory: 'SHORT',
          targetDirection: null,
          chosenDirection: null,
          userResponse: null,
          targetColor: null,
          chosenColor: null,
          wordName: null,
          wordColor: null,
          condition: null,
          instruction: null,
          level: null,
          sequenceLength: null,
          interTapTimeMs: null,
          responseDurationMs: null,
          stimulusScheduledAtPerfMs: null,
          stimulusPresentedAtPerfMs: null,
          responseDetectedAtPerfMs: null,
          provenanceToken: null,
          trialsDigest: null
        }
      ];

      const stats = computeVrtStats(observations);
      expect(stats.medianRt).toBeNull();
      expect(stats.meanRt).toBeNull();
      expect(stats.falseStartRate).toBe(100);
    });
  });

  describe('Memory assessment sequence length integrity', () => {
    it('should derive sequenceLength as level + 1 for block-memory when not provided', () => {
      const blockSession: ResearchSessionRecord = {
        id: 'block-sess-1',
        assessmentType: 'block-memory',
        ageGroup: 'Adults (26–40)',
        deviceCategory: 'desktop',
        device: 'desktop',
        completedAtMonth: '2026-09',
        completedAtTimestamp: 1789400000000,
        progressionTrials: [
          { trialNumber: 1, level: 1, correct: true, falseStart: false, timedOut: false },
          { trialNumber: 2, level: 2, correct: true, falseStart: false, timedOut: false }
        ]
      };

      const [obs1, obs2] = normalizeSessionToObservations(blockSession);
      expect(obs1.level).toBe(1);
      expect(obs1.sequenceLength).toBe(2);
      expect(obs2.level).toBe(2);
      expect(obs2.sequenceLength).toBe(3);

      const stats = computeBlockMemoryStats([obs1, obs2]);
      expect(stats.maxSpan).toBe(3);
      expect(stats.spanDistribution.map(d => d.span)).toEqual([2, 3]);
    });

    it('should derive sequenceLength as level + 2 for number-memory when not provided', () => {
      const numberSession: ResearchSessionRecord = {
        id: 'num-sess-1',
        assessmentType: 'number-memory',
        ageGroup: 'Adults (26–40)',
        deviceCategory: 'desktop',
        device: 'desktop',
        completedAtMonth: '2026-09',
        completedAtTimestamp: 1789400000000,
        progressionTrials: [
          { trialNumber: 1, level: 1, correct: true, falseStart: false, timedOut: false },
          { trialNumber: 2, level: 2, correct: true, falseStart: false, timedOut: false }
        ]
      };

      const [obs1, obs2] = normalizeSessionToObservations(numberSession);
      expect(obs1.level).toBe(1);
      expect(obs1.sequenceLength).toBe(3);
      expect(obs2.level).toBe(2);
      expect(obs2.sequenceLength).toBe(4);

      const stats = computeNumberMemoryStats([obs1, obs2]);
      expect(stats.maxDigitSpan).toBe(4);
      expect(stats.digitSpanDistribution.map(d => d.digitLength)).toEqual([3, 4]);
    });
  });

  describe('Colour recognition stats integrity', () => {
    it('should compute and return distinct overallMeanRt and overallMedianRt', () => {
      const observations: DatasetObservation[] = [
        {
          obsId: 'obs-c1',
          sessionId: 's-c1',
          assessmentType: 'color-recognition',
          rawAssessmentType: 'color-recognition',
          ageGroup: 'adults',
          completedAtMonth: '2026-09',
          deviceCategory: 'desktop',
          inputModality: 'mouse',
          refreshRateHz: 60,
          trialIndex: 1,
          latencyMs: 400,
          rawLatencyMs: 400,
          displayDelayOffsetMs: 0,
          isValid: true,
          isCorrect: true,
          validityStatus: 'VALID',
          qualityFlag: null,
          foreperiodMs: null,
          foreperiodCategory: null,
          targetDirection: null,
          chosenDirection: null,
          userResponse: null,
          targetColor: null,
          chosenColor: null,
          wordName: 'RED',
          wordColor: 'RED',
          condition: 'congruent',
          instruction: 'WORD',
          level: null,
          sequenceLength: null,
          interTapTimeMs: null,
          responseDurationMs: null,
          stimulusScheduledAtPerfMs: null,
          stimulusPresentedAtPerfMs: null,
          responseDetectedAtPerfMs: null,
          provenanceToken: null,
          trialsDigest: null
        },
        {
          obsId: 'obs-c2',
          sessionId: 's-c1',
          assessmentType: 'color-recognition',
          rawAssessmentType: 'color-recognition',
          ageGroup: 'adults',
          completedAtMonth: '2026-09',
          deviceCategory: 'desktop',
          inputModality: 'mouse',
          refreshRateHz: 60,
          trialIndex: 2,
          latencyMs: 500,
          rawLatencyMs: 500,
          displayDelayOffsetMs: 0,
          isValid: true,
          isCorrect: true,
          validityStatus: 'VALID',
          qualityFlag: null,
          foreperiodMs: null,
          foreperiodCategory: null,
          targetDirection: null,
          chosenDirection: null,
          userResponse: null,
          targetColor: null,
          chosenColor: null,
          wordName: 'RED',
          wordColor: 'BLUE',
          condition: 'incongruent',
          instruction: 'WORD',
          level: null,
          sequenceLength: null,
          interTapTimeMs: null,
          responseDurationMs: null,
          stimulusScheduledAtPerfMs: null,
          stimulusPresentedAtPerfMs: null,
          responseDetectedAtPerfMs: null,
          provenanceToken: null,
          trialsDigest: null
        },
        {
          obsId: 'obs-c3',
          sessionId: 's-c1',
          assessmentType: 'color-recognition',
          rawAssessmentType: 'color-recognition',
          ageGroup: 'adults',
          completedAtMonth: '2026-09',
          deviceCategory: 'desktop',
          inputModality: 'mouse',
          refreshRateHz: 60,
          trialIndex: 3,
          latencyMs: 900,
          rawLatencyMs: 900,
          displayDelayOffsetMs: 0,
          isValid: true,
          isCorrect: true,
          validityStatus: 'VALID',
          qualityFlag: null,
          foreperiodMs: null,
          foreperiodCategory: null,
          targetDirection: null,
          chosenDirection: null,
          userResponse: null,
          targetColor: null,
          chosenColor: null,
          wordName: 'GREEN',
          wordColor: 'YELLOW',
          condition: 'incongruent',
          instruction: 'WORD',
          level: null,
          sequenceLength: null,
          interTapTimeMs: null,
          responseDurationMs: null,
          stimulusScheduledAtPerfMs: null,
          stimulusPresentedAtPerfMs: null,
          responseDetectedAtPerfMs: null,
          provenanceToken: null,
          trialsDigest: null
        }
      ];

      const stats = computeColourStats(observations);
      // Latencies are 400, 500, 900 -> Mean = 600, Median = 500
      expect(stats.overallMeanRt).toBe(600);
      expect(stats.overallMedianRt).toBe(500);
      expect(stats.congruentMeanRt).toBe(400);
      expect(stats.incongruentMeanRt).toBe(700);
      expect(stats.interferenceCost).toBe(300);
    });
  });

  describe('Protocol observation normalization fallbacks & progression telemetry', () => {
    it('should preserve foreperiodMs and derive foreperiodCategory in VRT progressionTrials and compute preparatory decay', () => {
      const vrtSession: ResearchSessionRecord = {
        id: 'vrt-prog-1',
        assessmentType: 'visual-reaction',
        ageGroup: 'Adults (26–40)',
        deviceCategory: 'desktop',
        device: 'desktop',
        completedAtMonth: '2026-09',
        completedAtTimestamp: 1789400000000,
        progressionTrials: [
          { trialNumber: 1, reactionTime: 220, foreperiodMs: 250, falseStart: false, timedOut: false },
          { trialNumber: 2, reactionTime: 260, foreperiodMs: 1500, falseStart: false, timedOut: false }
        ]
      };

      const [obs1, obs2] = normalizeSessionToObservations(vrtSession);
      expect(obs1.foreperiodMs).toBe(250);
      expect(obs1.foreperiodCategory).toBe('SHORT');
      expect(obs2.foreperiodMs).toBe(1500);
      expect(obs2.foreperiodCategory).toBe('LONG');

      const stats = computeVrtStats([obs1, obs2]);
      expect(stats.shortForeperiodMedianRt).toBe(220);
      expect(stats.longForeperiodMedianRt).toBe(260);
      expect(stats.longForeperiodMedianRt! - stats.shortForeperiodMedianRt!).toBe(40);
    });

    it('should derive chosenDirection from userResponse in direction CRT trials', () => {
      const dirSession: ResearchSessionRecord = {
        id: 'dir-sess-1',
        assessmentType: 'direction',
        ageGroup: 'Adults (26–40)',
        deviceCategory: 'desktop',
        device: 'desktop',
        completedAtMonth: '2026-09',
        completedAtTimestamp: 1789400000000,
        progressionTrials: [
          { trialNumber: 1, reactionTime: 350, targetDirection: 'left', userResponse: 'left', correct: true, falseStart: false, timedOut: false }
        ]
      };

      const [obs] = normalizeSessionToObservations(dirSession);
      expect(obs.targetDirection).toBe('left');
      expect(obs.chosenDirection).toBe('left');
      expect(obs.userResponse).toBe('left');
    });

    it('should derive targetColor, chosenColor, and condition in colour recognition trials', () => {
      const colorSession: ResearchSessionRecord = {
        id: 'color-sess-1',
        assessmentType: 'color-recognition',
        ageGroup: 'Adults (26–40)',
        deviceCategory: 'desktop',
        device: 'desktop',
        completedAtMonth: '2026-09',
        completedAtTimestamp: 1789400000000,
        progressionTrials: [
          {
            trialNumber: 1,
            reactionTime: 420,
            instruction: 'WORD',
            wordName: 'RED',
            wordColor: 'BLUE',
            userResponse: 'RED',
            correct: true,
            falseStart: false,
            timedOut: false
          },
          {
            trialNumber: 2,
            reactionTime: 480,
            instruction: 'COLOR',
            wordName: 'RED',
            wordColor: 'GREEN',
            userResponse: 'GREEN',
            correct: true,
            falseStart: false,
            timedOut: false
          }
        ]
      };

      const [obs1, obs2] = normalizeSessionToObservations(colorSession);
      // Trial 1: task is WORD, so target is RED, condition is incongruent, choice is RED
      expect(obs1.targetColor).toBe('RED');
      expect(obs1.chosenColor).toBe('RED');
      expect(obs1.condition).toBe('incongruent');

      // Trial 2: task is COLOR, so target is GREEN, condition is incongruent, choice is GREEN
      expect(obs2.targetColor).toBe('GREEN');
      expect(obs2.chosenColor).toBe('GREEN');
      expect(obs2.condition).toBe('incongruent');
    });
  });
});
