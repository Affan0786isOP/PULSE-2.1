import React from 'react';
import { MobileAssessmentSwipeStrip } from '../ui/MobileAssessmentSwipeStrip';

interface MobileAssessmentsSceneProps {
  onNavigate?: (view: string) => void;
}

export function MobileAssessmentsScene({ onNavigate }: MobileAssessmentsSceneProps) {
  return (
    <section
      id="assessments"
      aria-label="Available Assessment Batteries"
      className="w-full py-6 border-b border-[var(--border-subtle)]"
    >
      <div className="mb-4">
        <span className="text-[10px] font-mono font-bold text-[var(--accent)] tracking-wider uppercase block mb-1">
          BATTERIES
        </span>
        <h2 className="font-heading text-xl font-extrabold text-[var(--text-primary)] tracking-tight mb-1">
          Explore the Assessments
        </h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Swipe horizontally to inspect protocols for reaction latency, directional choice, colour interference, and memory.
        </p>
      </div>

      <MobileAssessmentSwipeStrip onNavigate={onNavigate} />
    </section>
  );
}
