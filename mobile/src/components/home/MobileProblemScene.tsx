import React from 'react';
import { motion } from 'motion/react';
import { Monitor, Cpu, Filter, AlertTriangle } from 'lucide-react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

interface MobileProblemItem {
  icon: React.ElementType;
  title: string;
  badge: string;
  summary: string;
  control: string;
}

const MOBILE_PROBLEMS: MobileProblemItem[] = [
  {
    icon: Monitor,
    title: 'Display Frame Quantization',
    badge: 'FRAME CADENCE',
    summary: 'Screens refresh at discrete intervals (16.7ms at 60Hz). Stimuli cannot appear mid-frame without incurring hardware wait latency.',
    control: 'PULSE samples frame intervals via requestAnimationFrame to estimate nominal cadence and apply midpoint offset correction.',
  },
  {
    icon: Cpu,
    title: 'Main-Thread Input Jitter',
    badge: 'EVENT DISPATCH',
    summary: 'JavaScript execution and DOM rendering share a single thread. Naive timers capture thread contention rather than cognitive speed.',
    control: 'Timestamps are recorded at the native DOM boundary using high-resolution monotonic performance.now() timestamps.',
  },
  {
    icon: Filter,
    title: 'Anticipation & Outlier Skew',
    badge: 'TRIAL SANITY',
    summary: 'Subconscious guesses (<80ms) and sporadic distractions distort simple arithmetic averages.',
    control: 'PULSE rejects anticipations below an 80ms physiological floor and computes both median and sample standard deviation.',
  },
];

export function MobileProblemScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section 
      id="problem" 
      className="w-full py-8 mb-8 border-t border-white/5 scroll-mt-20"
      aria-label="Mobile Problem Analysis"
    >
      <div className="mb-6">
        <motion.div 
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider mb-2"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span>[ PROBLEM ANALYSIS // LIMITATIONS ]</span>
        </motion.div>

        <motion.h2 
          className="font-heading text-2xl font-bold tracking-tight text-white mb-2"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.05 }}
        >
          The Browser as an Instrument
        </motion.h2>

        <motion.p 
          className="text-[#8A94A6] text-xs leading-relaxed"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.1 }}
        >
          Consumer devices introduce software and display delays. PULSE accounts for client-side variance rather than treating browsers as laboratory timers.
        </motion.p>
      </div>

      {/* Stacked Problem Cards */}
      <div className="flex flex-col gap-3 mb-6">
        {MOBILE_PROBLEMS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.article 
              key={item.title}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : idx * 0.07 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#00F0FF]">
                    <Icon size={15} />
                  </div>
                  <h3 className="font-heading text-sm font-bold text-white">{item.title}</h3>
                </div>
                <span className="text-[9px] font-mono tracking-wider px-2 py-0.5 rounded bg-white/5 text-[#8A94A6] uppercase">
                  {item.badge}
                </span>
              </div>

              <p className="text-[#8A94A6] text-xs leading-relaxed mb-3">
                {item.summary}
              </p>

              <div className="pt-2.5 border-t border-white/5">
                <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider block mb-0.5">
                  PULSE CONTROL:
                </span>
                <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                  {item.control}
                </p>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Limitation Callout */}
      <div className="p-3.5 rounded-xl bg-white/[0.015] border border-white/10 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#8A94A6] leading-relaxed">
          PULSE is an open observational tool for cognitive tracking. It does not provide medical evaluation or clinical diagnosis.
        </p>
      </div>
    </section>
  );
}
