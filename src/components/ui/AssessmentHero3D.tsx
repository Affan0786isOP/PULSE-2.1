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
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Continuous scale factor for carousel geometry (S = 1.0 at <= 1280px, S = 3.5 at >= 7680px)
  const getScaleFactor = () => {
    if (typeof window === 'undefined') return 1;
    const w = window.innerWidth;
    if (w <= 1280) return 1;
    if (w >= 7680) return 3.5;
    return 1 + 2.5 * ((w - 1280) / (7680 - 1280));
  };

  const [carouselScale, setCarouselScale] = useState(getScaleFactor);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId: number | null = null;
    const onResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        setCarouselScale(getScaleFactor());
        rafId = null;
      });
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

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

  const springEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

  const getCardStyle = (offset: number) => {
    switch (offset) {
      case 0:
        return {
          x: 0,
          width: 440 * carouselScale,
          height: 280 * carouselScale,
          rotateY: 0,
          z: 0,
          scale: 1,
          opacity: 1,
          zIndex: 30,
        };
      case 1:
        return {
          x: 428 * carouselScale,
          width: 72 * carouselScale,
          height: 265 * carouselScale,
          rotateY: shouldReduceMotion ? 0 : -10,
          z: shouldReduceMotion ? 0 : -40,
          scale: 1,
          opacity: 0.98,
          zIndex: 24,
        };
      case 2:
        return {
          x: 488 * carouselScale,
          width: 68 * carouselScale,
          height: 252 * carouselScale,
          rotateY: shouldReduceMotion ? 0 : -14,
          z: shouldReduceMotion ? 0 : -80,
          scale: 1,
          opacity: 0.92,
          zIndex: 18,
        };
      case 3:
        return {
          x: 544 * carouselScale,
          width: 64 * carouselScale,
          height: 238 * carouselScale,
          rotateY: shouldReduceMotion ? 0 : -18,
          z: shouldReduceMotion ? 0 : -120,
          scale: 1,
          opacity: 0.86,
          zIndex: 12,
        };
      case 4:
      default:
        return {
          x: 598 * carouselScale,
          width: 58 * carouselScale,
          height: 224 * carouselScale,
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
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      role="region"
      aria-label="Assessment Protocols 3D Carousel"
    >
      {/* 3D Perspective Stage */}
      <div 
        className="relative w-full flex items-center justify-center"
        style={{ 
          maxWidth: `${680 * carouselScale}px`,
          height: `${300 * carouselScale}px`,
          perspective: 1200 
        }}
      >
        {/* Previous Button */}
        <button 
          type="button"
          onClick={handlePrev}
          style={{
            left: `${-24 * carouselScale}px`,
            width: `${44 * carouselScale}px`,
            height: `${44 * carouselScale}px`,
          }}
          className="absolute z-40 rounded-full bg-white shadow-[0_4px_16px_rgba(0,102,255,0.12),0_2px_4px_rgba(0,0,0,0.04)] border border-sky-100 flex items-center justify-center text-slate-700 hover:text-[#0066FF] hover:border-[#0066FF]/40 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
          aria-label="Previous assessment protocol"
        >
          <ChevronLeft size={Math.round(21 * carouselScale)} strokeWidth={2.4} />
        </button>

        {/* 3D Card Stack Container */}
        <div 
          className="relative w-full transform-style-3d"
          style={{ height: `${300 * carouselScale}px` }}
        >
          {HERO_ASSESSMENTS.map((assessment, index) => {
            const offset = (index - activeIndex + HERO_ASSESSMENTS.length) % HERO_ASSESSMENTS.length;
            const isActive = offset === 0;
            const style = getCardStyle(offset);

            return (
              <motion.div
                key={assessment.id}
                role="button"
                tabIndex={Math.abs(offset) <= 1 ? 0 : -1}
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
                className="rounded-[28px] overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
              >
                {/* Background Layer 1: Active Card Light Gradient & Shadow */}
                <div 
                  className={`absolute inset-0 rounded-[28px] bg-gradient-to-br from-white/98 via-[#F9FBFF]/96 to-[#EAF3FD]/92 border border-white/90 shadow-[0_20px_50px_rgba(0,102,255,0.13),0_4px_16px_rgba(0,0,0,0.04)] text-[#090D1A] transition-opacity duration-300 pointer-events-none ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden="true"
                />

                {/* Background Layer 2: Inactive Card Light Theme Surface */}
                <div 
                  className={`absolute inset-0 rounded-[24px] bg-gradient-to-b from-white/95 via-[#F1F6FD]/95 to-[#E4F0FC]/95 border border-sky-200/90 shadow-[0_8px_22px_rgba(0,102,255,0.08),0_2px_6px_rgba(0,0,0,0.03)] hover:border-[#0066FF]/40 hover:shadow-[0_12px_28px_rgba(0,102,255,0.12)] text-[#090D1A] transition-all duration-300 pointer-events-none ${
                    isActive ? 'opacity-0' : 'opacity-100'
                  }`}
                  aria-hidden="true"
                />

                {/* Content Layer 1: Active Card Full Layout */}
                <div 
                  className={`absolute inset-0 w-full h-full p-6 sm:p-7 min-[1280px]:p-[clamp(28px,calc(16.8px+0.875vw),84px)] flex flex-row items-center justify-between gap-4 transition-opacity duration-300 ${
                    isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  {/* Soft Blue Atmospheric Wash on Right Half of Card */}
                  <div 
                    className="absolute right-0 top-0 bottom-0 w-[55%] bg-gradient-to-l from-[#C0DEFA]/85 via-[#DBECFC]/50 to-transparent pointer-events-none rounded-r-[28px]" 
                    aria-hidden="true"
                  />

                  {/* Left: Metadata & Actions */}
                  <div className="flex flex-col justify-between h-full z-10 flex-1 min-w-0">
                    <div>
                      {/* Protocol Counter */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="font-mono text-[11.5px] min-[1280px]:text-[clamp(11.5px,calc(7.4px+0.32031vw),32px)] font-bold text-slate-800 tracking-wider">
                          {String(index + 1).padStart(2, '0')} <span className="text-slate-400 font-normal">/ 05</span>
                        </span>
                      </div>

                      {/* Assessment Title */}
                      <h3 className="font-heading font-extrabold text-2xl min-[1280px]:text-[clamp(24px,calc(15.2px+0.6875vw),68px)] text-[#090D1A] tracking-tight leading-tight mb-2 whitespace-nowrap">
                        {assessment.title}
                      </h3>

                      {/* Assessment Subtext */}
                      <p className="text-xs sm:text-[13px] min-[1280px]:text-[clamp(13px,calc(8.4px+0.35938vw),36px)] text-[#475569] leading-relaxed max-w-[200px] min-[1280px]:max-w-[clamp(200px,calc(100px+7.8125vw),600px)] line-clamp-2">
                        {assessment.description}
                      </p>
                    </div>

                    {/* CTA: Try Test Button */}
                    <div className="mt-3">
                      <div className="inline-flex items-center gap-1.5 px-4 min-[1280px]:px-[clamp(16px,calc(10px+0.46875vw),42px)] py-2 min-[1280px]:py-[clamp(8px,calc(5px+0.234375vw),22px)] rounded-full bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:from-[#005FE6] hover:to-[#0047B3] text-white text-xs sm:text-[13px] min-[1280px]:text-[clamp(13px,calc(8.4px+0.35938vw),36px)] font-semibold shadow-[0_4px_12px_rgba(0,102,255,0.35)] hover:shadow-[0_6px_16px_rgba(0,102,255,0.45)] active:scale-95 transition-shadow">
                        <span>Try Test</span>
                        <ArrowRight size={14} strokeWidth={2.4} />
                      </div>
                    </div>
                  </div>

                  {/* Right: High-Contrast Glowing Protocol Art Container */}
                  <div 
                    className="relative flex items-center justify-center shrink-0 z-10"
                    style={{
                      width: `${144 * carouselScale}px`,
                      height: `${144 * carouselScale}px`,
                    }}
                  >
                    {/* Outer Ambient Atmospheric Halo */}
                    <div 
                      className="absolute -inset-2 rounded-full bg-[radial-gradient(circle,rgba(0,102,255,0.22)_0%,rgba(56,189,248,0.12)_45%,transparent_70%)] pointer-events-none" 
                      aria-hidden="true"
                    />

                    {/* Dark High-Contrast Background Disc for Crisp Logo Legibility */}
                    <div 
                      className="absolute inset-0 rounded-full bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#080E1C] border border-sky-400/35 shadow-[0_12px_28px_rgba(0,102,255,0.22),inset_0_0_20px_rgba(0,210,255,0.15)] pointer-events-none" 
                      aria-hidden="true"
                    />

                    {/* Inner Calibration Rings */}
                    <div 
                      className="absolute inset-2.5 rounded-full border border-sky-400/25 pointer-events-none shadow-[inset_0_0_12px_rgba(0,102,255,0.2)]" 
                      aria-hidden="true"
                    />
                    <div 
                      className="absolute inset-5 rounded-full border border-sky-300/15 pointer-events-none" 
                      aria-hidden="true"
                    />

                    {/* Protocol Logo Asset */}
                    <motion.img 
                      src={assessment.logo} 
                      alt={assessment.title}
                      style={{
                        width: `${108 * carouselScale}px`,
                        height: `${108 * carouselScale}px`,
                      }}
                      className="object-contain relative z-10 drop-shadow-[0_0_14px_rgba(0,240,255,0.85)] drop-shadow-[0_4px_12px_rgba(0,102,255,0.5)] filter contrast-125 brightness-110"
                      animate={isActive ? { scale: [1, 1.03, 1] } : {}}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                </div>

                {/* Content Layer 2: Inactive Card Exposed Logo Art */}
                <div 
                  className={`w-full h-full relative flex items-center overflow-hidden transition-opacity duration-300 ${
                    isActive ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
                  }`}
                >
                  {/* Ambient inner soft cyan glow */}
                  <div 
                    className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(56,189,248,0.22)_0%,rgba(0,102,255,0.08)_50%,transparent_75%)] pointer-events-none" 
                    aria-hidden="true" 
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    {/* Dark High-Contrast Badge Halo Behind Inactive Icon */}
                    <div 
                      style={{
                        width: `${(offset === 1 ? 48 : offset === 2 ? 44 : offset === 3 ? 40 : 36) * carouselScale}px`,
                        height: `${(offset === 1 ? 48 : offset === 2 ? 44 : offset === 3 ? 40 : 36) * carouselScale}px`,
                      }}
                      className="absolute rounded-full bg-gradient-to-b from-[#1E293B] via-[#111C2E] to-[#09111F] border border-sky-400/40 shadow-[0_3px_10px_rgba(0,0,0,0.25),inset_0_0_8px_rgba(0,210,255,0.18)] pointer-events-none"
                      aria-hidden="true"
                    />
                    <img 
                      src={assessment.logo} 
                      alt={assessment.title}
                      style={{
                        width: `${(offset === 1 ? 32 : offset === 2 ? 30 : offset === 3 ? 28 : 26) * carouselScale}px`,
                        height: `${(offset === 1 ? 32 : offset === 2 ? 30 : offset === 3 ? 28 : 26) * carouselScale}px`,
                      }}
                      className="object-contain relative z-10 drop-shadow-[0_0_8px_rgba(0,220,255,0.85)] filter contrast-125 brightness-110"
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Next Button */}
        <button 
          type="button"
          onClick={handleNext}
          style={{
            right: `${-24 * carouselScale}px`,
            width: `${44 * carouselScale}px`,
            height: `${44 * carouselScale}px`,
          }}
          className="absolute z-40 rounded-full bg-white shadow-[0_4px_16px_rgba(0,102,255,0.12),0_2px_4px_rgba(0,0,0,0.04)] border border-sky-100 flex items-center justify-center text-slate-700 hover:text-[#0066FF] hover:border-[#0066FF]/40 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
          aria-label="Next assessment protocol"
        >
          <ChevronRight size={Math.round(21 * carouselScale)} strokeWidth={2.4} />
        </button>
      </div>

      {/* Pagination Pill Dots */}
      <div 
        className="flex items-center z-20 shrink-0" 
        style={{ 
          gap: `${10 * carouselScale}px`,
          marginTop: `${12 * carouselScale}px`
        }}
        role="tablist" 
        aria-label="Assessment protocols"
      >
        {HERO_ASSESSMENTS.map((assessment, idx) => (
          <button
            key={assessment.id}
            type="button"
            role="tab"
            aria-selected={idx === activeIndex}
            onClick={() => handleSelect(idx)}
            style={{
              width: idx === activeIndex ? `${10 * carouselScale}px` : `${8 * carouselScale}px`,
              height: idx === activeIndex ? `${10 * carouselScale}px` : `${8 * carouselScale}px`,
            }}
            className={`transition-all duration-300 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
              idx === activeIndex 
                ? 'bg-[#0066FF] ring-4 ring-[#0066FF]/20' 
                : 'bg-[#64748B] hover:bg-[#475569]'
            }`}
            aria-label={`Select protocol ${idx + 1}: ${assessment.title}`}
          />
        ))}
      </div>
    </div>
  );
}
