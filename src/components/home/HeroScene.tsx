import React from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowRight, Activity, ShieldCheck, Cpu } from 'lucide-react';
import { ProvenanceBadge } from '../brand/ProvenanceBadge';
import { APP_VERSION } from '../../lib/version';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export interface HeroSceneProps {
  onExploreAssessments?: () => void;
  onExploreProof?: () => void;
}

export function HeroScene({ onExploreAssessments, onExploreProof }: HeroSceneProps) {
  const shouldReduceMotion = useReducedMotionPreference();

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
      });
      window.history.pushState(null, '', `#${targetId}`);
    }
  };

  return (
    <section 
      id="hero" 
      className="relative w-full min-h-[calc(100vh-80px)] flex flex-col justify-center py-12 lg:py-16 scroll-mt-24"
      aria-label="Hero Introduction"
    >
      {/* Background Reticle Grid & Technical HUD Frame */}
      <div 
        className="absolute inset-0 pointer-events-none select-none overflow-hidden" 
        aria-hidden="true"
      >
        {/* Subtle Crosshair Reticle Markers */}
        <div className="absolute top-8 left-0 right-0 flex justify-between text-[10px] font-mono text-[#475569] tracking-widest px-4 border-b border-white/5 pb-2">
          <span>SYS_CLOCK: 1000Hz_CALIBRATED</span>
          <span className="hidden md:inline">REFRESH_SYNC: AUTO_DETECT</span>
          <span>LATENCY_ISOLATION: ACTIVE</span>
        </div>
        <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-[#00F0FF]/5 blur-3xl" />
        <div className="absolute top-1/2 -right-12 w-80 h-80 rounded-full bg-[#3B82F6]/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl">
        {/* Provenance Badge */}
        <motion.div 
          className="mb-6 inline-block"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <ProvenanceBadge />
        </motion.div>

        {/* Main Display Headline */}
        <motion.h1 
          className="font-heading text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.04] mb-6 text-[#F8FAFC] text-balance"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.08 }}
        >
          PRECISION COGNITIVE BENCHMARKING.<br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F8FAFC] via-[#CBD5E1] to-[#94A3B8]">
            MILLISECOND LATENCY.
          </span><br className="hidden lg:block" />
          STANDARDIZED TELEMETRY.
        </motion.h1>

        {/* Technical Subtitle */}
        <motion.p 
          className="text-[#8A94A6] text-sm sm:text-base font-mono uppercase tracking-wider mb-4"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.16 }}
        >
          PULSE {APP_VERSION} // RESEARCH-GRADE NEURAL TELEMETRY
        </motion.p>

        {/* Human Narrative Description */}
        <motion.p 
          className="text-[#94A3B8] text-base sm:text-lg max-w-3xl leading-relaxed mb-10 text-pretty"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.2 }}
        >
          An open-source cognitive measurement instrument quantifying visual reaction latency, 
          directional choice discrimination, and spatial working memory with sub-millisecond hardware 
          clock fidelity directly inside the browser.
        </motion.p>

        {/* Action Controls */}
        <motion.div 
          className="flex flex-wrap items-center gap-4 mb-14"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.26 }}
        >
          {/* Primary CTA: leads to homepage assessment discovery experience */}
          <a
            href="#assessments"
            onClick={(e) => {
              handleScrollTo(e, 'assessments');
              onExploreAssessments?.();
            }}
            className="group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#00F0FF] text-black font-semibold text-sm hover:bg-[#38bdf8] active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(0,240,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A]"
          >
            <span>Explore Assessments</span>
            <ArrowDown size={16} className="transition-transform group-hover:translate-y-0.5" />
          </a>

          {/* Secondary CTA: leads to proof / methodology */}
          <a
            href="#proof"
            onClick={(e) => {
              handleScrollTo(e, 'proof');
              onExploreProof?.();
            }}
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#F8FAFC] font-medium text-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            <span>Measurement Methodology</span>
            <ArrowRight size={15} className="text-[#8A94A6]" />
          </a>
        </motion.div>

        {/* Telemetry Instrument Baseline Pillars */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-white/5 max-w-4xl"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.32 }}
        >
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <Cpu size={18} className="text-[#00F0FF] mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F8FAFC] mb-1">
                Sub-ms Clocks
              </div>
              <p className="text-xs text-[#8A94A6] leading-relaxed">
                <code className="text-[#CBD5E1] font-mono">performance.now()</code> hardware timer timestamps bypassing JS event loop delay.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <Activity size={18} className="text-[#38BDF8] mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F8FAFC] mb-1">
                Display Sync
              </div>
              <p className="text-xs text-[#8A94A6] leading-relaxed">
                Synchronized to display refresh frames via <code className="text-[#CBD5E1] font-mono">requestAnimationFrame</code> delta tracking.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <ShieldCheck size={18} className="text-[#2DD4BF] mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F8FAFC] mb-1">
                Client Isolation
              </div>
              <p className="text-xs text-[#8A94A6] leading-relaxed">
                Zero network round-trip overhead. Pure local client execution and transparent open dataset.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
