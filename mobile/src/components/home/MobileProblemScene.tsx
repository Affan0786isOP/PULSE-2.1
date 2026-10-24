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
    summary: "Stimuli are presented via the browser's frame pipeline, so visible onset can be quantized by display cadence.",
    control: 'PULSE samples frame intervals via requestAnimationFrame to estimate nominal cadence and apply midpoint offset correction.',
  },
  {
    icon: Cpu,
    title: 'Main-Thread Input Jitter',
    badge: 'EVENT DISPATCH',
    summary: 'Wall-clock timestamps provide lower-resolution non-monotonic timing, while main-thread scheduling introduces variance.',
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
      className="w-full py-8 mb-8 border-t border-[var(--border-subtle)] scroll-mt-20"
      aria-label="Mobile Problem Analysis"
    >
      <div className="mb-6">
        <motion.div 
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--accent)] uppercase tracking-wider mb-2 font-bold"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span>[ PROBLEM ANALYSIS // LIMITATIONS ]</span>
        </motion.div>

        <motion.h2 
          className="font-heading text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.05 }}
        >
          The Browser as an Instrument
        </motion.h2>

        <motion.p 
          className="text-[var(--text-secondary)] text-xs leading-relaxed"
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
              className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex flex-col shadow-sm"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : idx * 0.07 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
                    <Icon size={15} />
                  </div>
                  <h3 className="font-heading text-sm font-bold text-[var(--text-primary)]">{item.title}</h3>
                </div>
                <span className="text-[9px] font-mono tracking-wider px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-secondary)] uppercase">
                  {item.badge}
                </span>
              </div>

              <p className="text-[var(--text-secondary)] text-xs leading-relaxed mb-3">
                {item.summary}
              </p>

              <div className="pt-2.5 border-t border-[var(--border-subtle)]">
                <span className="text-[10px] font-mono text-[var(--accent)] uppercase tracking-wider block mb-0.5 font-bold">
                  PULSE CONTROL:
                </span>
                <p className="text-[11px] text-[var(--text-primary)] leading-relaxed font-mono">
                  {item.control}
                </p>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Limitation Callout */}
      <div className="p-3.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-start gap-3 shadow-sm">
        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          PULSE is an open observational tool for cognitive tracking. It does not provide medical evaluation or clinical diagnosis.
        </p>
      </div>
    </section>
  );
}
