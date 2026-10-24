import type { AssessmentId } from '../contracts/common';

export interface HomepageAssessmentPresentation {
  assessmentId: AssessmentId;
  protocolNumber: string;
  category: string;
  heroDescription: string;
  logoPath: string;
}

export const HOMEPAGE_ASSESSMENT_PRESENTATION: Record<AssessmentId, HomepageAssessmentPresentation> = {
  'visual-reaction': {
    assessmentId: 'visual-reaction',
    protocolNumber: 'PROTOCOL 01',
    category: 'REACTION TIME',
    heroDescription: 'Measures how quickly you respond to a visual cue. Device and browser timing can affect results.',
    logoPath: '/brand/assessments/visual-reaction.png',
  },
  'direction': {
    assessmentId: 'direction',
    protocolNumber: 'PROTOCOL 02',
    category: 'CHOICE RESPONSE',
    heroDescription: 'Measures response time when you identify and select a direction.',
    logoPath: '/brand/assessments/directional-choice.png',
  },
  'color-recognition': {
    assessmentId: 'color-recognition',
    protocolNumber: 'PROTOCOL 03',
    category: 'COLOUR INTERFERENCE',
    heroDescription: 'Explores how colour-word conflict can affect your response.',
    logoPath: '/brand/assessments/colour-recognition.png',
  },
  'block-memory': {
    assessmentId: 'block-memory',
    protocolNumber: 'PROTOCOL 04',
    category: 'VISUAL MEMORY',
    heroDescription: 'Recall visual block sequences as they become longer.',
    logoPath: '/brand/assessments/block-memory.png',
  },
  'number-memory': {
    assessmentId: 'number-memory',
    protocolNumber: 'PROTOCOL 05',
    category: 'NUMBER MEMORY',
    heroDescription: 'Recall number sequences as the length increases.',
    logoPath: '/brand/assessments/number-memory.png',
  },
};
