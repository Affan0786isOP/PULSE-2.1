import {
  ProtocolType,
  DemographicAgeGroup,
  InputModality,
  DatasetObservation,
  ResearchSessionRecord,
} from './types';
import { deriveForeperiodCategory, VRT_MIN_VALID_RT_MS } from '../protocolValidators';

export function normalizeAgeGroupKey(ageGroup?: string | null): DemographicAgeGroup {
  if (!ageGroup || typeof ageGroup !== 'string') return 'unspecified';
  const clean = ageGroup.trim().toLowerCase();
  
  if (clean === 'all') return 'all';
  if (clean.includes('children') || clean.includes('8–12') || clean.includes('8-12') || clean === '< 13' || clean === '<13') return 'children';
  if (clean.includes('adolescent') || clean.includes('13–17') || clean.includes('13-17')) return 'adolescents';
  
  // Map exact legacy number strings to distinct legacy keys FIRST
  if (clean.includes('18–24') || clean.includes('18-24')) return 'legacy-18-24';
  if (clean.includes('25–34') || clean.includes('25-34')) return 'legacy-25-34';
  if (clean.includes('35–54') || clean.includes('35-54')) return 'legacy-35-54';
  if (clean.includes('55–64') || clean.includes('55-64')) return 'legacy-55-64';
  if (clean.includes('65+') || clean.includes('65 plus')) return 'legacy-65-plus';

  // Map exact modern number strings to their strict buckets
  if (clean.includes('18–25') || clean.includes('18-25') || clean === 'young adults' || clean === 'young adults (18-25)') return 'young-adults';
  if (clean.includes('26–40') || clean.includes('26-40') || clean === 'adults' || clean === 'adults (26-40)') return 'adults';
  if (clean.includes('41–60') || clean.includes('41-60') || clean.includes('middle-aged') || clean.includes('middle aged')) return 'middle-aged';
  if (clean.includes('61–75') || clean.includes('61-75') || clean === 'older adults' || clean === 'older adults (61-75)') return 'older-adults';
  if (clean.includes('76+') || clean.includes('76 plus') || clean === 'seniors' || clean === 'seniors (76+)') return 'seniors';

  return 'unspecified';
}

export function getAuthoritativeAgeLabel(keyOrLabel?: string | null): string {
  const key = normalizeAgeGroupKey(keyOrLabel);
  switch (key) {
    case 'children': return 'Children (8–12)';
    case 'adolescents': return 'Adolescents (13–17)';
    case 'young-adults': return 'Young adults (18–25)';
    case 'adults': return 'Adults (26–40)';
    case 'middle-aged': return 'Middle-aged adults (41–60)';
    case 'older-adults': return 'Older adults (61–75)';
    case 'seniors': return 'Seniors (76+)';
    case 'legacy-18-24': return 'Legacy (18–24)';
    case 'legacy-25-34': return 'Legacy (25–34)';
    case 'legacy-35-54': return 'Legacy (35–54)';
    case 'legacy-55-64': return 'Legacy (55–64)';
    case 'legacy-65-plus': return 'Legacy (65+)';
    case 'all': return 'All Cohorts';
    default: return 'Unspecified';
  }
}

export function normalizeProtocolType(type: string): ProtocolType {
  if (!type || typeof type !== 'string') return 'unknown';
  const t = type.toLowerCase().trim().replace(/[_\s]+/g, '-');
  if (t === 'reaction-test' || t === 'reaction' || t === 'visual-reaction' || t === 'visual' || t === 'visual-reaction-test') return 'visual-reaction';
  if (t === 'direction-test' || t === 'direction' || t === 'direction-reflex') return 'direction';
  if (t === 'color-recognition' || t === 'colour-recognition' || t === 'color-test' || t === 'colour-test' || t === 'color' || t === 'colour' || t === 'color-rec' || t === 'colour-rec') return 'color-recognition';
  if (t === 'block-memory-test' || t === 'block-memory' || t === 'block') return 'block-memory';
  if (t === 'number-memory-test' || t === 'number-memory' || t === 'number') return 'number-memory';
  return 'unknown';
}

export function normalizeInputModality(explicitModality?: string): InputModality {
  if (!explicitModality) return 'unknown';
  const m = explicitModality.toLowerCase().trim();
  if (m === 'touch' || m === 'mouse' || m === 'keyboard') {
    return m;
  }
  return 'unknown';
}

export function normalizeSessionToObservations(record: ResearchSessionRecord): DatasetObservation[] {
  const trials = record.progressionTrials || [];
  const pType = normalizeProtocolType(record.assessmentType);

  let completedAtMonth = record.completedAtMonth;
  if (!completedAtMonth && typeof record.completedAtTimestamp === 'number') {
    const d = new Date(record.completedAtTimestamp);
    if (!isNaN(d.getTime())) {
      completedAtMonth = d.toISOString().substring(0, 7);
    }
  }
  completedAtMonth = completedAtMonth || 'unspecified';

  const sessionAgeGroup = normalizeAgeGroupKey(record.ageGroup);
  const sessionDeviceCat = record.deviceCategory === 'mobile' || record.device === 'mobile'
    ? 'mobile'
    : (record.deviceCategory === 'desktop' || record.device === 'desktop' ? 'desktop' : 'unknown');

  const sessionModality = normalizeInputModality(record.inputModality || record.inputMethod);

  const sessionRefreshRate: number | null = typeof record.displayRefreshRateHz === 'number'
    ? record.displayRefreshRateHz
    : (typeof record.refreshRateHz === 'number'
      ? record.refreshRateHz
      : (typeof record.refreshRate === 'number' ? record.refreshRate : null));

  if (trials.length === 0) {
    const latency = typeof record.medianReactionTime === 'number'
      ? record.medianReactionTime
      : (typeof record.averageReactionTime === 'number'
        ? record.averageReactionTime
        : (typeof record.scoreMetric === 'number' ? record.scoreMetric : null));

    const hasValidMetrics = latency !== null || typeof record.highestLevel === 'number' || typeof record.longestSeq === 'number';
    if (!hasValidMetrics) {
      return [];
    }

    const accuracyVal = typeof record.accuracy === 'number' ? record.accuracy : 100;
    const isCorrect = accuracyVal > 0;

    return [{
      obsId: `${record.id}-summary`,
      sessionId: record.id,
      assessmentType: pType,
      rawAssessmentType: record.assessmentType,
      ageGroup: sessionAgeGroup,
      completedAtMonth,
      completedAtTimestamp: record.completedAtTimestamp,
      deviceCategory: sessionDeviceCat,
      inputModality: sessionModality,
      refreshRateHz: sessionRefreshRate,
      trialIndex: 1,
      latencyMs: latency,
      rawLatencyMs: latency,
      displayDelayOffsetMs: null,
      isCorrect,
      isValid: true,
      validityStatus: 'VALID',
      qualityFlag: null,
      foreperiodMs: null,
      foreperiodCategory: null,
      targetDirection: null,
      chosenDirection: null,
      userResponse: null,
      targetColor: null,
      chosenColor: null,
      wordName: null,
      wordColor: null,
      condition: null,
      instruction: null,
      level: typeof record.highestLevel === 'number' ? record.highestLevel : null,
      sequenceLength: typeof record.longestSeq === 'number' ? record.longestSeq : null,
      interTapTimeMs: null,
      responseDurationMs: null,
      stimulusScheduledAtPerfMs: null,
      stimulusPresentedAtPerfMs: null,
      responseDetectedAtPerfMs: null,
      provenanceToken: record.provenanceToken || null,
      trialsDigest: record.trialsDigest || null
    }];
  }

  return trials.map((t, idx) => {
    const rawRt = t.reactionTime ?? t.inputLatencyMs ?? t.rawRt ?? t.rawReactionTime ?? t.rawLatencyMs;
    const physiologicalRt = typeof t.rawLatencyMs === 'number'
      ? t.rawLatencyMs
      : (typeof t.rawReactionTime === 'number'
        ? t.rawReactionTime
        : (typeof t.rawRt === 'number'
          ? t.rawRt
          : (typeof t.reactionTime === 'number' ? t.reactionTime : (typeof t.inputLatencyMs === 'number' ? t.inputLatencyMs : null))));

    const isSpeedAssessment = pType === 'visual-reaction' || pType === 'direction' || pType === 'color-recognition';
    const isPhysiologicallySubThreshold = typeof physiologicalRt === 'number' && physiologicalRt < VRT_MIN_VALID_RT_MS && isSpeedAssessment;

    const isFalseStart = t.falseStart === true ||
      t.validity === 'FALSE_START_PRE_STIMULUS' ||
      t.validity === 'ANTICIPATORY_TOO_FAST' ||
      (t.valid !== true && isPhysiologicallySubThreshold);

    const isTimeout = t.timedOut === true;
    const isCorrect = typeof t.correct === 'boolean' 
      ? t.correct 
      : (typeof t.correctness === 'boolean' 
        ? t.correctness 
        : (typeof t.accuracy === 'number' ? t.accuracy === 1 : null));
    
    let validityStatus: 'VALID' | 'FALSE_START' | 'TIMEOUT' | 'INCORRECT' | 'ABORTED' = 'VALID';
    let isValid = true;

    if (isFalseStart || t.validity === 'FALSE_START' || t.validity === 'FALSE_START_PRE_STIMULUS' || t.validity === 'ANTICIPATORY_TOO_FAST') {
      isValid = false;
      validityStatus = 'FALSE_START';
    } else if (isTimeout || t.validity === 'TIMEOUT') {
      isValid = false;
      validityStatus = 'TIMEOUT';
    } else if (t.validity === 'ABORTED' || (typeof rawRt === 'number' && rawRt <= 0) || (t.valid === false && isCorrect !== false && t.validity !== 'INCORRECT')) {
      isValid = false;
      validityStatus = 'ABORTED';
    } else if (isCorrect === false || t.validity === 'INCORRECT') {
      // In research assessments, an incorrect response on a completed trial is a valid trial with an incorrect outcome
      isValid = true;
      validityStatus = 'INCORRECT';
    } else {
      isValid = true;
      validityStatus = 'VALID';
    }

    let foreperiodCategory: 'SHORT' | 'LONG' | null = null;
    if (typeof t.foreperiodMs === 'number') {
      foreperiodCategory = deriveForeperiodCategory(t.foreperiodMs);
    } else if (t.foreperiodCategory === 'SHORT' || t.foreperiodCategory === 'LONG') {
      foreperiodCategory = t.foreperiodCategory;
    }

    const trialModality = normalizeInputModality(t.inputModality || t.inputMethod) !== 'unknown'
      ? normalizeInputModality(t.inputModality || t.inputMethod)
      : sessionModality;

    const trialRefreshRate: number | null = typeof t.refreshRateHz === 'number'
      ? t.refreshRateHz
      : sessionRefreshRate;

    const trialNum = typeof t.trialNumber === 'number' ? t.trialNumber : (idx + 1);
    const seqNum = typeof t.sequenceNumber === 'number' ? t.sequenceNumber : (idx + 1);
    const attemptNum = typeof t.attemptNumber === 'number' ? t.attemptNumber : 1;
    const obsId = `${record.id}-obs${idx}-s${seqNum}-t${trialNum}-a${attemptNum}`;

    return {
      obsId,
      researchRecordId: record.id,
      sessionId: record.id,
      assessmentType: pType,
      rawAssessmentType: record.assessmentType,
      ageGroup: sessionAgeGroup,
      completedAtMonth,
      completedAtTimestamp: record.completedAtTimestamp,
      deviceCategory: sessionDeviceCat,
      inputModality: trialModality,
      refreshRateHz: trialRefreshRate,
      trialIndex: t.trialNumber || idx + 1,
      latencyMs: typeof rawRt === 'number' ? rawRt : null,
      rawLatencyMs: typeof t.rawLatencyMs === 'number' ? t.rawLatencyMs : (typeof t.rawRt === 'number' ? t.rawRt : null),
      displayDelayOffsetMs: typeof t.displayDelayOffsetMs === 'number' ? t.displayDelayOffsetMs : null,
      isValid,
      isCorrect,
      validityStatus,
      qualityFlag: t.qualityFlag || null,
      foreperiodMs: typeof t.foreperiodMs === 'number' ? t.foreperiodMs : null,
      foreperiodCategory,
      targetDirection: t.targetDirection || null,
      chosenDirection: t.chosenDirection || (pType === 'direction' && t.userResponse ? t.userResponse : null),
      userResponse: t.userResponse || null,
      targetColor: t.targetColor || (pType === 'color-recognition' && t.instruction ? ((t.instruction.toUpperCase() === 'WORD') ? t.wordName : t.wordColor) : null) || null,
      chosenColor: t.chosenColor || (pType === 'color-recognition' && t.userResponse ? t.userResponse : null),
      wordName: t.wordName || null,
      wordColor: t.wordColor || null,
      condition: t.condition || (pType === 'color-recognition' && t.wordName && t.wordColor ? (t.wordName === t.wordColor ? 'congruent' : 'incongruent') : null),
      instruction: t.instruction || null,
      level: typeof t.level === 'number' ? t.level : null,
      sequenceLength: typeof t.sequenceLength === 'number'
        ? t.sequenceLength
        : (pType === 'block-memory' && typeof t.level === 'number' && t.level > 0
            ? t.level + 1
            : (pType === 'number-memory' && typeof t.level === 'number' && t.level > 0
                ? t.level + 2
                : null)),
      interTapTimeMs: typeof t.interTapTimeMs === 'number' ? t.interTapTimeMs : null,
      responseDurationMs: typeof t.responseDurationMs === 'number' ? t.responseDurationMs : null,
      stimulusScheduledAtPerfMs: typeof t.stimulusScheduledAtPerfMs === 'number' ? t.stimulusScheduledAtPerfMs : null,
      stimulusPresentedAtPerfMs: typeof t.stimulusPresentedAtPerfMs === 'number' ? t.stimulusPresentedAtPerfMs : null,
      responseDetectedAtPerfMs: typeof t.responseDetectedAtPerfMs === 'number' ? t.responseDetectedAtPerfMs : null,
      provenanceToken: record.provenanceToken || null,
      trialsDigest: record.trialsDigest || null
    };
  });
}
