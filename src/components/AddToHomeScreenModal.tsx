import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Smartphone, 
  Share, 
  SquarePlus, 
  Zap, 
  Download, 
  ShieldCheck,
  Maximize2
} from 'lucide-react';
import { playAudioCue, triggerHaptic } from '../lib/settingsStore';
import { acquireScrollLock } from '../lib/modalScrollLock';
import { useModalAccessibility } from '../lib/modalAccessibility';

interface AddToHomeScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstalled: boolean;
  isIos: boolean;
  isSafari?: boolean;
  isInstallable: boolean;
  onPromptInstall: () => Promise<boolean>;
}

export function AddToHomeScreenModal({
  isOpen,
  onClose,
  isInstalled,
  isIos,
  isInstallable,
  onPromptInstall
}: AddToHomeScreenModalProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const unlock = acquireScrollLock();
      return () => {
        unlock();
      };
    }
  }, [isOpen]);

  useModalAccessibility({
    isOpen,
    onClose,
    dialogRef,
    initialFocusRef: closeButtonRef
  });

  const handleInstallClick = async () => {
    playAudioCue('click');
    triggerHaptic('tap');
    const success = await onPromptInstall();
    if (success) {
      playAudioCue('success');
      triggerHaptic('success');
    }
  };

  const handleClose = () => {
    playAudioCue('click');
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="pwa-install-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
        >
          {/* Backdrop click */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            onClick={handleClose}
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-modal-title"
            id="pwa-install-modal"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-t-2xl sm:rounded-xl overflow-hidden text-left max-h-[90vh] flex flex-col my-auto"
            style={{
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))'
            }}
          >
            {/* Header Banner */}
            <div className="relative px-5 pt-5 pb-4 border-b border-[var(--border-subtle)] bg-[var(--surface-1)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0 overflow-hidden">
                  <img 
                    src="/icon-192.png" 
                    alt="PULSE Icon" 
                    className="w-7 h-7 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 id="pwa-modal-title" className="text-sm font-bold font-heading text-[var(--text-primary)]">
                      Add PULSE to Home Screen
                    </h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--accent-subtle)] border border-[var(--border-subtle)] text-[var(--accent)]">
                      PWA App
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Standalone mobile experience &amp; dedicated viewport
                  </p>
                </div>
              </div>

              <button 
                ref={closeButtonRef}
                type="button"
                id="close-pwa-modal-btn"
                onClick={handleClose}
                className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Status if already installed */}
              {isInstalled ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                      Installed in Standalone Mode
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                      PULSE is running as an installed standalone app with reduced browser chrome.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Feature Highlights Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex flex-col gap-1">
                      <div className="w-5 h-5 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
                        <Zap size={12} />
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)]">Dedicated Viewport</span>
                      <span className="text-[10px] text-[var(--text-muted)] leading-tight">Runs in an isolated window free from browser tab controls</span>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex flex-col gap-1">
                      <div className="w-5 h-5 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
                        <Maximize2 size={12} />
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)]">Direct Touch Area</span>
                      <span className="text-[10px] text-[var(--text-muted)] leading-tight">Edge-to-edge touch targets on mobile</span>
                    </div>
                  </div>

                  {/* Device-Specific Instructions */}
                  {isIos ? (
                    <div className="space-y-2.5">
                      <div className="text-xs font-mono font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone size={13} />
                        <span>iOS Safari Quick Steps</span>
                      </div>

                      <div className="space-y-2 text-xs font-mono">
                        {/* Step 1 */}
                        <div className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] font-bold text-[11px] flex items-center justify-center shrink-0">
                            1
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-[var(--text-secondary)] font-sans">
                              Tap the <strong className="text-[var(--text-primary)] font-semibold">Share button</strong> in Safari
                            </span>
                            <div className="px-2 py-0.5 rounded bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--accent)] shrink-0 flex items-center gap-1">
                              <Share size={11} />
                              <span className="text-[10px]">Share</span>
                            </div>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] font-bold text-[11px] flex items-center justify-center shrink-0">
                            2
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-[var(--text-secondary)] font-sans">
                              Scroll and select <strong className="text-[var(--text-primary)] font-semibold">Add to Home Screen</strong>
                            </span>
                            <div className="px-2 py-0.5 rounded bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--accent)] shrink-0 flex items-center gap-1">
                              <SquarePlus size={11} />
                              <span className="text-[10px]">Add</span>
                            </div>
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] font-bold text-[11px] flex items-center justify-center shrink-0">
                            3
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-[var(--text-secondary)] font-sans">
                              Tap <strong className="text-[var(--text-primary)] font-semibold">Add</strong> in the top right
                            </span>
                            <div className="px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--bg-base)] font-bold text-[10px] shrink-0">
                              Add
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Install PULSE directly to your device for convenient one-tap launching and a standalone fullscreen viewport.
                      </p>

                      {isInstallable ? (
                        <button type="button"
                          id="native-pwa-install-btn"
                          onClick={handleInstallClick}
                          className="w-full py-2.5 px-4 rounded-lg bg-[var(--accent)] hover:opacity-90 text-[var(--bg-base)] font-mono font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors active:scale-95 cursor-pointer"
                        >
                          <Download size={14} />
                          <span>Install PULSE Application</span>
                        </button>
                      ) : (
                        <div className="bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg p-3 space-y-2 mt-2">
                          <p className="text-xs text-[var(--text-primary)] font-medium">To install manually:</p>
                          <div className="flex items-start gap-2">
                            <div className="w-4 h-4 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</div>
                            <p className="text-[11px] text-[var(--text-secondary)]">Tap the browser menu icon (usually 3 dots)</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-4 h-4 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</div>
                            <p className="text-[11px] text-[var(--text-secondary)]">Select <strong>Add to Home screen</strong> or <strong>Install app</strong></p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Dismiss Button */}
            <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-1)] flex items-center justify-between shrink-0">
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {isInstalled ? 'Standalone Mode Ready' : 'App shell & offline assessments available'}
              </span>
              <button type="button"
                onClick={handleClose}
                className="px-3 py-1.5 rounded-md bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-mono cursor-pointer transition-colors"
              >
                {isInstalled ? 'Done' : 'Dismiss'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
