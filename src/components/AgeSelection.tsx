import React, { useState } from 'react';
import { VALID_AGE_GROUPS, AgeGroup } from '../lib/firestore';
import { ArrowLeft, User, Check, Sparkles, Compass, Zap, Target, Layers, ShieldCheck, Award, ArrowRight, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { AssessmentInfoPanel } from './AssessmentInfoPanel';

const AGE_METADATA: Record<AgeGroup, { label: string; range: string; icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }> }> = {
  'Children (8–12)': { label: 'Children', range: '8–12 years', icon: Sparkles },
  'Adolescents (13–17)': { label: 'Adolescents', range: '13–17 years', icon: Compass },
  'Young adults (18–25)': { label: 'Young Adults', range: '18–25 years', icon: Zap },
  'Adults (26–40)': { label: 'Adults', range: '26–40 years', icon: Target },
  'Middle-aged adults (41–60)': { label: 'Middle-Aged Adults', range: '41–60 years', icon: Layers },
  'Older adults (61–75)': { label: 'Older Adults', range: '61–75 years', icon: ShieldCheck },
  'Seniors (76+)': { label: 'Seniors', range: '76+ years', icon: Award }
};

interface AgeSelectionProps {
  onSelect: (age: AgeGroup) => void;
  onCancel: () => void;
  assessmentId?: string;
  route?: string;
}

export function AgeSelection({ onSelect, onCancel, assessmentId, route }: AgeSelectionProps) {
  const [selectedAge, setSelectedAge] = useState<AgeGroup | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const handleSelect = (age: AgeGroup) => {
    setSelectedAge(age);
  };

  // Resolve canonical route from route prop or assessmentId
  const canonicalRoute = route || (assessmentId ? (
    assessmentId === 'visual-reaction' ? '/reaction-test' :
    assessmentId === 'direction' ? '/direction-test' :
    assessmentId === 'color-recognition' ? '/colour-recognition' :
    assessmentId === 'block-memory' ? '/block-memory' :
    assessmentId === 'number-memory' ? '/number-memory' : undefined
  ) : undefined);

  return (
    <div 
      className="h-[100dvh] max-h-[100dvh] w-full bg-transparent text-[var(--text-primary)] flex flex-col justify-between overflow-hidden p-3 sm:p-5 p-safe"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))'
      }}
    >
      {/* Top Navigation Bar */}
      <div className="w-full flex items-center justify-between shrink-0 mb-2">
        <button
          type="button" 
          id="back-to-assessments-btn"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors h-8 px-3 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:bg-[var(--surface-2)] cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <ArrowLeft size={13} />
          <span>Assessments</span>
        </button>

        <div className="flex items-center gap-2">
          {canonicalRoute && (
            <button
              type="button"
              onClick={() => setIsInfoOpen(true)}
              aria-label="About this assessment and methodology"
              aria-expanded={isInfoOpen}
              aria-controls="assessment-info-panel"
              className="inline-flex items-center gap-1 text-xs font-mono text-cyan-400 hover:text-cyan-300 active:scale-[0.98] transition-[color,background-color,transform] h-8 px-2.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:bg-[var(--surface-2)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <Info size={13} />
              <span>Info</span>
            </button>
          )}

          <span className="font-mono text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase bg-[var(--surface-1)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-md">
            Demographic Baseline
          </span>
        </div>
      </div>

      {/* Main Center Panel (Proportionate Desktop Grid) */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md sm:max-w-2xl mx-auto flex-1 flex flex-col justify-center my-auto min-h-0 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-5 sm:p-7 shadow-sm"
      >
        {/* Header Titles */}
        <div className="text-center mb-4 sm:mb-5 shrink-0">
          <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] mb-2.5">
            <User size={18} />
          </div>
          <h2 className="text-lg sm:text-xl font-heading font-semibold text-[var(--text-primary)] tracking-tight">
            Select Your Age Group
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
            Benchmarks normalize accuracy against peer cohorts. Anonymous and non-identifying.
          </p>
        </div>

        {/* Dense Grid Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 w-full mb-4 sm:mb-5 overflow-y-auto max-h-[46vh] sm:max-h-none py-1">
          {VALID_AGE_GROUPS.map((group) => {
            const meta = AGE_METADATA[group];
            const isSelected = selectedAge === group;
            const Icon = meta?.icon || User;

            return (
              <button
                key={group}
                type="button"
                onClick={() => handleSelect(group)}
                className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-xs ring-1 ring-[var(--accent)]'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-2)] hover:border-[var(--border-default)] hover:bg-[var(--surface-3)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                    isSelected ? 'bg-[var(--accent)] text-black' : 'bg-[var(--surface-1)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                  }`}>
                    <Icon size={14} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 truncate">
                    <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                      {meta?.label || group}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--text-muted)]">
                      {meta?.range}
                    </div>
                  </div>
                </div>

                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 transition-all ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-black'
                    : 'border-[var(--border-subtle)] bg-transparent'
                }`}>
                  {isSelected && <Check size={10} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="shrink-0 pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            id="continue-to-assessment-btn"
            disabled={!selectedAge}
            onClick={() => selectedAge && onSelect(selectedAge)}
            className={`w-full py-2.5 px-4 rounded-xl font-heading font-medium text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all ${
              selectedAge
                ? 'bg-[var(--accent)] text-black hover:opacity-90 active:scale-[0.99] cursor-pointer shadow-xs'
                : 'bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed opacity-60'
            }`}
          >
            <span>Proceed to Assessment</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>

      {/* Info Drawer when opened */}
      {canonicalRoute && (
        <AssessmentInfoPanel
          route={canonicalRoute}
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
        />
      )}

      {/* Bottom Micro Context */}
      <div className="text-center shrink-0 mt-2">
        <p className="font-mono text-[10px] text-[var(--text-muted)]">
          Data protocol: Anonymous peer aggregation only
        </p>
      </div>
    </div>
  );
}
