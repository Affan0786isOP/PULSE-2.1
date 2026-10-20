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
      className="w-full flex-1 flex flex-col justify-center items-center overflow-x-hidden p-2 sm:p-4 select-none"
    >
      {/* Top Utility Bar */}
      <div className="w-full max-w-md sm:max-w-2xl flex items-center justify-between shrink-0 mb-3 px-1">
        <button
          type="button" 
          id="back-to-assessments-btn"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-slate-700 hover:text-[#090D1A] transition-colors h-8 px-3 rounded-lg bg-white border border-slate-200/90 hover:bg-slate-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
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
              className="inline-flex items-center gap-1 text-xs font-mono text-slate-700 hover:text-[#090D1A] transition-colors h-8 px-2.5 rounded-lg bg-white border border-slate-200/90 hover:bg-slate-50 cursor-pointer"
            >
              <Info size={13} className="text-[#0066FF]" />
              <span>Info</span>
            </button>
          )}

          <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-500 uppercase bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
            Demographic Baseline
          </span>
        </div>
      </div>

      {/* Main Center Panel (Proportionate Desktop Grid) */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md sm:max-w-2xl mx-auto flex flex-col justify-center bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-sm text-[#090D1A]"
      >
        {/* Header Titles */}
        <div className="text-center mb-4 sm:mb-5 shrink-0">
          <div className="w-10 h-10 mx-auto rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0066FF] mb-2.5">
            <User size={18} />
          </div>
          <h2 className="text-lg sm:text-xl font-heading font-semibold text-[#090D1A] tracking-tight">
            Select Your Age Group
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
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
                className={`group flex items-center justify-between p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
                  isSelected
                    ? 'border-[#0066FF] bg-blue-50/70 shadow-xs ring-1 ring-[#0066FF]'
                    : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                    isSelected ? 'bg-[#0066FF] text-white' : 'bg-white border border-slate-200 text-slate-500 group-hover:text-slate-900'
                  }`}>
                    <Icon size={14} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 truncate">
                    <div className="text-xs font-semibold text-[#090D1A] truncate">
                      {meta?.label || group}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {meta?.range}
                    </div>
                  </div>
                </div>

                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 transition-all ${
                  isSelected
                    ? 'border-[#0066FF] bg-[#0066FF] text-white'
                    : 'border-slate-300 bg-white'
                }`}>
                  {isSelected && <Check size={10} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="shrink-0 pt-3 border-t border-slate-200/80">
          <button
            type="button"
            id="continue-to-assessment-btn"
            disabled={!selectedAge}
            onClick={() => selectedAge && onSelect(selectedAge)}
            className={`w-full py-2.5 px-4 rounded-xl font-heading font-medium text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition-all ${
              selectedAge
                ? 'bg-[#0066FF] hover:bg-[#0052CC] text-white active:scale-[0.99] cursor-pointer shadow-sm'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
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
      <div className="text-center shrink-0 mt-3">
        <p className="font-mono text-[10px] text-slate-500">
          Data protocol: Anonymous peer aggregation only
        </p>
      </div>
    </div>
  );
}
