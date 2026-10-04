import React from 'react';
import { motion } from 'motion/react';
import { MobileAssessmentCarousel } from '../ui/MobileAssessmentCarousel';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export function MobileAssessmentsScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section 
      id="assessments" 
      className="w-full py-8 mb-8 border-t border-white/5 scroll-mt-20"
      aria-label="Mobile Cognitive Assessments Discovery"
    >
      <div className="mb-4">
        <motion.div 
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider mb-2"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span>[ SUITE // PROTOCOLS ]</span>
        </motion.div>

        <motion.h2 
          className="font-heading text-2xl font-bold tracking-tight text-white mb-2"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.05 }}
        >
          Standardized Assessments
        </motion.h2>

        <motion.p 
          className="text-[#8A94A6] text-xs leading-relaxed"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.1 }}
        >
          Five standardized cognitive benchmarks. Swipe cards to inspect protocols and begin evaluation.
        </motion.p>
      </div>

      <div className="w-full">
        <MobileAssessmentCarousel />
      </div>
    </section>
  );
}
