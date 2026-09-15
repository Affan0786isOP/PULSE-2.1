import { describe, it, expect } from 'vitest';
import {
  computeDirectionStats,
  computeColourStats,
  computeBlockMemoryStats,
  computeNumberMemoryStats,
  computeVrtStats,
} from './stats';
import { DatasetObservation } from './types';

// Helper to create base observation
function makeObs(overrides: Partial<DatasetObservation>): DatasetObservation {
  return {
    obsId: 'test-obs',
    researchRecordId: 'test-session',
    sessionId: 'test-session',
    assessmentType: 'visual-reaction',
    completedAtMonth: '2023-10',
    trialIndex: 1,
    ageGroup: 'Adults (26–40)',
    inputModality: 'mouse',
    refreshRateHz: 60,
    isValid: true,
    validityStatus: 'VALID',
    latencyMs: null,
    isCorrect: null,
    ...overrides,
  };
}

describe('Statistics Engine Correctness (STAT Fixes)', () => {
  it('Direction: known correct + known incorrect + unknown correctness', () => {
    // STAT-01
    const obs = [
      makeObs({ assessmentType: 'direction', targetDirection: 'UP', isCorrect: true, latencyMs: 200 }),
      makeObs({ assessmentType: 'direction', targetDirection: 'UP', isCorrect: false, latencyMs: 200 }),
      makeObs({ assessmentType: 'direction', targetDirection: 'UP', isCorrect: null, latencyMs: 200 }), // Should not be in denominator
      makeObs({ assessmentType: 'direction', targetDirection: 'UP', isCorrect: undefined, latencyMs: 200 }), // Should not be in denominator
    ];
    const stats = computeDirectionStats(obs);
    const upStats = stats.directionBreakdown.find(d => d.direction === 'UP');
    expect(upStats?.count).toBe(4);
    // Accuracy should be 1 / 2 = 50%
    expect(upStats?.accuracy).toBe(50);
  });

  it('BMT: mismatched level vs sequenceLength', () => {
    // STAT-02
    const obs = [
      makeObs({ assessmentType: 'block-memory', level: 1, sequenceLength: 5 }),
      makeObs({ assessmentType: 'block-memory', level: 99, sequenceLength: 5 }), // level differs, but canonical sequenceLength matches
      makeObs({ assessmentType: 'block-memory', level: 5, sequenceLength: undefined }), // falls back to level + 1 = 6
    ];
    const stats = computeBlockMemoryStats(obs);
    
    // We should see progression for length 5 and 6
    const curve5 = stats.progressionCurve.find(p => p.level === 5);
    const curve6 = stats.progressionCurve.find(p => p.level === 6);
    
    expect(curve5).toBeDefined();
    expect(curve5?.attemptCount).toBe(2);
    
    expect(curve6).toBeDefined();
    expect(curve6?.attemptCount).toBe(1);
  });

  it('BMT: known/unknown correctness denominator', () => {
    // STAT-03
    const obs = [
      makeObs({ assessmentType: 'block-memory', sequenceLength: 5, isCorrect: true }),
      makeObs({ assessmentType: 'block-memory', sequenceLength: 5, isCorrect: false }),
      makeObs({ assessmentType: 'block-memory', sequenceLength: 5, isCorrect: null }), // unknown correctness
    ];
    const stats = computeBlockMemoryStats(obs);
    const curve = stats.progressionCurve.find(p => p.level === 5);
    
    expect(curve?.attemptCount).toBe(3); // Total attempts
    expect(curve?.accuracyRate).toBe(50); // 1 correct out of 2 known
  });

  it('NMT: known/unknown correctness denominator', () => {
    // STAT-04
    const obs = [
      makeObs({ assessmentType: 'number-memory', sequenceLength: 5, isCorrect: true }),
      makeObs({ assessmentType: 'number-memory', sequenceLength: 5, isCorrect: false }),
      makeObs({ assessmentType: 'number-memory', sequenceLength: 5, isCorrect: null }), // unknown correctness
    ];
    const stats = computeNumberMemoryStats(obs);
    const curve = stats.progressionCurve.find(p => p.digitLength === 5);
    
    expect(curve?.attemptCount).toBe(3); // Total attempts
    expect(curve?.accuracyRate).toBe(50); // 1 correct out of 2 known
  });

  it('VRT percentile count includes physiologically valid trials even if corrected latency < 80ms (TIM-01)', () => {
    // STAT-00 & TIM-01
    const obs = [
      makeObs({ assessmentType: 'visual-reaction', latencyMs: 250, isValid: true }),
      makeObs({ assessmentType: 'visual-reaction', latencyMs: 300, isValid: true }),
      makeObs({ assessmentType: 'visual-reaction', latencyMs: 75, isValid: true }), // Corrected latency < 80ms, but isValid=true means physiologically it was >= 80ms
      makeObs({ assessmentType: 'visual-reaction', latencyMs: null, isValid: true }), // not numeric
    ];
    const stats = computeVrtStats(obs);
    
    // 250, 300, and 75 should all be included because they are isValid=true
    expect(stats.count).toBe(3);
    expect(stats.minRt).toBe(75);
    expect(stats.maxRt).toBe(300);
  });

  it('VRT: false-start and invalid observations do not contaminate valid RT stats', () => {
    const obs = [
      makeObs({ assessmentType: 'visual-reaction', latencyMs: 250, isValid: true }),
      makeObs({ assessmentType: 'visual-reaction', latencyMs: 150, isValid: false, validityStatus: 'FALSE_START' }), // False start
      makeObs({ assessmentType: 'visual-reaction', latencyMs: 4000, isValid: false, validityStatus: 'TIMEOUT' }), // Timeout
    ];
    const stats = computeVrtStats(obs);
    
    // Only the valid 250ms latency should be counted
    expect(stats.count).toBe(1);
    expect(stats.minRt).toBe(250);
    expect(stats.maxRt).toBe(250);
    expect(stats.medianRt).toBe(250);
  });

  it('VRT: wait-time effect short vs long breakdown', () => {
    const obs = [
      // Short foreperiod (100-500ms)
      makeObs({ assessmentType: 'visual-reaction', latencyMs: 300, isValid: true, foreperiodCategory: 'SHORT' }),
      makeObs({ assessmentType: 'visual-reaction', latencyMs: 320, isValid: true, foreperiodCategory: 'SHORT' }), // Median = 310
      // Long foreperiod (501-3000ms)
      makeObs({ assessmentType: 'visual-reaction', latencyMs: 200, isValid: true, foreperiodCategory: 'LONG' }),
      makeObs({ assessmentType: 'visual-reaction', latencyMs: 220, isValid: true, foreperiodCategory: 'LONG' }), // Median = 210
    ];
    const stats = computeVrtStats(obs);
    
    const shortBreakdown = stats.foreperiodBreakdown.find(f => f.category === 'Short Foreperiod (100–500 ms)');
    const longBreakdown = stats.foreperiodBreakdown.find(f => f.category === 'Long Foreperiod (501–3000 ms)');
    
    expect(shortBreakdown?.count).toBe(2);
    expect(shortBreakdown?.medianRt).toBe(310);
    expect(longBreakdown?.count).toBe(2);
    expect(longBreakdown?.medianRt).toBe(210);
  });

  it('Direction: RT metrics exclude incorrect trials while accuracy denominator includes them', () => {
    const obs = [
      makeObs({ assessmentType: 'direction', targetDirection: 'UP', isCorrect: true, latencyMs: 200, isValid: true }),
      makeObs({ assessmentType: 'direction', targetDirection: 'UP', isCorrect: false, latencyMs: 500, isValid: true, validityStatus: 'INCORRECT' }),
    ];
    const stats = computeDirectionStats(obs);

    // Median and Mean RT should be 200 (only the valid correct trial), NOT 350
    expect(stats.medianRt).toBe(200);
    expect(stats.meanRt).toBe(200);
    // Accuracy should be 50% (1 correct out of 2)
    expect(stats.accuracyRate).toBe(50);
    expect(stats.errorRate).toBe(50);

    const upStats = stats.directionBreakdown.find(d => d.direction === 'UP');
    expect(upStats?.count).toBe(2);
    expect(upStats?.medianRt).toBe(200);
    expect(upStats?.accuracy).toBe(50);
  });

  it('Colour: RT metrics and interference cost include ONLY valid correct trials', () => {
    const obs = [
      makeObs({ assessmentType: 'colour-recognition', condition: 'congruent', isCorrect: true, latencyMs: 300, isValid: true }),
      makeObs({ assessmentType: 'colour-recognition', condition: 'congruent', isCorrect: false, latencyMs: 900, isValid: true, validityStatus: 'INCORRECT' }),
      makeObs({ assessmentType: 'colour-recognition', condition: 'incongruent', isCorrect: true, latencyMs: 450, isValid: true }),
      makeObs({ assessmentType: 'colour-recognition', condition: 'incongruent', isCorrect: false, latencyMs: 1200, isValid: true, validityStatus: 'INCORRECT' }),
    ];
    const stats = computeColourStats(obs);

    // Congruent mean RT should be 300 (excluding 900)
    expect(stats.congruentMeanRt).toBe(300);
    // Incongruent mean RT should be 450 (excluding 1200)
    expect(stats.incongruentMeanRt).toBe(450);
    // Interference cost should be 450 - 300 = 150
    expect(stats.interferenceCost).toBe(150);
    // Overall RT should also exclude incorrect trials: median of [300, 450] = 375
    expect(stats.overallMedianRt).toBe(375);
    // Accuracy includes all valid trials: 2 / 4 = 50%
    expect(stats.accuracyRate).toBe(50);
  });

  it('Block Memory: maxSpan uses only successful attempts while accuracy denominator includes failed attempts', () => {
    const obs = [
      makeObs({ assessmentType: 'block-memory', sequenceLength: 4, isCorrect: true, isValid: true, validityStatus: 'VALID' }),
      makeObs({ assessmentType: 'block-memory', sequenceLength: 5, isCorrect: true, isValid: true, validityStatus: 'VALID' }),
      makeObs({ assessmentType: 'block-memory', sequenceLength: 6, isCorrect: false, isValid: true, validityStatus: 'INCORRECT' }),
    ];
    const stats = computeBlockMemoryStats(obs);

    // maxSpan should be 5 (only successful attempts), NOT 6
    expect(stats.maxSpan).toBe(5);
    // successRate should include all 3 attempts: 2 / 3 = 66.7%
    expect(stats.successRate).toBe(66.7);
  });

  it('Number Memory: maxDigitSpan uses only successful attempts while accuracy denominator includes failed attempts', () => {
    const obs = [
      makeObs({ assessmentType: 'number-memory', sequenceLength: 5, isCorrect: true, isValid: true, validityStatus: 'VALID' }),
      makeObs({ assessmentType: 'number-memory', sequenceLength: 6, isCorrect: true, isValid: true, validityStatus: 'VALID' }),
      makeObs({ assessmentType: 'number-memory', sequenceLength: 7, isCorrect: false, isValid: true, validityStatus: 'INCORRECT' }),
    ];
    const stats = computeNumberMemoryStats(obs);

    // maxDigitSpan should be 6 (only successful attempts), NOT 7
    expect(stats.maxDigitSpan).toBe(6);
    // recallAccuracyRate should include all 3 attempts: 2 / 3 = 66.7%
    expect(stats.recallAccuracyRate).toBe(66.7);
  });
});
