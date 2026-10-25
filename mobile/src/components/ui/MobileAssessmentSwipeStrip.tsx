import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { HOMEPAGE_ASSESSMENT_PRESENTATION } from '../../../../shared/homepage/assessmentPresentation';
import { getAssessmentLaunchRoute } from '../../../../shared/registries/routeRegistry';
import type { AssessmentId } from '../../../../shared/contracts/common';
import { triggerHaptic } from '../../lib/settingsStore';

const CANONICAL_ASSESSMENT_IDS: AssessmentId[] = [
  'visual-reaction',
  'direction',
  'color-recognition',
  'block-memory',
  'number-memory',
];

interface MobileAssessmentSwipeStripProps {
  onNavigate?: (view: string) => void;
}

export function MobileAssessmentSwipeStrip({ onNavigate }: MobileAssessmentSwipeStripProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const assessments = CANONICAL_ASSESSMENT_IDS.map(
    (id) => HOMEPAGE_ASSESSMENT_PRESENTATION[id]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const cardWidth = el.firstElementChild
        ? (el.firstElementChild as HTMLElement).offsetWidth + 16 // card width + gap
        : 260;
      const index = Math.round(el.scrollLeft / cardWidth);
      const clamped = Math.max(0, Math.min(index, assessments.length - 1));
      setActiveIndex(clamped);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [assessments.length]);

  const handleLaunch = (assessmentId: string) => {
    triggerHaptic('tap');
    const launchRoute = getAssessmentLaunchRoute(assessmentId);
    if (onNavigate) {
      onNavigate(launchRoute);
    } else {
      navigate(launchRoute);
    }
  };

  const scrollToIndex = (index: number) => {
    triggerHaptic('tap');
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[index] as HTMLElement | undefined;
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  };

  return (
    <div className="w-full">
      {/* Scrollable touch strip */}
      <div
        ref={scrollRef}
        role="region"
        aria-label="Cognitive Assessments Carousel"
        tabIndex={0}
        className="w-full flex gap-4 overflow-x-auto snap-x snap-mandatory pt-1 pb-4 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-2xl [-webkit-overflow-scrolling:touch]"
      >
        {assessments.map((item, idx) => {
          const launchRoute = getAssessmentLaunchRoute(item.assessmentId);
          return (
            <article
              key={item.assessmentId}
              data-testid={`assessment-card-${item.assessmentId}`}
              className="snap-start shrink-0 w-[270px] sm:w-[290px] rounded-2xl bg-[var(--surface-1)] border border-[var(--border-subtle)] p-4 flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold text-[var(--accent)] uppercase tracking-wider">
                      {item.protocolNumber}
                    </span>
                    <span className="text-[9.5px] font-mono text-[var(--text-secondary)] uppercase tracking-wide">
                      {item.category}
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] p-1.5 flex items-center justify-center shrink-0">
                    <img
                      src={item.logoPath}
                      alt=""
                      aria-hidden="true"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <h3 className="font-heading text-lg font-bold text-[var(--text-primary)] mb-1 leading-snug">
                  {item.category}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4 line-clamp-3">
                  {item.heroDescription}
                </p>
              </div>

              {/* 44x44 minimum touch target action */}
              <button
                type="button"
                data-testid={`launch-btn-${item.assessmentId}`}
                data-launch-route={launchRoute}
                onClick={() => handleLaunch(item.assessmentId)}
                aria-label={`Launch ${item.category}`}
                className="w-full min-h-[44px] h-[44px] px-4 rounded-xl bg-[var(--surface-2)] active:bg-[var(--accent)] hover:bg-[var(--accent)]/20 text-[var(--text-primary)] active:text-slate-950 font-semibold text-xs transition-colors flex items-center justify-between border border-[var(--border-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <span className="inline-flex items-center gap-1.5 font-bold tracking-wide">
                  <Play size={13} fill="currentColor" aria-hidden="true" />
                  <span>START TEST</span>
                </span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </div>

      {/* Touch-accessible interactive indicators */}
      <div
        role="group"
        aria-label="Assessment Navigation Dots"
        className="flex items-center justify-center gap-2 mt-2"
      >
        {assessments.map((item, idx) => (
          <button
            key={item.assessmentId}
            type="button"
            onClick={() => scrollToIndex(idx)}
            aria-label={`Jump to ${item.category}`}
            aria-current={idx === activeIndex ? 'true' : 'false'}
            className="min-w-[44px] min-h-[44px] p-2 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-full"
          >
            <span
              className={`block h-1.5 rounded-full transition-all duration-200 ${
                idx === activeIndex
                  ? 'w-6 bg-[var(--accent)]'
                  : 'w-1.5 bg-[var(--border-subtle)]'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
