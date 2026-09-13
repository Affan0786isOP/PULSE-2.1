import { DatasetObservation, ProtocolType, AssessmentId } from './types';
import { normalizeProtocolType } from './normalization';

/**
 * Maps a section to its canonical ProtocolType, or null if multi-protocol.
 */
export function getSectionProtocolKey(section: AssessmentId | 'data-explorer'): ProtocolType | null {
  switch (section) {
    case 'visual-reaction':
      return 'visual-reaction';
    case 'direction':
      return 'direction';
    case 'colour-recognition':
      return 'color-recognition';
    case 'block-memory':
      return 'block-memory';
    case 'number-memory':
      return 'number-memory';
    case 'data-explorer':
    default:
      return null;
  }
}

/**
 * Visual Reaction Protocol consumer (Simple Reaction Time - SRT).
 * Operates strictly on already-filtered observations.
 */
export function selectVisualReactionObservations(filteredObservations: DatasetObservation[]): DatasetObservation[] {
  return filteredObservations.filter(o => normalizeProtocolType(o.assessmentType) === 'visual-reaction');
}

/**
 * Direction Reflex Protocol consumer (Choice Reaction Time - CRT).
 * Operates strictly on already-filtered observations.
 */
export function selectDirectionObservations(filteredObservations: DatasetObservation[]): DatasetObservation[] {
  return filteredObservations.filter(o => normalizeProtocolType(o.assessmentType) === 'direction');
}

/**
 * Colour Recognition consumer (Stroop Effect).
 * Operates strictly on already-filtered observations, tolerating both UK/US spellings.
 */
export function selectColourRecognitionObservations(filteredObservations: DatasetObservation[]): DatasetObservation[] {
  return filteredObservations.filter(o => normalizeProtocolType(o.assessmentType) === 'color-recognition');
}

/**
 * Block Memory Protocol consumer (Corsi Block-Tapping Span).
 * Operates strictly on already-filtered observations.
 */
export function selectBlockMemoryObservations(filteredObservations: DatasetObservation[]): DatasetObservation[] {
  return filteredObservations.filter(o => normalizeProtocolType(o.assessmentType) === 'block-memory');
}

/**
 * Number Memory Protocol consumer (Digit Span).
 * Operates strictly on already-filtered observations.
 */
export function selectNumberMemoryObservations(filteredObservations: DatasetObservation[]): DatasetObservation[] {
  return filteredObservations.filter(o => normalizeProtocolType(o.assessmentType) === 'number-memory');
}

/**
 * Raw Observation Telemetry Explorer consumer.
 * Operates strictly on already-filtered observations for multidimensional drill-down.
 */
export function selectDataExplorerObservations(filteredObservations: DatasetObservation[]): DatasetObservation[] {
  return filteredObservations;
}

/**
 * Canonical section selector that routes section consumers to their protocol-specific slice
 * from the single shared filtered observations collection.
 *
 * Guaranteed:
 * 1. Global filters are applied prior to section selection.
 * 2. Section selection never bypasses or duplicates global filters.
 * 3. Switching sections never reinterprets global filter conditions.
 */
export function selectObservationsForSection(
  filteredObservations: DatasetObservation[],
  section: AssessmentId | 'data-explorer'
): DatasetObservation[] {
  switch (section) {
    case 'visual-reaction':
      return selectVisualReactionObservations(filteredObservations);
    case 'direction':
      return selectDirectionObservations(filteredObservations);
    case 'colour-recognition':
      return selectColourRecognitionObservations(filteredObservations);
    case 'block-memory':
      return selectBlockMemoryObservations(filteredObservations);
    case 'number-memory':
      return selectNumberMemoryObservations(filteredObservations);
    case 'data-explorer':
      return selectDataExplorerObservations(filteredObservations);
    default:
      return filteredObservations;
  }
}
