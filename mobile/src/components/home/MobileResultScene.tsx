import React from 'react';
import { motion } from 'motion/react';
import { Info } from 'lucide-react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export function MobileResultScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section
      id="result"
      className="w-full py-8 mb-8 border-t border-[var(--border-subtle)] scroll-mt-20"
      aria-label="Example assessment results"
    >
      <div className="mb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--accent)] uppercase tracking-wider mb-2 font-bold">
          [ SAMPLE RESULT ]
        </div>
        <motion.h2
          className="font-heading text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          See your results
        </motion.h2>
        <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
          A clear snapshot of your performance after each test.
        </p>
      </div>

      <motion.div
        className="rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] p-4 shadow-sm"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)] mb-4">
          <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">Visual Reaction · Example</span>
          <span className="text-[9px] font-mono font-bold text-[var(--accent)] bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-full px-2 py-1">SAMPLE DATA</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="col-span-2 pb-4 border-b border-[var(--border-subtle)]">
            <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider block mb-1">Mean reaction time</span>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-5xl font-bold text-[var(--accent)] tabular-nums">142</span>
              <span className="font-mono text-base text-[var(--text-secondary)]">ms</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
            <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase block mb-1">Median</span>
            <span className="font-heading text-lg font-bold text-[var(--text-primary)]">139 <span className="text-[10px] font-mono text-[var(--text-secondary)]">ms</span></span>
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)]">
            <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase block mb-1">Std deviation</span>
            <span className="font-heading text-lg font-bold text-[var(--text-primary)]">12.4 <span className="text-[10px] font-mono text-[var(--text-secondary)]">ms</span></span>
          </div>
        </div>

        <div className="flex items-start gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)] leading-relaxed">
          <Info size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
          <p>Illustrative values—not your result or medical data.</p>
        </div>
      </motion.div>
    </section>
  );
}
