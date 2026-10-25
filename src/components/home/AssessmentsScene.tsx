import React from 'react';
import { motion } from 'motion/react';
import { DesktopAssessmentCarousel } from '../ui/DesktopAssessmentCarousel';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export function AssessmentsScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section 
      id="assessments" 
      className="relative w-full py-16 lg:py-24 border-t border-slate-200 dark:border-slate-800/80 scroll-mt-24 flex flex-col transition-colors duration-300"
      aria-label="Cognitive Assessments Discovery Suite"
    >
      <div className="max-w-5xl mx-auto w-full mb-6">
        <motion.div 
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-[#12161B] border border-sky-200 dark:border-[#22C7D6]/40 text-[11px] font-mono text-[#0066FF] dark:text-[#22C7D6] uppercase tracking-wider mb-4 shadow-sm"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span>[ 5 QUICK TESTS ]</span>
        </motion.div>

        <motion.h2 
          className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#090D1A] dark:text-white mb-4 text-balance"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.06 }}
        >
          Explore the five tests
        </motion.h2>

        <motion.p 
          className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-3xl leading-relaxed text-pretty font-normal"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.12 }}
        >
          Try short tasks for reaction speed, direction, colour recognition, and memory. Pick a test to get started.
        </motion.p>
      </div>

      <div className="w-full flex-1 flex flex-col min-h-[480px]">
        <DesktopAssessmentCarousel />
      </div>
    </section>
  );
}
