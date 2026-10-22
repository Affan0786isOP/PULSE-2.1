import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AssessmentId } from '../../../../shared/contracts/common';
import { getAssessmentLaunchRoute } from '../../../../shared/registries/assessmentRegistry';

const protocols: ReadonlyArray<{ id: AssessmentId; title: string; label: string; description: string }> = [
  { id: 'visual-reaction', title: 'Visual Reaction Test', label: 'REACTION TIME', description: 'Respond when a visual signal appears.' },
  { id: 'direction', title: 'Directional Choice Test', label: 'CHOICE SPEED', description: 'Match a response to the direction shown.' },
  { id: 'color-recognition', title: 'Colour Recognition Test', label: 'ATTENTION', description: 'Identify the text colour when the word conflicts.' },
  { id: 'block-memory', title: 'Block Memory Test', label: 'SPATIAL MEMORY', description: 'Repeat sequences of highlighted blocks.' },
  { id: 'number-memory', title: 'Number Memory Test', label: 'WORKING MEMORY', description: 'Recall increasingly long number sequences.' },
];

export function MobileAssessmentCarousel() {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const launchRef = useRef<HTMLButtonElement | null>(null);
  const focusAfterMove = useRef(false);
  const active = protocols[activeIndex];

  useEffect(() => {
    if (focusAfterMove.current) launchRef.current?.focus();
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
    <div role="region" aria-label="Assessment protocol carousel" aria-keyshortcuts="ArrowLeft ArrowRight" tabIndex={0} onKeyDown={handleKeyDown} className="rounded-2xl border p-4 outline-none focus-visible:ring-2" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-subtle)', outlineColor: 'var(--focus-ring)' }}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Protocol preview</p>
        <p className="font-mono text-[10px]" style={{ color: 'var(--accent)' }} aria-live="polite">0{activeIndex + 1} / 0{protocols.length}</p>
      </div>
      <div role="group" aria-roledescription="slide" aria-label={active.title} className="min-h-32">
        <p className="font-mono text-[9px] tracking-widest" style={{ color: 'var(--accent)' }}>{active.label}</p>
        <h3 className="mt-2 font-heading text-lg font-bold tracking-tight">{active.title}</h3>
        <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>{active.description}</p>
        <button ref={launchRef} type="button" onClick={() => navigate(getAssessmentLaunchRoute(active.id))} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2" style={{ backgroundColor: 'var(--accent)', color: 'var(--surface-0)', outlineColor: 'var(--focus-ring)' }}>Start this protocol <span aria-hidden="true">→</span></button>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{activeIndex + 1} of {protocols.length} protocols</p>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous assessment protocol" disabled={activeIndex === 0} onClick={() => moveTo(activeIndex - 1)} className="flex h-10 w-10 items-center justify-center rounded-full border text-lg disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-default)', outlineColor: 'var(--focus-ring)' }}>←</button>
          <button type="button" aria-label="Next assessment protocol" disabled={activeIndex === protocols.length - 1} onClick={() => moveTo(activeIndex + 1)} className="flex h-10 w-10 items-center justify-center rounded-full border text-lg disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-default)', outlineColor: 'var(--focus-ring)' }}>→</button>
        </div>
      </div>
      <p className="sr-only">Use the left and right arrow keys while this carousel has focus. The launch button supports Enter and Space.</p>
    </div>
  );
}
