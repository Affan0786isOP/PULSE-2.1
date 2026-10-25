import React from 'react';
import { motion } from 'motion/react';
import { Clock, Cpu, Activity, BarChart2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export interface ProofSceneProps {
  onExploreAssessments?: () => void;
}

interface PipelineStage {
  step: string;
  name: string;
  badge: string;
  icon: React.ElementType;
  description: string;
  technicalMechanism: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    step: '01',
    name: 'Stimulus Presentation',
    badge: 'FRAME_CADENCE',
    icon: Activity,
    description: 'Visual stimulus timing is scheduled in the client; requestAnimationFrame sampling estimates display refresh cadence and timing offset.',
    technicalMechanism: 'requestAnimationFrame frame-delta sampling with theoretical display-delay midpoint estimation.',
  },
  {
    step: '02',
    name: 'Human Response Capture',
    badge: 'MONOTONIC_TIMING',
    icon: Clock,
    description: 'Pointer and keyboard responses are captured at the native DOM boundary with high-resolution timestamps.',
    technicalMechanism: 'performance.now() or event.timeStamp recorded directly on incoming PointerEvent / KeyboardEvent.',
  },
  {
    step: '03',
    name: 'Trial Validation & Correction',
    badge: 'TRIAL_VALIDATION',
    icon: Cpu,
    description: 'Trials are filtered for anticipatory false starts and timeouts, adjusted by estimated display offset.',
    technicalMechanism: '80ms physiological reaction floor check, timeout rejection, and display delay offset adjustment.',
  },
  {
    step: '04',
    name: 'Session Metrics & Summary',
    badge: 'STATISTICAL_METRICS',
    icon: BarChart2,
    description: 'Valid trial latencies are aggregated into mean, median, standard deviation, and consistency metrics.',
    technicalMechanism: 'Unbiased sample variance (Bessel correction N-1) and coefficient-of-variation consistency calculation.',
  },
];

export function ProofScene({ onExploreAssessments }: ProofSceneProps) {
  const shouldReduceMotion = useReducedMotionPreference();

  const handleScrollToAssessments = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById('assessments');
    if (target) {
      e.preventDefault();
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
      className="relative w-full py-16 lg:py-24 border-t border-slate-200 dark:border-slate-800/80 scroll-mt-24 transition-colors duration-300"
      aria-label="Measurement Pipeline and Proof"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-[#12161B] border border-sky-200 dark:border-[#22C7D6]/40 text-[11px] font-mono text-[#0066FF] dark:text-[#22C7D6] uppercase tracking-wider mb-4 shadow-sm">
            <span>[ PROTOCOL // MEASUREMENT PIPELINE ]</span>
          </div>
          
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#090D1A] dark:text-white mb-4">
            How PULSE Measures Client-Side Reaction Latency
          </h2>
          
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-3xl leading-relaxed text-pretty font-normal">
            Web-based cognitive timing requires accounting for display cadence and event timing. 
            PULSE structures evaluation through a factual 4-stage client-side pipeline.
          </p>
        </div>

        {/* 4 Pipeline Stages (Stimulus -> Response -> Measurement -> Result) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {PIPELINE_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <motion.article 
                key={stage.step}
                className="relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#181D23] border border-slate-200 dark:border-slate-800 hover:border-[#0066FF]/40 dark:hover:border-[#22C7D6]/40 shadow-sm transition-all"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : idx * 0.08 }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-[#0066FF] dark:text-[#22C7D6] tracking-wider">
                      STAGE {stage.step}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {stage.badge}
                    </span>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-[#12161B] border border-sky-100 dark:border-slate-800 flex items-center justify-center text-[#0066FF] dark:text-[#22C7D6] mb-4">
                    <Icon size={20} aria-hidden="true" />
                  </div>

                  <h3 className="font-heading text-lg font-bold text-[#090D1A] dark:text-white mb-2">
                    {stage.name}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    {stage.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Mechanism
                  </div>
                  <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
                    {stage.technicalMechanism}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Factual Credibility Summary Box */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#12161B] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold mb-2">
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>Documented Evaluation Flow</span>
            </div>
            <h4 className="font-heading text-lg sm:text-xl font-bold text-[#090D1A] dark:text-white mb-2">
              Local Timestamp Capture. Transparent Evaluation.
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Stimulus presentation, response detection, and trial metrics are computed locally in the browser engine. 
              Network round trips do not affect reaction timestamps, and anonymous session dataset contribution is voluntary.
            </p>
          </div>

          <a
            href="#assessments"
            onClick={handleScrollToAssessments}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium text-xs font-mono uppercase tracking-wider transition-all active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
          >
            <span>Explore Protocols</span>
            <ArrowRight size={14} className="text-[#0066FF] dark:text-[#22C7D6]" />
          </a>
        </div>
      </div>
    </section>
  );
}
