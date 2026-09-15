/**
 * PULSE Dataset Statistics Engine
 * ==============================================================================
 * Centralized, rigorous statistical computations for all PULSE research telemetry.
 * All functions explicitly filter non-numeric, NaN, and invalid inputs before computing.
 * ==============================================================================
 */

import {
  DatasetObservation,
  NumericDistributionStats,
  HistogramBin,
  DatasetSummaryStats
} from './types';
import { deriveForeperiodCategory, VRT_MIN_VALID_RT_MS } from '../protocolValidators';

export function extractSortedValidNumbers(values: (number | null | undefined)[]): number[] {
  return values
    .filter((v): v is number => typeof v === 'number' && !isNaN(v) && isFinite(v))
    .sort((a, b) => a - b);
}

export function calcPercentile(sortedValues: number[], p: number): number | null {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0];
  if (p <= 0) return sortedValues[0];
  if (p >= 100) return sortedValues[sortedValues.length - 1];

  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

export function computeNumericStats(rawValues: (number | null | undefined)[]): NumericDistributionStats {
  const values = extractSortedValidNumbers(rawValues);
  const count = values.length;

  if (count === 0) {
    return {
      count: 0,
      mean: null,
      median: null,
      p10: null,
      p25: null,
      p75: null,
      p90: null,
      min: null,
      max: null,
      stdDev: null,
      iqr: null
    };
  }

  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / count;

  const median = calcPercentile(values, 50);
  const p10 = calcPercentile(values, 10);
  const p25 = calcPercentile(values, 25);
  const p75 = calcPercentile(values, 75);
  const p90 = calcPercentile(values, 90);
  const min = values[0];
  const max = values[count - 1];
  const iqr = p75 !== null && p25 !== null ? p75 - p25 : null;

  let stdDev: number | null = null;
  if (count > 1) {
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (count - 1);
    stdDev = Math.sqrt(variance);
  } else {
    stdDev = 0;
  }

  return {
    count,
    mean: Number(mean.toFixed(2)),
    median: median !== null ? Number(median.toFixed(2)) : null,
    p10: p10 !== null ? Number(p10.toFixed(2)) : null,
    p25: p25 !== null ? Number(p25.toFixed(2)) : null,
    p75: p75 !== null ? Number(p75.toFixed(2)) : null,
    p90: p90 !== null ? Number(p90.toFixed(2)) : null,
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    stdDev: stdDev !== null ? Number(stdDev.toFixed(2)) : null,
    iqr: iqr !== null ? Number(iqr.toFixed(2)) : null
  };
}

export function computeHistogramBins(
  rawValues: (number | null | undefined)[],
  numBins = 8,
  minOverride?: number,
  maxOverride?: number
): HistogramBin[] {
  const values = extractSortedValidNumbers(rawValues);
  if (values.length === 0) return [];

  const rawMin = minOverride !== undefined ? minOverride : values[0];
  const rawMax = maxOverride !== undefined ? maxOverride : values[values.length - 1];

  const min = rawMin;
  const max = rawMax === rawMin ? rawMin + 1 : rawMax;
  const range = max - min;
  const binWidth = range / numBins;

  return Array.from({ length: numBins }, (_, i) => {
    const binStart = min + i * binWidth;
    const binEnd = min + (i + 1) * binWidth;
    const isLast = i === numBins - 1;
    const count = values.filter(v => isLast ? (v >= binStart && v <= binEnd) : (v >= binStart && v < binEnd)).length;
    const percentage = Number(((count / values.length) * 100).toFixed(1));

    return {
      binStart: Math.round(binStart),
      binEnd: Math.round(binEnd),
      binLabel: `${Math.round(binStart)}–${Math.round(binEnd)}`,
      count,
      percentage
    };
  });
}

export function computeSummaryStats(observations: DatasetObservation[]): DatasetSummaryStats {
  const totalObservations = observations.length;
  const validObservationsList = observations.filter(o => o.isValid);
  const validObservations = validObservationsList.length;

  const sessionIds = new Set(observations.map(o => o.sessionId));
  const totalSessions = sessionIds.size;

  const validLatencies = validObservationsList
    .map(o => o.latencyMs)
    .filter((l): l is number => typeof l === 'number' && !isNaN(l) && l > 0);

  const latencyDist = computeNumericStats(validLatencies);

  const accuracyTrials = validObservationsList.filter(o => o.isCorrect !== null && o.isCorrect !== undefined);
  const accuracyRate = accuracyTrials.length > 0
    ? Number(((accuracyTrials.filter(o => o.isCorrect === true).length / accuracyTrials.length) * 100).toFixed(1))
    : null;

  const falseStarts = observations.filter(o => o.validityStatus === 'FALSE_START');
  const falseStartRate = totalObservations > 0
    ? Number(((falseStarts.length / totalObservations) * 100).toFixed(1))
    : null;

  const protocolBreakdown: Record<string, number> = {};
  const ageGroupBreakdown: Record<string, number> = {};
  const modalityBreakdown: Record<string, number> = {};

  observations.forEach(o => {
    protocolBreakdown[o.assessmentType] = (protocolBreakdown[o.assessmentType] || 0) + 1;
    if (o.ageGroup) {
      ageGroupBreakdown[o.ageGroup] = (ageGroupBreakdown[o.ageGroup] || 0) + 1;
    }
    if (o.inputModality) {
      modalityBreakdown[o.inputModality] = (modalityBreakdown[o.inputModality] || 0) + 1;
    }
  });

  return {
    totalObservations,
    validObservations,
    totalSessions,
    accuracyRate,
    falseStartRate,
    medianLatencyMs: latencyDist.median,
    meanLatencyMs: latencyDist.mean,
    iqrLatencyMs: latencyDist.iqr,
    p10LatencyMs: latencyDist.p10,
    p90LatencyMs: latencyDist.p90,
    protocolBreakdown,
    ageGroupBreakdown,
    modalityBreakdown
  };
}

export interface VrtProtocolStats {
  count: number;
  minRt: number | null;
  maxRt: number | null;
  medianRt: number | null;
  iqrRt: number | null;
  p10Rt: number | null;
  p25Rt: number | null;
  p75Rt: number | null;
  p90Rt: number | null;
  meanRt: number | null;
  stdDevRt: number | null;
  falseStartRate: number | null;
  shortForeperiodMedianRt: number | null;
  longForeperiodMedianRt: number | null;
  histogram: HistogramBin[];
  foreperiodBreakdown: {
    category: string;
    count: number;
    medianRt: number | null;
    meanRt: number | null;
  }[];
}

export function computeVrtStats(observations: DatasetObservation[]): VrtProtocolStats {
  const vrtObs = observations.filter(o => o.assessmentType === 'visual-reaction');
  const validVrt = vrtObs.filter(o => o.isValid && typeof o.latencyMs === 'number' && o.latencyMs > 0);
  const latencies = validVrt.map(o => o.latencyMs);
  const dist = computeNumericStats(latencies);

  const falseStarts = vrtObs.filter(o => o.validityStatus === 'FALSE_START');
  const falseStartRate = vrtObs.length > 0 ? Number(((falseStarts.length / vrtObs.length) * 100).toFixed(1)) : null;

  const shortFpTrials = validVrt.filter(o => {
    if (typeof o.foreperiodMs === 'number') {
      return deriveForeperiodCategory(o.foreperiodMs) === 'SHORT';
    }
    return o.foreperiodCategory === 'SHORT';
  });
  const longFpTrials = validVrt.filter(o => {
    if (typeof o.foreperiodMs === 'number') {
      return deriveForeperiodCategory(o.foreperiodMs) === 'LONG';
    }
    return o.foreperiodCategory === 'LONG';
  });

  const shortFpStats = computeNumericStats(shortFpTrials.map(o => o.latencyMs));
  const longFpStats = computeNumericStats(longFpTrials.map(o => o.latencyMs));

  const histogram = computeHistogramBins(latencies, 8);

  return {
    count: dist.count,
    minRt: dist.min,
    maxRt: dist.max,
    medianRt: dist.median,
    iqrRt: dist.iqr,
    p10Rt: dist.p10,
    p25Rt: dist.p25,
    p75Rt: dist.p75,
    p90Rt: dist.p90,
    meanRt: dist.mean,
    stdDevRt: dist.stdDev,
    falseStartRate,
    shortForeperiodMedianRt: shortFpStats.median,
    longForeperiodMedianRt: longFpStats.median,
    histogram,
    foreperiodBreakdown: [
      {
        category: 'Short Foreperiod (100–500 ms)',
        count: shortFpTrials.length,
        medianRt: shortFpStats.median,
        meanRt: shortFpStats.mean
      },
      {
        category: 'Long Foreperiod (501–3000 ms)',
        count: longFpTrials.length,
        medianRt: longFpStats.median,
        meanRt: longFpStats.mean
      }
    ]
  };
}

export interface DirectionProtocolStats {
  medianRt: number | null;
  meanRt: number | null;
  iqrRt: number | null;
  p10Rt: number | null;
  accuracyRate: number | null;
  errorRate: number | null;
  directionBreakdown: {
    direction: string;
    count: number;
    accuracy: number | null;
    medianRt: number | null;
  }[];
  histogram: HistogramBin[];
}

export function computeDirectionStats(observations: DatasetObservation[]): DirectionProtocolStats {
  const drtObs = observations.filter(o => o.assessmentType === 'direction');
  const validDrt = drtObs.filter(o => o.isValid && typeof o.latencyMs === 'number' && o.latencyMs > 0);
  const validCorrectDrt = validDrt.filter(o => o.isCorrect === true);
  const latencies = validCorrectDrt.map(o => o.latencyMs);
  const dist = computeNumericStats(latencies);

  const accuracyTrials = validDrt.filter(o => o.isCorrect !== null && o.isCorrect !== undefined);
  const accuracyRate = accuracyTrials.length > 0
    ? Number(((accuracyTrials.filter(o => o.isCorrect === true).length / accuracyTrials.length) * 100).toFixed(1))
    : null;
  const errorRate = accuracyRate !== null ? Number((100 - accuracyRate).toFixed(1)) : null;

  const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  const directionBreakdown = directions.map(dir => {
    const dirTrials = validDrt.filter(o => o.targetDirection?.toUpperCase() === dir);
    const accTrials = dirTrials.filter(o => o.isCorrect !== null && o.isCorrect !== undefined);
    const correctCount = accTrials.filter(o => o.isCorrect === true).length;
    const acc = accTrials.length > 0 ? Number(((correctCount / accTrials.length) * 100).toFixed(1)) : null;
    const dirCorrectTrials = dirTrials.filter(o => o.isCorrect === true);
    const dirRtStats = computeNumericStats(dirCorrectTrials.map(o => o.latencyMs));

    return {
      direction: dir,
      count: dirTrials.length,
      accuracy: acc,
      medianRt: dirRtStats.median
    };
  });

  const histogram = computeHistogramBins(latencies, 8);

  return {
    medianRt: dist.median,
    meanRt: dist.mean,
    iqrRt: dist.iqr,
    p10Rt: dist.p10,
    accuracyRate,
    errorRate,
    directionBreakdown,
    histogram
  };
}

export interface ColourProtocolStats {
  congruentMeanRt: number | null;
  incongruentMeanRt: number | null;
  interferenceCost: number | null;
  overallMeanRt: number | null;
  overallMedianRt: number | null;
  accuracyRate: number | null;
  conditionBreakdown: {
    condition: string;
    count: number;
    meanRt: number | null;
    medianRt: number | null;
    accuracy: number | null;
  }[];
  histogram: HistogramBin[];
}

export function computeColourStats(observations: DatasetObservation[]): ColourProtocolStats {
  const crtObs = observations.filter(o => o.assessmentType === 'color-recognition' || o.assessmentType === 'colour-recognition');
  const validCrt = crtObs.filter(o => o.isValid && typeof o.latencyMs === 'number' && o.latencyMs > 0);
  const validCorrectCrt = validCrt.filter(o => o.isCorrect === true);
  const overallDist = computeNumericStats(validCorrectCrt.map(o => o.latencyMs));

  const congruentTrials = validCrt.filter(o => o.condition === 'congruent');
  const incongruentTrials = validCrt.filter(o => o.condition === 'incongruent');

  const congCorrectTrials = congruentTrials.filter(o => o.isCorrect === true);
  const incongCorrectTrials = incongruentTrials.filter(o => o.isCorrect === true);

  const congStats = computeNumericStats(congCorrectTrials.map(o => o.latencyMs));
  const incongStats = computeNumericStats(incongCorrectTrials.map(o => o.latencyMs));

  const congMean = congStats.mean;
  const incongMean = incongStats.mean;
  const interferenceCost = incongMean !== null && congMean !== null
    ? Number((incongMean - congMean).toFixed(1))
    : null;

  const accuracyTrials = validCrt.filter(o => o.isCorrect !== null && o.isCorrect !== undefined);
  const accuracyRate = accuracyTrials.length > 0
    ? Number(((accuracyTrials.filter(o => o.isCorrect === true).length / accuracyTrials.length) * 100).toFixed(1))
    : null;

  const congAccTrials = congruentTrials.filter(o => o.isCorrect !== null && o.isCorrect !== undefined);
  const incongAccTrials = incongruentTrials.filter(o => o.isCorrect !== null && o.isCorrect !== undefined);

  const conditionBreakdown = [
    {
      condition: 'Congruent (Matching)',
      count: congruentTrials.length,
      meanRt: congStats.mean,
      medianRt: congStats.median,
      accuracy: congAccTrials.length > 0 ? Number(((congAccTrials.filter(o => o.isCorrect === true).length / congAccTrials.length) * 100).toFixed(1)) : null
    },
    {
      condition: 'Incongruent (Interfering)',
      count: incongruentTrials.length,
      meanRt: incongStats.mean,
      medianRt: incongStats.median,
      accuracy: incongAccTrials.length > 0 ? Number(((incongAccTrials.filter(o => o.isCorrect === true).length / incongAccTrials.length) * 100).toFixed(1)) : null
    }
  ];

  const histogram = computeHistogramBins(validCorrectCrt.map(o => o.latencyMs), 8);

  return {
    congruentMeanRt: congMean,
    incongruentMeanRt: incongMean,
    interferenceCost,
    overallMeanRt: overallDist.mean,
    overallMedianRt: overallDist.median,
    accuracyRate,
    conditionBreakdown,
    histogram
  };
}

export interface BlockMemoryProtocolStats {
  medianSpan: number | null;
  maxSpan: number | null;
  meanInterTapRt: number | null;
  successRate: number | null;
  spanDistribution: {
    span: number;
    count: number;
    percentage: number;
  }[];
  progressionCurve: {
    level: number;
    attemptCount: number;
    accuracyRate: number | null;
  }[];
}

export function computeBlockMemoryStats(observations: DatasetObservation[]): BlockMemoryProtocolStats {
  const bmtObs = observations.filter(o => o.assessmentType === 'block-memory');
  const validBmt = bmtObs.filter(o => o.isValid);

  const spans = validBmt.map(o => o.sequenceLength ?? (typeof o.level === 'number' && o.level > 0 ? o.level + 1 : null)).filter((s): s is number => typeof s === 'number' && s > 0);
  const spanStats = computeNumericStats(spans);

  const correctBmt = validBmt.filter(o => o.isCorrect === true);
  const correctSpans = correctBmt.map(o => o.sequenceLength ?? (typeof o.level === 'number' && o.level > 0 ? o.level + 1 : null)).filter((s): s is number => typeof s === 'number' && s > 0);
  const correctSpanStats = computeNumericStats(correctSpans);

  const interTapTimes = validBmt.map(o => o.interTapTimeMs).filter((t): t is number => typeof t === 'number' && t > 0);
  const interTapStats = computeNumericStats(interTapTimes);

  const accuracyTrials = validBmt.filter(o => o.isCorrect !== null && o.isCorrect !== undefined);
  const successRate = accuracyTrials.length > 0
    ? Number(((accuracyTrials.filter(o => o.isCorrect === true).length / accuracyTrials.length) * 100).toFixed(1))
    : null;

  const spanCounts: Record<number, number> = {};
  spans.forEach(s => {
    spanCounts[s] = (spanCounts[s] || 0) + 1;
  });

  const spanDistribution = Object.keys(spanCounts)
    .map(Number)
    .sort((a, b) => a - b)
    .map(span => ({
      span,
      count: spanCounts[span],
      percentage: spans.length > 0 ? Number(((spanCounts[span] / spans.length) * 100).toFixed(1)) : 0
    }));

  const uniqueSpans = Array.from(new Set(spans)).sort((a, b) => a - b);
  const progressionCurve = uniqueSpans.map(level => {
    const levelTrials = validBmt.filter(o => (o.sequenceLength ?? (typeof o.level === 'number' && o.level > 0 ? o.level + 1 : null)) === level);
    const accTrials = levelTrials.filter(o => o.isCorrect !== null && o.isCorrect !== undefined);
    const correctCount = accTrials.filter(o => o.isCorrect === true).length;
    const acc = accTrials.length > 0 ? Number(((correctCount / accTrials.length) * 100).toFixed(1)) : null;

    return {
      level,
      attemptCount: levelTrials.length,
      accuracyRate: acc
    };
  });

  return {
    medianSpan: spanStats.median,
    maxSpan: correctSpanStats.max,
    meanInterTapRt: interTapStats.mean,
    successRate,
    spanDistribution,
    progressionCurve
  };
}

export interface NumberMemoryProtocolStats {
  medianDigitSpan: number | null;
  maxDigitSpan: number | null;
  meanEntryLatency: number | null;
  recallAccuracyRate: number | null;
  digitSpanDistribution: {
    digitLength: number;
    count: number;
    percentage: number;
  }[];
  progressionCurve: {
    digitLength: number;
    attemptCount: number;
    accuracyRate: number | null;
  }[];
}

export function computeNumberMemoryStats(observations: DatasetObservation[]): NumberMemoryProtocolStats {
  const nmtObs = observations.filter(o => o.assessmentType === 'number-memory');
  const validNmt = nmtObs.filter(o => o.isValid);

  const digitLengths = validNmt.map(o => o.sequenceLength ?? (typeof o.level === 'number' && o.level > 0 ? o.level + 2 : null)).filter((s): s is number => typeof s === 'number' && s > 0);
  const spanStats = computeNumericStats(digitLengths);

  const correctNmt = validNmt.filter(o => o.isCorrect === true);
  const correctDigitLengths = correctNmt.map(o => o.sequenceLength ?? (typeof o.level === 'number' && o.level > 0 ? o.level + 2 : null)).filter((s): s is number => typeof s === 'number' && s > 0);
  const correctSpanStats = computeNumericStats(correctDigitLengths);

  const latencies = validNmt.map(o => o.latencyMs).filter((l): l is number => typeof l === 'number' && l > 0);
  const latencyStats = computeNumericStats(latencies);

  const accuracyTrials = validNmt.filter(o => o.isCorrect !== null && o.isCorrect !== undefined);
  const recallAccuracyRate = accuracyTrials.length > 0
    ? Number(((accuracyTrials.filter(o => o.isCorrect === true).length / accuracyTrials.length) * 100).toFixed(1))
    : null;

  const lengthCounts: Record<number, number> = {};
  digitLengths.forEach(d => {
    lengthCounts[d] = (lengthCounts[d] || 0) + 1;
  });

  const digitSpanDistribution = Object.keys(lengthCounts)
    .map(Number)
    .sort((a, b) => a - b)
    .map(digitLength => ({
      digitLength,
      count: lengthCounts[digitLength],
      percentage: digitLengths.length > 0 ? Number(((lengthCounts[digitLength] / digitLengths.length) * 100).toFixed(1)) : 0
    }));

  const uniqueLengths = Array.from(new Set(digitLengths)).sort((a, b) => a - b);
  const progressionCurve = uniqueLengths.map(digitLength => {
    const lengthTrials = validNmt.filter(o => (o.sequenceLength ?? (typeof o.level === 'number' && o.level > 0 ? o.level + 2 : null)) === digitLength);
    const accTrials = lengthTrials.filter(o => o.isCorrect !== null && o.isCorrect !== undefined);
    const correctCount = accTrials.filter(o => o.isCorrect === true).length;
    const acc = accTrials.length > 0 ? Number(((correctCount / accTrials.length) * 100).toFixed(1)) : null;

    return {
      digitLength,
      attemptCount: lengthTrials.length,
      accuracyRate: acc
    };
  });

  return {
    medianDigitSpan: spanStats.median,
    maxDigitSpan: correctSpanStats.max,
    meanEntryLatency: latencyStats.mean,
    recallAccuracyRate,
    digitSpanDistribution,
    progressionCurve
  };
}

export interface SubgroupCohortStat {
  groupKey: string;
  groupLabel: string;
  sampleCount: number;
  medianLatency: number | null;
  meanLatency: number | null;
  accuracyRate: number | null;
}

export function computeSubgroupStratification(
  observations: DatasetObservation[],
  groupBy: 'ageGroup' | 'inputModality' | 'refreshRateHz' | 'completedAtMonth'
): SubgroupCohortStat[] {
  const groups: Record<string, DatasetObservation[]> = {};

  observations.forEach(o => {
    let key = 'unknown';
    if (groupBy === 'ageGroup') key = o.ageGroup || 'unspecified';
    else if (groupBy === 'inputModality') key = o.inputModality || 'unknown';
    else if (groupBy === 'refreshRateHz') key = typeof o.refreshRateHz === 'number' ? `${o.refreshRateHz} Hz` : 'Unspecified';
    else if (groupBy === 'completedAtMonth') key = o.completedAtMonth || 'unspecified';

    if (!groups[key]) groups[key] = [];
    groups[key].push(o);
  });

  return Object.entries(groups).map(([groupKey, groupObs]) => {
    const validObs = groupObs.filter(o => o.isValid);
    const latencies = validObs.map(o => o.latencyMs).filter((l): l is number => typeof l === 'number' && l > 0);
    const dist = computeNumericStats(latencies);

    const accTrials = validObs.filter(o => o.isCorrect !== null && o.isCorrect !== undefined);
    const accRate = accTrials.length > 0
      ? Number(((accTrials.filter(o => o.isCorrect === true).length / accTrials.length) * 100).toFixed(1))
      : null;

    return {
      groupKey,
      groupLabel: groupKey.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      sampleCount: groupObs.length,
      medianLatency: dist.median,
      meanLatency: dist.mean,
      accuracyRate: accRate
    };
  });
}
