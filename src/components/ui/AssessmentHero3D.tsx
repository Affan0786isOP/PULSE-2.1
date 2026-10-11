import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
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
    if (shouldReduceMotion) return;
    intervalRef.current = setInterval(() => {
      if (!isPaused) {
        setActiveIndex((prev) => (prev + 1) % HERO_ASSESSMENTS.length);
      }
    }, 5000);
  }, [isPaused, shouldReduceMotion]);

  useEffect(() => {
    startAutoplay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoplay]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % HERO_ASSESSMENTS.length);
  }, []);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + HERO_ASSESSMENTS.length) % HERO_ASSESSMENTS.length);
  }, []);

  const handleSelect = (index: number) => {
    setActiveIndex(index);
  };

  const handleLaunch = () => {
    navigate(HERO_ASSESSMENTS[activeIndex].targetRoute);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is in an input, textarea, select, or modal dialog
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.closest('[role="dialog"]') ||
        document.querySelector('[role="dialog"]')
      ) {
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
  }, [handleNext, handlePrev]);

  const getCardStyle = (index: number) => {
    const total = HERO_ASSESSMENTS.length;
    const offset = (index - activeIndex + total) % total;

    let x = 0;
    let width = 440;
    let height = 280;
    let rotateY = 0;
    let translateZ = 0;
    let scale = 1;
    let opacity = 1;
    let zIndex = 30;

    if (offset === 0) {
      x = 0;
      width = 440;
      height = 280;
      rotateY = 0;
      translateZ = 0;
      scale = 1;
      opacity = 1;
      zIndex = 30;
    } else if (offset === 1) {
      x = 428;
      width = 72;
      height = 265;
      rotateY = -10;
      translateZ = -40;
      scale = 1;
      opacity = 0.98;
      zIndex = 24;
    } else if (offset === 2) {
      x = 488;
      width = 68;
      height = 252;
      rotateY = -14;
      translateZ = -80;
      scale = 1;
      opacity = 0.92;
      zIndex = 18;
    } else if (offset === 3) {
      x = 544;
      width = 64;
      height = 238;
      rotateY = -18;
      translateZ = -120;
      scale = 1;
      opacity = 0.86;
      zIndex = 12;
    } else if (offset === 4) {
      x = 598;
      width = 58;
      height = 224;
      rotateY = -22;
      translateZ = -160;
      scale = 1;
      opacity = 0.80;
      zIndex = 6;
    }

    if (shouldReduceMotion) {
      rotateY = 0;
      translateZ = 0;
      scale = 1;
      opacity = offset === 0 ? 1 : 0.85;
    }

    return { rotateY, translateZ, scale, opacity, zIndex, offset, x, width, height };
  };

  return (
    <div 
      className="relative w-full h-full flex flex-col items-center justify-center py-1 min-h-0 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Assessment Protocols 3D Carousel"
    >
      {/* 3D Stage */}
      <div 
        className="relative w-[660px] max-w-full flex-1 min-h-[300px] max-h-[350px] flex items-center justify-start perspective-[1400px] origin-center scale-[0.93] xl:scale-100 transition-transform"
      >
        {/* Previous Button */}
        <button 
          type="button"
          onClick={handlePrev}
          className="absolute -left-4 sm:-left-5 lg:-left-6 z-40 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white shadow-[0_4px_16px_rgba(0,102,255,0.12),0_2px_4px_rgba(0,0,0,0.04)] border border-sky-100 flex items-center justify-center text-slate-700 hover:text-[#0066FF] hover:border-[#0066FF]/40 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
          aria-label="Previous assessment protocol"
        >
          <ChevronLeft size={21} strokeWidth={2.4} />
        </button>

        {/* 3D Card Stack */}
        <div className="relative w-full h-[300px] transform-style-3d">
          <AnimatePresence initial={false}>
            {HERO_ASSESSMENTS.map((assessment, index) => {
              const { rotateY, translateZ, scale, opacity, zIndex, offset, x, width, height } = getCardStyle(index);
              const isActive = offset === 0;

              return (
                <motion.div
                  key={assessment.id}
                  role="button"
                  tabIndex={Math.abs(offset) <= 1 ? 0 : -1}
                  aria-label={isActive ? "Launch " + assessment.title : "Select " + assessment.title}
                  aria-current={isActive ? 'true' : undefined}
                  initial={false}
                  animate={{
                    rotateY,
                    z: translateZ,
                    scale,
                    opacity,
                    zIndex,
                    x,
                    width,
                    height
                  }}
                  transition={{
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    marginTop: -height / 2,
                    transformOrigin: 'left center',
                    pointerEvents: 'auto'
                  }}
                  className={`flex transition-all cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
                    isActive
                      ? 'rounded-[28px] bg-gradient-to-br from-white/98 via-[#F9FBFF]/96 to-[#EAF3FD]/92 border border-white/90 shadow-[0_20px_50px_rgba(0,102,255,0.13),0_4px_16px_rgba(0,0,0,0.04)] text-[#090D1A]'
                      : 'rounded-[22px] bg-gradient-to-b from-[#2A374A]/95 via-[#1C2638]/95 to-[#111A29]/95 border border-white/70 shadow-[0_10px_26px_rgba(0,0,0,0.35)] text-white hover:border-sky-300/80 transition-colors'
                  }`}
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
                  {isActive ? (
                    /* Active Card Layout (Matching Light Reference) */
                    <div className="w-full h-full p-6 sm:p-7 flex flex-row items-center justify-between gap-4 relative">
                      {/* Soft Blue Atmospheric Wash on Right Half of Card */}
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-[55%] bg-gradient-to-l from-[#C0DEFA]/85 via-[#DBECFC]/50 to-transparent pointer-events-none rounded-r-[28px]" 
                        aria-hidden="true"
                      />

                      {/* Left: Metadata & Actions */}
                      <div className="flex flex-col justify-between h-full z-10 flex-1 min-w-0">
                        <div>
                          {/* Protocol Counter & Progress Dashes */}
                          <div className="flex items-center gap-2.5 mb-2.5">
                            <span className="font-mono text-[11.5px] font-bold text-slate-800 tracking-wider">
                              {String(index + 1).padStart(2, '0')} <span className="text-slate-400 font-normal">/ 05</span>
                            </span>
                            <div className="flex items-center gap-1.5" aria-hidden="true">
                              {[0, 1, 2, 3, 4].map((step) => (
                                <div 
                                  key={step} 
                                  className={`h-[3.5px] rounded-full transition-all duration-300 ${
                                    step === activeIndex 
                                      ? 'w-4 bg-[#0066FF]' 
                                      : 'w-2.5 bg-slate-200'
                                  }`} 
                                />
                              ))}
                            </div>
                          </div>

                          {/* Assessment Title */}
                          <h3 className="font-heading font-extrabold text-2xl text-[#090D1A] tracking-tight leading-tight mb-2">
                            {assessment.title}
                          </h3>

                          {/* Assessment Subtext */}
                          <p className="text-xs sm:text-[13px] text-[#475569] leading-relaxed max-w-[200px] line-clamp-2">
                            {assessment.description}
                          </p>
                        </div>

                        {/* CTA: Try Test Button */}
                        <div className="mt-3">
                          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:from-[#005FE6] hover:to-[#0047B3] text-white text-xs sm:text-[13px] font-semibold shadow-[0_4px_12px_rgba(0,102,255,0.35)] hover:shadow-[0_6px_16px_rgba(0,102,255,0.45)] active:scale-95 transition-all">
                            <span>Try Test</span>
                            <ArrowRight size={14} strokeWidth={2.4} />
                          </div>
                        </div>
                      </div>

                      {/* Right: Glowing Protocol Art */}
                      <div className="relative w-36 h-36 flex items-center justify-center shrink-0 z-10">
                        {/* Concentric Ambient Rings & Radial Halo */}
                        <div 
                          className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.55)_0%,rgba(0,102,255,0.32)_45%,rgba(199,226,251,0.2)_70%,transparent_100%)] pointer-events-none" 
                          aria-hidden="true"
                        />
                        <div 
                          className="absolute inset-2 rounded-full border border-sky-300/60 pointer-events-none shadow-[inset_0_0_14px_rgba(0,102,255,0.18)]" 
                          aria-hidden="true"
                        />
                        <div 
                          className="absolute inset-6 rounded-full border border-sky-200/40 pointer-events-none" 
                          aria-hidden="true"
                        />

                        {/* Protocol Logo Asset */}
                        <motion.img 
                          src={assessment.logo} 
                          alt={assessment.title}
                          className="w-26 h-26 sm:w-28 sm:h-28 object-contain relative z-10 drop-shadow-[0_6px_18px_rgba(0,102,255,0.45)] drop-shadow-[0_0_14px_rgba(0,240,255,0.75)] filter contrast-125 brightness-105"
                          animate={isActive ? { scale: [1, 1.03, 1] } : {}}
                          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Inactive Card Layout (Sleek 3D Stack with Exposed, Clearly Visible Protocol Art) */
                    <div className="w-full h-full relative flex items-center overflow-hidden">
                      {/* Ambient inner soft cyan glow */}
                      <div 
                        className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(0,240,255,0.2)_0%,transparent_70%)] pointer-events-none" 
                        aria-hidden="true" 
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <img 
                          src={assessment.logo} 
                          alt={assessment.title}
                          className={`object-contain relative z-10 drop-shadow-[0_0_14px_rgba(0,240,255,0.95)] drop-shadow-[0_0_4px_rgba(0,180,255,0.8)] filter contrast-125 brightness-110 ${
                            offset === 1 ? 'w-11 h-11' :
                            offset === 2 ? 'w-10 h-10' :
                            offset === 3 ? 'w-9 h-9' : 'w-8 h-8'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Next Button */}
        <button 
          type="button"
          onClick={handleNext}
          className="absolute -right-3 sm:-right-4 lg:-right-5 z-40 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white shadow-[0_4px_16px_rgba(0,102,255,0.12),0_2px_4px_rgba(0,0,0,0.04)] border border-sky-100 flex items-center justify-center text-slate-700 hover:text-[#0066FF] hover:border-[#0066FF]/40 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
          aria-label="Next assessment protocol"
        >
          <ChevronRight size={21} strokeWidth={2.4} />
        </button>
      </div>

      {/* Pagination Pill Dots */}
      <div className="flex items-center gap-2.5 mt-3 z-20 shrink-0" role="tablist" aria-label="Assessment protocols">
        {HERO_ASSESSMENTS.map((assessment, idx) => (
          <button
            key={assessment.id}
            type="button"
            role="tab"
            aria-selected={idx === activeIndex}
            onClick={() => handleSelect(idx)}
            className={`transition-all duration-300 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
              idx === activeIndex 
                ? 'w-2.5 h-2.5 bg-[#0066FF] ring-4 ring-[#0066FF]/20' 
                : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
            }`}
            aria-label={`Select protocol ${idx + 1}: ${assessment.title}`}
          />
        ))}
      </div>
    </div>
  );
}
