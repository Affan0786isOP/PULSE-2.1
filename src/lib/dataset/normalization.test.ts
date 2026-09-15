import { describe, it, expect } from 'vitest';
import { normalizeSessionToObservations } from './normalization';
import { ResearchSessionRecord, RawProgressionTrial } from './types';

// Helper to construct a minimal session
function makeSession(
  assessmentType: string,
  trials: RawProgressionTrial[]
): ResearchSessionRecord {
  return {
    id: 'test-session',
    assessmentType,
    ageGroup: 'Adults (26–40)',
    completedAtMonth: '2023-10',
    completedAtTimestamp: Date.now(),
    deviceCategory: 'desktop',
    inputModality: 'mouse',
    displayRefreshRateHz: 60,
    progressionTrials: trials,
  };
}

describe('Observation Normalization Correctness (STAT-05/06 Fixes)', () => {
  it('correct BMT trial remains valid + correct=true', () => {
    const trials: RawProgressionTrial[] = [
      {
        valid: true,
        validity: 'VALID',
        correct: true,
        correctness: true,
        reactionTime: 500,
        level: 1,
      },
    ];
    const session = makeSession('block-memory', trials);
    const obs = normalizeSessionToObservations(session);
    
    expect(obs.length).toBe(1);
    expect(obs[0].isValid).toBe(true);
    expect(obs[0].validityStatus).toBe('VALID');
    expect(obs[0].isCorrect).toBe(true);
  });

  it('incorrect BMT trial remains valid + correct=false', () => {
    const trials: RawProgressionTrial[] = [
      {
        valid: true, // From server canonicalization fix
        validity: 'INCORRECT',
        correct: false,
        correctness: false,
        reactionTime: 500,
        level: 1,
      },
    ];
    const session = makeSession('block-memory', trials);
    const obs = normalizeSessionToObservations(session);
    
    expect(obs.length).toBe(1);
    expect(obs[0].isValid).toBe(true); // Should remain valid
    expect(obs[0].validityStatus).toBe('INCORRECT');
    expect(obs[0].isCorrect).toBe(false);
  });

  it('correct NMT trial remains valid + correct=true', () => {
    const trials: RawProgressionTrial[] = [
      {
        valid: true,
        validity: 'VALID',
        correct: true,
        correctness: true,
        reactionTime: 500,
        level: 1,
      },
    ];
    const session = makeSession('number-memory', trials);
    const obs = normalizeSessionToObservations(session);
    
    expect(obs.length).toBe(1);
    expect(obs[0].isValid).toBe(true);
    expect(obs[0].validityStatus).toBe('VALID');
    expect(obs[0].isCorrect).toBe(true);
  });

  it('incorrect NMT trial remains valid + correct=false', () => {
    const trials: RawProgressionTrial[] = [
      {
        valid: true,
        validity: 'INCORRECT',
        correct: false,
        correctness: false,
        reactionTime: 500,
        level: 1,
      },
    ];
    const session = makeSession('number-memory', trials);
    const obs = normalizeSessionToObservations(session);
    
    expect(obs.length).toBe(1);
    expect(obs[0].isValid).toBe(true);
    expect(obs[0].validityStatus).toBe('INCORRECT');
    expect(obs[0].isCorrect).toBe(false);
  });

  it('genuinely invalid/aborted memory trials remain invalid', () => {
    const trials: RawProgressionTrial[] = [
      {
        valid: false,
        validity: 'ABORTED',
        correct: false, // Or undefined
        reactionTime: 500,
      },
    ];
    const session = makeSession('block-memory', trials);
    const obs = normalizeSessionToObservations(session);
    
    expect(obs.length).toBe(1);
    expect(obs[0].isValid).toBe(false);
    expect(obs[0].validityStatus).toBe('ABORTED');
  });

  it('downstream normalization preserves the distinction between timeout and incorrect', () => {
    const trials: RawProgressionTrial[] = [
      {
        valid: false,
        validity: 'TIMEOUT',
        timedOut: true,
        correct: false,
        reactionTime: 5000,
      },
      {
        valid: true,
        validity: 'INCORRECT',
        correct: false,
        reactionTime: 500,
      }
    ];
    const session = makeSession('number-memory', trials);
    const obs = normalizeSessionToObservations(session);
    
    expect(obs.length).toBe(2);
    // Trial 1: Timeout
    expect(obs[0].isValid).toBe(false);
    expect(obs[0].validityStatus).toBe('TIMEOUT');
    // Trial 2: Incorrect
    expect(obs[1].isValid).toBe(true);
    expect(obs[1].validityStatus).toBe('INCORRECT');
  });

  it('VRT: preserves false-start/timeout semantics and foreperiod telemetry', () => {
    const trials: RawProgressionTrial[] = [
      {
        valid: false,
        validity: 'FALSE_START',
        falseStart: true,
        reactionTime: 10,
        foreperiodMs: 250,
        foreperiodCategory: 'SHORT'
      },
      {
        valid: true,
        validity: 'VALID',
        reactionTime: 250,
        foreperiodMs: 1500,
        foreperiodCategory: 'LONG'
      }
    ];
    const session = makeSession('visual-reaction', trials);
    const obs = normalizeSessionToObservations(session);
    
    expect(obs.length).toBe(2);
    // Trial 1: False start
    expect(obs[0].isValid).toBe(false);
    expect(obs[0].validityStatus).toBe('FALSE_START');
    expect(obs[0].foreperiodMs).toBe(250);
    expect(obs[0].foreperiodCategory).toBe('SHORT');
    
    // Trial 2: Valid long foreperiod
    expect(obs[1].isValid).toBe(true);
    expect(obs[1].validityStatus).toBe('VALID');
    expect(obs[1].foreperiodMs).toBe(1500);
    expect(obs[1].foreperiodCategory).toBe('LONG');
  });

  it('TIM-01: display-delay offset bringing reactionTime < 80ms preserves physiological validity when rawLatencyMs >= 80ms', () => {
    const trials: RawProgressionTrial[] = [
      {
        valid: true,
        validity: 'VALID',
        falseStart: false,
        timedOut: false,
        rawLatencyMs: 85,
        reactionTime: 72, // 85ms - 13ms display offset
        displayDelayOffsetMs: 13,
        foreperiodMs: 300,
        foreperiodCategory: 'SHORT'
      }
    ];
    const session = makeSession('visual-reaction', trials);
    const obs = normalizeSessionToObservations(session);

    expect(obs.length).toBe(1);
    expect(obs[0].isValid).toBe(true);
    expect(obs[0].validityStatus).toBe('VALID');
    expect(obs[0].latencyMs).toBe(72);
    expect(obs[0].rawLatencyMs).toBe(85);
  });

  it('TIM-01: rejects impossible or non-positive RTs (<= 0) as invalid ABORTED observations', () => {
    const trials: RawProgressionTrial[] = [
      {
        valid: true,
        reactionTime: 0,
        rawLatencyMs: 0,
        falseStart: false,
        timedOut: false
      },
      {
        valid: true,
        reactionTime: -15,
        rawLatencyMs: -15,
        falseStart: false,
        timedOut: false
      }
    ];
    const session = makeSession('visual-reaction', trials);
    const obs = normalizeSessionToObservations(session);

    expect(obs.length).toBe(2);
    expect(obs[0].isValid).toBe(false);
    expect(obs[0].validityStatus).toBe('ABORTED');
    expect(obs[1].isValid).toBe(false);
    expect(obs[1].validityStatus).toBe('ABORTED');
  });

  it('normalizes legacy research sessions lacking progressionTrials into valid summary observations', () => {
    const session: ResearchSessionRecord = {
      id: 'legacy-color-session',
      assessmentType: 'color-recognition',
      ageGroup: 'Adolescents (13–17)',
      averageReactionTime: 1956.85,
      medianReactionTime: 1969.4,
      fastestReactionTime: 1121.7,
      slowestReactionTime: 3019.5,
      accuracy: 100,
      completedAtMonth: '2026-08',
      progressionTrials: []
    };
    const obs = normalizeSessionToObservations(session);

    expect(obs.length).toBe(1);
    expect(obs[0].obsId).toBe('legacy-color-session-summary');
    expect(obs[0].assessmentType).toBe('color-recognition');
    expect(obs[0].isValid).toBe(true);
    expect(obs[0].latencyMs).toBe(1969.4);
    expect(obs[0].isCorrect).toBe(true);
    expect(obs[0].ageGroup).toBe('adolescents');
  });

  it('normalizes various colour-recognition naming formats and aliases robustly', () => {
    const variants = [
      'color-recognition',
      'colour-recognition',
      'Colour Recognition',
      'color recognition',
      'colour-test',
      'color-test',
      'colour_recognition',
      'color-rec'
    ];

    for (const v of variants) {
      const session: ResearchSessionRecord = {
        id: `session-${v}`,
        assessmentType: v,
        ageGroup: 'Children (8–12)',
        medianReactionTime: 1200,
        completedAtMonth: '2026-08',
        progressionTrials: []
      };
      const obs = normalizeSessionToObservations(session);
      expect(obs.length).toBe(1);
      expect(obs[0].assessmentType).toBe('color-recognition');
      expect(obs[0].isValid).toBe(true);
    }
  });
});
