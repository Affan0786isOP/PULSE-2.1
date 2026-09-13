import {
  ProtocolType,
  DemographicAgeGroup,
  InputModality,
  DatasetObservation,
  ResearchSessionRecord,
} from './types';
import { deriveForeperiodCategory } from '../protocolValidators';

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
  const t = type.toLowerCase().trim();
  if (t === 'reaction-test' || t === 'reaction' || t === 'visual-reaction') return 'visual-reaction';
  if (t === 'direction-test' || t === 'direction') return 'direction';
  if (t === 'color-recognition' || t === 'colour-recognition' || t === 'color-test' || t === 'color') return 'color-recognition';
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

  if (trials.length === 0) {
    return [];
  }

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

  return trials.map((t, idx) => {
    const rawRt = t.reactionTime ?? t.inputLatencyMs ?? t.rawRt ?? t.rawReactionTime ?? t.rawLatencyMs;
    const isFalseStart = t.falseStart === true || (typeof rawRt === 'number' && rawRt < 100 && (pType === 'visual-reaction' || pType === 'direction' || pType === 'color-recognition'));
    const isTimeout = t.timedOut === true;
    const isCorrect = typeof t.correct === 'boolean' 
      ? t.correct 
      : (typeof t.correctness === 'boolean' 
        ? t.correctness 
        : (typeof t.accuracy === 'number' ? t.accuracy === 1 : null));
    
    let validityStatus: 'VALID' | 'FALSE_START' | 'TIMEOUT' | 'INCORRECT' | 'ABORTED' = 'VALID';
    let isValid = true;

    if (isFalseStart || t.validity === 'FALSE_START_PRE_STIMULUS' || t.validity === 'ANTICIPATORY_TOO_FAST') {
      isValid = false;
      validityStatus = 'FALSE_START';
    } else if (isTimeout || t.validity === 'TIMEOUT') {
      isValid = false;
      validityStatus = 'TIMEOUT';
    } else if (t.valid === false || t.validity === 'INVALID' || t.validity === 'ABORTED') {
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
      chosenDirection: t.chosenDirection || null,
      userResponse: t.userResponse || null,
      targetColor: t.targetColor || null,
      chosenColor: t.chosenColor || null,
      wordName: t.wordName || null,
      wordColor: t.wordColor || null,
      condition: t.condition === 'congruent' ? 'congruent' : (t.condition === 'incongruent' ? 'incongruent' : null),
      instruction: t.instruction || null,
      level: typeof t.level === 'number' ? t.level : null,
      sequenceLength: typeof t.sequenceLength === 'number' ? t.sequenceLength : null,
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
