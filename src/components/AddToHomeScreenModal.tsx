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
  ExternalLink
} from 'lucide-react';
import { playAudioCue, triggerHaptic, useReducedMotionPreference } from '../lib/settingsStore';
import { useModalAccessibility } from '../lib/modalAccessibility';

export interface AddToHomeScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstalled: boolean;
  isIos: boolean;
  isSafari?: boolean;
  isIosSafari?: boolean;
  isIosChrome?: boolean;
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
  isIosChrome: propIsIosChrome,
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
  const shouldReduceMotion = useReducedMotionPreference();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { zIndex } = useModalAccessibility({
    isOpen,
    onClose,
    dialogRef,
    initialFocusRef: closeButtonRef,
    modalId: 'pwa-install-modal'
  });

  const isIosChrome = typeof propIsIosChrome === 'boolean'
    ? propIsIosChrome
    : (isIos && typeof window !== 'undefined' && /CriOS/i.test(window.navigator.userAgent));
  const isIosSafari = typeof propIsIosSafari === 'boolean' 
    ? propIsIosSafari 
    : (isIos && (isSafari ?? true) && !isIosChrome);
  const isIosOtherBrowser = typeof propIsIosOtherBrowser === 'boolean' 
    ? propIsIosOtherBrowser 
    : (isIos && !isIosSafari && !isIosChrome && !isUnsupportedBrowser);

  const handleInstallClick = async () => {
    playAudioCue('click');
    triggerHaptic('tap');
    const success = await onPromptInstall();
    if (success) {
      playAudioCue('success');
      triggerHaptic('success');
    }
  };

  const fallbackCopyText = (text: string): boolean => {
    if (typeof document === 'undefined') return false;
    let textArea: HTMLTextAreaElement | null = null;
    try {
      textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.setAttribute('readonly', '');
      textArea.setAttribute('aria-hidden', 'true');
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      return Boolean(document.execCommand && document.execCommand('copy'));
    } catch {
      return false;
    } finally {
      if (textArea && textArea.parentNode) {
        textArea.parentNode.removeChild(textArea);
      }
    }
  };

  const handleCopyLink = async () => {
    playAudioCue('click');
    triggerHaptic('tap');
    const url = typeof window !== 'undefined' ? window.location.href : '';
    let success = false;

    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(url);
        success = true;
      } catch {
        success = false;
      }
    }

    if (!success) {
      success = fallbackCopyText(url);
    }

    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
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
        <div
          style={{ zIndex }}
          className="fixed inset-0 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        >
          {/* Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.05 : 0.2 }}
            className="fixed inset-0 bg-[#090D1A]/50 backdrop-blur-sm cursor-pointer"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
            aria-hidden="true"
          />

          {/* Modal Dialog Container */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-modal-title"
            id="pwa-install-modal"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16, scale: shouldReduceMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 16, scale: shouldReduceMotion ? 1 : 0.96 }}
            transition={{ duration: shouldReduceMotion ? 0.05 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[500px] max-h-[min(650px,calc(100dvh-2rem))] bg-gradient-to-b from-[#FFFFFF] via-[#F9FBFF] to-[#F1F6FD] border border-sky-100 rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 flex flex-col font-sans text-[#090D1A] my-auto shadow-[0_24px_64px_rgba(0,102,255,0.14),0_8px_24px_rgba(0,0,0,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] overflow-hidden"
          >
            {/* Header: Title, Subtitle, and Close Control */}
            <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-[14px] bg-[#EAF5FF] text-[#0066FF] flex items-center justify-center shrink-0 shadow-xs">
                  <Download size={22} strokeWidth={2.2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 id="pwa-modal-title" className="font-heading font-extrabold text-[15px] sm:text-[16px] tracking-wide text-[#090D1A] uppercase leading-tight">
                      ADD TO HOME SCREEN
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EAF5FF] border border-sky-200 text-[#0066FF] uppercase tracking-wider">
                      PWA
                    </span>
                  </div>
                  <p className="text-[11.5px] sm:text-[12px] text-[#64748B] font-medium tracking-tight">
                    Install PULSE as a dedicated standalone app
                  </p>
                </div>
              </div>

              <button 
                ref={closeButtonRef}
                type="button"
                id="close-pwa-modal-btn"
                onClick={handleClose}
                aria-label="Close"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            {/* Body Content with Scrollable Container */}
            <div className="flex-1 space-y-3.5 min-h-0 overflow-y-auto pr-1 -mr-1 custom-scrollbar">
              {/* Status if already installed */}
              {isInstalled ? (
                <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 shadow-[0_2px_8px_rgba(16,185,129,0.06)] flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <ShieldCheck size={19} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold font-mono text-emerald-800 uppercase tracking-wider">
                      APP INSTALLED
                    </h3>
                    <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                      PULSE is installed and running in its own standalone window with direct home screen access.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Feature Highlights Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3.5 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] flex flex-col gap-1.5">
                      <div className="w-7 h-7 rounded-lg bg-[#EAF5FF] text-[#0066FF] flex items-center justify-center">
                        <Zap size={14} strokeWidth={2.4} />
                      </div>
                      <span className="text-xs font-bold text-[#090D1A]">App Window</span>
                      <span className="text-[10.5px] text-[#64748B] leading-tight">Runs in its own window without browser address bars</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] flex flex-col gap-1.5">
                      <div className="w-7 h-7 rounded-lg bg-[#EAF5FF] text-[#0066FF] flex items-center justify-center">
                        <Maximize2 size={14} strokeWidth={2.4} />
                      </div>
                      <span className="text-xs font-bold text-[#090D1A]">Fullscreen Focus</span>
                      <span className="text-[10.5px] text-[#64748B] leading-tight">Maximum screen space and faster touch response</span>
                    </div>
                  </div>

                  {/* Device & Browser Specific Instructions */}
                  {isUnsupportedBrowser ? (
                    <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 shadow-[0_2px_8px_rgba(245,158,11,0.06)] space-y-2">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                        <ExternalLink size={16} strokeWidth={2.2} />
                        <span>In-App Browser Detected</span>
                      </div>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Browsers inside social media or messaging apps cannot install apps to your home screen. Open this page directly in <strong className="text-[#090D1A] font-semibold">Chrome</strong> or <strong className="text-[#090D1A] font-semibold">Safari</strong> to install.
                      </p>
                    </div>
                  ) : isIosChrome ? (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] space-y-3">
                      <div className="text-xs font-mono font-bold text-[#0066FF] uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone size={14} strokeWidth={2.2} />
                        <span>iOS Chrome Quick Steps</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        {/* Step 1 */}
                        <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-100 flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-[#EAF5FF] text-[#0066FF] font-bold text-[11px] flex items-center justify-center shrink-0">
                            1
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-[#475569]">
                              Tap the <strong className="text-[#090D1A] font-semibold">Share</strong> or <strong className="text-[#090D1A] font-semibold">Menu (⋯)</strong> icon in Chrome
                            </span>
                            <div className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[#0066FF] shrink-0 flex items-center gap-1 shadow-xs">
                              <Share size={11} strokeWidth={2.2} />
                              <span className="text-[10px] font-semibold">Share</span>
                            </div>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-100 flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-[#EAF5FF] text-[#0066FF] font-bold text-[11px] flex items-center justify-center shrink-0">
                            2
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-[#475569]">
                              Scroll down and tap <strong className="text-[#090D1A] font-semibold">Add to Home Screen</strong>
                            </span>
                            <div className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[#0066FF] shrink-0 flex items-center gap-1 shadow-xs">
                              <SquarePlus size={11} strokeWidth={2.2} />
                              <span className="text-[10px] font-semibold">Add</span>
                            </div>
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-100 flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-[#EAF5FF] text-[#0066FF] font-bold text-[11px] flex items-center justify-center shrink-0">
                            3
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-[#475569]">
                              Tap <strong className="text-[#090D1A] font-semibold">Add</strong> in the top right corner
                            </span>
                            <div className="px-2 py-0.5 rounded-lg bg-[#0066FF] text-white font-bold text-[10px] shrink-0 shadow-xs">
                              Add
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : isIosOtherBrowser ? (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] space-y-3">
                      <div className="flex items-center gap-2 text-[#0066FF] font-bold text-xs font-mono uppercase tracking-wider">
                        <Smartphone size={14} strokeWidth={2.2} />
                        <span>Add to Home Screen on iOS</span>
                      </div>
                      <p className="text-xs text-[#475569] leading-relaxed">
                        Tap the <strong className="text-[#090D1A] font-semibold">Share</strong> or <strong className="text-[#090D1A] font-semibold">Menu</strong> button and select <strong className="text-[#090D1A] font-semibold">Add to Home Screen</strong>, or copy the URL to open in Safari or Chrome.
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F6FD] border border-slate-200 text-[#0066FF] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs active:scale-98"
                      >
                        {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        <span>{copiedLink ? 'Link Copied' : 'Copy Page URL'}</span>
                      </button>
                    </div>
                  ) : isIosSafari ? (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] space-y-3">
                      <div className="text-xs font-mono font-bold text-[#0066FF] uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone size={14} strokeWidth={2.2} />
                        <span>iOS Safari Quick Steps</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        {/* Step 1 */}
                        <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-100 flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-[#EAF5FF] text-[#0066FF] font-bold text-[11px] flex items-center justify-center shrink-0">
                            1
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-[#475569]">
                              Tap the <strong className="text-[#090D1A] font-semibold">Share button</strong> in Safari
                            </span>
                            <div className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[#0066FF] shrink-0 flex items-center gap-1 shadow-xs">
                              <Share size={11} strokeWidth={2.2} />
                              <span className="text-[10px] font-semibold">Share</span>
                            </div>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-100 flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-[#EAF5FF] text-[#0066FF] font-bold text-[11px] flex items-center justify-center shrink-0">
                            2
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-[#475569]">
                              Scroll down and select <strong className="text-[#090D1A] font-semibold">Add to Home Screen</strong>
                            </span>
                            <div className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[#0066FF] shrink-0 flex items-center gap-1 shadow-xs">
                              <SquarePlus size={11} strokeWidth={2.2} />
                              <span className="text-[10px] font-semibold">Add</span>
                            </div>
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-100 flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-[#EAF5FF] text-[#0066FF] font-bold text-[11px] flex items-center justify-center shrink-0">
                            3
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-[#475569]">
                              Tap <strong className="text-[#090D1A] font-semibold">Add</strong> in the top right corner
                            </span>
                            <div className="px-2 py-0.5 rounded-lg bg-[#0066FF] text-white font-bold text-[10px] shrink-0 shadow-xs">
                              Add
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : hasNativePrompt ? (
                    <div className="p-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] space-y-3.5">
                      <p className="text-xs text-[#475569] leading-relaxed">
                        Install PULSE to launch directly from your desktop or home screen in its own window with minimal system latency.
                      </p>

                      <button 
                        type="button"
                        id="native-pwa-install-btn"
                        onClick={handleInstallClick}
                        className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#0099FF] hover:from-[#0055DD] hover:to-[#0088EE] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-[0_4px_14px_rgba(0,102,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
                      >
                        <Download size={16} strokeWidth={2.4} />
                        <span>Install PULSE</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] space-y-3">
                      <p className="text-xs text-[#475569] leading-relaxed">
                        Install PULSE from your browser toolbar or menu to open it directly as a dedicated app window.
                      </p>

                      <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3 space-y-2 text-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-md bg-[#EAF5FF] text-[#0066FF] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</div>
                          <p className="text-xs text-[#475569]">Tap the browser menu icon (<strong className="text-[#090D1A] font-semibold">⋮</strong> or settings icon in the address bar)</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-md bg-[#EAF5FF] text-[#0066FF] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</div>
                          <p className="text-xs text-[#475569]">Select <strong className="text-[#090D1A] font-semibold">Install PULSE</strong> or <strong className="text-[#090D1A] font-semibold">Add to Home screen</strong></p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer with Status Badge and Dismiss/Done button */}
            <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isInstalled ? 'bg-emerald-500' : isOffline ? 'bg-amber-500' : 'bg-[#0066FF]'
                }`} />
                <span className="text-[11px] font-mono text-[#64748B]">
                  {isInstalled 
                    ? 'App installed' 
                    : isOffline 
                      ? 'Offline mode' 
                      : 'Ready to install'}
                </span>
              </div>
              <button 
                type="button"
                id="dismiss-pwa-modal-btn"
                onClick={handleClose}
                className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#090D1A] text-xs font-semibold cursor-pointer transition-colors shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
              >
                {isInstalled ? 'Done' : 'Dismiss'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
