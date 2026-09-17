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
  Maximize2,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { playAudioCue, triggerHaptic } from '../lib/settingsStore';
import { useModalAccessibility } from '../lib/modalAccessibility';

export interface AddToHomeScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstalled: boolean;
  isIos: boolean;
  isSafari?: boolean;
  isIosSafari?: boolean;
  isIosOtherBrowser?: boolean;
  isInstallable?: boolean;
  hasNativePrompt?: boolean;
  isInstallPromptSupported?: boolean;
  isUnsupportedBrowser?: boolean;
  isOffline?: boolean;
  onPromptInstall: () => Promise<boolean>;
}

export function AddToHomeScreenModal({
  isOpen,
  onClose,
  isInstalled,
  isIos,
  isSafari,
  isIosSafari: propIsIosSafari,
  isIosOtherBrowser: propIsIosOtherBrowser,
  isInstallable,
  hasNativePrompt = false,
  isInstallPromptSupported = false,
  isUnsupportedBrowser = false,
  isOffline = false,
  onPromptInstall
}: AddToHomeScreenModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { zIndex } = useModalAccessibility({
    isOpen,
    onClose,
    dialogRef,
    initialFocusRef: closeButtonRef,
    modalId: 'mobile-pwa-install-modal'
  });

  const isIosSafari = typeof propIsIosSafari === 'boolean' ? propIsIosSafari : (isIos && (isSafari ?? true));
  const isIosOtherBrowser = typeof propIsIosOtherBrowser === 'boolean' ? propIsIosOtherBrowser : (isIos && !isIosSafari);

  const handleInstallClick = async () => {
    playAudioCue('click');
    triggerHaptic('tap');
    const success = await onPromptInstall();
    if (success) {
      playAudioCue('success');
      triggerHaptic('success');
    }
  };

  const handleCopyLink = async () => {
    try {
      playAudioCue('click');
      triggerHaptic('tap');
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
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
          key="mobile-pwa-install-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ zIndex }}
          className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
        >
          {/* Backdrop click */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-pwa-modal-title"
            id="mobile-pwa-install-modal"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-t-2xl sm:rounded-xl overflow-hidden text-left max-h-[90vh] flex flex-col my-auto outline-none shadow-2xl"
            style={{
              paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))'
            }}
          >
            {/* Header Banner */}
            <div className="relative px-5 pt-5 pb-4 border-b border-[var(--border-subtle)] bg-[var(--surface-1)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0 overflow-hidden">
                  <img 
                    src="/mobile/icon-192.png" 
                    alt="PULSE Icon" 
                    className="w-7 h-7 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 id="mobile-pwa-modal-title" className="text-sm font-bold font-heading text-[var(--text-primary)]">
                      Add PULSE to Home Screen
                    </h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--accent-subtle)] border border-[var(--border-subtle)] text-[var(--accent)]">
                      PWA
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Standalone window &amp; convenient home screen access
                  </p>
                </div>
              </div>

              <button 
                ref={closeButtonRef}
                type="button"
                id="close-mobile-pwa-modal-btn"
                onClick={handleClose}
                className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--surface-2)] hover:bg-[var(--surface-3)] active:bg-[var(--surface-3)] active:scale-[0.95] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-[color,background-color,border-color,transform] cursor-pointer"
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
                      Installed Application Active
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                      PULSE is running as an installed standalone application with dedicated viewport isolation.
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
                      <span className="text-[10px] text-[var(--text-muted)] leading-tight">Runs in an isolated window without standard browser address bars</span>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] flex flex-col gap-1">
                      <div className="w-5 h-5 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center">
                        <Maximize2 size={12} />
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)]">Edge-to-Edge Canvas</span>
                      <span className="text-[10px] text-[var(--text-muted)] leading-tight">Uninterrupted screen space with full hardware touch responsiveness</span>
                    </div>
                  </div>

                  {/* Device & Browser Specific Instructions */}
                  {isIosOtherBrowser ? (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <AlertTriangle size={15} />
                        <span>Apple Safari Required on iOS</span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        iOS only permits adding web applications to your Home Screen from <strong className="text-[var(--text-primary)]">Apple Safari</strong>. Third-party browsers (Chrome, Firefox, Edge) cannot trigger Home Screen installation on iOS.
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="w-full py-2 px-3 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--accent)] font-mono text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{copiedLink ? 'Link Copied — Paste into Safari' : 'Copy URL for Safari'}</span>
                      </button>
                    </div>
                  ) : isUnsupportedBrowser ? (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <ExternalLink size={15} />
                        <span>In-App Browser Detected</span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        In-app browsers (social media and messaging webviews) do not support home screen installation. Open this page directly in <strong className="text-[var(--text-primary)]">Chrome</strong> or <strong className="text-[var(--text-primary)]">Safari</strong> to install.
                      </p>
                    </div>
                  ) : isIosSafari ? (
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
                              Scroll down and select <strong className="text-[var(--text-primary)] font-semibold">Add to Home Screen</strong>
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
                              Tap <strong className="text-[var(--text-primary)] font-semibold">Add</strong> in the top right corner
                            </span>
                            <div className="px-2 py-0.5 rounded bg-[var(--accent)] text-slate-950 font-bold text-[10px] shrink-0">
                              Add
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : hasNativePrompt ? (
                    <div className="space-y-3">
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Install PULSE directly to your phone for instant one-tap launching and an isolated window.
                      </p>

                      <button 
                        type="button"
                        id="native-mobile-pwa-install-btn"
                        onClick={handleInstallClick}
                        className="w-full py-2.5 px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-slate-950 font-mono font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors active:scale-98 cursor-pointer shadow-sm"
                      >
                        <Download size={14} />
                        <span>Install PULSE App</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Install PULSE via your browser menu for one-tap home screen access and standalone execution.
                      </p>

                      <div className="bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-lg p-3 space-y-2 mt-2 font-mono text-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</div>
                          <p className="text-[11px] text-[var(--text-secondary)] font-sans">Tap the browser menu icon (<strong className="text-[var(--text-primary)]">⋮</strong> or settings icon in the toolbar)</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</div>
                          <p className="text-[11px] text-[var(--text-secondary)] font-sans">Select <strong className="text-[var(--text-primary)]">Install PULSE</strong> or <strong className="text-[var(--text-primary)]">Add to Home screen</strong></p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Dismiss Button */}
            <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-1)] flex items-center justify-between shrink-0">
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {isInstalled 
                  ? 'Standalone Mode Ready' 
                  : isOffline 
                    ? 'Offline Mode Active' 
                    : 'Local client cache enabled'}
              </span>
              <button 
                type="button"
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
