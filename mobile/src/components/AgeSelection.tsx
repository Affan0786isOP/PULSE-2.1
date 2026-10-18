import React, { useState } from 'react';
import { VALID_AGE_GROUPS, AgeGroup } from '../lib/firestore';
import { ArrowLeft, User, Check, Sparkles, Compass, Zap, Target, Layers, ShieldCheck, Award, ArrowRight, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { triggerHaptic } from '../lib/settingsStore';
import { AssessmentInfoPanel } from './AssessmentInfoPanel';
import { PulseLogo } from './brand';

const AGE_METADATA: Record<AgeGroup, { label: string; range: string; icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }> }> = {
  'Children (8–12)': { label: 'Children', range: '8–12 yrs', icon: Sparkles },
  'Adolescents (13–17)': { label: 'Adolescents', range: '13–17 yrs', icon: Compass },
  'Young adults (18–25)': { label: 'Young Adults', range: '18–25 yrs', icon: Zap },
  'Adults (26–40)': { label: 'Adults', range: '26–40 yrs', icon: Target },
  'Middle-aged adults (41–60)': { label: 'Middle-Aged Adults', range: '41–60 yrs', icon: Layers },
  'Older adults (61–75)': { label: 'Older Adults', range: '61–75 yrs', icon: ShieldCheck },
  'Seniors (76+)': { label: 'Seniors', range: '76+ yrs', icon: Award }
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

  // Resolve canonical route from route prop or assessmentId
  const canonicalRoute = route || (assessmentId ? (
    assessmentId === 'visual-reaction' ? '/reaction-test' :
    assessmentId === 'direction' ? '/direction-test' :
    assessmentId === 'color-recognition' ? '/colour-recognition' :
    assessmentId === 'block-memory' ? '/block-memory' :
    assessmentId === 'number-memory' ? '/number-memory' : undefined
  ) : undefined);

  const handleSelect = (age: AgeGroup) => {
    triggerHaptic('tap');
    setSelectedAge(age);
  };

  const handleCancel = () => {
    triggerHaptic('tap');
    onCancel();
  };

  const handleContinue = () => {
    if (selectedAge) {
      triggerHaptic('tap');
      onSelect(selectedAge);
    }
  };

  return (
    <div 
      className="h-[100dvh] max-h-[100dvh] w-full bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD] text-[#090D1A] flex flex-col justify-between overflow-hidden p-3 p-safe selection:bg-[#0066FF]/20"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))'
      }}
    >
      {/* Top Header */}
      <div className="w-full flex items-center justify-between shrink-0 mb-1.5">
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            id="back-to-assessments-btn"
            onClick={handleCancel}
            aria-label="Go Back"
            title="Go Back"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200/90 text-slate-700 hover:text-[#090D1A] hover:bg-slate-50 shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
          >
            <ArrowLeft size={16} strokeWidth={2.2} />
          </button>

          <button 
            type="button" 
            id="age-selection-logo-btn"
            onClick={handleCancel}
            className="flex items-center cursor-pointer p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] rounded-lg"
            title="PULSE Home"
            aria-label="PULSE Home"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0066FF]">
              <PulseLogo variant="mark" size={16} color="#0066FF" />
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canonicalRoute && (
            <button
              type="button"
              onClick={() => setIsInfoOpen(true)}
              aria-label="About this assessment and methodology"
              aria-expanded={isInfoOpen}
              aria-controls="assessment-info-panel"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200/90 text-[#0066FF] hover:bg-slate-50 shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
              title="Assessment methodology & details"
            >
              <Info size={16} strokeWidth={2.2} />
            </button>
          )}
          <span className="font-mono text-[10px] font-bold tracking-wider text-slate-600 uppercase bg-white border border-slate-200/90 px-2.5 py-1 rounded-md shadow-2xs">
            Demographic Baseline
          </span>
        </div>
      </div>

      {/* Main Content Panel (No Scroll, 48px touch targets) */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center my-auto min-h-0 bg-white border border-slate-200/80 rounded-3xl p-4 shadow-[0_4px_24px_rgba(0,102,255,0.04)]"
      >
        {/* Header Titles */}
        <div className="text-center mb-3 shrink-0">
          <div className="w-9 h-9 mx-auto rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0066FF] mb-2 shadow-2xs">
            <User size={16} strokeWidth={2.2} />
          </div>
          <h2 className="font-heading text-base font-bold tracking-tight text-[#090D1A]">
            Select your age group
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
            PULSE compares your performance to others in your age group.
          </p>
        </div>

        {/* List of Age Options */}
        <div 
          role="radiogroup" 
          aria-label="Select your age cohort" 
          className="grid grid-cols-1 gap-1.5 mb-3.5 shrink-0"
        >
          {VALID_AGE_GROUPS.map((age, i) => {
            const isSelected = selectedAge === age;
            const meta = AGE_METADATA[age] || { label: age, range: '', icon: User };
            const IconComponent = meta.icon;

            return (
              <motion.button
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${meta.label} (${meta.range})`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                whileTap={{ scale: 0.98 }}
                key={age}
                id={`age-option-${age.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => handleSelect(age)}
                className={`w-full min-h-[46px] text-left px-3 py-2 rounded-xl border text-xs font-mono transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
                  isSelected 
                    ? 'bg-sky-50/70 border-[#0066FF] text-[#090D1A] shadow-xs' 
                    : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                    isSelected
                      ? 'bg-[#0066FF] text-white border-[#0066FF]'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    <IconComponent size={14} strokeWidth={2.2} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-xs truncate text-[#090D1A]">
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-[#64748B]">
                      {meta.range}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-[#0066FF] flex items-center justify-center text-white">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Continue Action Button */}
        <button
          type="button"
          id="continue-assessment-btn"
          onClick={handleContinue}
          disabled={!selectedAge}
          className={`w-full min-h-[44px] h-11 px-4 rounded-full font-sans font-bold text-xs tracking-wider uppercase inline-flex items-center justify-center gap-2 transition-all shrink-0 ${
            selectedAge 
              ? 'bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:from-[#005FE6] hover:to-[#0047B3] text-white cursor-pointer shadow-[0_4px_16px_rgba(0,102,255,0.3)] active:scale-[0.98]' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60 border border-slate-200'
          }`}
        >
          <span>Continue to Test</span>
          <ArrowRight size={14} />
        </button>
      </motion.div>

      {/* Bottom subtle note */}
      <div className="text-center py-1 shrink-0">
        <p className="font-mono text-[10.5px] text-[#64748B]">De-identified research baseline • PULSE</p>
      </div>

      {canonicalRoute && (
        <AssessmentInfoPanel
          route={canonicalRoute}
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
        />
      )}
    </div>
  );
}
