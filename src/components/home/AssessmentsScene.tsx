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
      <motion.div 
        className="max-w-5xl mx-auto w-full mb-6"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="inline-flex items-center text-[11px] font-mono text-[#0066FF] dark:text-[#22C7D6] uppercase tracking-wider mb-4">
          <span>[ 5 QUICK TESTS ]</span>
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#090D1A] dark:text-white mb-4 text-balance">
          Explore the five tests
        </h2>

        <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-3xl leading-relaxed text-pretty font-normal">
          Try short tasks for reaction speed, direction, colour recognition, and memory. Pick a test to get started.
        </p>
      </motion.div>

      <motion.div 
        className="w-full flex-1 flex flex-col min-h-[480px]"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.08, ease: [0.16, 1, 0.3, 1] }}
      >
        <DesktopAssessmentCarousel />
      </motion.div>
    </section>
  );
}
