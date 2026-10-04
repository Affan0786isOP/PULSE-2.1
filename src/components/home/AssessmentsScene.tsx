import React from 'react';
import { motion } from 'motion/react';
import { AssessmentHero3D } from '../ui/AssessmentHero3D';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export function AssessmentsScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section 
      id="assessments" 
      className="relative w-full py-16 lg:py-24 border-t border-white/5 scroll-mt-24 flex flex-col"
      aria-label="Cognitive Assessments Discovery Suite"
    >
      <div className="max-w-5xl mb-8">
        <motion.div 
          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-[11px] font-mono text-[#00F0FF] uppercase tracking-wider mb-4"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span>[ SUITE // CANONICAL PROTOCOLS ]</span>
        </motion.div>

        <motion.h2 
          className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F8FAFC] mb-4 text-balance"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.06 }}
        >
          Standardized Cognitive Assessments
        </motion.h2>

        <motion.p 
          className="text-[#94A3B8] text-base sm:text-lg max-w-3xl leading-relaxed text-pretty"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.12 }}
        >
          Five behavioral instruments evaluating visual reaction latency, directional choice discrimination, 
          semantic conflict, and visuospatial working memory. Select any protocol to review metrics and begin evaluation.
        </motion.p>
      </div>

      <div className="w-full flex-1 flex flex-col min-h-[480px]">
        <AssessmentHero3D />
      </div>
    </section>
  );
}
