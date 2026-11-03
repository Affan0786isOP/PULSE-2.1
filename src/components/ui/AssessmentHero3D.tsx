import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { HERO_ASSESSMENTS } from '../../data/assessmentsHero';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export function AssessmentHero3D() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotionPreference();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const isPaused = isHovered || hasFocus;
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

  const handleSelect = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const springEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

  const getCardStyle = (offset: number) => {
    switch (offset) {
      case 0:
        return {
          x: 0,
          width: 440,
          height: 280,
          rotateY: 0,
          z: 0,
          scale: 1,
          opacity: 1,
          zIndex: 30,
        };
      case 1:
        return {
          x: 428,
          width: 72,
          height: 265,
          rotateY: shouldReduceMotion ? 0 : -10,
          z: shouldReduceMotion ? 0 : -40,
          scale: 1,
          opacity: 0.98,
          zIndex: 24,
        };
      case 2:
        return {
          x: 488,
          width: 68,
          height: 252,
          rotateY: shouldReduceMotion ? 0 : -14,
          z: shouldReduceMotion ? 0 : -80,
          scale: 1,
          opacity: 0.92,
          zIndex: 18,
        };
      case 3:
        return {
          x: 544,
          width: 64,
          height: 238,
          rotateY: shouldReduceMotion ? 0 : -18,
          z: shouldReduceMotion ? 0 : -120,
          scale: 1,
          opacity: 0.86,
          zIndex: 12,
        };
      case 4:
      default:
        return {
          x: 598,
          width: 58,
          height: 224,
          rotateY: shouldReduceMotion ? 0 : -22,
          z: shouldReduceMotion ? 0 : -160,
          scale: 1,
          opacity: 0.80,
          zIndex: 6,
        };
    }
  };

  return (
    <div 
      className="relative w-full h-full flex flex-col items-center justify-center py-1 min-h-0 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setHasFocus(true)}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setHasFocus(false);
        }
      }}
      onKeyDown={(event) => {
        // Scope arrow-key handling to the carousel; never hijack page-level navigation.
        const target = event.target as HTMLElement;
        if (target.closest('input, textarea, select, [role="dialog"]')) return;
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          handlePrev();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          handleNext();
        }
      }}
      role="region"
      aria-label="Assessment Protocols 3D Carousel"
    >
      {/* 3D Perspective Stage Container */}
      <div className="relative flex items-center justify-center">
        {/* Previous Button */}
        <button 
          type="button"
          onClick={handlePrev}
          className="mr-3 z-40 w-11 h-11 rounded-full bg-white dark:bg-[#181D23] shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] shrink-0"
          aria-label="Previous assessment protocol"
        >
          <ChevronLeft size={21} strokeWidth={2.4} />
        </button>

        {/* 3D Perspective Stage */}
        <div 
          className="relative w-[680px] h-[300px] flex items-center justify-center"
          style={{ perspective: 1200 }}
        >
          {/* 3D Card Stack Container */}
          <div className="relative w-full h-[300px] transform-style-3d">
            {HERO_ASSESSMENTS.map((assessment, index) => {
              const offset = (index - activeIndex + HERO_ASSESSMENTS.length) % HERO_ASSESSMENTS.length;
              const isActive = offset === 0;
              const style = getCardStyle(offset);

              return (
                <motion.div
                  key={assessment.id}
                  role="button"
                  tabIndex={0}
                  aria-label={isActive ? `Launch ${assessment.title}` : `Select ${assessment.title}`}
                  aria-current={isActive ? 'true' : 'false'}
                  initial={false}
                  animate={{
                    x: style.x,
                    width: style.width,
                    height: style.height,
                    rotateY: style.rotateY,
                    z: style.z,
                    scale: style.scale,
                    opacity: style.opacity,
                    zIndex: style.zIndex,
                  }}
                  transition={{
                    duration: shouldReduceMotion ? 0.05 : 0.42,
                    ease: springEase,
                  }}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    y: '-50%',
                    left: 0,
                    transformOrigin: 'left center',
                    zIndex: style.zIndex,
                    pointerEvents: 'auto',
                  }}
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
                  className="rounded-[28px] overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] hover:ring-2 hover:ring-[#0066FF]/30 dark:hover:ring-[#22C7D6]/40 transition-shadow"
                >
                  {/* Background Layer 1: Active Card Dual-Tone Slate Theme Surface */}
                  <div 
                    className={`absolute inset-0 rounded-[28px] bg-slate-800 dark:bg-[#181D23] border border-slate-700/80 dark:border-slate-800 shadow-[0_16px_36px_rgba(15,23,42,0.22)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.5)] text-white dark:text-slate-100 transition-opacity duration-300 pointer-events-none ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                    aria-hidden="true"
                  />

                  {/* Background Layer 2: Inactive Card Dual-Tone Slate Theme Surface */}
                  <div 
                    className={`absolute inset-0 rounded-[24px] bg-slate-800/90 dark:bg-[#12161B] border border-slate-700/70 dark:border-slate-800/80 shadow-md hover:border-slate-600 dark:hover:border-slate-700 text-white dark:text-slate-200 transition-all duration-300 pointer-events-none ${
                      isActive ? 'opacity-0' : 'opacity-100'
                    }`}
                    aria-hidden="true"
                  />

                  {/* Content Layer 1: Active Card Full Layout (Fixed 440px width prevents any text squishing) */}
                  <div 
                    className={`absolute inset-0 w-[440px] h-[280px] p-6 sm:p-7 flex flex-row items-center justify-between gap-4 transition-opacity duration-300 ${
                      isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    {/* Left: Metadata & Actions */}
                    <div className="flex flex-col justify-between h-full z-10 flex-1 min-w-0">
                      <div>
                        {/* Protocol Counter (Clean 01 / 05 counter) */}
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="font-mono text-[13px] font-bold text-white tracking-wider">
                            {String(index + 1).padStart(2, '0')} <span className="text-slate-400 font-medium">/ 05</span>
                          </span>
                        </div>

                        {/* Assessment Title */}
                        <h3 className="font-heading font-extrabold text-2xl text-white tracking-tight leading-tight mb-2 whitespace-nowrap">
                          {assessment.title}
                        </h3>

                        {/* Assessment Subtext */}
                        <p className="text-xs sm:text-[13px] text-slate-300 font-normal leading-relaxed max-w-[210px] line-clamp-2">
                          {assessment.description}
                        </p>
                      </div>

                      {/* Secondary Action: Try Protocol Button */}
                      <div className="mt-3">
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-600 dark:border-slate-700 bg-slate-700/80 dark:bg-[#12161B] hover:bg-slate-700 dark:hover:bg-slate-800 text-sky-300 dark:text-[#22C7D6] text-xs sm:text-[12.5px] font-semibold shadow-sm active:scale-95 transition-all">
                          <span>Try {assessment.title}</span>
                          <ArrowRight size={13} strokeWidth={2.2} />
                        </div>
                      </div>
                    </div>

                    {/* Right: Protocol Art Container */}
                    <div className="relative w-36 h-36 flex items-center justify-center shrink-0 z-10">
                      {/* Theme-Adaptive Medallion Shell */}
                      <div 
                        className="absolute inset-0 rounded-full bg-slate-700/80 dark:bg-[#12161B] border border-slate-600/80 dark:border-slate-800 shadow-sm pointer-events-none" 
                        aria-hidden="true"
                      />

                      {/* Protocol Logo Asset */}
                      <motion.img 
                        src={assessment.logo} 
                        alt={assessment.title}
                        className="w-22 h-22 sm:w-24 sm:h-24 object-contain relative z-10" 
                        animate={isActive && !shouldReduceMotion ? { scale: [1, 1.02, 1] } : {}}
                        transition={{ duration: 3.5, repeat: shouldReduceMotion ? 0 : Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  </div>

                  {/* Content Layer 2: Inactive Card Identifiable Art & Label */}
                  <div 
                    className={`w-full h-full relative flex flex-col items-center pt-4 pb-3 overflow-hidden transition-all duration-300 group-hover:bg-white/10 dark:group-hover:bg-white/5 ${
                      isActive ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
                    }`}
                  >
                    {/* Top Protocol Number Badge */}
                    <div className="z-10 font-mono text-[10px] font-bold text-slate-200 dark:text-slate-300 bg-slate-900/80 dark:bg-[#181D23] px-1.5 py-0.5 rounded shadow-sm border border-slate-700 dark:border-slate-700 shrink-0">
                      0{index + 1}
                    </div>

                    {/* Fixed-Position Logo Badge to prevent up-and-down visual hopping */}
                    <div className="relative flex items-center justify-center mt-3 shrink-0">
                      <div 
                        className="w-10 h-10 rounded-full bg-slate-700/80 dark:bg-[#181D23] border border-slate-600/80 dark:border-slate-800 shadow-sm pointer-events-none flex items-center justify-center"
                        aria-hidden="true"
                      >
                        <img 
                          src={assessment.logo} 
                          alt={assessment.title}
                          className="w-6 h-6 object-contain"
                        />
                      </div>
                    </div>

                    {/* Vertical Readable Title Label for Inactive Cards */}
                    <div className="z-10 text-[10px] font-bold text-slate-200 dark:text-slate-300 tracking-wider uppercase whitespace-nowrap [writing-mode:vertical-rl] rotate-180 opacity-90 mt-auto overflow-hidden">
                      {assessment.title}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Next Button */}
        <button 
          type="button"
          onClick={handleNext}
          className="ml-3 z-40 w-11 h-11 rounded-full bg-white dark:bg-[#181D23] shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] shrink-0"
          aria-label="Next assessment protocol"
        >
          <ChevronRight size={21} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
