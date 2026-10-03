import React from 'react';
import { motion } from 'motion/react';
import { Activity, Clock, Cpu, BarChart2, CheckCircle2, ArrowDown } from 'lucide-react';
import { triggerHaptic, useReducedMotionPreference } from '../../lib/settingsStore';

export interface MobileProofSceneProps {
  onExploreAssessments?: () => void;
}

interface MobilePipelineCard {
  step: string;
  title: string;
  badge: string;
  icon: React.ElementType;
  summary: string;
  mechanism: string;
}

const MOBILE_PIPELINE_CARDS: MobilePipelineCard[] = [
  {
    step: '01',
    title: 'Stimulus Presentation',
    badge: 'FRAME_CADENCE',
    icon: Activity,
    summary: 'Visual stimulus timing is scheduled in the client; requestAnimationFrame samples display frame cadence for timing-offset estimation.',
    mechanism: 'requestAnimationFrame frame-delta sampling',
  },
  {
    step: '02',
    title: 'Touch Response',
    badge: 'MONOTONIC_TIMING',
    icon: Clock,
    summary: 'Touch and pointer contact timestamps are recorded at the native document boundary.',
    mechanism: 'performance.now() high-resolution timestamp capture',
  },
  {
    step: '03',
    title: 'Trial Validation',
    badge: 'VALIDITY_FILTER',
    icon: Cpu,
    summary: 'Anticipatory false starts and timeouts are filtered out, with estimated display offset applied.',
    mechanism: 'Physiological reaction floor and display offset adjustment',
  },
  {
    step: '04',
    title: 'Session Metrics',
    badge: 'SUMMARY_STATS',
    icon: BarChart2,
    summary: 'Trial latencies are aggregated into mean, median, standard deviation, and consistency scores.',
    mechanism: 'Client-side statistical aggregation and optional leaderboard submission',
  },
];

export function MobileProofScene({ onExploreAssessments }: MobileProofSceneProps) {
  const shouldReduceMotion = useReducedMotionPreference();

  const handleScrollToAssessments = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById('assessments');
    if (target) {
      e.preventDefault();
      triggerHaptic();
      target.scrollIntoView({
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
      });
      window.history.pushState(null, '', '#assessments');
      onExploreAssessments?.();
    }
  };

  return (
    <section 
      id="proof" 
      className="w-full py-8 mb-8 border-t border-white/5 scroll-mt-20"
      aria-label="Mobile Measurement Pipeline"
    >
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider mb-3">
          <span>[ METHODOLOGY // PIPELINE ]</span>
        </div>
        
        <h2 className="font-heading text-2xl font-bold tracking-tight text-white mb-2">
          The 4-Stage Evaluation Pipeline
        </h2>
        
        <p className="text-[#8A94A6] text-xs leading-relaxed">
          How PULSE measures reaction latency directly on mobile browsers without network interference.
        </p>
      </div>

      {/* Sequential Stacked Timeline Cards */}
      <div className="flex flex-col gap-3 mb-6">
        {MOBILE_PIPELINE_CARDS.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.article
              key={card.step}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/10 active:border-[#00F0FF]/40 transition-colors"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : idx * 0.06 }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#00F0FF]">
                    STAGE {card.step}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {card.title}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-[#00F0FF]" aria-hidden="true" />
                </div>
              </div>

              <p className="text-xs text-[#94A3B8] leading-relaxed mb-3">
                {card.summary}
              </p>

              <div className="text-[10px] font-mono text-[#CBD5E1] bg-black/30 px-2.5 py-1.5 rounded border border-white/5">
                <span className="text-[#64748B] uppercase tracking-wider mr-1.5">Tech:</span>
                {card.mechanism}
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Credibility Summary & CTA */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
        <div className="flex items-center gap-2 text-xs font-mono text-[#2DD4BF] uppercase tracking-wide mb-1.5">
          <CheckCircle2 size={15} aria-hidden="true" />
          <span>Local Measurement Engine</span>
        </div>
        <p className="text-xs text-[#8A94A6] leading-relaxed mb-4">
          Stimulus presentation and touch latency timestamps are processed locally in browser memory. Network delays do not affect local reaction-time calculation.
        </p>

        <a
          href="#assessments"
          onClick={handleScrollToAssessments}
          className="min-h-[44px] w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs font-mono uppercase tracking-wider active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
        >
          <span>Select An Assessment</span>
          <ArrowDown size={14} className="text-[#00F0FF]" />
        </a>
      </div>
    </section>
  );
}
