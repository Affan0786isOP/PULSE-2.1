import React from 'react';
import { motion } from 'motion/react';
import { Target, Repeat, Eye } from 'lucide-react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

interface MobilePrinciple {
  title: string;
  badge: string;
  icon: React.ElementType;
  description: string;
}

const MOBILE_PRINCIPLES: MobilePrinciple[] = [
  {
    title: 'Precision',
    badge: 'TIMING INTEGRITY',
    icon: Target,
    description: 'Careful stimulus timing, trial handling, and result calculation designed to minimize client-side measurement variability.',
  },
  {
    title: 'Repeatability',
    badge: 'PROTOCOLS',
    icon: Repeat,
    description: 'Structured assessment protocols produce consistently handled task data across repeated evaluation sessions.',
  },
  {
    title: 'Clarity',
    badge: 'METRICS',
    icon: Eye,
    description: 'Results are presented as understandable task-specific performance metrics with documented computation methods.',
  },
];

export function MobileWhyPulseScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section 
      id="why-pulse" 
      className="w-full py-8 mb-8 border-t border-[var(--border-subtle)] scroll-mt-20"
      aria-label="Why PULSE Principles"
    >
      <div className="mb-6">
        <motion.div 
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--accent)] uppercase tracking-wider mb-2 font-bold"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span>[ WHY PULSE // PRINCIPLES ]</span>
        </motion.div>

        <motion.h2 
          className="font-heading text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.05 }}
        >
          Core Measurement Standards
        </motion.h2>

        <motion.p 
          className="text-[var(--text-secondary)] text-xs leading-relaxed"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.1 }}
        >
          Engineered for disciplined client timing, reproducible test procedures, and transparent statistical reporting.
        </motion.p>
      </div>

      <div className="flex flex-col gap-3">
        {MOBILE_PRINCIPLES.map((principle, idx) => {
          const Icon = principle.icon;
          return (
            <motion.article 
              key={principle.title}
              className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex flex-col shadow-sm"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: shouldReduceMotion ? 0 : idx * 0.05 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
                    <Icon size={14} />
                  </div>
                  <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                    {principle.title}
                  </h3>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-secondary)] uppercase">
                  {principle.badge}
                </span>
              </div>

              <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                {principle.description}
              </p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
