import React, { useMemo } from 'react';
import {
  DatasetObservation,
  ProtocolType,
  AssessmentId,
  DatasetMode
} from '../../lib/dataset/types';
import {
  Zap,
  Compass,
  Palette,
  Grid,
  Hash,
  Table,
  CheckCircle2,
  Info
} from 'lucide-react';

import { VisualReactionDashboard } from './visualizations/VisualReactionDashboard';
import { DirectionDashboard } from './visualizations/DirectionDashboard';
import { ColourRecognitionDashboard } from './visualizations/ColourRecognitionDashboard';
import { BlockMemoryDashboard } from './visualizations/BlockMemoryDashboard';
import { NumberMemoryDashboard } from './visualizations/NumberMemoryDashboard';

interface DatasetContentSlotProps {
  activeAssessment: AssessmentId;
  datasetMode: DatasetMode;
  sectionObservations: DatasetObservation[];
}

interface SectionMeta {
  title: string;
  subtitle: string;
  protocolKey?: ProtocolType;
  icon: React.ElementType;
  plannedVisualizations: string[];
}

const SECTION_METADATA: Record<AssessmentId | 'data-explorer', SectionMeta> = {
  'visual-reaction': {
    title: 'VISUAL REACTION PROTOCOL (SRT)',
    subtitle: 'Simple reaction latency telemetry, parametric percentile distributions, skewness analysis, and foreperiod preparatory delay effects (100 ms to 3,000 ms).',
    protocolKey: 'visual-reaction',
    icon: Zap,
    plannedVisualizations: [
      'RT distribution',
      'Short vs Long foreperiod',
      'false-start rate',
      'percentile distribution',
      'age/cohort comparison'
    ]
  },
  'direction': {
    title: 'DIRECTION REFLEX PROTOCOL (CRT)',
    subtitle: 'Choice reaction latency across spatial visual stimuli, directional congruency, decision latency overhead, and directional bias evaluation.',
    protocolKey: 'direction',
    icon: Compass,
    plannedVisualizations: [
      '4-direction accuracy',
      'RT distribution',
      'directional latency comparison',
      'accuracy/RT relationship'
    ]
  },
  'colour-recognition': {
    title: 'COLOUR RECOGNITION (STROOP EFFECT)',
    subtitle: 'Cognitive interference evaluation, congruent vs incongruent trial response latencies, inhibitory control capacity, and semantic interference costs.',
    protocolKey: 'colour-recognition',
    icon: Palette,
    plannedVisualizations: [
      'congruent vs incongruent',
      'Stroop/interference cost',
      'accuracy',
      'latency distribution'
    ]
  },
  'block-memory': {
    title: 'BLOCK MEMORY PROTOCOL (CORSI SPAN)',
    subtitle: 'Spatial working memory capacity, Corsi block span progression curves, sequential recall accuracy, and memory degradation inflection points.',
    protocolKey: 'block-memory',
    icon: Grid,
    plannedVisualizations: [
      'span distribution',
      'level progression',
      'recall accuracy by level',
      'memory capacity'
    ]
  },
  'number-memory': {
    title: 'NUMBER MEMORY PROTOCOL (DIGIT SPAN)',
    subtitle: 'Verbal/symbolic working memory capacity, digit span recall distributions, chunking thresholds, and memory limit inflection analysis.',
    protocolKey: 'number-memory',
    icon: Hash,
    plannedVisualizations: [
      'digit-span distribution',
      'recall success by digit length',
      'progression',
      'memory capacity'
    ]
  },
  'data-explorer': {
    title: 'RAW OBSERVATION TELEMETRY EXPLORER',
    subtitle: 'Multidimensional observation query engine, trial-level telemetry inspector, filterable observation records, and schema-compliant research data extraction.',
    icon: Table,
    plannedVisualizations: [
      'Filterable Telemetry Observation Log & Inspector',
      'Trial-Level Timing Breakdown',
      'Multivariate Cross-Filtering Data Matrix',
      'Normalized Research Observation Schema Validator'
    ]
  }
};

export function DatasetContentSlot({
  activeAssessment,
  datasetMode,
  sectionObservations
}: DatasetContentSlotProps) {
  const activeKey = datasetMode === 'data-explorer' ? 'data-explorer' : activeAssessment;
  const meta = SECTION_METADATA[activeKey];
  const SectionIcon = meta.icon;

  const validCount = useMemo(() => {
    return sectionObservations.filter(o => o.isValid).length;
  }, [sectionObservations]);

  const validPercent = sectionObservations.length > 0
    ? Math.round((validCount / sectionObservations.length) * 100)
    : 0;

  const uniqueSessions = useMemo(() => {
    return new Set(sectionObservations.map(o => o.sessionId)).size;
  }, [sectionObservations]);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 sm:p-6 backdrop-blur-xl flex-1 flex flex-col">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)] mb-6">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--cyan-primary)] shrink-0 mt-0.5">
            <SectionIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-heading font-black text-lg sm:text-xl text-[var(--text-main)] tracking-wide uppercase">
                {meta.title}
              </h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* Telemetry pill */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-muted)]">
            <span className="text-[var(--cyan-primary)] font-bold">{sectionObservations.length.toLocaleString()}</span>
            <span className="ml-1">matching obs</span>
          </div>
        </div>
      </div>

      {/* Observational Metrics Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 font-mono text-xs">
        <div className="p-3 rounded-xl bg-[var(--bg-panel)]/60 border border-[var(--border-subtle)]">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Observations In Slice</div>
          <div className="text-base font-bold text-[var(--text-main)] tabular-nums">
            {sectionObservations.length.toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-panel)]/60 border border-[var(--border-subtle)]">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Valid Trial Ratio</div>
          <div className="text-base font-bold text-[var(--cyan-primary)] tabular-nums">
            {validPercent}% <span className="text-[10px] font-normal text-[var(--text-muted)]">({validCount.toLocaleString()} trials)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-panel)]/60 border border-[var(--border-subtle)]">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Participant Sessions</div>
          <div className="text-base font-bold text-[var(--text-main)] tabular-nums">
            {uniqueSessions.toLocaleString()}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-panel)]/60 border border-[var(--border-subtle)]">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Target Protocol</div>
          <div className="text-base font-bold text-[var(--text-main)] truncate uppercase">
            {meta.protocolKey ? meta.protocolKey.replace('-', ' ') : 'Multiple'}
          </div>
        </div>
      </div>

      {datasetMode === 'data-explorer' ? (
        <div className="flex-1 min-h-[300px] bg-[var(--bg-panel)]/30 border border-dashed border-[var(--border-subtle)] rounded-xl flex flex-col items-center justify-center p-6 text-center mb-6">
          <Info size={32} className="text-[var(--text-muted)] mb-4" />
          <h3 className="font-bold text-[var(--text-secondary)] mb-2">Data Explorer In Development</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm">
            The raw tabular data view is currently under development. This space will host the fully paginated, exportable raw telemetry viewer.
          </p>
        </div>
      ) : (
        <div className="flex-1 pb-6">
          {activeAssessment === 'visual-reaction' && <VisualReactionDashboard observations={sectionObservations} />}
          {activeAssessment === 'direction' && <DirectionDashboard observations={sectionObservations} />}
          {activeAssessment === 'colour-recognition' && <ColourRecognitionDashboard observations={sectionObservations} />}
          {activeAssessment === 'block-memory' && <BlockMemoryDashboard observations={sectionObservations} />}
          {activeAssessment === 'number-memory' && <NumberMemoryDashboard observations={sectionObservations} />}
        </div>
      )}
    </div>
  );
}
