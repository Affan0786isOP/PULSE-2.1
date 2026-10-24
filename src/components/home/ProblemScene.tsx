import React from 'react';
import { Activity, MousePointerClick, BarChart3, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

const STEPS = [
  {
    number: '01',
    title: 'Choose a test',
    description: 'Five short tasks cover reaction, direction, colour, and memory.',
    icon: MousePointerClick,
  },
  {
    number: '02',
    title: 'Complete a few trials',
    description: 'Respond to prompts while PULSE records browser event timing.',
    icon: Activity,
  },
  {
    number: '03',
    title: 'Review your result',
    description: 'See descriptive metrics from your valid trials.',
    icon: ChartNoAxesColumn,
  },
];

export function ProblemScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section
      id="problem"
      className="relative w-full py-12 lg:py-16 border-t border-slate-200 dark:border-slate-800/80 scroll-mt-24 transition-colors duration-300"
      aria-label="How PULSE works and measurement limits"
    >
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-[#12161B] border border-sky-200 dark:border-[#22C7D6]/40 text-[11px] font-mono text-[#0066FF] dark:text-[#22C7D6] uppercase tracking-wider mb-3">
            [ QUICK GUIDE ]
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#090D1A] dark:text-white mb-2 text-balance">
            How it works
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl">
            Choose a test, try a few rounds, and review your result. Device and browser timing can vary, so use results for personal tracking—not diagnosis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.article
                key={step.number}
                className="rounded-2xl bg-white dark:bg-[#181D23] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: shouldReduceMotion ? 0 : index * 0.05 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-[#0066FF] dark:text-[#22C7D6]">{step.number}</span>
                  <Icon size={18} className="text-[#0066FF] dark:text-[#22C7D6]" aria-hidden="true" />
                </div>
                <h3 className="font-heading text-base font-bold text-[#090D1A] dark:text-white mb-1">{step.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.description}</p>
              </motion.article>
            );
          })}
        </div>

        <details className="group mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#12161B] px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#090D1A] dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] rounded">
            <span className="flex items-center gap-2"><Activity size={16} className="text-[#0066FF] dark:text-[#22C7D6]" aria-hidden="true" /> How browser timing works—and its limits</span>
            <ChevronDown size={16} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="pt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Browser timestamps are used to record responses, and frame timing can help estimate display cadence. Device scheduling, display refresh, and input hardware still affect measured time; these estimates cannot remove every delay or make browser tests laboratory-calibrated.
            <span className="block mt-2"><Link to="/privacy" className="text-[#0066FF] dark:text-[#22C7D6] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current">Read the Research Privacy Policy</Link> for data-sharing details.</span>
          </div>
        </details>
      </div>
    </section>
  );
}
