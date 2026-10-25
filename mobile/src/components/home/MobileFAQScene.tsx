import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { triggerHaptic } from '../../lib/settingsStore';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-item-1',
    question: 'How accurate are browser reaction times?',
    answer: 'Browser reaction times are measured via high-resolution performance.now() timestamps. While display refresh intervals (e.g., 16.6ms at 60Hz) and touch digitizers introduce small physical offsets, relative consistency across trials is preserved.',
  },
  {
    id: 'faq-item-2',
    question: 'Are my assessment results diagnostic?',
    answer: 'No. PULSE provides descriptive behavioral task metrics for personal benchmarking. They are not medical or diagnostic tests and cannot replace neuropsychological evaluations.',
  },
  {
    id: 'faq-item-3',
    question: 'Do I need an account to test?',
    answer: 'No account or sign-up is required. All assessments run instantly in your browser, and your session scores are saved locally on your device.',
  },
  {
    id: 'faq-item-4',
    question: 'Why do mobile results differ from desktop?',
    answer: 'Touchscreens involve capacitive contact latency (~30-70ms), whereas physical mechanical switches on desktop mice or keyboards register almost instantaneously.',
  },
  {
    id: 'faq-item-5',
    question: 'How are trial outliers filtered?',
    answer: 'Anticipatory clicks occurring below physiological minimums (<80ms) and inactive trial timeouts are rejected from session aggregate scores to prevent skewed averages.',
  },
];

export function MobileFAQScene() {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    triggerHaptic('tap');
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section
      id="faq"
      aria-label="Frequently Asked Questions"
      className="w-full py-6 border-b border-[var(--border-subtle)]"
    >
      <div className="mb-4">
        <span className="text-[10px] font-mono font-bold text-[var(--accent)] tracking-wider uppercase block mb-1">
          QUESTIONS
        </span>
        <h2 className="font-heading text-xl font-extrabold text-[var(--text-primary)] tracking-tight mb-1">
          Frequently Asked Questions
        </h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Common inquiries on latency timing, methodology, and scientific scope.
        </p>
      </div>

      <div className="space-y-2">
        {FAQ_ITEMS.map((item) => {
          const isOpen = Boolean(openIds[item.id]);
          const panelId = `faq-panel-${item.id}`;
          const buttonId = `faq-btn-${item.id}`;

          return (
            <div
              key={item.id}
              className="rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] overflow-hidden shadow-sm"
            >
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleItem(item.id)}
                className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <span className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                  {item.question}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-[var(--text-secondary)] shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[var(--accent)]' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="px-4 pb-3.5 pt-1 text-[11.5px] text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-subtle)]/50"
                >
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
