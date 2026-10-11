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
    title: 'Visual Reaction',
    description: 'Test how quickly you respond to visual stimuli.',
    targetRoute: '/reaction-test',
    logo: '/brand/assessments/visual-reaction.png',
  },
  {
    id: 'direction',
    protocolNumber: 'PROTOCOL 02',
    category: 'CHOICE COORDINATION',
    title: 'Directional Choice',
    description: 'Evaluate cognitive bifurcation speed and motor choice.',
    targetRoute: '/direction-test',
    logo: '/brand/assessments/directional-choice.png',
  },
  {
    id: 'color',
    protocolNumber: 'PROTOCOL 03',
    category: 'COGNITIVE CONFLICT',
    title: 'Colour Recognition',
    description: 'Assess semantic inhibitory control and selective attention.',
    targetRoute: '/colour-recognition',
    logo: '/brand/assessments/colour-recognition.png',
  },
  {
    id: 'block',
    protocolNumber: 'PROTOCOL 04',
    category: 'SPATIAL WORKING MEMORY',
    title: 'Block Memory',
    description: 'Benchmark visuospatial memory span through serial recall.',
    targetRoute: '/block-memory',
    logo: '/brand/assessments/block-memory.png',
  },
  {
    id: 'number',
    protocolNumber: 'PROTOCOL 05',
    category: 'DIGIT SPAN MEMORY',
    title: 'Number Memory',
    description: 'Test working memory capacity with adaptive digit length.',
    targetRoute: '/number-memory',
    logo: '/brand/assessments/number-memory.png',
  },
];
