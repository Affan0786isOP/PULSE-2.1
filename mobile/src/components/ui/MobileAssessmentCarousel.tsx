import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { CANONICAL_ASSESSMENT_IDS, AssessmentId } from '@shared/contracts/common';
import { ASSESSMENT_DEFINITIONS } from '@shared/registries/assessmentRegistry';
import { HOMEPAGE_ASSESSMENT_PRESENTATION } from '@shared/homepage/assessmentPresentation';
import { getAssessmentLaunchRoute } from '@shared/registries/routeRegistry';
import { triggerHaptic, useReducedMotionPreference } from '../../lib/settingsStore';

export interface MobileAssessmentCard {
  id: AssessmentId;
  protocolNumber: string;
  category: string;
  title: string;
  description: string;
  targetRoute: string;
  logo: string;
}

const MOBILE_ASSESSMENTS: MobileAssessmentCard[] = CANONICAL_ASSESSMENT_IDS.map((id) => {
  const def = ASSESSMENT_DEFINITIONS[id];
  const pres = HOMEPAGE_ASSESSMENT_PRESENTATION[id];
  return {
    id,
    protocolNumber: pres.protocolNumber,
    category: pres.category,
    title: def.displayName,
    description: pres.heroDescription,
    targetRoute: getAssessmentLaunchRoute(id),
    logo: pres.logoPath,
  };
});

export function MobileAssessmentCarousel() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotionPreference();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isInView, setIsInView] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  // Viewport Intersection Observer (>50% visible)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInView(Boolean(entry.isIntersecting && entry.intersectionRatio >= 0.5));
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleNext = useCallback(() => {
    triggerHaptic();
    setActiveIndex((prev) => (prev + 1) % MOBILE_ASSESSMENTS.length);
  }, []);

  const handlePrev = useCallback(() => {
    triggerHaptic();
    setActiveIndex((prev) => (prev - 1 + MOBILE_ASSESSMENTS.length) % MOBILE_ASSESSMENTS.length);
  }, []);

  const handleSelect = (index: number) => {
    triggerHaptic();
    setActiveIndex(index);
  };

  const handleLaunch = useCallback(() => {
    triggerHaptic();
    navigate(MOBILE_ASSESSMENTS[activeIndex].targetRoute);
  }, [activeIndex, navigate]);

  // Autoplay
  useEffect(() => {
    if (shouldReduceMotion || !isInView || isInteracting || isFocused) {
      return;
    }

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MOBILE_ASSESSMENTS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [shouldReduceMotion, isInView, isInteracting, isFocused]);

  // Keyboard navigation when hardware keyboard is present
  useEffect(() => {
    if (!isFocused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Enter') {
        if (document.activeElement === containerRef.current) {
          e.preventDefault();
          handleLaunch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, handlePrev, handleNext, handleLaunch]);

  // Touch handlers to support swipe without trapping vertical document scroll
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsInteracting(true);
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartX.current;
    const diffY = touch.clientY - touchStartY.current;

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsInteracting(false);
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX.current;

    if (isHorizontalSwipe.current && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    isHorizontalSwipe.current = null;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full flex flex-col items-center select-none py-2 outline-none"
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsFocused(false);
        }
      }}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Mobile Assessment Protocols Carousel"
    >
      {/* Cards Stage */}
      <div 
        className="relative w-full h-[360px] flex items-center justify-center overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-full max-w-[320px] h-[340px] flex items-center justify-center">
          <AnimatePresence initial={false}>
            {MOBILE_ASSESSMENTS.map((assessment, index) => {
              const total = MOBILE_ASSESSMENTS.length;
              let offset = (index - activeIndex + total) % total;
              if (offset > Math.floor(total / 2)) {
                offset -= total;
              }

              const isActive = offset === 0;
              const isPrev = offset === -1;
              const isNext = offset === 1;

              let x = '0%';
              let scale = 0.82;
              let opacity = 0;
              let zIndex = 0;

              if (isActive) {
                x = '0%';
                scale = 1;
                opacity = 1;
                zIndex = 20;
              } else if (isPrev) {
                x = '-65%';
                scale = 0.88;
                opacity = 0.4;
                zIndex = 10;
              } else if (isNext) {
                x = '65%';
                scale = 0.88;
                opacity = 0.4;
                zIndex = 10;
              }

              return (
                <motion.div
                  key={assessment.id}
                  aria-hidden={!isActive}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${MOBILE_ASSESSMENTS.length}: ${assessment.title}`}
                  initial={shouldReduceMotion ? { opacity: 0 } : { x: isNext ? 100 : -100, scale: 0.8, opacity: 0 }}
                  animate={shouldReduceMotion ? { opacity } : { x, scale, opacity, zIndex }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { x: isPrev ? -100 : 100, scale: 0.8, opacity: 0 }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 300, damping: 30 }
                  }
                  style={{
                    pointerEvents: (isActive || isPrev || isNext) ? 'auto' : 'none',
                  }}
                  className={`absolute w-full h-full rounded-2xl bg-[var(--surface-1)] border ${
                    isActive ? 'border-[var(--accent)] shadow-lg' : 'border-[var(--border-subtle)]'
                  } flex flex-col justify-between p-5 overflow-hidden cursor-pointer shadow-sm`}
                  onClick={() => {
                    if (isActive) {
                      handleLaunch();
                    } else if (isNext) {
                      handleNext();
                    } else if (isPrev) {
                      handlePrev();
                    }
                  }}
                >
                  {/* Top Header with Visual Graphic */}
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <span className="text-[10px] font-mono text-[var(--accent)] uppercase tracking-wider block mb-0.5 font-bold">
                        {assessment.protocolNumber}
                      </span>
                      <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-wider block">
                        {assessment.category}
                      </span>
                    </div>
                    <img 
                      src={assessment.logo} 
                      alt=""
                      aria-hidden="true"
                      className="w-14 h-14 object-contain rounded-xl p-1 bg-[var(--surface-2)] border border-[var(--border-subtle)]"
                    />
                  </div>

                  {/* Card Bottom Meta & Actions */}
                  <div className="relative z-10 flex flex-col items-start text-left mt-auto">
                    <h3 className="font-heading text-xl font-bold text-[var(--text-primary)] mb-1">{assessment.title}</h3>
                    <p className="text-[var(--text-secondary)] text-xs leading-relaxed mb-4 line-clamp-2">{assessment.description}</p>
                    
                    <button 
                      type="button"
                      tabIndex={isActive ? 0 : -1}
                      aria-hidden={!isActive}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isActive) {
                          handleLaunch();
                        } else {
                          handleSelect(index);
                        }
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        isActive 
                          ? 'bg-[var(--accent)] text-slate-950 font-bold active:scale-[0.98]' 
                          : 'bg-[var(--surface-2)] text-[var(--text-secondary)] pointer-events-auto'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <Play size={13} fill="currentColor" />
                          <span>LAUNCH PROTOCOL</span>
                        </>
                      ) : (
                        <span>SELECT</span>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-2 mt-4 z-20">
        {MOBILE_ASSESSMENTS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`transition-all duration-300 rounded-full h-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] ${
              idx === activeIndex 
                ? 'w-6 bg-[var(--accent)]' 
                : 'w-1.5 bg-[var(--border-subtle)] hover:bg-[var(--text-secondary)]'
            }`}
            aria-label={`Go to assessment ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
