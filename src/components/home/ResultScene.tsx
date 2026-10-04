import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import { BarChart2, ShieldCheck, Database, Award, Info, CheckCircle2 } from 'lucide-react';
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
    }, 400);
    return () => clearTimeout(timer);
  }, [shouldReduceMotion]);

  return (
    <section 
      id="result" 
      className="relative w-full py-20 lg:py-28 border-t border-white/5 scroll-mt-24"
      aria-label="Assessment Telemetry and Result Structure"
    >
      <div className="max-w-5xl">
        {/* Section Header */}
        <div className="mb-14">
          <motion.div 
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-[11px] font-mono text-[#00F0FF] uppercase tracking-wider mb-4"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span>[ TELEMETRY OUTPUT // SESSION DATA ]</span>
          </motion.div>

          <motion.h2 
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F8FAFC] mb-4 text-balance"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.06 }}
          >
            Interpretable Cognitive Telemetry
          </motion.h2>

          <motion.p 
            className="text-[#94A3B8] text-base sm:text-lg max-w-3xl leading-relaxed text-pretty"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.12 }}
          >
            Upon completing a 5-trial assessment run, PULSE computes client-side descriptive metrics 
            designed for clarity, session comparison, and research utility.
          </motion.p>
        </div>

        {/* Illustrative Result Dashboard Card */}
        <motion.div 
          className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 sm:p-8 lg:p-10 mb-8"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.18 }}
        >
          {/* Card Top Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-white/10 mb-8">
            <div className="flex items-center gap-2.5 text-xs font-mono text-[#8A94A6]">
              <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
              <span>SAMPLE PROTOCOL // VISUAL REACTION LATENCY</span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#00F0FF]/10 text-[#00F0FF] text-[11px] font-mono uppercase">
              <CheckCircle2 size={13} />
              <span>5 / 5 VALID TRIALS</span>
            </div>
          </div>

          {/* Metric Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
            {/* Primary Hero Metric */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <span className="text-xs font-mono text-[#8A94A6] uppercase tracking-wider mb-2">
                Mean Reaction Latency
              </span>
              <div className="flex items-baseline gap-3 text-[#F8FAFC]">
                <span className="font-heading text-6xl sm:text-7xl font-bold tracking-tight text-[#00F0FF]">
                  {shouldReduceMotion ? (
                    <span className="tabular-nums">142</span>
                  ) : (
                    <NumberFlow value={metricValue} />
                  )}
                </span>
                <span className="text-2xl font-mono text-[#8A94A6]">ms</span>
              </div>
              <p className="text-xs text-[#8A94A6] mt-3">
                Calculated after subtracting estimated theoretical display delay midpoint.
              </p>
            </div>

            {/* Secondary Statistical Grid */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] font-mono text-[#8A94A6] uppercase block mb-1">Median Latency</span>
                <span className="font-heading text-2xl font-bold text-[#F8FAFC]">139 <span className="text-xs font-mono text-[#8A94A6]">ms</span></span>
                <span className="text-[11px] text-[#64748B] block mt-1">Robust to single outliers</span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] font-mono text-[#8A94A6] uppercase block mb-1">Consistency Index</span>
                <span className="font-heading text-2xl font-bold text-[#00F0FF]">91.3%</span>
                <span className="text-[11px] text-[#64748B] block mt-1">100 × (1 - CV)</span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] font-mono text-[#8A94A6] uppercase block mb-1">Sample Std Dev</span>
                <span className="font-heading text-2xl font-bold text-[#F8FAFC]">±12.4 <span className="text-xs font-mono text-[#8A94A6]">ms</span></span>
                <span className="text-[11px] text-[#64748B] block mt-1">Bessel correction (N-1)</span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] font-mono text-[#8A94A6] uppercase block mb-1">Fastest Trial</span>
                <span className="font-heading text-2xl font-bold text-[#F8FAFC]">128 <span className="text-xs font-mono text-[#8A94A6]">ms</span></span>
                <span className="text-[11px] text-[#64748B] block mt-1">Filtered &gt; 80ms floor</span>
              </div>
            </div>
          </div>

          {/* Data Destination & Transparency Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-white/10 text-xs text-[#8A94A6]">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={16} className="text-[#00F0FF] shrink-0" />
              <span>Local Storage: Session history retained in browser cache.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Database size={16} className="text-[#00F0FF] shrink-0" />
              <span>Open Dataset: Voluntary opt-in research contributions.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Award size={16} className="text-[#00F0FF] shrink-0" />
              <span>Leaderboard: Optional alias submission for public benchmarks.</span>
            </div>
          </div>
        </motion.div>

        {/* Required Illustrative Benchmark Data Disclaimer */}
        <motion.div 
          className="p-4 sm:p-5 rounded-xl bg-white/[0.015] border border-white/10 flex items-start gap-3.5"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.24 }}
        >
          <Info size={18} className="text-[#8A94A6] shrink-0 mt-0.5" />
          <div className="text-xs text-[#8A94A6] leading-relaxed">
            <span className="font-mono text-[#CBD5E1] block uppercase tracking-wider mb-1 font-semibold">
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
