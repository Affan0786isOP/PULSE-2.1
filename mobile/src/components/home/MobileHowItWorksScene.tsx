import React from 'react';
import { motion } from 'motion/react';
import { MousePointerClick, PlayCircle, BarChart3, Database } from 'lucide-react';
import { useReducedMotionPreference } from '../../lib/settingsStore';

interface MobileFlowStep {
  step: string;
  name: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const MOBILE_FLOW_STEPS: MobileFlowStep[] = [
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
    description: 'Execute consecutive trials under standardized stimulus intervals and touch/key input detection.',
  },
  {
    step: '03',
    name: 'REVIEW',
    icon: BarChart3,
    title: 'Inspect Metrics',
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

export function MobileHowItWorksScene() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <section 
      id="how-it-works" 
      className="w-full py-8 mb-8 border-t border-[var(--border-subtle)] scroll-mt-20"
      aria-label="How PULSE Works Flow"
    >
      <div className="mb-6">
        <motion.div 
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--accent)] uppercase tracking-wider mb-2 font-bold"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span>[ WORKFLOW // 4 STEPS ]</span>
        </motion.div>

        <motion.h2 
          className="font-heading text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.05 }}
        >
          How It Works
        </motion.h2>

        <motion.p 
          className="text-[var(--text-secondary)] text-xs leading-relaxed"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.1 }}
        >
          From protocol selection to local statistical review in four clear steps.
        </motion.p>
      </div>

      <div className="flex flex-col gap-3">
        {MOBILE_FLOW_STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <motion.article 
              key={step.step}
              className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] flex flex-col shadow-sm"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: shouldReduceMotion ? 0 : idx * 0.05 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-bold text-[var(--accent)]">
                  {step.step} // {step.name}
                </span>
                <div className="w-6 h-6 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-[var(--accent)]">
                  <Icon size={13} />
                </div>
              </div>

              <h3 className="font-heading text-sm font-bold text-[var(--text-primary)] mb-1">
                {step.title}
              </h3>

              <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                {step.description}
              </p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
