import React from 'react';
import {
  DatasetObservation,
  AssessmentId,
  DatasetMode
} from '../../lib/dataset/types';
import { Table } from 'lucide-react';

import { VisualReactionDashboard } from './visualizations/VisualReactionDashboard';
import { DirectionDashboard } from './visualizations/DirectionDashboard';
import { ColourRecognitionDashboard } from './visualizations/ColourRecognitionDashboard';
import { BlockMemoryDashboard } from './visualizations/BlockMemoryDashboard';
import { NumberMemoryDashboard } from './visualizations/NumberMemoryDashboard';
import { DataExplorer } from './DataExplorer';

interface DatasetContentSlotProps {
  activeAssessment: AssessmentId;
  datasetMode: DatasetMode;
  sectionObservations: DatasetObservation[];
}

export function DatasetContentSlot({
  activeAssessment,
  datasetMode,
  sectionObservations
}: DatasetContentSlotProps) {
  return (
    <div className="w-full flex-1 flex flex-col">
      {/* Header only for Data Explorer mode */}
      {datasetMode === 'data-explorer' && (
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-[var(--border-subtle)] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--cyan-primary)] shrink-0">
              <Table size={16} />
            </div>
            <div>
              <h2 className="font-heading font-black text-base text-[var(--text-main)] tracking-wide uppercase">
                Data Explorer
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-muted)]">
              <span className="text-[var(--cyan-primary)] font-bold">{sectionObservations.length.toLocaleString()}</span>
              <span className="ml-1">records</span>
            </div>
          </div>
        </div>
      )}

      {datasetMode === 'data-explorer' ? (
        <div className="flex-1">
          <DataExplorer observations={sectionObservations} />
        </div>
      ) : (
        <div className="flex-1">
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
