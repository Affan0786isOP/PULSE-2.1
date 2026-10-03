import React from 'react';
import { motion } from 'motion/react';
import { Clock, Cpu, Activity, BarChart2, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
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
    description: 'Visual stimulus cues are scheduled across browser animation frames to sample nominal display refresh cadence.',
    technicalMechanism: 'requestAnimationFrame frame delta sampling with theoretical display delay midpoint estimation.',
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
      className="relative w-full py-20 lg:py-28 border-t border-white/5 scroll-mt-24"
      aria-label="Measurement Pipeline and Proof"
    >
      <div className="max-w-5xl">
        {/* Section Header */}
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-[11px] font-mono text-[#00F0FF] uppercase tracking-wider mb-4">
            <span>[ PROTOCOL // MEASUREMENT PIPELINE ]</span>
          </div>
          
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F8FAFC] mb-4">
            How PULSE Measures Client-Side Reaction Latency
          </h2>
          
          <p className="text-[#94A3B8] text-base sm:text-lg max-w-3xl leading-relaxed text-pretty">
            Web-based cognitive timing requires accounting for display cadence and event timing. 
            PULSE structures evaluation through a factual 4-stage client-side pipeline.
          </p>
        </div>

        {/* 4 Pipeline Stages (Stimulus -> Response -> Measurement -> Result) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {PIPELINE_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <motion.article 
                key={stage.step}
                className="relative flex flex-col justify-between p-5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-[#00F0FF]/30 transition-colors"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : idx * 0.08 }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-[#00F0FF] tracking-wider">
                      STAGE {stage.step}
                    </span>
                    <span className="text-[10px] font-mono text-[#64748B] bg-white/5 px-2 py-0.5 rounded">
                      {stage.badge}
                    </span>
                  </div>

                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#F8FAFC] mb-4">
                    <Icon size={20} className="text-[#00F0FF]" aria-hidden="true" />
                  </div>

                  <h3 className="font-heading text-lg font-semibold text-[#F8FAFC] mb-2">
                    {stage.name}
                  </h3>

                  <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
                    {stage.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] mb-1">
                    Mechanism
                  </div>
                  <div className="text-[11px] font-mono text-[#CBD5E1]">
                    {stage.technicalMechanism}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Factual Credibility Summary Box */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#2DD4BF] mb-2">
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>Documented Evaluation Flow</span>
            </div>
            <h4 className="font-heading text-lg sm:text-xl font-semibold text-[#F8FAFC] mb-2">
              Local Timestamp Capture. Transparent Evaluation.
            </h4>
            <p className="text-xs sm:text-sm text-[#8A94A6] leading-relaxed">
              Stimulus presentation, response detection, and trial metrics are computed locally in the browser engine. 
              Network round trips do not affect reaction timestamps, and anonymous session dataset contribution is voluntary.
            </p>
          </div>

          <a
            href="#assessments"
            onClick={handleScrollToAssessments}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs font-mono uppercase tracking-wider transition-all active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            <span>Launch Launcher</span>
            <ArrowRight size={14} className="text-[#00F0FF]" />
          </a>
        </div>
      </div>
    </section>
  );
}
