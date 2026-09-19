import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, X, ListChecks, Zap, BarChart2 } from 'lucide-react';
import { triggerHaptic } from '../lib/settingsStore';
import { useModalAccessibility } from '../lib/modalAccessibility';

const WELCOME_STORAGE_KEY = 'pulse_mobile_welcome_seen';
const LEGACY_WELCOME_STORAGE_KEY = 'pulse_welcome_seen';

export function isMobileWelcomeSeen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(WELCOME_STORAGE_KEY) ?? localStorage.getItem(LEGACY_WELCOME_STORAGE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export function setMobileWelcomeSeen(seen: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (seen) {
      localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
      localStorage.setItem(LEGACY_WELCOME_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(WELCOME_STORAGE_KEY);
      localStorage.removeItem(LEGACY_WELCOME_STORAGE_KEY);
    }
  } catch {}
}

// Backward-compatible export redirecting to authoritative persistence
export function isMobileWelcomeSeenInMemory(): boolean {
  return isMobileWelcomeSeen();
}

export function setMobileWelcomeSeenInMemory(seen: boolean): void {
  setMobileWelcomeSeen(seen);
}

export interface MobileWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: string) => void;
}

export function WelcomeModal({ isOpen, onClose, onNavigate }: MobileWelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(isMobileWelcomeSeen);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setDontShowAgain(isMobileWelcomeSeen());
    }
  }, [isOpen]);

  const { zIndex } = useModalAccessibility({
    isOpen,
    onClose,
    dialogRef,
    initialFocusRef: closeButtonRef,
    modalId: 'mobile-welcome-modal'
  });

  const handleClose = () => {
    triggerHaptic('tap');
    setMobileWelcomeSeen(dontShowAgain);
    onClose();
  };

  const handleStartAssessments = () => {
    triggerHaptic('tap');
    setMobileWelcomeSeen(dontShowAgain);
    onClose();
    if (onNavigate) {
      onNavigate('assessments');
    }
  };

  const handleDontShowAgain = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setDontShowAgain(isChecked);
    setMobileWelcomeSeen(isChecked);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          style={{ zIndex }}
        >
          {/* Opaque dark backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
          />

          {/* Modal Container */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-welcome-modal-heading"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-10 w-full max-w-[420px] bg-[#0b101b] border border-white/20 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col font-sans text-[#e8ecf3] my-auto outline-none"
            style={{ backgroundColor: '#0b101b' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#00f0ff]/10 border border-[#00f0ff]/40 flex items-center justify-center text-[#00f0ff] shrink-0">
                  <Activity size={20} className="stroke-[2.2]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="font-bold text-[15px] tracking-wide text-white leading-tight">PULSE</div>
                  <div className="text-[11px] text-[#8b9bb4] tracking-tight truncate">Precision User Latency &amp; Stimulus Evaluator</div>
                </div>
              </div>

              <button 
                ref={closeButtonRef}
                type="button" 
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#8b9bb4] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <h2 id="mobile-welcome-modal-heading" className="text-lg font-bold text-white mb-1.5">Welcome to PULSE - Precision User Latency &amp; Stimulus Evaluator</h2>
            <p className="text-[13px] text-[#93a4c1] leading-relaxed mb-3">
              PULSE is an open research tool to benchmark your sensory reaction times, directional choice speed, and working memory.
            </p>

            {/* How it works */}
            <div className="text-[12px] font-bold text-[#00f0ff] uppercase tracking-wider mb-2">How it works:</div>
            <div className="flex flex-col gap-2.5 mb-4 bg-white/[0.03] border border-white/10 rounded-xl p-3">
              <div className="flex gap-2.5">
                <div className="w-[26px] h-[26px] shrink-0 rounded-lg bg-[#00f0ff]/15 text-[#00f0ff] flex items-center justify-center mt-0.5">
                  <ListChecks size={14} />
                </div>
                <div>
                  <div className="text-[12.5px] font-semibold text-white mb-0.5">Pick a test</div>
                  <div className="text-[11.5px] text-[#8b9bb4] leading-snug">Visual Reaction, Direction, Colour Recognition, Block Memory, or Number Memory.</div>
                </div>
              </div>

              <div className="flex gap-2.5">
                <div className="w-[26px] h-[26px] shrink-0 rounded-lg bg-[#00f0ff]/15 text-[#00f0ff] flex items-center justify-center mt-0.5">
                  <Zap size={14} />
                </div>
                <div>
                  <div className="text-[12.5px] font-semibold text-white mb-0.5">Respond</div>
                  <div className="text-[11.5px] text-[#8b9bb4] leading-snug">Watch for the cue and answer as fast and accurately as you can.</div>
                </div>
              </div>

              <div className="flex gap-2.5">
                <div className="w-[26px] h-[26px] shrink-0 rounded-lg bg-[#00f0ff]/15 text-[#00f0ff] flex items-center justify-center mt-0.5">
                  <BarChart2 size={14} />
                </div>
                <div>
                  <div className="text-[12.5px] font-semibold text-white mb-0.5">Review</div>
                  <div className="text-[11.5px] text-[#8b9bb4] leading-snug">Get your score instantly, evaluate your personal results, and compare against reference benchmarks.</div>
                </div>
              </div>
            </div>

            <p className="text-[11.5px] text-[#8b9bb4] leading-relaxed mb-3">
              You can also check the Leaderboard, explore the open research Dataset, and review evidence-based habit recommendations in the Improve guide.
            </p>

            {/* Footer Checkbox */}
            <div className="pt-1 mb-3">
              <label className="flex items-center gap-2 text-[12px] text-[#8b9bb4] cursor-pointer w-fit select-none hover:text-[#a5b4cb] transition-colors">
                <input 
                  type="checkbox" 
                  checked={dontShowAgain}
                  onChange={handleDontShowAgain}
                  className="w-3.5 h-3.5 rounded border-white/20 bg-black/40 text-[#00f0ff] focus:ring-0 focus:ring-offset-0 cursor-pointer" 
                />
                Don't show this again
              </label>
            </div>

            {/* Button */}
            <div className="flex">
              <button 
                type="button" 
                id="mobile-welcome-start-assessments-btn"
                onClick={handleStartAssessments}
                className="w-full bg-[#00f0ff] hover:bg-[#33f3ff] active:scale-[0.99] border border-[#00f0ff] text-[#00161a] rounded-xl py-2.5 px-4 text-[13px] font-bold cursor-pointer transition-all shadow-md text-center"
              >
                Start assessments
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
