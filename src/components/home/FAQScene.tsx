import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useReducedMotionPreference } from '../../lib/settingsStore';

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-item-1',
    question: 'What is PULSE?',
    answer: (
      <p>
        PULSE is an open behavioral testing framework providing standardized cognitive reaction and memory assessments directly in web browsers. It is designed for personal benchmarking, performance tracking, and open observational datasets.
      </p>
    ),
  },
  {
    id: 'faq-item-2',
    question: 'What do the assessments measure?',
    answer: (
      <p>
        The suite evaluates specific behavioral tasks including simple visual reaction latency, directional choice discrimination, inhibitory conflict control (color-word interference), and serial visual/numerical working memory spans.
      </p>
    ),
  },
  {
    id: 'faq-item-3',
    question: 'How are my results presented?',
    answer: (
      <p>
        Results are presented as task-specific descriptive performance metrics, including mean reaction time, sample median, standard deviation, and consistency ratios computed locally at the end of each session.
      </p>
    ),
  },
  {
    id: 'faq-item-4',
    question: 'Is PULSE a medical or diagnostic test?',
    answer: (
      <p>
        No. PULSE is not a medical device, diagnostic test, clinical tool, or IQ assessment. It provides observational software benchmarking and does not replace medical consultation, laboratory tachistoscopes, or certified neurological examinations.
      </p>
    ),
  },
  {
    id: 'faq-item-5',
    question: 'How does PULSE handle research and privacy?',
    answer: (
      <p>
        Assessment results are presented in the browser, while submitted assessment data is validated and processed by PULSE&apos;s research backend. For full disclosures regarding telemetry, data storage, and observational dataset handling, please review our{' '}
        <Link to="/privacy" className="text-[#0066FF] dark:text-[#22C7D6] underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]">
          Research Privacy Policy
        </Link>.
      </p>
    ),
  },
];

export function FAQScene() {
  const shouldReduceMotion = useReducedMotionPreference();
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section 
      id="faq" 
      className="relative w-full py-16 lg:py-24 border-t border-slate-200 dark:border-slate-800/80 scroll-mt-24 transition-colors duration-300"
      aria-label="Frequently Asked Questions"
    >
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <motion.div 
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-[#12161B] border border-sky-200 dark:border-[#22C7D6]/40 text-[11px] font-mono text-[#0066FF] dark:text-[#22C7D6] uppercase tracking-wider mb-4 shadow-sm"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <HelpCircle size={13} />
            <span>[ SYSTEM INQUIRIES // DOCUMENTATION ]</span>
          </motion.div>

          <motion.h2 
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#090D1A] dark:text-white mb-4 text-balance"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.06 }}
          >
            Frequently Asked Questions
          </motion.h2>

          <motion.p 
            className="text-slate-600 dark:text-slate-400 text-base sm:text-lg leading-relaxed text-pretty font-normal"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.12 }}
          >
            Essential information regarding assessment mechanics, measurement boundaries, and privacy practices.
          </motion.p>
        </div>

        {/* Accordion Container */}
        <div className="space-y-3">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id;
            const triggerId = `faq-trigger-${item.id}`;
            const panelId = `faq-panel-${item.id}`;

            return (
              <div 
                key={item.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181D23] overflow-hidden shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-700"
              >
                <button
                  id={triggerId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggleItem(item.id)}
                  className="w-full py-5 px-6 flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] focus-visible:ring-inset"
                >
                  <span className="font-heading text-base sm:text-lg font-bold text-[#090D1A] dark:text-white pr-4">
                    {item.question}
                  </span>
                  <ChevronDown 
                    size={18} 
                    className={`text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#0066FF] dark:text-[#22C7D6]' : ''
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
                    <div className="px-6 pb-6 pt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80">
                      {item.answer}
                    </div>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
