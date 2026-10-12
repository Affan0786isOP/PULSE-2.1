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
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      role="region"
      aria-label="Assessment Protocols 3D Carousel"
    >
      {/* 3D Perspective Stage Container */}
      <div className="relative flex items-center justify-center">
        {/* Previous Button */}
        <button 
          type="button"
          onClick={handlePrev}
          className="mr-3 z-40 w-11 h-11 rounded-full bg-white shadow-[0_4px_16px_rgba(0,102,255,0.12),0_2px_4px_rgba(0,0,0,0.04)] border border-sky-100 flex items-center justify-center text-slate-700 hover:text-[#0066FF] hover:border-[#0066FF]/40 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] shrink-0"
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

                  {/* Content Layer 1: Active Card Full Layout (Fixed 440px width prevents any text squishing) */}
                  <div 
                    className={`absolute inset-0 w-[440px] h-[280px] p-6 sm:p-7 flex flex-row items-center justify-between gap-4 transition-opacity duration-300 ${
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
                        {/* Protocol Counter (Streamlined, without redundant segments) */}
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="font-mono text-[13px] font-bold text-[#090D1A] tracking-wider">
                            {String(index + 1).padStart(2, '0')} <span className="text-slate-500 font-medium">/ 05</span>
                          </span>
                        </div>

                        {/* Assessment Title */}
                        <h3 className="font-heading font-extrabold text-2xl text-[#090D1A] tracking-tight leading-tight mb-2 whitespace-nowrap">
                          {assessment.title}
                        </h3>

                        {/* Assessment Subtext */}
                        <p className="text-xs sm:text-[13px] text-[#334155] font-normal leading-relaxed max-w-[210px] line-clamp-2">
                          {assessment.description}
                        </p>
                      </div>

                      {/* Secondary Action: Try Protocol Outline Button */}
                      <div className="mt-3">
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-sky-300/80 bg-white/80 hover:bg-sky-50/80 text-[#0066FF] hover:text-[#0052CC] text-xs sm:text-[12.5px] font-semibold shadow-sm hover:shadow active:scale-95 transition-all">
                          <span>Try {assessment.title}</span>
                          <ArrowRight size={13} strokeWidth={2.2} />
                        </div>
                      </div>
                    </div>

                    {/* Right: Soft Brand-Tinted Blue Protocol Art Container */}
                    <div className="relative w-36 h-36 flex items-center justify-center shrink-0 z-10">
                      {/* Outer Ambient Atmospheric Halo */}
                      <div 
                        className="absolute -inset-2 rounded-full bg-[radial-gradient(circle,rgba(0,102,255,0.08)_0%,rgba(186,230,253,0.18)_50%,transparent_70%)] pointer-events-none" 
                        aria-hidden="true"
                      />

                      {/* Restrained Airy Pale-Blue Surface Disc with Subtle Sky Border */}
                      <div 
                        className="absolute inset-0 rounded-full bg-gradient-to-b from-[#F0F7FF] via-[#E4F0FC] to-[#D5E8FD] border border-[#BFDBFE] shadow-[0_8px_20px_rgba(0,102,255,0.08),inset_0_1px_2px_rgba(255,255,255,0.9)] pointer-events-none" 
                        aria-hidden="true"
                      />

                      {/* Soft Brand-Blue Tinted Core Well (Airy and harmonious with light theme) */}
                      <div 
                        className="absolute inset-2.5 rounded-full bg-gradient-to-b from-[#1E3A8A]/25 via-[#2563EB]/20 to-[#1D4ED8]/30 border border-sky-400/30 shadow-[inset_0_2px_6px_rgba(0,102,255,0.1)] pointer-events-none" 
                        aria-hidden="true"
                      />

                      {/* Protocol Logo Asset */}
                      <motion.img 
                        src={assessment.logo} 
                        alt={assessment.title}
                        className="w-20 h-20 sm:w-22 sm:h-22 object-contain relative z-10 drop-shadow-[0_4px_12px_rgba(0,102,255,0.3)] filter contrast-110 brightness-105"
                        animate={isActive ? { scale: [1, 1.02, 1] } : {}}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  </div>

                  {/* Content Layer 2: Inactive Card Identifiable Art & Label */}
                  <div 
                    className={`w-full h-full relative flex flex-col items-center justify-between py-4 overflow-hidden transition-all duration-300 group ${
                      isActive ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto hover:bg-sky-50/50'
                    }`}
                  >
                    {/* Ambient inner soft pale-blue glow */}
                    <div 
                      className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(186,230,253,0.3)_0%,rgba(0,102,255,0.06)_50%,transparent_75%)] pointer-events-none" 
                      aria-hidden="true" 
                    />
                    
                    {/* Top Protocol Number Badge */}
                    <div className="z-10 font-mono text-[10.5px] font-bold text-slate-800 bg-white/95 px-1.5 py-0.5 rounded shadow-sm border border-slate-300">
                      0{index + 1}
                    </div>

                    {/* Identifiable Restrained Logo Badge */}
                    <div className="relative flex items-center justify-center my-auto">
                      <div 
                        className={`absolute rounded-full bg-gradient-to-b from-[#1E3A8A]/30 via-[#2563EB]/25 to-[#1D4ED8]/35 border border-sky-400/40 shadow-[0_2px_6px_rgba(0,102,255,0.12)] pointer-events-none group-hover:scale-105 transition-transform ${
                          offset === 1 ? 'w-10 h-10' :
                          offset === 2 ? 'w-9.5 h-9.5' :
                          offset === 3 ? 'w-9 h-9' : 'w-8.5 h-8.5'
                        }`}
                        aria-hidden="true"
                      />
                      <img 
                        src={assessment.logo} 
                        alt={assessment.title}
                        className={`object-contain relative z-10 drop-shadow-[0_2px_6px_rgba(0,102,255,0.25)] filter contrast-110 brightness-105 group-hover:scale-105 transition-transform ${
                          offset === 1 ? 'w-6.5 h-6.5' :
                          offset === 2 ? 'w-6 h-6' :
                          offset === 3 ? 'w-5.5 h-5.5' : 'w-5 h-5'
                        }`}
                      />
                    </div>

                    {/* Vertical Readable Title Label for Inactive Cards */}
                    <div className="z-10 text-[11px] font-bold text-[#0F172A] tracking-wider uppercase whitespace-nowrap [writing-mode:vertical-rl] rotate-180 group-hover:text-[#0066FF] transition-colors mt-1">
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
          className="ml-3 z-40 w-11 h-11 rounded-full bg-white shadow-[0_4px_16px_rgba(0,102,255,0.12),0_2px_4px_rgba(0,0,0,0.04)] border border-sky-100 flex items-center justify-center text-slate-700 hover:text-[#0066FF] hover:border-[#0066FF]/40 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] shrink-0"
          aria-label="Next assessment protocol"
        >
          <ChevronRight size={21} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
