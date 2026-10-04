import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { CANONICAL_ASSESSMENT_IDS, AssessmentId } from '@shared/contracts/common';
import { ASSESSMENT_DEFINITIONS } from '@shared/registries/assessmentRegistry';
import { HOMEPAGE_ASSESSMENT_PRESENTATION } from '@shared/homepage/assessmentPresentation';
import { useReducedMotionPreference } from '../../lib/settingsStore';

const TARGET_ROUTES: Record<AssessmentId, string> = {
  'visual-reaction': '/reaction-test',
  'direction': '/direction-test',
  'color-recognition': '/colour-recognition',
  'block-memory': '/block-memory',
  'number-memory': '/number-memory',
};

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
    targetRoute: TARGET_ROUTES[id] || '/assessments',
    logo: pres.logoPath,
  };
});

export function AssessmentHero3D() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotionPreference();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport intersection observer (>50% visibility)
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

  // Autoplay Option B: Advance only when in view, not hovered, not focused, and motion not reduced
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

  // Scoped keyboard navigation: Listen ONLY when container or children are focused (:focus-within)
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

  const getCardStyle = (index: number) => {
    const total = DESKTOP_ASSESSMENTS.length;
    let offset = (index - activeIndex + total) % total;
    
    // Normalize offset to -2, -1, 0, 1, 2
    if (offset > Math.floor(total / 2)) {
      offset -= total;
    }

    // Default styles for hidden cards
    let rotateY = 0;
    let translateZ = -400;
    let scale = 0.7;
    let opacity = 0;
    let zIndex = 0;

    if (offset === 0) {
      rotateY = 0;
      translateZ = 0;
      scale = 1;
      opacity = 1;
      zIndex = 30;
    } else if (offset === -1) {
      rotateY = 22;
      translateZ = -180;
      scale = 0.85;
      opacity = 0.6;
      zIndex = 20;
    } else if (offset === 1) {
      rotateY = -22;
      translateZ = -180;
      scale = 0.85;
      opacity = 0.6;
      zIndex = 20;
    }

    if (shouldReduceMotion) {
      rotateY = 0;
      translateZ = offset === 0 ? 0 : -100;
      scale = offset === 0 ? 1 : 0.9;
    }

    return { rotateY, translateZ, scale, opacity, zIndex, offset };
  };

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Cognitive Assessments Discovery Carousel"
      className="relative w-full h-full flex flex-col items-center justify-center py-2 min-h-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00F0FF]/30 rounded-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
    >
      {/* 3D Stage */}
      <div 
        className="relative w-full max-w-4xl flex-1 min-h-[200px] max-h-[420px] flex items-center justify-center perspective-[1400px]"
      >
        <button 
          onClick={handlePrev}
          className="absolute left-4 z-40 p-3 rounded-full bg-[var(--surface-1)]/80 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          aria-label="Previous assessment"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="relative w-full max-w-lg h-full transform-style-3d">
          <AnimatePresence initial={false}>
            {DESKTOP_ASSESSMENTS.map((assessment, index) => {
              const { rotateY, translateZ, scale, opacity, zIndex, offset } = getCardStyle(index);
              const isActive = offset === 0;

              return (
                <motion.div
                  key={assessment.id}
                  initial={false}
                  animate={{
                    rotateY,
                    z: translateZ,
                    scale,
                    opacity,
                    zIndex,
                    x: offset === -1 ? '-50%' : offset === 1 ? '50%' : '0%'
                  }}
                  transition={{
                    duration: 0.6,
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
                  className={`flex flex-col bg-[#10141B] rounded-2xl border ${
                    isActive 
                      ? 'border-[#00F0FF]/40 shadow-[0_20px_50px_rgba(0,0,0,0.8),_0_0_30px_rgba(0,240,255,0.15)]' 
                      : 'border-[var(--border-hairline)]'
                  } overflow-hidden cursor-pointer`}
                  onClick={() => {
                    if (isActive) {
                      navigate(assessment.targetRoute);
                    } else {
                      handleSelect(index);
                    }
                  }}
                >
                  <div className="relative h-[40%] min-h-[120px] w-full bg-[#08080A] flex items-center justify-center border-b border-[var(--border-hairline)] overflow-hidden">
                    {/* Visualizer Background Graphic */}
                    <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwem0yMCAyMGMwLTExLTAuNC0yMC0yMC0yMHMyMCA4LjkgMjAgMjAgMC40IDIwIDIwIDIwLTIwLTguOS0yMC0yMHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] pointer-events-none" />
                    
                    {/* Assessment Custom Logo Visual Focus */}
                    <motion.img 
                      src={assessment.logo} 
                      alt={assessment.title}
                      className="w-24 h-24 object-contain relative z-10 rounded-xl"
                      animate={isActive ? { scale: [1, 1.05, 1], filter: ['drop-shadow(0 0 0px #00F0FF)', 'drop-shadow(0 0 15px rgba(0,240,255,0.4))', 'drop-shadow(0 0 0px #00F0FF)'] } : {}}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  
                  <div className="p-6 flex flex-col flex-1">
                    <div className="text-[11px] text-[#00F0FF] font-mono tracking-widest mb-2 uppercase">
                      {assessment.protocolNumber} • {assessment.category}
                    </div>
                    <h3 className="font-heading text-2xl font-bold text-[#F8FAFC] tracking-tight mb-3">
                      {assessment.title}
                    </h3>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6 flex-1">
                      {assessment.description}
                    </p>
                    <div className={`mt-auto flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold transition-colors duration-300 ${
                      isActive 
                        ? 'bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20' 
                        : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                    }`}>
                      {isActive ? (
                        <>
                          <Play size={16} fill="currentColor" />
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

        <button 
          onClick={handleNext}
          className="absolute right-4 z-40 p-3 rounded-full bg-[var(--surface-1)]/80 border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          aria-label="Next assessment"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Pagination Pill Dots */}
      <div className="flex items-center gap-3 mt-4 z-20 shrink-0">
        {DESKTOP_ASSESSMENTS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`transition-all duration-300 rounded-full h-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] ${
              idx === activeIndex 
                ? 'w-8 bg-[#00F0FF]' 
                : 'w-2 bg-[var(--border-strong)] hover:bg-[var(--text-muted)]'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
