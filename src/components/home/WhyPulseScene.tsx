import React from 'react';
import { motion } from 'motion/react';
import { Target, Repeat, Eye } from 'lucide-react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

interface Principle {
  title: string;
  badge: string;
  icon: React.ElementType;
  description: string;
}

const PRINCIPLES: Principle[] = [
  {
    title: 'Precision',
    badge: 'TIMING & INTEGRITY',
    icon: Target,
    description: 'Careful stimulus timing, trial handling, and result calculation designed to minimize client-side measurement variability.',
  },
  {
    title: 'Repeatability',
    badge: 'STANDARDIZED PROTOCOLS',
    icon: Repeat,
    description: 'Structured assessment protocols produce consistently handled task data across repeated evaluation sessions.',
  },
  {
    title: 'Clarity',
    badge: 'TRANSPARENT METRICS',
    icon: Eye,
    description: 'Results are presented as understandable task-specific performance metrics with documented computation methods.',
  },
];

export function WhyPulseScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section 
      id="why-pulse" 
      className="relative w-full py-16 lg:py-24 border-t border-slate-200 dark:border-slate-800/80 scroll-mt-24 transition-colors duration-300"
      aria-label="Why PULSE Core Principles"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <motion.div 
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-[#12161B] border border-sky-200 dark:border-[#22C7D6]/40 text-[11px] font-mono text-[#0066FF] dark:text-[#22C7D6] uppercase tracking-wider mb-4 shadow-sm"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span>[ FOUNDATION // CORE PRINCIPLES ]</span>
          </motion.div>

          <motion.h2 
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#090D1A] dark:text-white mb-4 text-balance"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.06 }}
          >
            Built for Measurement Integrity
          </motion.h2>

          <motion.p 
            className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-3xl leading-relaxed text-pretty font-normal"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.12 }}
          >
            PULSE approaches behavioral testing through explicit engineering standards: disciplined client timing, reproducible test procedures, and transparent statistical reporting.
          </motion.p>
        </div>

        {/* 3 Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRINCIPLES.map((principle, idx) => {
            const Icon = principle.icon;
            return (
              <motion.article 
                key={principle.title}
                className="flex flex-col p-6 rounded-2xl bg-white dark:bg-[#181D23] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : idx * 0.08 }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-[#12161B] border border-sky-100 dark:border-slate-800 flex items-center justify-center text-[#0066FF] dark:text-[#22C7D6]">
                    <Icon size={20} />
                  </div>
                  <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase">
                    {principle.badge}
                  </span>
                </div>

                <h3 className="font-heading text-xl font-bold text-[#090D1A] dark:text-white mb-2.5">
                  {principle.title}
                </h3>

                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  {principle.description}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
