import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { HERO_ASSESSMENTS, HeroAssessment } from '../../data/assessmentsHero';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export function AssessmentHero3D() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotionPreference();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!isPaused) {
        setActiveIndex((prev) => (prev + 1) % HERO_ASSESSMENTS.length);
      }
    }, 5000);
  }, [isPaused]);

  useEffect(() => {
    startAutoplay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoplay]);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % HERO_ASSESSMENTS.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + HERO_ASSESSMENTS.length) % HERO_ASSESSMENTS.length);
  };

  const handleSelect = (index: number) => {
    setActiveIndex(index);
  };

  const handleLaunch = () => {
    navigate(HERO_ASSESSMENTS[activeIndex].targetRoute);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is in an input or modal dialog
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex]);

  const getCardStyle = (index: number) => {
    const total = HERO_ASSESSMENTS.length;
    let offset = (index - activeIndex + total) % total;
    
    // Normalize offset to -2, -1, 0, 1, 2
    if (offset > Math.floor(total / 2)) {
      offset -= total;
    }

    // Default styles for hidden cards
    let rotateY = 0;
    let translateZ = -300;
    let scale = 0.75;
    let opacity = 0;
    let zIndex = 0;

    if (offset === 0) {
      rotateY = 0;
      translateZ = 0;
      scale = 1;
      opacity = 1;
      zIndex = 30;
    } else if (offset === -1) {
      rotateY = 16;
      translateZ = -140;
      scale = 0.88;
      opacity = 0.65;
      zIndex = 20;
    } else if (offset === 1) {
      rotateY = -16;
      translateZ = -140;
      scale = 0.88;
      opacity = 0.65;
      zIndex = 20;
    }

    if (shouldReduceMotion) {
      rotateY = 0;
      translateZ = offset === 0 ? 0 : -50;
      scale = offset === 0 ? 1 : 0.92;
    }

    return { rotateY, translateZ, scale, opacity, zIndex, offset };
  };

  return (
    <div 
      className="relative w-full h-full flex flex-col items-center justify-center py-2 min-h-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* 3D Stage */}
      <div 
        className="relative w-full max-w-4xl flex-1 min-h-[300px] max-h-[460px] flex items-center justify-center perspective-[1200px]"
      >
        <button 
          type="button"
          onClick={handlePrev}
          className="absolute left-2 sm:left-4 z-40 p-2.5 sm:p-3 rounded-full bg-[var(--surface-1)]/90 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Previous assessment protocol"
        >
          <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>

        <div className="relative w-full max-w-[460px] h-[340px] sm:h-[380px] transform-style-3d">
          <AnimatePresence initial={false}>
            {HERO_ASSESSMENTS.map((assessment, index) => {
              const { rotateY, translateZ, scale, opacity, zIndex, offset } = getCardStyle(index);
              const isActive = offset === 0;

              return (
                <motion.div
                  key={assessment.id}
                  role="button"
                  tabIndex={Math.abs(offset) <= 1 ? 0 : -1}
                  aria-label={isActive ? "Launch " + assessment.title : "Select " + assessment.title}
                  initial={false}
                  animate={{
                    rotateY,
                    z: translateZ,
                    scale,
                    opacity,
                    zIndex,
                    x: offset === -1 ? '-42%' : offset === 1 ? '42%' : '0%'
                  }}
                  transition={{
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    transformOrigin: 'center center',
                    pointerEvents: Math.abs(offset) <= 1 ? 'auto' : 'none'
                  }}
                  className={"flex flex-col bg-[var(--surface-1)] rounded-2xl border transition-colors " + (
                    isActive
                      ? 'border-[var(--accent)]/50 shadow-[0_16px_40px_rgba(0,0,0,0.6),0_0_25px_var(--accent-subtle)]'
                      : 'border-[var(--border-subtle)]'
                  ) + " overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (isActive) {
                        navigate(assessment.targetRoute);
                      } else {
                        handleSelect(index);
                      }
                    }
                  }}
                  onClick={() => {
                    if (isActive) {
                      navigate(assessment.targetRoute);
                    } else {
                      handleSelect(index);
                    }
                  }}
                >
                  <div className="relative h-[38%] min-h-[110px] w-full bg-[var(--surface-0)] flex items-center justify-center border-b border-[var(--border-subtle)] overflow-hidden">
                    {/* Visualizer Technical Grid Accent */}
                    <div 
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: 'var(--bg-grid-pattern)',
                        backgroundSize: '48px 48px'
                      }}
                    />
                    
                    {/* Assessment Custom Logo Visual Focus */}
                    <motion.img 
                      src={assessment.logo} 
                      alt={assessment.title}
                      className="w-20 h-20 sm:w-22 sm:h-22 object-contain relative z-10 rounded-xl"
                      animate={isActive ? { scale: [1, 1.04, 1] } : {}}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  
                  <div className="p-5 sm:p-6 flex flex-col flex-1">
                    <div className="text-[11px] text-[var(--accent)] font-mono font-medium tracking-widest mb-1.5 uppercase">
                      {assessment.protocolNumber} • {assessment.category}
                    </div>
                    <h3 className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
                      {assessment.title}
                    </h3>
                    <p className="text-[var(--text-secondary)] text-xs sm:text-sm leading-relaxed mb-4 flex-1 line-clamp-2 sm:line-clamp-3">
                      {assessment.description}
                    </p>
                    <div className={`mt-auto flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold tracking-wide transition-all ${
                      isActive 
                        ? 'bg-[var(--accent)] text-slate-950 hover:bg-[var(--accent-hover)] active:scale-[0.98]' 
                        : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}>
                      {isActive ? (
                        <>
                          <Play size={15} fill="currentColor" />
                          <span>LAUNCH PROTOCOL</span>
                        </>
                      ) : (
                        <span>SELECT PROTOCOL</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <button 
          type="button"
          onClick={handleNext}
          className="absolute right-2 sm:right-4 z-40 p-2.5 sm:p-3 rounded-full bg-[var(--surface-1)]/90 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Next assessment protocol"
        >
          <ChevronRight size={20} className="sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Pagination Pill Dots */}
      <div className="flex items-center gap-2.5 mt-4 z-20 shrink-0" role="tablist" aria-label="Assessment protocols">
        {HERO_ASSESSMENTS.map((assessment, idx) => (
          <button
            key={assessment.id}
            type="button"
            role="tab"
            aria-selected={idx === activeIndex}
            onClick={() => handleSelect(idx)}
            className={`transition-all duration-300 rounded-full h-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              idx === activeIndex 
                ? 'w-8 bg-[var(--accent)]' 
                : 'w-2.5 bg-[var(--border-strong)] hover:bg-[var(--text-muted)]'
            }`}
            aria-label={`Select protocol ${idx + 1}: ${assessment.title}`}
          />
        ))}
      </div>
    </div>
  );
}
