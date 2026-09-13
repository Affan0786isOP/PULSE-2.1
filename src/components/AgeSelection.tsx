import React, { useState } from 'react';
import { VALID_AGE_GROUPS, AgeGroup } from '../lib/firestore';
import { ArrowLeft, User, Check, Sparkles, Compass, Zap, Target, Layers, ShieldCheck, Award, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

const AGE_METADATA: Record<AgeGroup, { label: string; range: string; icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }> }> = {
  'Children (8–12)': { label: 'Children', range: '8–12 years', icon: Sparkles },
  'Adolescents (13–17)': { label: 'Adolescents', range: '13–17 years', icon: Compass },
  'Young adults (18–25)': { label: 'Young Adults', range: '18–25 years', icon: Zap },
  'Adults (26–40)': { label: 'Adults', range: '26–40 years', icon: Target },
  'Middle-aged adults (41–60)': { label: 'Middle-Aged Adults', range: '41–60 years', icon: Layers },
  'Older adults (61–75)': { label: 'Older Adults', range: '61–75 years', icon: ShieldCheck },
  'Seniors (76+)': { label: 'Seniors', range: '76+ years', icon: Award }
};

export function AgeSelection({ onSelect, onCancel }: { onSelect: (age: AgeGroup) => void; onCancel: () => void }) {
  const [selectedAge, setSelectedAge] = useState<AgeGroup | null>(null);

  const handleSelect = (age: AgeGroup) => {
    setSelectedAge(age);
  };

  return (
    <div 
      className="h-[100dvh] max-h-[100dvh] w-full bg-transparent text-[var(--text-primary)] flex flex-col justify-between overflow-hidden p-3 sm:p-5 select-none p-safe"
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
          className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors h-8 px-3 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:bg-[var(--surface-2)] cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Assessments</span>
        </button>

        <span className="font-mono text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase bg-[var(--surface-1)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-md">
          Demographic Baseline
        </span>
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
          <h2 className="font-mono text-sm font-bold tracking-tight uppercase text-[var(--text-primary)]">
            Select Age Cohort
          </h2>
          <p className="font-mono text-[var(--text-muted)] text-xs mt-1">
            Calibrates normative baselines &amp; cognitive research data
          </p>
        </div>

        {/* 2-Column Responsive Grid of Age Cohorts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 mb-5 shrink-0">
          {VALID_AGE_GROUPS.map((age, i) => {
            const isSelected = selectedAge === age;
            const meta = AGE_METADATA[age] || { label: age, range: '', icon: User };
            const IconComponent = meta.icon;
            const isLastOdd = i === VALID_AGE_GROUPS.length - 1;

            return (
              <motion.button
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                whileTap={{ scale: 0.99 }}
                key={age}
                id={`age-option-${age.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => handleSelect(age)}
                className={`w-full text-left p-3 rounded-xl border text-xs font-mono transition-colors duration-150 cursor-pointer flex items-center justify-between gap-3 ${
                  isLastOdd ? 'sm:col-span-2 sm:max-w-[calc(50%-0.3125rem)] sm:mx-auto' : ''
                } ${
                  isSelected 
                    ? 'bg-[var(--surface-2)] border-[var(--accent)] text-[var(--text-primary)]' 
                    : 'bg-[var(--surface-1)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent)] text-slate-950 border-[var(--accent)]'
                      : 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--border-subtle)]'
                  }`}>
                    <IconComponent size={15} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-xs truncate text-[var(--text-primary)]">
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {meta.range}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center text-slate-950">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-[var(--border-subtle)]" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Continue Action Button */}
        <div className="w-full max-w-sm mx-auto shrink-0">
          <button
            type="button"
            id="continue-assessment-btn"
            onClick={() => selectedAge && onSelect(selectedAge)}
            disabled={!selectedAge}
            className={`w-full h-11 px-5 rounded-xl font-mono font-bold text-xs tracking-wider uppercase inline-flex items-center justify-center gap-2 transition-colors active:scale-95 cursor-pointer ${
              selectedAge 
                ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-slate-950' 
                : 'bg-[var(--surface-2)] text-[var(--text-muted)] cursor-not-allowed opacity-50 border border-[var(--border-subtle)]'
            }`}
          >
            <span>Continue to Test</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>

      {/* Bottom subtle baseline note */}
      <div className="text-center py-1 shrink-0">
        <p className="font-mono text-[10px] text-[var(--text-muted)]">De-identified research baseline • PULSE</p>
      </div>
    </div>
  );
}
