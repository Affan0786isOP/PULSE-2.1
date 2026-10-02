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
    category: 'LATENCY TELEMETRY',
    heroDescription: 'Measures pure somatic visual response latency with sub-millisecond precision.',
    logoPath: '/brand/assessments/reaction.png',
  },
  'direction': {
    assessmentId: 'direction',
    protocolNumber: 'PROTOCOL 02',
    category: 'CHOICE COORDINATION',
    heroDescription: 'Evaluates cognitive bifurcation speed and motor execution under choice conditions.',
    logoPath: '/brand/assessments/direction.png',
  },
  'color-recognition': {
    assessmentId: 'color-recognition',
    protocolNumber: 'PROTOCOL 03',
    category: 'COGNITIVE CONFLICT',
    heroDescription: 'Assesses semantic inhibitory control and selective attention thresholds.',
    logoPath: '/brand/assessments/color.png',
  },
  'block-memory': {
    assessmentId: 'block-memory',
    protocolNumber: 'PROTOCOL 04',
    category: 'SPATIAL WORKING MEMORY',
    heroDescription: 'Benchmarks visuospatial memory span through progressive serial recall.',
    logoPath: '/brand/assessments/block.png',
  },
  'number-memory': {
    assessmentId: 'number-memory',
    protocolNumber: 'PROTOCOL 05',
    category: 'DIGIT SPAN MEMORY',
    heroDescription: 'Tests phonological working memory limit with adaptive digit length scaling.',
    logoPath: '/brand/assessments/number.png',
  },
};
