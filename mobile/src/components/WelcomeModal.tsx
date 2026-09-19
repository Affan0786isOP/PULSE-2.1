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
            className="relative z-10 w-full max-w-[420px] bg-[var(--surface-1)] border border-[var(--border-default)] rounded-xl p-5 sm:p-6 shadow-2xl flex flex-col font-sans text-[var(--text-primary)] my-auto outline-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0">
                  <Activity size={18} className="stroke-[2.5]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="font-bold text-sm tracking-wide text-[var(--text-primary)] leading-tight">PULSE</div>
                  <div className="text-[10px] text-[var(--text-muted)] tracking-tight truncate font-mono">Mobile Benchmark Suite</div>
                </div>
              </div>

              <button 
                ref={closeButtonRef}
                type="button" 
                onClick={handleClose}
                className="w-7 h-7 rounded-md bg-[var(--surface-2)] hover:bg-[var(--surface-3)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <h2 id="mobile-welcome-modal-heading" className="text-base font-bold text-[var(--text-primary)] tracking-tight mb-1">
              Welcome to PULSE
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
              Precision User Latency &amp; Stimulus Evaluator — an open research tool to benchmark your sensory reaction times, directional choice speed, and working memory.
            </p>

            {/* How it works */}
            <div className="text-[10.5px] font-mono font-bold text-[var(--accent)] uppercase tracking-wider mb-2">How it works</div>
            <div className="flex flex-col gap-2.5 mb-3.5 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg p-3">
              <div className="flex gap-2.5 items-start">
                <div className="w-6 h-6 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                  <ListChecks size={13} className="stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">Pick a test</div>
                  <div className="text-[11px] text-[var(--text-secondary)] leading-snug">Visual Reaction, Direction, Colour Recognition, Block Memory, or Number Memory.</div>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <div className="w-6 h-6 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                  <Zap size={13} className="stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">Respond</div>
                  <div className="text-[11px] text-[var(--text-secondary)] leading-snug">Watch for the cue and answer as fast and accurately as you can.</div>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <div className="w-6 h-6 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                  <BarChart2 size={13} className="stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">Review</div>
                  <div className="text-[11px] text-[var(--text-secondary)] leading-snug">Get your score instantly, evaluate your personal results, and compare against reference benchmarks.</div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-3.5">
              You can also check the Leaderboard, explore the open research Dataset, and review evidence-based habit recommendations in the Improve guide.
            </p>

            {/* Footer Checkbox */}
            <div className="pt-0.5 mb-3.5">
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer w-fit select-none hover:text-[var(--text-primary)] transition-colors">
                <input 
                  type="checkbox" 
                  checked={dontShowAgain}
                  onChange={handleDontShowAgain}
                  className="w-3.5 h-3.5 rounded border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer" 
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
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] text-slate-950 rounded-md py-2.5 px-4 text-xs font-semibold cursor-pointer transition-[background-color,transform] shadow-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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
