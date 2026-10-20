import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { X, List, Zap, BarChart2, Database, ChevronRight, ArrowRight, Check } from 'lucide-react';
import { PulseLogo } from './brand';
import { useModalAccessibility } from '../lib/modalAccessibility';

export const WELCOME_STORAGE_KEY = 'pulse_desktop_welcome_seen';
export const LEGACY_WELCOME_STORAGE_KEY = 'pulse_welcome_seen';

export function isWelcomeSeen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(WELCOME_STORAGE_KEY) ?? localStorage.getItem(LEGACY_WELCOME_STORAGE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export function setWelcomeSeen(seen: boolean): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (seen) {
      localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
      localStorage.setItem(LEGACY_WELCOME_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(WELCOME_STORAGE_KEY);
      localStorage.removeItem(LEGACY_WELCOME_STORAGE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

// Backward-compatible exports redirecting to authoritative persistence
export function isWelcomeSeenInMemory(): boolean {
  return isWelcomeSeen();
}

export function setWelcomeSeenInMemory(seen: boolean): void {
  setWelcomeSeen(seen);
}

export interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: string) => void;
}

export function WelcomeModal({ isOpen, onClose, onNavigate }: WelcomeModalProps) {
  const navigate = useNavigate();
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(() => isWelcomeSeen());
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Synchronize checkbox state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDontShowAgain(isWelcomeSeen());
    }
  }, [isOpen]);

  // Central dismissal handler that ensures preference persistence is always synchronized
  const handleDismiss = useCallback((targetRoute?: string) => {
    setWelcomeSeen(dontShowAgain);
    onClose();
    if (targetRoute) {
      if (onNavigate) {
        onNavigate(targetRoute.replace(/^\//, ''));
      }
      navigate(targetRoute);
    }
  }, [dontShowAgain, onClose, onNavigate, navigate]);

  // Hook into modal accessibility with handleDismiss so Escape and backdrop behave consistently
  const { zIndex } = useModalAccessibility({
    isOpen,
    onClose: handleDismiss,
    dialogRef,
    initialFocusRef: closeButtonRef,
    modalId: 'welcome-modal'
  });

  const handleStartAssessments = () => {
    handleDismiss('/assessments');
  };

  const handleDontShowAgainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setDontShowAgain(isChecked);
    setWelcomeSeen(isChecked);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          style={{ zIndex }}
        >
          {/* Soft blurred dark backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#090D1A]/50 backdrop-blur-sm cursor-pointer"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleDismiss();
            }}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-modal-heading"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[550px] max-h-[min(690px,calc(100dvh-2rem))] bg-gradient-to-b from-[#FFFFFF] via-[#F9FBFF] to-[#F1F6FD] dark:from-[#12161B] dark:via-[#161B22] dark:to-[#0E1217] border border-sky-100 dark:border-slate-800 rounded-[28px] sm:rounded-[32px] p-6 sm:p-7 flex flex-col font-sans text-[#090D1A] dark:text-white my-auto shadow-[0_24px_64px_rgba(0,102,255,0.14),0_8px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)] focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] outline-none overflow-y-auto"
          >
            {/* Top Atmospheric Wave Graphic (Decor) */}
            <svg 
              className="absolute right-0 top-0 w-52 h-36 pointer-events-none select-none opacity-50 dark:opacity-30 overflow-hidden" 
              viewBox="0 0 220 140" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path 
                d="M 40 95 C 80 65, 120 105, 160 55 C 180 30, 205 45, 220 35" 
                stroke="#00C2FF" 
                strokeWidth="1.2" 
                strokeDasharray="2 3"
                strokeOpacity="0.45"
              />
              <path 
                d="M 70 115 C 110 75, 150 85, 190 35 C 205 25, 215 30, 220 15" 
                stroke="#0066FF" 
                strokeWidth="1.2" 
                strokeOpacity="0.25"
              />
              <circle cx="160" cy="55" r="2.5" fill="#0066FF" />
              <circle cx="110" cy="80" r="2" fill="#00C2FF" />
            </svg>

            {/* Header: Branded Mark and Close Button */}
            <div className="flex items-center justify-between gap-3 mb-4 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-[14px] bg-[#090D1A] dark:bg-[#181D23] border border-transparent dark:border-slate-800 flex items-center justify-center text-[#00D2FF] shrink-0 shadow-sm">
                  <PulseLogo variant="mark" size={24} color="#00D2FF" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="font-heading font-extrabold text-[15px] tracking-wide text-[#090D1A] dark:text-white leading-tight">
                    PULSE
                  </div>
                  <div className="text-[11.5px] sm:text-[12px] text-[#64748B] dark:text-slate-400 font-medium tracking-tight truncate">
                    Cognitive Benchmarking Suite
                  </div>
                </div>
              </div>

              <button 
                ref={closeButtonRef}
                type="button" 
                onClick={() => handleDismiss()}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#181D23] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
                aria-label="Close dialog"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            {/* Title & Description */}
            <div className="relative z-10 mb-4">
              <h2 id="welcome-modal-heading" className="text-2xl sm:text-[29px] font-extrabold text-[#090D1A] dark:text-white tracking-tight leading-tight">
                Welcome to <span className="bg-gradient-to-r from-[#0066FF] to-[#00C2FF] dark:from-[#22C7D6] dark:to-[#00D2FF] bg-clip-text text-transparent">PULSE</span>
              </h2>
              <p className="text-xs sm:text-[13px] text-[#475569] dark:text-slate-300 leading-relaxed mt-1.5 max-w-[480px]">
                Precision User Latency &amp; Stimulus Evaluator is an open research tool to benchmark your sensory reaction times, directional choice speed, and working memory.
              </p>
            </div>

            {/* Section Header: HOW IT WORKS */}
            <div className="flex items-center gap-2.5 mb-3 relative z-10">
              <span className="text-[10.5px] font-mono font-bold text-[#0066FF] dark:text-[#22C7D6] tracking-[0.14em] uppercase">
                HOW IT WORKS
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-sky-200 dark:from-slate-700 to-transparent" aria-hidden="true" />
            </div>

            {/* Three Steps with Vertical Connecting Dash Line */}
            <div className="relative flex flex-col gap-2.5 mb-3.5 z-10">
              {/* Vertical Dashed Line running from step 1 badge to step 3 badge */}
              <div 
                className="absolute left-[21px] top-6 bottom-6 w-0 border-l-[1.5px] border-dashed border-[#94A3B8]/60 dark:border-slate-700 z-0 pointer-events-none" 
                aria-hidden="true" 
              />

              {/* Step 1: Pick a test */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => handleDismiss('/assessments')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDismiss('/assessments');
                  }
                }}
                className="group relative flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-white/95 dark:bg-[#181D23] border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,102,255,0.04)] dark:shadow-none hover:border-sky-200 dark:hover:border-slate-700 hover:shadow-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
              >
                {/* Step Badge */}
                <div className="w-5 h-5 rounded-full bg-[#0066FF] dark:bg-[#22C7D6] text-white dark:text-black flex items-center justify-center font-bold text-[10.5px] shrink-0 z-10 shadow-xs">
                  1
                </div>

                {/* Icon Container */}
                <div className="w-11 h-11 rounded-xl bg-[#EAF5FF] dark:bg-[#12161B] text-[#0066FF] dark:text-[#22C7D6] flex items-center justify-center shrink-0 border border-transparent dark:border-slate-800">
                  <List size={20} strokeWidth={2.4} />
                </div>

                {/* Step Content */}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] sm:text-[14px] font-bold text-[#090D1A] dark:text-white leading-tight mb-0.5">
                    Pick a test
                  </div>
                  <div className="text-[11px] sm:text-[12px] text-[#64748B] dark:text-slate-400 leading-snug">
                    Visual Reaction, Direction, Colour Recognition, Block Memory, or Number Memory.
                  </div>
                </div>

                {/* Right Arrow Action */}
                <div className="w-7 h-7 rounded-full bg-[#F1F6FD] dark:bg-[#12161B] text-[#64748B] dark:text-slate-400 group-hover:text-[#0066FF] dark:group-hover:text-[#22C7D6] group-hover:bg-[#E1EFFE] dark:group-hover:bg-[#181D23] flex items-center justify-center transition-colors shrink-0 ml-1">
                  <ChevronRight size={15} strokeWidth={2.4} />
                </div>
              </div>

              {/* Step 2: Respond */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => handleDismiss('/assessments')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDismiss('/assessments');
                  }
                }}
                className="group relative flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-white/95 dark:bg-[#181D23] border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,102,255,0.04)] dark:shadow-none hover:border-sky-200 dark:hover:border-slate-700 hover:shadow-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
              >
                {/* Step Badge */}
                <div className="w-5 h-5 rounded-full bg-[#0066FF] dark:bg-[#22C7D6] text-white dark:text-black flex items-center justify-center font-bold text-[10.5px] shrink-0 z-10 shadow-xs">
                  2
                </div>

                {/* Icon Container */}
                <div className="w-11 h-11 rounded-xl bg-[#EAF5FF] dark:bg-[#12161B] text-[#0066FF] dark:text-[#22C7D6] flex items-center justify-center shrink-0 border border-transparent dark:border-slate-800">
                  <Zap size={20} strokeWidth={2.4} fill="currentColor" fillOpacity={0.15} />
                </div>

                {/* Step Content */}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] sm:text-[14px] font-bold text-[#090D1A] dark:text-white leading-tight mb-0.5">
                    Respond
                  </div>
                  <div className="text-[11px] sm:text-[12px] text-[#64748B] dark:text-slate-400 leading-snug">
                    Watch for the cue and answer as fast and accurately as you can.
                  </div>
                </div>

                {/* Right Arrow Action */}
                <div className="w-7 h-7 rounded-full bg-[#F1F6FD] dark:bg-[#12161B] text-[#64748B] dark:text-slate-400 group-hover:text-[#0066FF] dark:group-hover:text-[#22C7D6] group-hover:bg-[#E1EFFE] dark:group-hover:bg-[#181D23] flex items-center justify-center transition-colors shrink-0 ml-1">
                  <ChevronRight size={15} strokeWidth={2.4} />
                </div>
              </div>

              {/* Step 3: Review */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => handleDismiss('/leaderboard')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDismiss('/leaderboard');
                  }
                }}
                className="group relative flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-white/95 dark:bg-[#181D23] border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,102,255,0.04)] dark:shadow-none hover:border-sky-200 dark:hover:border-slate-700 hover:shadow-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
              >
                {/* Step Badge */}
                <div className="w-5 h-5 rounded-full bg-[#0066FF] dark:bg-[#22C7D6] text-white dark:text-black flex items-center justify-center font-bold text-[10.5px] shrink-0 z-10 shadow-xs">
                  3
                </div>

                {/* Icon Container */}
                <div className="w-11 h-11 rounded-xl bg-[#EAF5FF] dark:bg-[#12161B] text-[#0066FF] dark:text-[#22C7D6] flex items-center justify-center shrink-0 border border-transparent dark:border-slate-800">
                  <BarChart2 size={20} strokeWidth={2.4} />
                </div>

                {/* Step Content */}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] sm:text-[14px] font-bold text-[#090D1A] dark:text-white leading-tight mb-0.5">
                    Review
                  </div>
                  <div className="text-[11px] sm:text-[12px] text-[#64748B] dark:text-slate-400 leading-snug">
                    Get your score instantly and compare it against reference benchmarks.
                  </div>
                </div>

                {/* Right Arrow Action */}
                <div className="w-7 h-7 rounded-full bg-[#F1F6FD] dark:bg-[#12161B] text-[#64748B] dark:text-slate-400 group-hover:text-[#0066FF] dark:group-hover:text-[#22C7D6] group-hover:bg-[#E1EFFE] dark:group-hover:bg-[#181D23] flex items-center justify-center transition-colors shrink-0 ml-1">
                  <ChevronRight size={15} strokeWidth={2.4} />
                </div>
              </div>
            </div>

            {/* Supporting Links Callout Box */}
            <div className="rounded-2xl bg-[#F4F9FF]/90 dark:bg-[#181D23] border border-[#E0EEFB] dark:border-slate-800 p-3 sm:p-3.5 flex items-center gap-3 text-[11.5px] sm:text-[12px] text-[#475569] dark:text-slate-300 leading-relaxed shadow-[0_2px_8px_rgba(0,102,255,0.03)] dark:shadow-none z-10 mb-4">
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#12161B] border border-sky-100 dark:border-slate-700 text-[#0066FF] dark:text-[#22C7D6] flex items-center justify-center shrink-0 shadow-xs">
                <Database size={16} strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                You can also compare scores on the{' '}
                <Link 
                  to="/leaderboard" 
                  onClick={() => handleDismiss()}
                  className="text-[#0066FF] dark:text-[#22C7D6] hover:underline font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] rounded"
                >
                  Leaderboard
                </Link>
                , download the open{' '}
                <Link 
                  to="/dataset" 
                  onClick={() => handleDismiss()}
                  className="text-[#0066FF] dark:text-[#22C7D6] hover:underline font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] rounded"
                >
                  Dataset
                </Link>
                , or read habit recommendations in the{' '}
                <Link 
                  to="/improve" 
                  onClick={() => handleDismiss()}
                  className="text-[#0066FF] dark:text-[#22C7D6] hover:underline font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] rounded"
                >
                  Improve
                </Link>{' '}
                guide.
              </div>
            </div>

            {/* Footer Row: Checkbox & CTA Button */}
            <div className="flex items-center justify-between gap-3 pt-1 z-10 flex-wrap sm:flex-nowrap">
              {/* "Don't show this again" Checkbox */}
              <label 
                htmlFor="welcome-dont-show-again"
                className="flex items-center gap-2 text-xs sm:text-[13px] font-medium text-[#475569] dark:text-slate-300 hover:text-[#090D1A] dark:hover:text-white cursor-pointer select-none group py-1"
              >
                <div className="relative flex items-center justify-center">
                  <input 
                    id="welcome-dont-show-again"
                    type="checkbox" 
                    checked={dontShowAgain}
                    onChange={handleDontShowAgainChange}
                    className="sr-only peer"
                    aria-label="Don't show this again"
                  />
                  <div className={`w-5 h-5 rounded-[6px] flex items-center justify-center transition-all ${
                    dontShowAgain 
                      ? 'bg-[#0066FF] dark:bg-[#22C7D6] text-white dark:text-black shadow-xs' 
                      : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#12161B] group-hover:border-slate-400 dark:group-hover:border-slate-500 peer-focus-visible:ring-2 peer-focus-visible:ring-[#0066FF] dark:peer-focus-visible:ring-[#22C7D6]'
                  }`}>
                    {dontShowAgain && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
                <span>Don't show this again</span>
              </label>

              {/* Start Cognitive Battery CTA Button */}
              <button 
                type="button" 
                id="welcome-start-assessments-btn"
                onClick={handleStartAssessments}
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:from-[#005FE6] hover:to-[#0047B3] dark:from-[#22C7D6] dark:to-[#00D2FF] text-white dark:text-black text-xs sm:text-[13.5px] font-semibold shadow-[0_4px_14px_rgba(0,102,255,0.35)] dark:shadow-[0_4px_14px_rgba(34,199,214,0.35)] hover:shadow-[0_6px_18px_rgba(0,102,255,0.45)] dark:hover:shadow-[0_6px_18px_rgba(34,199,214,0.45)] active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] ml-auto shrink-0"
              >
                <span>Start Cognitive Battery</span>
                <ArrowRight size={15} strokeWidth={2.4} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
