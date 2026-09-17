export type EvidenceType = 'established' | 'association' | 'interpretation' | 'practical_protocol';
export type LatencyImpact = 'associated_increase' | 'supports_consistency' | 'variable';

export interface ResearchCitation {
  source: string;
  year: number;
  reference: string;
  doi?: string;
  pmid?: string;
}

export interface ResearchEntry {
  id: string;
  statement: string;
  citation: ResearchCitation;
  evidenceType: EvidenceType;
  domain: string;
}

export interface PreparationHabit {
  id: string;
  title: string;
  desc: string;
  category: 'sleep' | 'physical' | 'hydration' | 'protocol' | 'environment';
}

export interface PhysiologicalFactor {
  id: string;
  title: string;
  desc: string;
  evidenceType: EvidenceType;
  impact: LatencyImpact;
  reduces: boolean; // Backwards-compatible flag: true = associated with higher latency
  iconName: 'Moon' | 'Droplet' | 'Activity' | 'User' | 'Target' | 'Dumbbell' | 'Apple' | 'Brain' | 'Monitor' | 'Coffee';
}

export const CHECKLIST_STORAGE_KEY = 'pulse_improve_checklist_v1';

export const RESEARCH_LEDGER_ENTRIES: ResearchEntry[] = [
  {
    id: "hicks-law",
    statement: "Choice reaction time increases as a logarithmic function of the number of stimulus-response alternatives.",
    citation: {
      source: "Quarterly Journal of Experimental Psychology",
      year: 1952,
      reference: "Hick, W. E. (1952)",
      doi: "10.1080/17470215208416600"
    },
    evidenceType: "established",
    domain: "Decision Latency"
  },
  {
    id: "sleep-deprivation-meta",
    statement: "Acute sleep loss is consistently associated with increased reaction time and substantial lapses in sustained psychomotor vigilance.",
    citation: {
      source: "Psychological Bulletin",
      year: 2010,
      reference: "Lim, J., & Dinges, D. F. (2010)",
      doi: "10.1037/a0018883"
    },
    evidenceType: "established",
    domain: "Sleep & Vigilance"
  },
  {
    id: "visual-speed-processing",
    statement: "The human visual cortex can extract complex semantic and spatial features within 150 milliseconds of stimulus onset.",
    citation: {
      source: "Nature",
      year: 1996,
      reference: "Thorpe, S., Fize, D., & Marlot, C. (1996)",
      doi: "10.1038/381520a0"
    },
    evidenceType: "established",
    domain: "Visual Processing"
  },
  {
    id: "hardware-latency-measurement",
    statement: "Display refresh intervals, OS compositors, and USB polling rates introduce deterministic delays that must be calibrated in browser-based timing.",
    citation: {
      source: "Behavior Research Methods",
      year: 2014,
      reference: "Plant, R. R. (2014)",
      doi: "10.3758/s13428-013-0433-2"
    },
    evidenceType: "established",
    domain: "Hardware Calibration"
  },
  {
    id: "hydration-attention",
    statement: "Mild dehydration (~1–2% body mass loss) is associated with self-reported fatigue and degraded performance on vigilance and visual tasks.",
    citation: {
      source: "Journal of Nutrition",
      year: 2012,
      reference: "Armstrong, L. E., et al. (2012)",
      doi: "10.3945/jn.111.142000"
    },
    evidenceType: "association",
    domain: "Physiological State"
  },
  {
    id: "circadian-psychomotor",
    statement: "Reaction time follows a circadian pattern in healthy adults, with peak performance typically coinciding with core body temperature peaks in the late afternoon.",
    citation: {
      source: "Chronobiology International",
      year: 2008,
      reference: "Valdez, P., et al. (2008)",
      doi: "10.1080/07420520802107031"
    },
    evidenceType: "association",
    domain: "Circadian Rhythm"
  },
  {
    id: "practice-familiarity-effects",
    statement: "Longitudinal performance gains on repetitive benchmark tasks largely reflect task familiarity, stimulus anticipation, and motor sequence learning rather than altered innate cognitive capacity.",
    citation: {
      source: "Neurobiology of Learning and Memory",
      year: 2018,
      reference: "Kelly, C., & Garavan, H. (2018)",
      doi: "10.1016/j.nlm.2018.02.012"
    },
    evidenceType: "interpretation",
    domain: "Learning & Practice"
  },
  {
    id: "age-cohort-variance",
    statement: "Cross-sectional response latencies show gradual lengthening across adulthood, primarily driven by sensory processing and motor execution intervals rather than simple nerve conduction.",
    citation: {
      source: "Psychology and Aging",
      year: 2006,
      reference: "Der, G., & Deary, I. J. (2006)",
      doi: "10.1037/0882-7974.21.1.62"
    },
    evidenceType: "association",
    domain: "Chronological Benchmarks"
  },
  {
    id: "speed-accuracy-tradeoff",
    statement: "Instructional emphasis on response speed systematically increases error rates, illustrating the classic speed-accuracy tradeoff governed by decision threshold adjustment.",
    citation: {
      source: "Trends in Cognitive Sciences",
      year: 2010,
      reference: "Bogacz, R., et al. (2010)",
      doi: "10.1016/j.tics.2010.01.002"
    },
    evidenceType: "established",
    domain: "Decision Strategy"
  },
  {
    id: "aerobic-exercise-cognition",
    statement: "Regular aerobic exercise is positively associated with executive function and steady response latencies, likely mediated by neurotrophic factor regulation and cerebral blood flow.",
    citation: {
      source: "British Journal of Sports Medicine",
      year: 2018,
      reference: "Northey, J. M., et al. (2018)",
      doi: "10.1136/bjsports-2016-096587"
    },
    evidenceType: "association",
    domain: "Physical Activity"
  },
  {
    id: "auditory-vs-visual",
    statement: "Auditory reaction times are consistently faster than visual reaction times across populations due to shorter mechanical and synaptic transmission times in the acoustic pathway.",
    citation: {
      source: "Frontiers in Human Neuroscience",
      year: 2015,
      reference: "Woods, D. L., et al. (2015)",
      doi: "10.3389/fnhum.2015.00131"
    },
    evidenceType: "established",
    domain: "Sensory Modality"
  },
  {
    id: "foreperiod-anticipation",
    statement: "Uncertainty in foreperiod duration prevents premature motor preparation, isolating true reactive stimulus detection from anticipatory guessing.",
    citation: {
      source: "Psychological Research",
      year: 2007,
      reference: "Vallesi, A., et al. (2007)",
      doi: "10.1007/s00426-006-0043-y"
    },
    evidenceType: "established",
    domain: "Temporal Preparation"
  }
];

export const PREPARATION_HABITS: PreparationHabit[] = [
  {
    id: "sleep",
    title: "Sleep 7–9 hours",
    desc: "Adequate rest supports sustained psychomotor vigilance and reduces intra-session latency variance.",
    category: "sleep"
  },
  {
    id: "hydration",
    title: "Stay hydrated",
    desc: "Adequate fluid intake helps prevent mild dehydration and associated subjective fatigue.",
    category: "hydration"
  },
  {
    id: "exercise",
    title: "Regular physical exercise",
    desc: "Consistent aerobic activity supports steady cardiovascular circulation and general neural health.",
    category: "physical"
  },
  {
    id: "nutrition",
    title: "Maintain balanced nutrition",
    desc: "Avoiding extreme glycemic fluctuations helps sustain consistent attentional focus during testing.",
    category: "physical"
  },
  {
    id: "screen-breaks",
    title: "Take structured screen breaks",
    desc: "Periodic pauses from continuous display focus alleviate oculomotor strain and visual fatigue.",
    category: "environment"
  },
  {
    id: "ergonomics",
    title: "Maintain stable posture",
    desc: "Comfortable, ergonomic seating and arm positioning reduce muscular tension and motor input variance.",
    category: "environment"
  },
  {
    id: "distractions",
    title: "Minimize sensory distractions",
    desc: "A quiet testing setting prevents involuntary exogenous attention capture during reaction trials.",
    category: "environment"
  },
  {
    id: "consistency",
    title: "Test at consistent times",
    desc: "Assessing at comparable circadian windows improves week-to-week baseline comparability.",
    category: "protocol"
  },
  {
    id: "task-familiarity",
    title: "Complete warm-up trials",
    desc: "Familiarizing yourself with button layout and task instructions avoids procedural errors.",
    category: "protocol"
  },
  {
    id: "rest-between",
    title: "Rest between test blocks",
    desc: "Short 30–60 second pauses prevent finger fatigue and attentional decay across repeated assessments.",
    category: "protocol"
  }
];

export const PHYSIOLOGICAL_FACTORS: PhysiologicalFactor[] = [
  {
    id: "sleep-deprivation",
    title: "Sleep Deprivation",
    desc: "Inadequate rest is statistically associated with degraded cognitive processing and higher reaction latency.",
    evidenceType: "established",
    impact: "associated_increase",
    reduces: true,
    iconName: "Moon"
  },
  {
    id: "hydration-level",
    title: "Hydration Status",
    desc: "Mild fluid deficit is associated with reduced vigilance and subjective focus during continuous tasks.",
    evidenceType: "association",
    impact: "supports_consistency",
    reduces: false,
    iconName: "Droplet"
  },
  {
    id: "acute-stress",
    title: "Acute Stress",
    desc: "Elevated acute stress introduces variability in motor initiation and decision boundary consistency.",
    evidenceType: "association",
    impact: "associated_increase",
    reduces: true,
    iconName: "Activity"
  },
  {
    id: "age-cohort",
    title: "Age Cohort Variance",
    desc: "Response latency typically demonstrates gradual differences across age cohorts, reflecting sensory and motor changes.",
    evidenceType: "association",
    impact: "associated_increase",
    reduces: true,
    iconName: "User"
  },
  {
    id: "targeted-practice",
    title: "Task Familiarity",
    desc: "Familiarity with visual cues reduces cognitive load and response uncertainty through learned stimulus associations.",
    evidenceType: "established",
    impact: "supports_consistency",
    reduces: false,
    iconName: "Target"
  },
  {
    id: "aerobic-exercise",
    title: "Aerobic Exercise",
    desc: "Regular aerobic activity supports cerebral blood flow and cardiovascular stability, correlating with lower latency drift.",
    evidenceType: "association",
    impact: "supports_consistency",
    reduces: false,
    iconName: "Dumbbell"
  },
  {
    id: "balanced-nutrition",
    title: "Nutritional Balance",
    desc: "Stable energy availability supports consistent attentional stamina and prevents acute focus dips.",
    evidenceType: "practical_protocol",
    impact: "supports_consistency",
    reduces: false,
    iconName: "Apple"
  },
  {
    id: "mental-fatigue",
    title: "Extended Mental Workload",
    desc: "Prolonged high-demand cognitive tasks increase error rates and lengthen decision deliberation intervals.",
    evidenceType: "established",
    impact: "associated_increase",
    reduces: true,
    iconName: "Brain"
  },
  {
    id: "screen-fatigue",
    title: "Visual & Screen Fatigue",
    desc: "Continuous near-distance visual fixation can induce ocular strain and temporary attentional drift.",
    evidenceType: "practical_protocol",
    impact: "associated_increase",
    reduces: true,
    iconName: "Monitor"
  },
  {
    id: "caffeine-intake",
    title: "Caffeine Intake",
    desc: "Moderate caffeine intake can temporarily support alertness and subjective vigilance, though effects plateau with tolerance.",
    evidenceType: "association",
    impact: "supports_consistency",
    reduces: false,
    iconName: "Coffee"
  }
];

// Compatibility array of plain string facts
export const REACTION_FACTS: string[] = RESEARCH_LEDGER_ENTRIES.map(e => e.statement);

export function getRandomizedFacts(): string[] {
  const array = [...REACTION_FACTS];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function getRandomizedResearchEntries(): ResearchEntry[] {
  const array = [...RESEARCH_LEDGER_ENTRIES];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function loadPersistedChecklist(): Set<number> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return new Set<number>();
  }
  try {
    const stored = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!stored) return new Set<number>();
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      const validIndices = parsed.filter((x): x is number => typeof x === 'number' && x >= 0 && x < PREPARATION_HABITS.length);
      return new Set(validIndices);
    }
  } catch {
    // Malformed JSON fallback
  }
  return new Set<number>();
}

export function savePersistedChecklist(checked: Set<number>): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const array = Array.from(checked);
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(array));
  } catch {
    // Ignore storage write issues
  }
}

export function clearPersistedChecklist(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(CHECKLIST_STORAGE_KEY);
  } catch {}
}
