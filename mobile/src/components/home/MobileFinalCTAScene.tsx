import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../../lib/settingsStore';

interface MobileFinalCTASceneProps {
  onNavigate?: (view: string) => void;
}

export function MobileFinalCTAScene({ onNavigate }: MobileFinalCTASceneProps) {
  const navigate = useNavigate();

  const handleStart = () => {
    triggerHaptic('tap');
    if (onNavigate) {
      onNavigate('/assessments');
    } else {
      navigate('/assessments');
    }
  };

  return (
    <section
      id="final-cta"
      aria-label="Start An Assessment"
      className="w-full py-6 border-b border-[var(--border-subtle)]"
    >
      <div className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-center flex flex-col items-center shadow-sm">
        <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] mb-3 shadow-inner">
          <Sparkles size={18} aria-hidden="true" />
        </div>

        <h2 className="font-heading text-xl font-extrabold text-[var(--text-primary)] mb-1.5 tracking-tight">
          Ready to Test Your Reactions?
        </h2>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-[280px] mb-4">
          Pick any battery to measure reaction time, memory, or focus in seconds. 100% free with no account.
        </p>

        <button
          type="button"
          data-testid="final-cta-btn"
          onClick={handleStart}
          aria-label="Start an assessment"
          className="w-full min-h-[48px] h-[48px] px-6 rounded-xl bg-[var(--accent)] active:opacity-90 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
        >
          <span>Start an assessment</span>
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
