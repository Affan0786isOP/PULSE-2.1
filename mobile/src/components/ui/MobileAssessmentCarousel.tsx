import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { CANONICAL_ASSESSMENT_IDS, AssessmentId } from '@shared/contracts/common';
import { ASSESSMENT_DEFINITIONS } from '@shared/registries/assessmentRegistry';
import { HOMEPAGE_ASSESSMENT_PRESENTATION } from '@shared/homepage/assessmentPresentation';
import { triggerHaptic, useReducedMotionPreference } from '../../lib/settingsStore';

const TARGET_ROUTES: Record<AssessmentId, string> = {
  'visual-reaction': '/reaction-test',
  'direction': '/direction-test',
  'color-recognition': '/colour-recognition',
  'block-memory': '/block-memory',
  'number-memory': '/number-memory',
};

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
    targetRoute: TARGET_ROUTES[id] || '/assessments',
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
        setIsInView(entry.isIntersecting);
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

  // Autoplay Option B
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
      // Determine if swipe is primarily horizontal (> 8px movement)
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsInteracting(false);
    if (touchStartX.current === null || isHorizontalSwipe.current !== true) {
      touchStartX.current = null;
      touchStartY.current = null;
      isHorizontalSwipe.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX.current;
    const threshold = 40; // min swipe distance in px

    if (diffX > threshold) {
      handlePrev();
    } else if (diffX < -threshold) {
      handleNext();
    }

    touchStartX.current = null;
    touchStartY.current = null;
    isHorizontalSwipe.current = null;
  };

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Mobile Cognitive Assessments Carousel"
      className="relative w-full flex flex-col items-center justify-center py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00F0FF]/30 rounded-2xl"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Cards Stage with Side-Peek */}
      <div className="relative w-full h-[320px] flex items-center justify-center overflow-hidden">
        {/* Navigation Buttons */}
        <button 
          onClick={handlePrev} 
          className="absolute left-0 z-30 p-2.5 text-white/70 hover:text-white active:scale-90 transition-transform -translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] rounded-full bg-black/40 backdrop-blur-sm border border-white/5"
          aria-label="Previous assessment"
        >
          <ChevronLeft size={26} strokeWidth={2} />
        </button>
        
        <button 
          onClick={handleNext} 
          className="absolute right-0 z-30 p-2.5 text-white/70 hover:text-white active:scale-90 transition-transform translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] rounded-full bg-black/40 backdrop-blur-sm border border-white/5"
          aria-label="Next assessment"
        >
          <ChevronRight size={26} strokeWidth={2} />
        </button>

        {/* Carousel Stack Container */}
        <div className="relative w-full max-w-[280px] h-[300px] flex items-center justify-center pointer-events-none">
          <AnimatePresence initial={false} mode="popLayout">
            {MOBILE_ASSESSMENTS.map((assessment, index) => {
              const isActive = index === activeIndex;
              const isPrev = index === (activeIndex - 1 + MOBILE_ASSESSMENTS.length) % MOBILE_ASSESSMENTS.length;
              const isNext = index === (activeIndex + 1) % MOBILE_ASSESSMENTS.length;
              
              let x = 0;
              let scale = 0.7;
              let opacity = 0;
              let zIndex = 0;

              if (isActive) {
                x = 0;
                scale = 1;
                opacity = 1;
                zIndex = 20;
              } else if (isPrev) {
                x = -80;
                scale = 0.85;
                opacity = 0.4;
                zIndex = 10;
              } else if (isNext) {
                x = 80;
                scale = 0.85;
                opacity = 0.4;
                zIndex = 10;
              }

              return (
                <motion.div
                  key={assessment.id}
                  aria-hidden={!isActive}
                  initial={shouldReduceMotion ? { opacity: 0 } : { x: isNext ? 100 : -100, scale: 0.8, opacity: 0 }}
                  animate={shouldReduceMotion ? { opacity } : { x, scale, opacity, zIndex }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { x: isPrev ? -100 : 100, scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{
                    pointerEvents: (isActive || isPrev || isNext) ? 'auto' : 'none',
                  }}
                  className={`absolute w-full h-full rounded-2xl bg-[#12141A] border ${
                    isActive ? 'border-[#00F0FF]/40 shadow-[0_20px_50px_rgba(0,0,0,0.8),_0_0_30px_rgba(0,240,255,0.15)]' : 'border-white/10'
                  } flex flex-col justify-between p-5 overflow-hidden cursor-pointer`}
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
                      <span className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider block mb-1">
                        {assessment.protocolNumber}
                      </span>
                      <span className="text-[9px] font-mono text-[#8A94A6] uppercase tracking-wider block">
                        {assessment.category}
                      </span>
                    </div>
                    <img 
                      src={assessment.logo} 
                      alt={assessment.title} 
                      className="w-14 h-14 object-contain rounded-lg drop-shadow-[0_0_12px_rgba(0,240,255,0.25)] border border-white/10 bg-black/40 p-1"
                    />
                  </div>

                  {/* Dark gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
                  
                  {/* Card Bottom Meta & Actions */}
                  <div className="relative z-10 flex flex-col items-start text-left mt-auto">
                    <h3 className="font-heading text-xl font-bold text-white mb-1.5">{assessment.title}</h3>
                    <p className="text-[#8A94A6] text-xs leading-relaxed mb-4 line-clamp-2">{assessment.description}</p>
                    
                    <button 
                      type="button"
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
                          ? 'bg-[#00F0FF] text-black shadow-[0_0_16px_rgba(0,240,255,0.3)] active:scale-[0.98]' 
                          : 'bg-white/10 text-white/70 hover:bg-white/15'
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
            className={`transition-all duration-300 rounded-full h-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00F0FF] ${
              idx === activeIndex 
                ? 'w-6 bg-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.6)]' 
                : 'w-1.5 bg-white/20 hover:bg-white/40'
            }`}
            aria-label={`Go to assessment ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
