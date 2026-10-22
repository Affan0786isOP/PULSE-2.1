import { useState } from 'react';

const faqs = [
  ['What does PULSE measure?', 'The current battery includes visual reaction, directional choice, colour recognition, block memory, and number memory. Each protocol reports metrics relevant to its task.'],
  ['How accurate are the measurements?', 'PULSE measures browser-observed event timing. It is not a laboratory measurement of neural onset, and browser scheduling, display refresh, and input hardware can affect the observed time.'],
  ['Can my hardware affect a result?', 'Yes. Screen refresh rate, touch or mouse latency, CPU load, browser scheduling, and background activity can change observed timings. For comparisons, use similar conditions where possible.'],
  ['Can I retake an assessment?', 'You can run an assessment again. Learning, fatigue, and changes in your environment can affect a later result, so treat each session in context.'],
  ['What happens to my data?', 'You can complete tests without creating an account. Research contribution is optional where offered; consult the Privacy page for the current data-handling details.'],
  ['Can I use PULSE on mobile?', 'Yes, the mobile experience supports the assessment flow. Touch input and mobile display characteristics differ from desktop, so avoid treating results across devices as perfectly interchangeable.'],
];

export function FAQScene() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <section id="faq" data-home-scene="faq" aria-labelledby="faq-heading" className="w-full border-y border-slate-200 bg-slate-50/80 py-20 dark:border-slate-800 dark:bg-[#0B0D10] lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <header className="max-w-md">
          <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#0066FF] dark:text-[#22C7D6]">07 / FAQ</p>
          <h2 id="faq-heading" className="font-heading text-3xl font-bold tracking-tight text-[#090D1A] dark:text-white sm:text-4xl">Good questions deserve clear answers.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">A quick guide to the measurements, devices, and privacy choices behind PULSE.</p>
        </header>
        <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {faqs.map(([question, answer], index) => {
            const expanded = expandedIndex === index;
            const triggerId = 'faq-trigger-' + index;
            const panelId = 'faq-panel-' + index;
            return (
              <div key={question}>
                <h3>
                  <button id={triggerId} type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpandedIndex(expanded ? null : index)} className="flex min-h-16 w-full items-center justify-between gap-6 py-5 text-left font-heading text-base font-semibold text-[#090D1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0066FF] dark:text-white dark:focus-visible:ring-[#22C7D6]">
                    <span>{question}</span>
                    <span aria-hidden="true" className="font-mono text-xl text-[#0066FF] dark:text-[#22C7D6]">{expanded ? '−' : '+'}</span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!expanded} className="max-w-3xl pb-5 pr-8 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {answer}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
