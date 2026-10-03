import React from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowRight, Cpu, Activity, Shield } from 'lucide-react';
import { triggerHaptic, useReducedMotionPreference } from '../../lib/settingsStore';

export interface MobileHeroSceneProps {
  onExploreAssessments?: () => void;
  onExploreProof?: () => void;
}

export function MobileHeroScene({ onExploreAssessments, onExploreProof }: MobileHeroSceneProps) {
  const shouldReduceMotion = useReducedMotionPreference();

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      e.preventDefault();
      triggerHaptic();
      target.scrollIntoView({
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
      });
      window.history.pushState(null, '', `#${targetId}`);
    }
  };

  return (
    <section 
      id="hero" 
      className="w-full flex flex-col justify-center py-6 mb-8 scroll-mt-20"
      aria-label="Mobile Hero Section"
    >
      {/* Top Status Badge */}
      <motion.div 
        className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-3 py-1 mb-5 self-start"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span className="text-[10px] font-mono font-medium tracking-wide text-[#8A94A6] uppercase flex items-center gap-2">
          SYSTEM BENCHMARK 
          <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse" /> 
          LOCAL EVALUATOR
        </span>
      </motion.div>

      {/* Main Display Headline */}
      <motion.h1 
        className="font-heading font-bold text-[2.5rem] leading-[1.05] tracking-tight text-white mb-4 text-balance"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.06 }}
      >
        Precision telemetry.<br />
        <span className="text-[#00F0FF]">Local timing</span> insight.
      </motion.h1>

      {/* Narrative Description */}
      <motion.p 
        className="text-[#8A94A6] text-sm leading-relaxed mb-6"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.12 }}
      >
        Cognitive benchmarking evaluating reaction speed, directional choice, 
        and working memory using high-resolution browser timestamps and display cadence estimation.
      </motion.p>

      {/* Action Buttons */}
      <motion.div 
        className="flex flex-col gap-3 mb-8 w-full"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.18 }}
      >
        {/* Primary CTA */}
        <a
          href="#assessments"
          onClick={(e) => {
            handleScrollTo(e, 'assessments');
            onExploreAssessments?.();
          }}
          className="min-h-[44px] w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00F0FF] text-black font-semibold text-sm hover:bg-[#38bdf8] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,240,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
        >
          <span>Explore Assessments</span>
          <ArrowDown size={16} />
        </a>

        {/* Secondary CTA */}
        <a
          href="#proof"
          onClick={(e) => {
            handleScrollTo(e, 'proof');
            onExploreProof?.();
          }}
          className="min-h-[44px] w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
        >
          <span>Measurement Pipeline</span>
          <ArrowRight size={15} className="text-[#8A94A6]" />
        </a>
      </motion.div>

      {/* Lightweight Technical Trust Signals */}
      <motion.div 
        className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5 text-center"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.24 }}
      >
        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col items-center">
          <Cpu size={14} className="text-[#00F0FF] mb-1" />
          <span className="text-[10px] font-mono text-[#F8FAFC] font-semibold">High-Res</span>
          <span className="text-[9px] text-[#8A94A6]">Timestamps</span>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col items-center">
          <Activity size={14} className="text-[#38BDF8] mb-1" />
          <span className="text-[10px] font-mono text-[#F8FAFC] font-semibold">Cadence</span>
          <span className="text-[9px] text-[#8A94A6]">Estimation</span>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col items-center">
          <Shield size={14} className="text-[#2DD4BF] mb-1" />
          <span className="text-[10px] font-mono text-[#F8FAFC] font-semibold">Local Calc</span>
          <span className="text-[9px] text-[#8A94A6]">In-Browser</span>
        </div>
      </motion.div>
    </section>
  );
}
