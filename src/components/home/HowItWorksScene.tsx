import React from 'react';
import { motion } from 'motion/react';
import { MousePointerClick, PlayCircle, BarChart3, Database } from 'lucide-react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

interface FlowStep {
  step: string;
  name: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const FLOW_STEPS: FlowStep[] = [
  {
    step: '01',
    name: 'CHOOSE',
    icon: MousePointerClick,
    title: 'Pick an Assessment',
    description: 'Select from standardized protocols targeting reaction speed, choice coordination, inhibitory control, or working memory.',
  },
  {
    step: '02',
    name: 'PERFORM',
    icon: PlayCircle,
    title: 'Complete the Task',
    description: 'Follow prompt cues to execute consecutive trials under standardized stimulus intervals and input detection.',
  },
  {
    step: '03',
    name: 'REVIEW',
    icon: BarChart3,
    title: 'Inspect Performance',
    description: 'Review descriptive session metrics including mean latency, median, standard deviation, and consistency indices.',
  },
  {
    step: '04',
    name: 'RESEARCH',
    icon: Database,
    title: 'Research & Privacy',
    description: 'Review our Research Privacy Policy to understand how submitted assessment observations and metrics are handled.',
  },
];

export function HowItWorksScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section 
      id="how-it-works" 
      className="relative w-full py-16 lg:py-24 border-t border-slate-200 dark:border-slate-800/80 scroll-mt-24 transition-colors duration-300"
      aria-label="How PULSE Works: Four-Step Flow"
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
            <span>[ PROTOCOL EXECUTION // 4-STEP WORKFLOW ]</span>
          </motion.div>

          <motion.h2 
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#090D1A] dark:text-white mb-4 text-balance"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.06 }}
          >
            How the Assessment Flow Operates
          </motion.h2>

          <motion.p 
            className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-3xl leading-relaxed text-pretty font-normal"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.12 }}
          >
            Each session proceeds through a structured sequence from protocol selection to local statistical synthesis.
          </motion.p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FLOW_STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.article 
                key={step.step}
                className="flex flex-col p-6 rounded-2xl bg-white dark:bg-[#181D23] border border-slate-200 dark:border-slate-800 relative overflow-hidden group hover:border-[#0066FF]/40 dark:hover:border-[#22C7D6]/40 shadow-sm transition-all"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : idx * 0.06 }}
              >
                {/* Step Number Top Meta */}
                <div className="flex items-center justify-between mb-6">
                  <span className="font-mono text-2xl font-extrabold text-[#0066FF]/30 dark:text-[#22C7D6]/30 group-hover:text-[#0066FF] dark:group-hover:text-[#22C7D6] transition-colors">
                    {step.step}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-[#12161B] border border-sky-100 dark:border-slate-800 flex items-center justify-center text-[#0066FF] dark:text-[#22C7D6]">
                    <Icon size={18} />
                  </div>
                </div>

                <div className="text-[11px] font-mono text-[#0066FF] dark:text-[#22C7D6] uppercase tracking-wider mb-2 font-bold">
                  {step.name}
                </div>

                <h3 className="font-heading text-lg font-bold text-[#090D1A] dark:text-white mb-2">
                  {step.title}
                </h3>

                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                  {step.description}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
