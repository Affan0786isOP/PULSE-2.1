import { useState } from 'react';
import { MobileSceneFrame } from './MobileSceneFrame';

const faqs = [
  ['What does PULSE measure?', 'Visual reaction, directional choice, colour recognition, block memory, and number memory. Each protocol reports task-specific metrics.'],
  ['How accurate are measurements?', 'PULSE measures browser-observed event timing, not laboratory neural onset. Browser scheduling, display refresh and input hardware can affect the observed time.'],
  ['Can hardware affect a result?', 'Yes. Touch latency, display refresh, CPU load and background activity can change observed timings. Use similar conditions when comparing sessions.'],
  ['Can I retake a test?', 'You can run an assessment again. Learning, fatigue and your environment can affect later results, so interpret each session in context.'],
  ['What happens to my data?', 'You can test without an account. Research contribution is optional where offered; see the Privacy page for current data-handling details.'],
  ['Does PULSE work on mobile?', 'Yes. Touch input and mobile display characteristics differ from desktop, so results across devices are not perfectly interchangeable.'],
];

export function MobileFAQScene() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <MobileSceneFrame id="faq" eyebrow="07 / FAQ" title="Questions, answered." description="A quick guide to timing, devices and privacy choices.">
      <div className="divide-y border-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {faqs.map(([question, answer], index) => {
          const expanded = expandedIndex === index;
          const triggerId = 'mobile-faq-trigger-' + index;
          const panelId = 'mobile-faq-panel-' + index;
          return (
            <div key={question}>
              <h3>
                <button id={triggerId} type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpandedIndex(expanded ? null : index)} className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left font-heading text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset" style={{ color: 'var(--text-primary)', outlineColor: 'var(--focus-ring)' }}>
                  <span>{question}</span>
                  <span aria-hidden="true" className="font-mono text-lg" style={{ color: 'var(--accent)' }}>{expanded ? '−' : '+'}</span>
                </button>
              </h3>
              <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!expanded} className="pb-4 pr-4 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>{answer}</div>
            </div>
          );
        })}
      </div>
    </MobileSceneFrame>
  );
}
