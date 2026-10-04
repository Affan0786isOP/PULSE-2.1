import React from 'react';
import { motion } from 'motion/react';
import { Monitor, Cpu, Filter, AlertTriangle } from 'lucide-react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

interface ProblemPillar {
  icon: React.ElementType;
  title: string;
  badge: string;
  description: string;
  mitigation: string;
}

const PROBLEM_PILLARS: ProblemPillar[] = [
  {
    icon: Monitor,
    title: 'Display Refresh Quantization',
    badge: 'DISPLAY CADENCE',
    description: 'Visual stimuli cannot render instantaneously. A standard 60Hz display paints new frames every 16.67ms, while 144Hz paints every 6.94ms. Stimulus events scheduled between frames incur unavoidable hardware-wait delays.',
    mitigation: 'PULSE samples ~45 requestAnimationFrame intervals to estimate display refresh cadence and apply a theoretical frame-midpoint timing offset.',
  },
  {
    icon: Cpu,
    title: 'Main-Thread & Event Queue Latency',
    badge: 'INPUT DISPATCH',
    description: 'Browsers process DOM input events on a shared thread alongside layout rendering, garbage collection, and background tasks. Naive Date.now() measurements accumulate variable thread jitter.',
    mitigation: 'PULSE binds directly to native DOM PointerEvent / KeyboardEvent boundaries and records high-resolution monotonic timestamps (performance.now()).',
  },
  {
    icon: Filter,
    title: 'Outlier & False-Start Distortion',
    badge: 'TRIAL INTEGRITY',
    description: 'Anticipatory guesses (<80ms) and sporadic attentional timeouts heavily skew naive arithmetic averages, producing misleading measurements that do not reflect genuine cognitive reaction latency.',
    mitigation: 'PULSE applies an 80ms physiological reaction floor to reject anticipations, enforces timeout ceilings, and computes both median and sample variance metrics.',
  },
];

export function ProblemScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section 
      id="problem" 
      className="relative w-full py-20 lg:py-28 border-t border-white/5 scroll-mt-24"
      aria-label="Cognitive Latency Measurement Problem Analysis"
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
            <span>[ PROBLEM ANALYSIS // LATENCY DECOMPOSITION ]</span>
          </motion.div>

          <motion.h2 
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F8FAFC] mb-4 text-balance"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.06 }}
          >
            The Browser is an Uncalibrated Instrument
          </motion.h2>

          <motion.p 
            className="text-[#94A3B8] text-base sm:text-lg max-w-3xl leading-relaxed text-pretty"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.12 }}
          >
            Conventional web tests treat browser click events as pure cognitive benchmarks. 
            In reality, consumer hardware and software introduce measurable variance that must be acknowledged and accounted for.
          </motion.p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {PROBLEM_PILLARS.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.article 
                key={pillar.title}
                className="flex flex-col p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-colors"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : idx * 0.08 }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#00F0FF]">
                    <Icon size={20} />
                  </div>
                  <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-white/5 text-[#8A94A6] uppercase">
                    {pillar.badge}
                  </span>
                </div>

                <h3 className="font-heading text-xl font-bold text-[#F8FAFC] mb-3">
                  {pillar.title}
                </h3>

                <p className="text-[#94A3B8] text-sm leading-relaxed mb-6 flex-1">
                  {pillar.description}
                </p>

                <div className="pt-4 border-t border-white/5">
                  <div className="text-[11px] font-mono text-[#00F0FF] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span>PULSE CONTROL:</span>
                  </div>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed">
                    {pillar.mitigation}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Factual Disclaimer Callout */}
        <motion.div 
          className="p-5 rounded-xl bg-white/[0.015] border border-white/10 flex items-start gap-4"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.28 }}
        >
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#F8FAFC] mb-1">
              Methodological Scope & Limitations
            </h4>
            <p className="text-xs text-[#8A94A6] leading-relaxed">
              PULSE provides client-side cognitive reaction benchmarking designed for personal tracking and observational research. 
              It does not replace laboratory tachistoscopes, electromyography, or clinical diagnostic equipment, nor does it eliminate device-specific hardware latency beyond client-side estimation.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
