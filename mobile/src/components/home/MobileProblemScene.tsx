import React from 'react';
import { Activity, MousePointerClick, BarChart3, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

const STEPS = [
  { number: '01', title: 'Choose a test', description: 'Five short tasks cover reaction, direction, colour, and memory.', icon: MousePointerClick },
  { number: '02', title: 'Complete a few trials', description: 'Respond to prompts while PULSE records browser event timing.', icon: Activity },
  { number: '03', title: 'Review your result', description: 'See descriptive metrics from your valid trials.', icon: ChartNoAxesColumn },
];

export function MobileProblemScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section
      id="problem"
      className="w-full py-8 mb-8 border-t border-[var(--border-subtle)] scroll-mt-20"
      aria-label="How PULSE works and measurement limits"
    >
      <div className="mb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--accent)] uppercase tracking-wider mb-2 font-bold">
          [ QUICK GUIDE ]
        </div>
        <motion.h2
          className="font-heading text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          How it works
        </motion.h2>
        <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
          Pick a test, try a few rounds, and review your result. Device timing varies, so use results for personal tracking—not diagnosis.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.article
              key={step.number}
              className="p-3.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] shadow-sm"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: shouldReduceMotion ? 0 : index * 0.04 }}
            >
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-7 h-7 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0">
                  <Icon size={14} aria-hidden="true" />
                </div>
                <h3 className="font-heading text-sm font-bold text-[var(--text-primary)]">{step.title}</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed pl-[38px]">{step.description}</p>
            </motion.article>
          );
        })}
      </div>

      <details className="group mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3.5 py-3">
        <summary className="flex min-h-[32px] cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded">
          <span className="flex items-center gap-2"><Activity size={14} className="text-[var(--accent)]" aria-hidden="true" /> Browser timing & its limits</span>
          <ChevronDown size={15} className="shrink-0 text-[var(--text-secondary)] transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <p className="pt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          Display refresh, device scheduling, and input hardware can affect measured times. Browser timing APIs help record responses but cannot remove every device-specific delay or make these tests laboratory-calibrated.
        </p>
      </details>
    </section>
  );
}
