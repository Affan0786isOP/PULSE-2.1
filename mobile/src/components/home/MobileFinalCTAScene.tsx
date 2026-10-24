import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight, Compass } from 'lucide-react';
import { getAssessmentLaunchRoute } from '@shared/registries/routeRegistry';
import { triggerHaptic, useReducedMotionPreference } from '../../lib/settingsStore';

interface MobileFinalCTASceneProps {
  onNavigate?: (tab: string) => void;
}

export function MobileFinalCTAScene({ onNavigate }: MobileFinalCTASceneProps) {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotionPreference();
  const primaryLaunchRoute = getAssessmentLaunchRoute('visual-reaction');

  const handleStartPrimary = () => {
    triggerHaptic();
    navigate(primaryLaunchRoute);
  };

  const handleExploreAll = () => {
    triggerHaptic();
    if (onNavigate) {
      onNavigate('assessments');
    } else {
      navigate('/assessments');
    }
  };

  return (
    <section 
      id="cta" 
      className="w-full py-8 mb-8 border-t border-[var(--border-subtle)] text-center scroll-mt-20"
      aria-label="Launch Assessment Call to Action"
    >
      <motion.div 
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--accent)] uppercase tracking-wider mb-3 font-bold"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span>[ INITIATE // RUN ]</span>
      </motion.div>

      <motion.h2 
        className="font-heading text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.05 }}
      >
        Ready to see how you perform?
      </motion.h2>

      <motion.p 
        className="text-[var(--text-secondary)] text-xs leading-relaxed max-w-xs mx-auto mb-6"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.1 }}
      >
        Begin with the visual reaction latency protocol or browse the full catalog of five cognitive instruments.
      </motion.p>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleStartPrimary}
          className="w-full py-3.5 px-5 rounded-xl bg-[var(--accent)] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer"
        >
          <Play size={15} fill="currentColor" />
          <span>Start an assessment</span>
        </button>

        <button
          type="button"
          onClick={handleExploreAll}
          className="w-full py-3 px-5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer shadow-sm"
        >
          <Compass size={15} />
          <span>Explore all assessments</span>
          <ArrowRight size={13} className="text-[var(--text-secondary)]" />
        </button>
      </div>
    </section>
  );
}
