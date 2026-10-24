import React from 'react';
import { motion } from 'motion/react';
import { MobileAssessmentCarousel } from '../ui/MobileAssessmentCarousel';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export function MobileAssessmentsScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section 
      id="assessments" 
      className="w-full py-8 mb-8 border-t border-[var(--border-subtle)] scroll-mt-20"
      aria-label="Mobile Cognitive Assessments Discovery"
    >
      <div className="mb-6">
        <motion.div 
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--accent)] uppercase tracking-wider mb-2 font-bold"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span>[ SUITE // 5 PROTOCOLS ]</span>
        </motion.div>

        <motion.h2 
          className="font-heading text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.05 }}
        >
          Cognitive Protocols
        </motion.h2>

        <motion.p 
          className="text-[var(--text-secondary)] text-xs leading-relaxed"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.1 }}
        >
          Swipe or tap any card to explore behavioral metrics and launch an assessment.
        </motion.p>
      </div>

      <div className="w-full">
        <MobileAssessmentCarousel />
      </div>
    </section>
  );
}
