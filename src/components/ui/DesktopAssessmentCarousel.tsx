import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AssessmentId } from '../../../shared/contracts/common';
import { getAssessmentLaunchRoute } from '../../../shared/registries/assessmentRegistry';

const protocols: ReadonlyArray<{ id: AssessmentId; title: string; label: string; description: string; insight: string }> = [
  { id: 'visual-reaction', title: 'Visual Reaction Test', label: 'REACTION TIME', description: 'Respond when a visual signal appears.', insight: 'Explore response speed across repeated trials.' },
  { id: 'direction', title: 'Directional Choice Test', label: 'CHOICE SPEED', description: 'Match a response to the direction shown.', insight: 'Observe speed when a choice is required.' },
  { id: 'color-recognition', title: 'Colour Recognition Test', label: 'ATTENTION', description: 'Identify the text colour when the word conflicts.', insight: 'Explore selective attention and interference.' },
  { id: 'block-memory', title: 'Block Memory Test', label: 'SPATIAL MEMORY', description: 'Repeat sequences of highlighted blocks.', insight: 'Test how much spatial sequence you can recall.' },
  { id: 'number-memory', title: 'Number Memory Test', label: 'WORKING MEMORY', description: 'Recall increasingly long number sequences.', insight: 'Explore short-term number retention.' },
];

export function DesktopAssessmentCarousel() {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const launchRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusAfterMove = useRef(false);
  const active = protocols[activeIndex];

  useEffect(() => {
    if (focusAfterMove.current) launchRefs.current[activeIndex]?.focus();
    focusAfterMove.current = false;
  }, [activeIndex]);

  const moveTo = (index: number, shouldFocus = false) => {
    const nextIndex = Math.max(0, Math.min(protocols.length - 1, index));
    focusAfterMove.current = shouldFocus && nextIndex !== activeIndex;
    setActiveIndex(nextIndex);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' && activeIndex > 0) {
      event.preventDefault();
      moveTo(activeIndex - 1, true);
    }
    if (event.key === 'ArrowRight' && activeIndex < protocols.length - 1) {
      event.preventDefault();
      moveTo(activeIndex + 1, true);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-stretch">
      <div role="region" aria-label="Assessment protocol carousel" aria-keyshortcuts="ArrowLeft ArrowRight" tabIndex={0} onKeyDown={handleKeyDown} className="relative min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-5 outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:border-slate-800 dark:bg-[#12161B] dark:focus-visible:ring-[#22C7D6] sm:p-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Protocol preview</p>
          <p className="font-mono text-xs text-[#0066FF] dark:text-[#22C7D6]" aria-live="polite">0{activeIndex + 1} / 0{protocols.length}</p>
        </div>
        <div role="group" aria-roledescription="slide" aria-label={active.title} className="min-h-52">
          <p className="font-mono text-[10px] tracking-[0.18em] text-[#0066FF] dark:text-[#22C7D6]">{active.label}</p>
          <h3 className="mt-3 font-heading text-2xl font-bold tracking-tight text-[#090D1A] dark:text-white sm:text-3xl">{active.title}</h3>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">{active.description}</p>
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{active.insight}</p>
          <button ref={(element) => { launchRefs.current[activeIndex] = element; }} type="button" onClick={() => navigate(getAssessmentLaunchRoute(active.id))} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0066FF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0052CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 dark:bg-[#22C7D6] dark:text-[#0B0D10] dark:hover:bg-[#35D4E1]">Start {active.title} <span aria-hidden="true">→</span></button>
        </div>
      </div>
      <aside className="flex flex-row items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-[#0B0D10] lg:flex-col lg:items-stretch lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Browse battery</p>
          <p className="mt-2 font-heading text-lg font-semibold text-[#090D1A] dark:text-white">{activeIndex + 1} <span className="text-slate-400">of</span> {protocols.length}</p>
          <div className="mt-3 flex gap-1.5" aria-hidden="true">
            {protocols.map((item, index) => <span key={item.id} className={index === activeIndex ? 'h-1.5 flex-1 rounded-full bg-[#0066FF] dark:bg-[#22C7D6]' : 'h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700'} />)}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous assessment protocol" disabled={activeIndex === 0} onClick={() => moveTo(activeIndex - 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:bg-[#12161B] dark:text-white dark:hover:bg-[#181D23] dark:focus-visible:ring-[#22C7D6]">←</button>
          <button type="button" aria-label="Next assessment protocol" disabled={activeIndex === protocols.length - 1} onClick={() => moveTo(activeIndex + 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:bg-[#12161B] dark:text-white dark:hover:bg-[#181D23] dark:focus-visible:ring-[#22C7D6]">→</button>
        </div>
      </aside>
      <p className="sr-only">Use the left and right arrow keys while this carousel has focus. The launch button supports Enter and Space.</p>
    </div>
  );
}
