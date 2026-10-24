import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Info } from 'lucide-react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export function ResultScene() {
  const shouldReduceMotion = useReducedMotionPreference();
  const [metricValue, setMetricValue] = useState(shouldReduceMotion ? 142 : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setMetricValue(142);
      return;
    }
    const timer = setTimeout(() => setMetricValue(142), 300);
    return () => clearTimeout(timer);
  }, [shouldReduceMotion]);

  return (
    <section
      id="result"
      className="relative w-full py-12 lg:py-16 border-t border-slate-200 dark:border-slate-800/80 scroll-mt-24 transition-colors duration-300"
      aria-label="Example assessment results"
    >
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-[#12161B] border border-sky-200 dark:border-[#22C7D6]/40 text-[11px] font-mono text-[#0066FF] dark:text-[#22C7D6] uppercase tracking-wider mb-3">
            <span>[ SAMPLE RESULT ]</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#090D1A] dark:text-white mb-2 text-balance">
            See your results
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl">
            A clear snapshot of your performance after each test.
          </p>
        </div>

        <motion.div
          className="rounded-2xl bg-white dark:bg-[#181D23] border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-sm"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.1 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-5">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Visual Reaction · Example
            </span>
            <span className="text-[11px] font-mono font-bold rounded-full px-3 py-1 bg-sky-50 dark:bg-[#22C7D6]/10 text-[#0066FF] dark:text-[#22C7D6] border border-sky-200 dark:border-[#22C7D6]/30">
              ILLUSTRATIVE DATA
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-4 items-stretch">
            <div className="sm:col-span-1 flex flex-col justify-center">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Mean reaction time
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-6xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0066FF] dark:text-[#22C7D6] tabular-nums">
                  {metricValue}
                </span>
                <span className="text-xl font-mono text-slate-400 dark:text-slate-500">ms</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12161B] border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase block mb-1">Median</span>
              <span className="font-heading text-2xl font-bold text-[#090D1A] dark:text-white">139 <span className="text-xs font-mono text-slate-400 dark:text-slate-500">ms</span></span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12161B] border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase block mb-1">Sample standard deviation</span>
              <span className="font-heading text-2xl font-bold text-[#090D1A] dark:text-white">12.4 <span className="text-xs font-mono text-slate-400 dark:text-slate-500">ms</span></span>
            </div>
          </div>

          <div className="flex items-start gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
            <Info size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
            <p>Example values only—not your result. PULSE is not a medical or diagnostic test.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
