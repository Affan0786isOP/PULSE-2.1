import type { AssessmentId } from '../contracts/common';
import type { AssessmentDefinition } from '../contracts/assessment';
import { CANONICAL_ASSESSMENT_IDS } from '../contracts/common';

export const ASSESSMENT_DEFINITIONS: Record<AssessmentId, AssessmentDefinition> = {
  'visual-reaction': {
    id: 'visual-reaction',
    displayName: 'Visual Reaction',
    aliases: ['reaction-test', 'visual-reaction-test', 'reaction', 'visual'],
    primaryMetric: 'averageReactionTime',
    metricDirection: 'lower-is-better',
    unit: 'ms',
    supportedDevices: ['desktop', 'mobile'],
  },
  'direction': {
    id: 'direction',
    displayName: 'Directional Choice',
    aliases: ['direction-test', 'direction-reflex'],
    primaryMetric: 'averageReactionTime',
    metricDirection: 'lower-is-better',
    unit: 'ms',
    supportedDevices: ['desktop', 'mobile'],
  },
  'color-recognition': {
    id: 'color-recognition',
    displayName: 'Color Recognition',
    aliases: [
      'colour-recognition',
      'color-recognition',
      'color-test',
      'colour-test',
      'color',
      'colour',
      'color-rec',
      'colour-rec',
    ],
    primaryMetric: 'averageReactionTime',
    metricDirection: 'lower-is-better',
    unit: 'ms',
    supportedDevices: ['desktop', 'mobile'],
  },
  'block-memory': {
    id: 'block-memory',
    displayName: 'Block Memory',
    aliases: ['block-memory-test', 'block'],
    primaryMetric: 'longestSeq',
    metricDirection: 'higher-is-better',
    unit: 'Blocks',
    supportedDevices: ['desktop', 'mobile'],
  },
  'number-memory': {
    id: 'number-memory',
    displayName: 'Number Memory',
    aliases: ['number-memory-test', 'number'],
    primaryMetric: 'longestSeq',
    metricDirection: 'higher-is-better',
    unit: 'Digits',
    supportedDevices: ['desktop', 'mobile'],
  },
};

/**
 * Static map of canonical IDs and approved aliases to canonical AssessmentId.
 * Uses exact trimmed lowercase lookup without automatic space/underscore translation.
 */
const ALIAS_LOOKUP_MAP: Map<string, AssessmentId> = new Map([
  // Canonical identities
  ['visual-reaction', 'visual-reaction'],
  ['direction', 'direction'],
  ['color-recognition', 'color-recognition'],
  ['block-memory', 'block-memory'],
  ['number-memory', 'number-memory'],

  // Approved aliases: visual-reaction
  ['reaction-test', 'visual-reaction'],
  ['visual-reaction-test', 'visual-reaction'],
  ['reaction', 'visual-reaction'],
  ['visual', 'visual-reaction'],

  // Approved aliases: direction
  ['direction-test', 'direction'],
  ['direction-reflex', 'direction'],

  // Approved aliases: color-recognition
  ['colour-recognition', 'color-recognition'],
  ['color-test', 'color-recognition'],
  ['colour-test', 'color-recognition'],
  ['color', 'color-recognition'],
  ['colour', 'color-recognition'],
  ['color-rec', 'color-recognition'],
  ['colour-rec', 'color-recognition'],

  // Approved aliases: block-memory
  ['block-memory-test', 'block-memory'],
  ['block', 'block-memory'],

  // Approved aliases: number-memory
  ['number-memory-test', 'number-memory'],
  ['number', 'number-memory'],
]);

/**
 * Resolves an assessment identifier or approved alias to its canonical AssessmentId.
 * Strictly returns undefined for any unapproved or unknown identifier.
 */
export function resolveAssessmentId(identifier: string | null | undefined): AssessmentId | undefined {
  if (!identifier || typeof identifier !== 'string') return undefined;
  const key = identifier.trim().toLowerCase();
  return ALIAS_LOOKUP_MAP.get(key);
}

/**
 * Type guard verifying if a string is a canonical AssessmentId.
 */
export function isValidAssessmentId(identifier: string | null | undefined): identifier is AssessmentId {
  if (!identifier || typeof identifier !== 'string') return false;
  return CANONICAL_ASSESSMENT_IDS.includes(identifier as AssessmentId);
}

/**
 * Returns the assessment definition for a canonical AssessmentId.
 */
export function getAssessmentDefinition(id: AssessmentId): AssessmentDefinition {
  return ASSESSMENT_DEFINITIONS[id];
}
