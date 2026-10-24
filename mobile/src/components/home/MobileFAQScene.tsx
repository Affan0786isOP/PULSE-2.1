import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { triggerHaptic, useReducedMotionPreference } from '../../lib/settingsStore';

interface MobileFAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

interface MobileFAQSceneProps {
  onNavigate?: (tab: string) => void;
}

export function MobileFAQScene({ onNavigate }: MobileFAQSceneProps) {
  const shouldReduceMotion = useReducedMotionPreference();
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    triggerHaptic();
    setOpenId((prev) => (prev === id ? null : id));
  };

  const FAQ_ITEMS: MobileFAQItem[] = [
    {
      id: 'mobile-faq-item-1',
      question: 'What is PULSE?',
      answer: (
        <p>
          PULSE is an open behavioral testing framework providing standardized cognitive reaction and memory assessments directly in web browsers. It is designed for personal benchmarking, performance tracking, and open observational datasets.
        </p>
      ),
    },
    {
      id: 'mobile-faq-item-2',
      question: 'What do the assessments measure?',
      answer: (
        <p>
          The suite evaluates specific behavioral tasks including visual reaction latency, directional choice discrimination, inhibitory conflict control, and visual/numerical working memory spans.
        </p>
      ),
    },
    {
      id: 'mobile-faq-item-3',
      question: 'How are my results presented?',
      answer: (
        <p>
          Results are presented as task-specific descriptive performance metrics, including mean reaction time, sample median, standard deviation, and consistency ratios computed locally at the end of each session.
        </p>
      ),
    },
    {
      id: 'mobile-faq-item-4',
      question: 'Is PULSE a medical or diagnostic test?',
      answer: (
        <p>
          No. PULSE is not a medical device, diagnostic test, clinical tool, or IQ assessment. It provides observational software benchmarking and does not replace medical consultation or certified neurological evaluation.
        </p>
      ),
    },
    {
      id: 'mobile-faq-item-5',
      question: 'How does PULSE handle research and privacy?',
      answer: (
        <p>
          Assessment results are presented in the browser, while submitted assessment data is validated and processed by PULSE&apos;s research backend. For full disclosures, review our{' '}
          <button 
            type="button"
            onClick={() => onNavigate ? onNavigate('privacy') : undefined}
            className="text-[var(--accent)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] cursor-pointer"
          >
            Research Privacy Policy
          </button>.
        </p>
      ),
    },
  ];

  return (
    <section 
      id="faq" 
      className="w-full py-8 mb-8 border-t border-[var(--border-subtle)] scroll-mt-20"
      aria-label="Frequently Asked Questions"
    >
      <div className="mb-6">
        <motion.div 
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--accent)] uppercase tracking-wider mb-2 font-bold"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <HelpCircle size={12} />
          <span>[ FAQ // DOCUMENTATION ]</span>
        </motion.div>

        <motion.h2 
          className="font-heading text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.05 }}
        >
          Frequently Asked Questions
        </motion.h2>

        <motion.p 
          className="text-[var(--text-secondary)] text-xs leading-relaxed"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.1 }}
        >
          Key details on assessment mechanics, measurement scope, and privacy.
        </motion.p>
      </div>

      <div className="space-y-2.5">
        {FAQ_ITEMS.map((item) => {
          const isOpen = openId === item.id;
          const triggerId = `mobile-faq-trigger-${item.id}`;
          const panelId = `mobile-faq-panel-${item.id}`;

          return (
            <div 
              key={item.id}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-1)] overflow-hidden shadow-sm"
            >
              <button
                id={triggerId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleItem(item.id)}
                className="w-full py-4 px-4 flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
              >
                <span className="font-heading text-sm font-bold text-[var(--text-primary)] pr-3">
                  {item.question}
                </span>
                <ChevronDown 
                  size={16} 
                  className={`text-[var(--text-secondary)] shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[var(--accent)]' : ''
                  }`}
                />
              </button>

              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                hidden={!isOpen}
                className={!isOpen ? 'hidden' : undefined}
              >
                <motion.div
                  initial={false}
                  animate={isOpen ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1 text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)]">
                    {item.answer}
                  </div>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
