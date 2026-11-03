import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { CANONICAL_ASSESSMENT_IDS, AssessmentId } from '@shared/contracts/common';
import { ASSESSMENT_DEFINITIONS } from '@shared/registries/assessmentRegistry';
import { HOMEPAGE_ASSESSMENT_PRESENTATION } from '@shared/homepage/assessmentPresentation';
import { getAssessmentLaunchRoute } from '@shared/registries/routeRegistry';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export interface DesktopAssessmentCard {
  id: AssessmentId;
  protocolNumber: string;
  category: string;
  title: string;
  description: string;
  targetRoute: string;
  logo: string;
}

const DESKTOP_ASSESSMENTS: DesktopAssessmentCard[] = CANONICAL_ASSESSMENT_IDS.map((id) => {
  const def = ASSESSMENT_DEFINITIONS[id];
  const pres = HOMEPAGE_ASSESSMENT_PRESENTATION[id];
  return {
    id,
    protocolNumber: pres.protocolNumber,
    category: pres.category,
    title: def.displayName.toUpperCase(),
    description: pres.heroDescription,
    targetRoute: getAssessmentLaunchRoute(id),
    logo: pres.logoPath,
  };
});

export function DesktopAssessmentCarousel() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotionPreference();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport intersection observer (>=50% visibility)
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

  // Autoplay: Advance only when in view, not hovered, not focused, and motion not reduced
  useEffect(() => {
    if (shouldReduceMotion || !isInView || isHovered || isFocused) {
      return;
    }

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % DESKTOP_ASSESSMENTS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [shouldReduceMotion, isInView, isHovered, isFocused]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % DESKTOP_ASSESSMENTS.length);
  }, []);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + DESKTOP_ASSESSMENTS.length) % DESKTOP_ASSESSMENTS.length);
  }, []);

  const handleSelect = (index: number) => {
    setActiveIndex(index);
  };

  const handleLaunch = useCallback(() => {
    navigate(DESKTOP_ASSESSMENTS[activeIndex].targetRoute);
  }, [activeIndex, navigate]);

  // Scoped keyboard navigation: Listen ONLY when container or children are focused
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

  const getCard2DStyle = (index: number) => {
    const total = DESKTOP_ASSESSMENTS.length;
    let offset = (index - activeIndex + total) % total;

    // Normalize offset to symmetric range: -2, -1, 0, 1, 2
    if (offset > Math.floor(total / 2)) {
      offset -= total;
    }

    // Strictly 2D layout calculation using x translation, scale, opacity, and zIndex
    let x = '0%';
    let scale = 0.75;
    let opacity = 0;
    let zIndex = 0;

    if (offset === 0) {
      x = '0%';
      scale = 1;
      opacity = 1;
      zIndex = 30;
    } else if (offset === -1) {
      x = '-52%';
      scale = 0.88;
      opacity = 0.55;
      zIndex = 20;
    } else if (offset === 1) {
      x = '52%';
      scale = 0.88;
      opacity = 0.55;
      zIndex = 20;
    } else if (offset === -2) {
      x = '-95%';
      scale = 0.75;
      opacity = 0;
      zIndex = 10;
    } else if (offset === 2) {
      x = '95%';
      scale = 0.75;
      opacity = 0;
      zIndex = 10;
    }

    if (shouldReduceMotion) {
      scale = offset === 0 ? 1 : 0.9;
    }

    return { x, scale, opacity, zIndex, offset };
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full flex flex-col items-center justify-center select-none py-4 outline-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsFocused(false);
        }
      }}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Assessment Protocols 2D Carousel"
    >
      {/* 2D Stage Wrapper */}
      <div className="relative w-full h-[460px] flex items-center justify-center overflow-hidden">
        {/* Navigation Prev Button */}
        <button
          onClick={handlePrev}
          className="absolute left-4 z-40 p-3 rounded-full bg-white/90 dark:bg-[#181D23]/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-[#20262E] transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
          aria-label="Previous assessment"
        >
          <ChevronLeft size={22} />
        </button>

        {/* 2D Cards Layer */}
        <div className="relative w-full max-w-md h-[430px] flex items-center justify-center">
          <AnimatePresence initial={false}>
            {DESKTOP_ASSESSMENTS.map((assessment, index) => {
              const { x, scale, opacity, zIndex, offset } = getCard2DStyle(index);
              const isActive = offset === 0;

              return (
                <motion.div
                  key={assessment.id}
                  aria-hidden={!isActive}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${DESKTOP_ASSESSMENTS.length}: ${assessment.title}`}
                  className={`absolute w-full h-full rounded-2xl bg-white dark:bg-[#181D23] border ${
                    isActive
                      ? 'border-[#0066FF]/60 dark:border-[#22C7D6]/60 shadow-[0_16px_40px_rgba(0,102,255,0.12)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] ring-1 ring-[#0066FF]/20 dark:ring-[#22C7D6]/20'
                      : 'border-slate-200 dark:border-slate-800 shadow-sm'
                  } flex flex-col justify-between overflow-hidden cursor-pointer transition-colors duration-300`}
                  initial={false}
                  animate={{
                    x,
                    scale,
                    opacity,
                    zIndex,
                  }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 260, damping: 28 }
                  }
                  style={{
                    pointerEvents: Math.abs(offset) <= 1 ? 'auto' : 'none',
                  }}
                  onClick={() => {
                    if (isActive) {
                      navigate(assessment.targetRoute);
                    } else {
                      handleSelect(index);
                    }
                  }}
                >
                  {/* Card Visual Header */}
                  <div className="relative h-44 w-full bg-slate-50 dark:bg-[#12161B] flex items-center justify-center border-b border-slate-100 dark:border-slate-800 overflow-hidden shrink-0">
                    {/* Visualizer Subtle Grid Graphic */}
                    <div className="absolute inset-0 opacity-40 dark:opacity-20 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                    
                    {/* Radial Atmosphere Glow */}
                    <div 
                      className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
                        isActive ? 'opacity-100 bg-[radial-gradient(ellipse_at_center,_rgba(0,102,255,0.1)_0%,_transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(34,199,214,0.15)_0%,_transparent_70%)]' : 'opacity-0'
                      }`} 
                    />

                    {/* Assessment Custom Logo Visual Focus */}
                    <motion.img
                      src={assessment.logo}
                      alt={assessment.title}
                      className="w-24 h-24 object-contain relative z-10 rounded-xl"
                      animate={
                        isActive && !shouldReduceMotion
                          ? { scale: [1, 1.04, 1] }
                          : {}
                      }
                      transition={
                        isActive && !shouldReduceMotion
                          ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                          : { duration: 0 }
                      }
                    />
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="text-[11px] text-[#0066FF] dark:text-[#22C7D6] font-mono font-bold tracking-widest mb-1.5 uppercase">
                      {assessment.protocolNumber} • {assessment.category}
                    </div>
                    <h3 className="font-heading text-2xl font-extrabold text-[#090D1A] dark:text-white tracking-tight mb-2">
                      {assessment.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6 flex-1 line-clamp-3">
                      {assessment.description}
                    </p>
                    <div className={`mt-auto flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
                      isActive
                        ? 'bg-sky-50 dark:bg-[#22C7D6]/10 text-[#0066FF] dark:text-[#22C7D6] border border-sky-200 dark:border-[#22C7D6]/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent'
                    }`}>
                      {isActive ? (
                        <>
                          <Play size={15} fill="currentColor" />
                          LAUNCH PROTOCOL
                        </>
                      ) : (
                        <span>SELECT</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Navigation Next Button */}
        <button
          onClick={handleNext}
          className="absolute right-4 z-40 p-3 rounded-full bg-white/90 dark:bg-[#181D23]/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-[#20262E] transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
          aria-label="Next assessment"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Pagination Pill Dots */}
      <div className="flex items-center gap-2.5 mt-4 z-20 shrink-0">
        {DESKTOP_ASSESSMENTS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`transition-all duration-300 rounded-full h-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] ${
              idx === activeIndex
                ? 'w-8 bg-[#0066FF] dark:bg-[#22C7D6] shadow-[0_0_8px_rgba(0,102,255,0.4)] dark:shadow-[0_0_8px_rgba(34,199,214,0.4)]'
                : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
