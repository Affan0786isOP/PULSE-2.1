import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ShieldCheck, Database, Award, Info } from 'lucide-react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export function MobileResultScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section 
      id="result" 
      className="w-full py-8 mb-8 border-t border-white/5 scroll-mt-20"
      aria-label="Mobile Telemetry Output and Results"
    >
      <div className="mb-6">
        <motion.div 
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider mb-2"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span>[ RESULTS // SESSION TELEMETRY ]</span>
        </motion.div>

        <motion.h2 
          className="font-heading text-2xl font-bold tracking-tight text-white mb-2"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.05 }}
        >
          Session Telemetry Output
        </motion.h2>

        <motion.p 
          className="text-[#8A94A6] text-xs leading-relaxed"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.1 }}
        >
          Detailed statistical metrics calculated locally in the browser immediately following trial completion.
        </motion.p>
      </div>

      {/* Illustrative Result Card */}
      <motion.div 
        className="rounded-2xl bg-white/[0.02] border border-white/10 p-5 mb-5"
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.15 }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <span className="text-[10px] font-mono text-[#8A94A6]">VISUAL REACTION TRIAL</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#00F0FF]">
            <CheckCircle2 size={12} />
            <span>5 / 5 VALID</span>
          </span>
        </div>

        {/* Primary Latency Metric */}
        <div className="mb-5">
          <span className="text-[11px] font-mono text-[#8A94A6] uppercase tracking-wider block mb-1">
            Mean Reaction Latency
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-5xl font-bold text-[#00F0FF] tabular-nums">
              142
            </span>
            <span className="font-mono text-lg text-[#8A94A6]">ms</span>
          </div>
          <span className="text-[11px] text-[#64748B] block mt-1">
            Adjusted by estimated theoretical display delay offset
          </span>
        </div>

        {/* Statistical Sub-Metrics */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-[10px] font-mono text-[#8A94A6] uppercase block">Median</span>
            <span className="font-heading text-lg font-bold text-white">139 <span className="text-[10px] font-mono text-[#8A94A6]">ms</span></span>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-[10px] font-mono text-[#8A94A6] uppercase block">Consistency</span>
            <span className="font-heading text-lg font-bold text-[#00F0FF]">91.3%</span>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-[10px] font-mono text-[#8A94A6] uppercase block">Sample Std Dev</span>
            <span className="font-heading text-lg font-bold text-white">±12.4 <span className="text-[10px] font-mono text-[#8A94A6]">ms</span></span>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-[10px] font-mono text-[#8A94A6] uppercase block">Fastest Trial</span>
            <span className="font-heading text-lg font-bold text-white">128 <span className="text-[10px] font-mono text-[#8A94A6]">ms</span></span>
          </div>
        </div>

        {/* Local Storage & Transparency Info */}
        <div className="pt-3 border-t border-white/5 flex flex-col gap-2 text-[11px] text-[#8A94A6]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#00F0FF] shrink-0" />
            <span>Stored locally in browser cache by default</span>
          </div>
          <div className="flex items-center gap-2">
            <Database size={14} className="text-[#00F0FF] shrink-0" />
            <span>Optional opt-in submission to open research dataset</span>
          </div>
          <div className="flex items-center gap-2">
            <Award size={14} className="text-[#00F0FF] shrink-0" />
            <span>Optional community leaderboard ranking</span>
          </div>
        </div>
      </motion.div>

      {/* Non-Diagnostic Disclaimer */}
      <div className="p-3.5 rounded-xl bg-white/[0.015] border border-white/10 flex items-start gap-3">
        <Info size={16} className="text-[#8A94A6] shrink-0 mt-0.5" />
        <div className="text-[11px] text-[#8A94A6] leading-relaxed">
          <span className="font-mono text-[#CBD5E1] block uppercase tracking-wider mb-0.5 font-semibold">
            Illustrative Telemetry // Not Medical Data
          </span>
          The values above illustrate PULSE&apos;s output format. Measurements reflect client-side reaction speed and do not constitute clinical or medical assessment.
        </div>
      </div>
    </section>
  );
}
