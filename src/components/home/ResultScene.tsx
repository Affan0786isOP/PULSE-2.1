import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Database, Award, Info, CheckCircle2 } from 'lucide-react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export function ResultScene() {
  const shouldReduceMotion = useReducedMotionPreference();
  const [metricValue, setMetricValue] = useState(shouldReduceMotion ? 142 : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setMetricValue(142);
      return;
    }
    const timer = setTimeout(() => {
      setMetricValue(142);
    }, 300);
    return () => clearTimeout(timer);
  }, [shouldReduceMotion]);

  return (
    <section 
      id="result" 
      className="relative w-full py-16 lg:py-24 border-t border-slate-200 dark:border-slate-800/80 scroll-mt-24 transition-colors duration-300"
      aria-label="Assessment Telemetry and Result Structure"
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
            <span>[ TELEMETRY OUTPUT // SESSION DATA ]</span>
          </motion.div>

          <motion.h2 
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#090D1A] dark:text-white mb-4 text-balance"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.06 }}
          >
            Interpretable Cognitive Telemetry
          </motion.h2>

          <motion.p 
            className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-3xl leading-relaxed text-pretty font-normal"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.12 }}
          >
            Upon completing a Visual Reaction assessment run, PULSE computes client-side descriptive metrics
            designed for clarity, session comparison, and research utility.
          </motion.p>
        </div>

        {/* Illustrative Result Dashboard Card */}
        <motion.div 
          className="rounded-2xl bg-white dark:bg-[#181D23] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 lg:p-10 mb-8 shadow-sm transition-all"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.18 }}
        >
          {/* Card Top Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-100 dark:border-slate-800/80 mb-8">
            <div className="flex items-center gap-2.5 text-xs font-mono text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-[#0066FF] dark:bg-[#22C7D6]" />
              <span>SAMPLE PROTOCOL // VISUAL REACTION LATENCY</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-[#22C7D6]/10 text-[#0066FF] dark:text-[#22C7D6] border border-sky-200 dark:border-[#22C7D6]/30 text-[11px] font-mono uppercase font-bold">
              <CheckCircle2 size={13} />
              <span>10 / 10 VALID TRIALS</span>
            </div>
          </div>

          {/* Metric Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
            {/* Primary Hero Metric */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 font-semibold">
                Mean Reaction Latency
              </span>
              <div className="flex items-baseline gap-3">
                <span className="font-heading text-6xl sm:text-7xl font-extrabold tracking-tight text-[#0066FF] dark:text-[#22C7D6] tabular-nums">
                  {metricValue}
                </span>
                <span className="text-2xl font-mono text-slate-400 dark:text-slate-500 font-semibold">ms</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                Calculated after subtracting estimated theoretical display delay midpoint.
              </p>
            </div>

            {/* Secondary Statistical Grid */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12161B] border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase block mb-1">Median Latency</span>
                <span className="font-heading text-2xl font-bold text-[#090D1A] dark:text-white">139 <span className="text-xs font-mono text-slate-400 dark:text-slate-500">ms</span></span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1">Robust to single outliers</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12161B] border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase block mb-1">Consistency Index</span>
                <span className="font-heading text-2xl font-bold text-[#0066FF] dark:text-[#22C7D6]">91.3%</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1">100 × (1 - CV)</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12161B] border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase block mb-1">Sample Std Dev</span>
                <span className="font-heading text-2xl font-bold text-[#090D1A] dark:text-white">±12.4 <span className="text-xs font-mono text-slate-400 dark:text-slate-500">ms</span></span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1">Bessel correction (N-1)</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#12161B] border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase block mb-1">Fastest Trial</span>
                <span className="font-heading text-2xl font-bold text-[#090D1A] dark:text-white">128 <span className="text-xs font-mono text-slate-400 dark:text-slate-500">ms</span></span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1">Filtered &gt; 80ms floor</span>
              </div>
            </div>
          </div>

          {/* Data Destination & Transparency Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={16} className="text-[#0066FF] dark:text-[#22C7D6] shrink-0" />
              <span>Local Storage: Session history retained in browser cache.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Database size={16} className="text-[#0066FF] dark:text-[#22C7D6] shrink-0" />
              <span>Open Dataset: Voluntary opt-in research contributions.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Award size={16} className="text-[#0066FF] dark:text-[#22C7D6] shrink-0" />
              <span>Leaderboard: Optional alias submission for public benchmarks.</span>
            </div>
          </div>
        </motion.div>

        {/* Required Illustrative Benchmark Data Disclaimer */}
        <motion.div 
          className="p-5 rounded-2xl bg-white dark:bg-[#12161B] border border-slate-200 dark:border-slate-800 flex items-start gap-3.5 shadow-sm"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.24 }}
        >
          <Info size={18} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <span className="font-mono text-slate-800 dark:text-slate-200 block uppercase tracking-wider mb-1 font-bold">
              Illustrative Benchmark Telemetry // Not Medical or Diagnostic Data
            </span>
            The 142 ms metric above is an illustrative output sample demonstrating PULSE&apos;s client-side calculation format. 
            Assessments measure behavioral performance in standard web environments and are not calibrated for medical diagnosis, clinical evaluation, or standardized IQ measurement.
          </div>
        </motion.div>
      </div>
    </section>
  );
}
