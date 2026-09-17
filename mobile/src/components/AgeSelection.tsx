import React, { useState } from 'react';
import { VALID_AGE_GROUPS, AgeGroup } from '../lib/firestore';
import { ArrowLeft, User, Check, Activity, Sparkles, Compass, Zap, Target, Layers, ShieldCheck, Award, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { triggerHaptic } from '../lib/settingsStore';

const AGE_METADATA: Record<AgeGroup, { label: string; range: string; icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }> }> = {
  'Children (8–12)': { label: 'Children', range: '8–12 yrs', icon: Sparkles },
  'Adolescents (13–17)': { label: 'Adolescents', range: '13–17 yrs', icon: Compass },
  'Young adults (18–25)': { label: 'Young Adults', range: '18–25 yrs', icon: Zap },
  'Adults (26–40)': { label: 'Adults', range: '26–40 yrs', icon: Target },
  'Middle-aged adults (41–60)': { label: 'Middle-Aged Adults', range: '41–60 yrs', icon: Layers },
  'Older adults (61–75)': { label: 'Older Adults', range: '61–75 yrs', icon: ShieldCheck },
  'Seniors (76+)': { label: 'Seniors', range: '76+ yrs', icon: Award }
};

export function AgeSelection({ onSelect, onCancel }: { onSelect: (age: AgeGroup) => void; onCancel: () => void }) {
  const [selectedAge, setSelectedAge] = useState<AgeGroup | null>(null);

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
      className="h-[100dvh] max-h-[100dvh] w-full bg-transparent text-[var(--text-primary)] flex flex-col justify-between overflow-hidden p-3 select-none p-safe"
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
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>

          <button 
            type="button"
            id="age-selection-logo-btn"
            onClick={handleCancel}
            className="flex items-center cursor-pointer p-0.5"
            title="PULSE Home"
            aria-label="PULSE Home"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
              <Activity size={16} />
            </div>
          </button>
        </div>

        <span className="font-mono text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase bg-[var(--surface-1)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-md">
          Demographic Baseline
        </span>
      </div>

      {/* Main Content Panel (No Scroll, 48px touch targets) */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center my-auto min-h-0 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl p-4 shadow-sm"
      >
        {/* Header Titles */}
        <div className="text-center mb-3 shrink-0">
          <div className="w-9 h-9 mx-auto rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] mb-2">
            <User size={16} />
          </div>
          <h2 className="font-mono text-sm font-bold tracking-tight uppercase text-[var(--text-primary)]">
            Select Age Cohort
          </h2>
          <p className="font-mono text-[var(--text-muted)] text-[11px] mt-0.5">
            Calibrates normative baselines &amp; research data
          </p>
          <p className="font-mono text-[10px] text-[var(--text-muted)] mt-1 opacity-80 max-w-xs mx-auto leading-tight">
            Age is used for data collection and scientific analysis in the dataset and will not affect the difficulty of the games.
          </p>
        </div>

        {/* List of Age Options */}
        <div className="grid grid-cols-1 gap-1.5 mb-3.5 shrink-0">
          {VALID_AGE_GROUPS.map((age, i) => {
            const isSelected = selectedAge === age;
            const meta = AGE_METADATA[age] || { label: age, range: '', icon: User };
            const IconComponent = meta.icon;

            return (
              <motion.button
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                whileTap={{ scale: 0.98 }}
                key={age}
                id={`age-option-${age.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => handleSelect(age)}
                className={`w-full min-h-[48px] text-left px-3 py-2 rounded-xl border text-xs font-mono transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected 
                    ? 'bg-[var(--surface-2)] border-[var(--accent)] text-[var(--text-primary)] shadow-sm' 
                    : 'bg-[var(--surface-1)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent)] text-slate-950 border-[var(--accent)]'
                      : 'bg-[var(--surface-2)] text-[var(--accent)] border-[var(--border-subtle)]'
                  }`}>
                    <IconComponent size={14} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-xs truncate text-[var(--text-primary)]">
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
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
        <button
          type="button"
          id="continue-assessment-btn"
          onClick={handleContinue}
          disabled={!selectedAge}
          className={`w-full min-h-[44px] h-11 px-4 rounded-xl font-mono font-bold text-xs tracking-wider uppercase inline-flex items-center justify-center gap-2 transition-all shrink-0 ${
            selectedAge 
              ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-slate-950 cursor-pointer shadow-sm active:scale-[0.99]' 
              : 'bg-[var(--surface-2)] text-[var(--text-muted)] cursor-not-allowed opacity-50 border border-[var(--border-subtle)]'
          }`}
        >
          <span>Continue to Test</span>
          <ArrowRight size={14} />
        </button>
      </motion.div>

      {/* Bottom subtle note */}
      <div className="text-center py-1 shrink-0">
        <p className="font-mono text-[10px] text-[var(--text-muted)]">De-identified research baseline • PULSE</p>
      </div>
    </div>
  );
}
