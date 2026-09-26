export interface HeroAssessment {
  id: string;
  protocolNumber: string;
  category: string;
  title: string;
  description: string;
  targetRoute: string;
  logo: string;
}

export const HERO_ASSESSMENTS: HeroAssessment[] = [
  {
    id: 'reaction',
    protocolNumber: 'PROTOCOL 01',
    category: 'LATENCY TELEMETRY',
    title: 'VISUAL REACTION',
    description: 'Measures pure somatic visual response latency with sub-millisecond precision.',
    targetRoute: '/reaction-test',
    logo: '/brand/assessments/reaction.png',
  },
  {
    id: 'direction',
    protocolNumber: 'PROTOCOL 02',
    category: 'CHOICE COORDINATION',
    title: 'DIRECTIONAL CHOICE',
    description: 'Evaluates cognitive bifurcation speed and motor execution under choice conditions.',
    targetRoute: '/direction-test',
    logo: '/brand/assessments/direction.png',
  },
  {
    id: 'color',
    protocolNumber: 'PROTOCOL 03',
    category: 'COGNITIVE CONFLICT',
    title: 'COLOR RECOGNITION',
    description: 'Assesses semantic inhibitory control and selective attention thresholds.',
    targetRoute: '/colour-recognition',
    logo: '/brand/assessments/color.png',
  },
  {
    id: 'block',
    protocolNumber: 'PROTOCOL 04',
    category: 'SPATIAL WORKING MEMORY',
    title: 'BLOCK MEMORY',
    description: 'Benchmarks visuospatial memory span through progressive serial recall.',
    targetRoute: '/block-memory',
    logo: '/brand/assessments/block.png',
  },
  {
    id: 'number',
    protocolNumber: 'PROTOCOL 05',
    category: 'DIGIT SPAN MEMORY',
    title: 'NUMBER MEMORY',
    description: 'Tests phonological working memory limit with adaptive digit length scaling.',
    targetRoute: '/number-memory',
    logo: '/brand/assessments/number.png',
  },
];
