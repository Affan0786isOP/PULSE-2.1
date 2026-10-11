import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Settings, 
  Monitor, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Trash2, 
  Check,
  Download,
  Sliders,
  AlertCircle,
  Clock,
  Moon,
  Activity,
  Timer
} from 'lucide-react';
import { PulseLogo } from './brand';
import { useRefreshRate } from '../lib/useRefreshRate';
import { detectRefreshRate, resetRefreshRateCache, cancelRefreshRateDetection } from '../lib/refreshRateDetector';
import { resetPendingSyncQueue } from '../lib/trialStore';
import { clearInMemorySessionTrials } from '../lib/inMemorySessionStore';
import { 
  useSettings, 
  playAudioCue, 
  triggerHaptic, 
  resetSettingsToDefaults,
  isHapticsSupported 
} from '../lib/settingsStore';
import { usePwaInstall } from '../lib/usePwaInstall';
import { AddToHomeScreenModal } from './AddToHomeScreenModal';
import { useModalAccessibility } from '../lib/modalAccessibility';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'general' | 'feedback' | 'calibration';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const refreshInfo = useRefreshRate();
  const pwa = usePwaInstall();
  const [settings, updateSettingsState] = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const isRecalibratingRef = useRef(false);
  useEffect(() => {
    isRecalibratingRef.current = isRecalibrating;
  }, [isRecalibrating]);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    const doc = document as any;
    return Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  });
  const [fullscreenNotice, setFullscreenNotice] = useState<string | null>(null);
  const fullscreenNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clearedNotice, setClearedNotice] = useState(false);
  const [mounted, setMounted] = useState(false);
  const wasOpenRef = useRef(false);
  const isMountedRef = useRef(true);
  const recalibrateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const hapticsAvailable = isHapticsSupported();

  useEffect(() => {
    isMountedRef.current = true;
    setMounted(true);
    return () => {
      isMountedRef.current = false;
      if (recalibrateTimeoutRef.current) {
        clearTimeout(recalibrateTimeoutRef.current);
      }
      if (fullscreenNoticeTimerRef.current) {
        clearTimeout(fullscreenNoticeTimerRef.current);
      }
      if (isRecalibratingRef.current) {
        cancelRefreshRateDetection();
      }
    };
  }, []);

  // Single authoritative owner of settings-open / settings-close events
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      setActiveTab('general');
      setCalibrationError(null);
      setIsRecalibrating(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pulse_settings_open'));
      }
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      if (recalibrateTimeoutRef.current) {
        clearTimeout(recalibrateTimeoutRef.current);
      }
      if (isRecalibratingRef.current) {
        cancelRefreshRateDetection();
        setIsRecalibrating(false);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pulse_settings_close'));
      }
    }
  }, [isOpen]);

  // Safe reference-counted modal scroll-lock & accessibility
  const { zIndex } = useModalAccessibility({
    isOpen,
    onClose,
    dialogRef,
    initialFocusRef: closeButtonRef,
    modalId: 'settings-modal'
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      setIsFullscreen(
        Boolean(
          doc.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.mozFullScreenElement ||
          doc.msFullscreenElement
        )
      );
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const showFullscreenFeedback = (msg: string) => {
    if (fullscreenNoticeTimerRef.current) {
      clearTimeout(fullscreenNoticeTimerRef.current);
    }
    setFullscreenNotice(msg);
    fullscreenNoticeTimerRef.current = setTimeout(() => {
      setFullscreenNotice(null);
    }, 3200);
  };

  const handleToggleSound = () => {
    const updated = updateSettingsState({ soundEnabled: !settings.soundEnabled });
    if (updated.soundEnabled) {
      playAudioCue('click');
    }
  };

  const handleToggleHaptics = () => {
    if (!hapticsAvailable) return;
    const updated = updateSettingsState({ hapticsEnabled: !settings.hapticsEnabled });
    if (updated.hapticsEnabled) {
      triggerHaptic('success');
    }
  };

  const handleTestHaptic = () => {
    if (!hapticsAvailable) return;
    triggerHaptic('success');
  };

  const handleToggleExhibition = () => {
    updateSettingsState({ exhibitionModeEnabled: !settings.exhibitionModeEnabled });
    playAudioCue('click');
  };

  const handleToggleReducedMotion = () => {
    updateSettingsState({ reducedMotionEnabled: !settings.reducedMotionEnabled });
    playAudioCue('click');
  };

  const handleTestSound = () => {
    playAudioCue('success');
  };

  const handleRecalibrateDisplay = async () => {
    setIsRecalibrating(true);
    setCalibrationError(null);
    playAudioCue('click');
    try {
      const fresh = await detectRefreshRate(true);
      if (recalibrateTimeoutRef.current) {
        clearTimeout(recalibrateTimeoutRef.current);
      }
      recalibrateTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setIsRecalibrating(false);
          if (fresh.status === 'ready' && fresh.source !== 'fallback') {
            playAudioCue('success');
          } else if (fresh.status === 'error' || fresh.source === 'fallback') {
            setCalibrationError(fresh.error || 'Calibration used fallback estimation');
            playAudioCue('error');
          }
        }
      }, 400);
    } catch {
      if (isMountedRef.current) {
        setIsRecalibrating(false);
        setCalibrationError('Calibration failed');
        playAudioCue('error');
      }
    }
  };

  const handleToggleFullscreen = async () => {
    playAudioCue('click');
    try {
      const doc = document as any;
      const docEl = document.documentElement as any;
      const isCurrentlyFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      const requestFS =
        docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen;

      const exitFS =
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen;

      if (!isCurrentlyFs) {
        if (!requestFS) {
          showFullscreenFeedback('Fullscreen is not supported on this browser/device');
          return;
        }
        await requestFS.call(docEl);
      } else {
        if (exitFS) {
          await exitFS.call(doc);
        }
      }
    } catch {
      showFullscreenFeedback('Fullscreen unavailable or restricted by browser');
    }
  };

  const handleClearCache = () => {
    playAudioCue('click');
    try {
      const targetedKeys = [
        'pulse_raw_trial_observations',
        'pulse_raw_trial_observations_evicted_count',
        'pulse_test_analytics_history',
        'pulse_test_analytics_history_evicted_count',
        'pulse_pending_sync_queue',
        'pulse_analytics_sessions',
        'pulse_analytics_sessions_evicted_count',
        'pulse_local_leaderboard',
        'pulse_local_leaderboard_entries',
        'pulse_local_leaderboard_entries_evicted_count',
        'pulse_local_leaderboard_evicted_count',
        'pulse_admin_audit_logs',
        'pulse_admin_audit_logs_evicted_count',
        'pulse_participant_id',
        'pulse_welcome_seen',
        'pulse_desktop_welcome_seen',
        'pulse_mobile_welcome_seen',
        'pulse_force_desktop',
        'pulse_force_mobile',
        'pulse_refresh_rate_cached',
        'pulse_refresh_rate_fp',
        'pulse_improve_checklist_v1',
        'pulse_user_settings'
      ];

      targetedKeys.forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });

      if (typeof localStorage !== 'undefined') {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('pulse_')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch {}
      }

      if (typeof sessionStorage !== 'undefined') {
        try {
          sessionStorage.removeItem('pulse_force_desktop');
          sessionStorage.removeItem('pulse_force_mobile');
          sessionStorage.removeItem('pulse_pending_sync_queue');
        } catch {}
      }

      if (typeof document !== 'undefined') {
        try {
          document.cookie = "pulse_force_desktop=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie = "pulse_force_mobile=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        } catch {}
      }

      resetRefreshRateCache();
      resetPendingSyncQueue();
      clearInMemorySessionTrials();
      resetSettingsToDefaults();

      setClearedNotice(true);
      setTimeout(() => {
        if (isMountedRef.current) setClearedNotice(false);
      }, 3000);
    } catch {
      // Ignore
    }
  };

  if (!mounted) return null;

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div 
              style={{ zIndex }}
              className="fixed inset-0 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
            >
              {/* Soft blurred dark backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) onClose();
                }}
                className="fixed inset-0 bg-[#090D1A]/50 backdrop-blur-sm cursor-pointer"
                aria-hidden="true"
              />

              {/* Modal Container */}
              <motion.div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-modal-heading"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.96, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 14 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-[550px] max-h-[min(690px,calc(100dvh-2rem))] bg-gradient-to-b from-[#FFFFFF] via-[#F9FBFF] to-[#F1F6FD] border border-sky-100 rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 flex flex-col font-sans text-[#090D1A] my-auto shadow-[0_24px_64px_rgba(0,102,255,0.14),0_8px_24px_rgba(0,0,0,0.05)] focus-visible:ring-2 focus-visible:ring-[#0066FF] outline-none overflow-hidden"
              >
                {/* Header: Title, Subtitle, and Close Control */}
                <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-[14px] bg-[#EAF5FF] text-[#0066FF] flex items-center justify-center shrink-0 shadow-xs">
                      <Settings size={22} strokeWidth={2.2} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h2 id="settings-modal-heading" className="font-heading font-extrabold text-[15px] sm:text-[16px] tracking-wide text-[#090D1A] uppercase leading-tight">
                        SYSTEM CONFIGURATION
                      </h2>
                      <p className="text-[11.5px] sm:text-[12px] text-[#64748B] font-medium tracking-tight">
                        Preferences &amp; Display Timing
                      </p>
                    </div>
                  </div>

                  <button 
                    ref={closeButtonRef}
                    type="button"
                    id="close-settings-modal-btn"
                    onClick={onClose}
                    aria-label="Close Settings"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
                  >
                    <X size={18} strokeWidth={2.2} />
                  </button>
                </div>

                {/* Segmented Pill Navigation Tabs */}
                <div className="mb-4 shrink-0">
                  <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-[#F0F5FA]/80 border border-slate-100 text-xs">
                    <button 
                      type="button"
                      onClick={() => { playAudioCue('click'); setActiveTab('general'); }}
                      className={`py-2 px-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
                        activeTab === 'general'
                          ? 'bg-white text-[#0066FF] shadow-[0_2px_8px_rgba(0,102,255,0.08)] border border-sky-100/60'
                          : 'text-[#64748B] hover:text-[#090D1A] border border-transparent'
                      }`}
                    >
                      <Sliders size={14} strokeWidth={2.2} />
                      <span>General</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => { playAudioCue('click'); setActiveTab('feedback'); }}
                      className={`py-2 px-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
                        activeTab === 'feedback'
                          ? 'bg-white text-[#0066FF] shadow-[0_2px_8px_rgba(0,102,255,0.08)] border border-sky-100/60'
                          : 'text-[#64748B] hover:text-[#090D1A] border border-transparent'
                      }`}
                    >
                      <Volume2 size={14} strokeWidth={2.2} />
                      <span>Feedback</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => { playAudioCue('click'); setActiveTab('calibration'); }}
                      className={`py-2 px-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
                        activeTab === 'calibration'
                          ? 'bg-white text-[#0066FF] shadow-[0_2px_8px_rgba(0,102,255,0.08)] border border-sky-100/60'
                          : 'text-[#64748B] hover:text-[#090D1A] border border-transparent'
                      }`}
                    >
                      <Monitor size={14} strokeWidth={2.2} />
                      <span>System</span>
                    </button>
                  </div>
                </div>

                {/* Tab Content Body */}
                <div className="flex-1 space-y-3 min-h-0 overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                  {/* TAB 1: GENERAL */}
                  {activeTab === 'general' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      {/* Font Scale Card */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#090D1A]">
                            Accessibility Text Scale
                          </span>
                          <span className="font-mono text-[11px] text-[#64748B] font-medium uppercase">
                            {Math.round((settings.fontScale || 1.0) * 100)}% ({
                              (settings.fontScale || 1.0) <= 0.9 ? 'Compact' :
                              (settings.fontScale || 1.0) <= 1.0 ? 'Default' :
                              (settings.fontScale || 1.0) <= 1.15 ? 'Large' : 'Max'
                            })
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#F0F5FA]/80 border border-slate-100">
                          {[
                            { label: '90%', scale: 0.9, title: 'Compact' },
                            { label: '100%', scale: 1.0, title: 'Default' },
                            { label: '115%', scale: 1.15, title: 'Large' },
                            { label: '130%', scale: 1.3, title: 'Max' }
                          ].map(opt => {
                            const isSelected = Math.abs((settings.fontScale || 1.0) - opt.scale) < 0.05;
                            return (
                              <button
                                type="button"
                                key={`font-scale-${opt.scale}`}
                                id={`font-scale-${opt.label.replace('%', '')}-btn`}
                                onClick={() => {
                                  playAudioCue('click');
                                  updateSettingsState({ fontScale: opt.scale });
                                }}
                                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg font-mono text-xs transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-white border-sky-200 text-[#0066FF] font-bold shadow-xs'
                                    : 'border-transparent text-[#64748B] hover:text-[#090D1A]'
                                }`}
                                title={`${opt.title} text scale (${opt.label})`}
                              >
                                <span className="text-[11.5px] font-bold">{opt.label}</span>
                                <span className="text-[9.5px] text-[#94A3B8]">{opt.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Fullscreen Card */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] text-[#0066FF] flex items-center justify-center shrink-0">
                            {isFullscreen ? <Minimize2 size={18} strokeWidth={2.2} /> : <Maximize2 size={18} strokeWidth={2.2} />}
                          </div>
                          <div>
                            <div className="text-xs sm:text-[13.5px] font-bold text-[#090D1A]">Fullscreen Focus</div>
                            <div className="text-[11px] sm:text-xs text-[#64748B]">Run tests without browser distractions</div>
                          </div>
                        </div>

                        <button 
                          type="button"
                          id="toggle-fullscreen-btn"
                          onClick={handleToggleFullscreen}
                          className="px-3.5 py-1.5 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-[#0066FF] font-semibold text-xs cursor-pointer transition-colors shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
                        >
                          {isFullscreen ? 'Exit' : 'Enter'}
                        </button>
                      </div>

                      {fullscreenNotice && (
                        <div 
                          role="status"
                          aria-live="polite"
                          className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-mono flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <AlertCircle size={14} className="shrink-0 text-rose-500" />
                            <span className="truncate">{fullscreenNotice}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFullscreenNotice(null)}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer p-0.5 shrink-0"
                            aria-label="Dismiss message"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}

                      {/* Mobile Web App (PWA) Card */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] text-[#0066FF] flex items-center justify-center shrink-0">
                            <Smartphone size={18} strokeWidth={2.2} />
                          </div>
                          <div>
                            <div className="text-xs sm:text-[13.5px] font-bold text-[#090D1A] flex items-center gap-1.5">
                              <span>Mobile Web App</span>
                              {pwa.isInstalled && (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 font-mono text-[9.5px] font-bold">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] sm:text-xs text-[#64748B]">
                              {pwa.isInstalled ? 'Running as a standalone app' : 'Add to home screen to launch quickly'}
                            </div>
                          </div>
                        </div>

                        <button 
                          type="button"
                          id="open-a2hs-guide-btn"
                          onClick={async () => {
                            playAudioCue('click');
                            if (pwa.isInstalled) {
                              pwa.openInstallGuide();
                            } else {
                              await pwa.promptInstall();
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-[#0066FF] font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
                        >
                          <Download size={13} strokeWidth={2.2} />
                          <span>{pwa.isInstalled ? 'Details' : 'Install'}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: FEEDBACK */}
                  {activeTab === 'feedback' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      {/* Audio Feedback Card */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] text-[#0066FF] flex items-center justify-center shrink-0">
                            {settings.soundEnabled ? <Volume2 size={18} strokeWidth={2.2} /> : <VolumeX size={18} strokeWidth={2.2} />}
                          </div>
                          <div>
                            <div className="text-xs sm:text-[13.5px] font-bold text-[#090D1A]">Audio Feedback</div>
                            <div className="text-[11px] sm:text-xs text-[#64748B]">Auditory beeps and click feedback</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2.5">
                          {settings.soundEnabled && (
                            <button 
                              type="button"
                              onClick={handleTestSound}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#0066FF] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
                            >
                              Test
                            </button>
                          )}
                          <button 
                            type="button"
                            id="toggle-sound-btn"
                            role="switch"
                            aria-checked={settings.soundEnabled}
                            aria-label="Toggle Audio Feedback"
                            onClick={handleToggleSound}
                            className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
                              settings.soundEnabled ? 'bg-[#0066FF]' : 'bg-slate-200 border border-slate-300'
                            }`}
                          >
                            <span 
                              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform flex items-center justify-center text-[10px] font-bold ${
                                settings.soundEnabled ? 'translate-x-5 text-[#0066FF]' : 'translate-x-0'
                              }`} 
                            >
                              {settings.soundEnabled ? '✓' : ''}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Haptic Vibration Card */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] text-[#0066FF] flex items-center justify-center shrink-0">
                            <Smartphone size={18} strokeWidth={2.2} />
                          </div>
                          <div>
                            <div className="text-xs sm:text-[13.5px] font-bold text-[#090D1A]">Haptic Vibration</div>
                            <div className="text-[11px] sm:text-xs text-[#64748B]">
                              {!hapticsAvailable ? 'Not supported on this device/browser' : 'Vibrate on button press'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2.5">
                          {settings.hapticsEnabled && hapticsAvailable && (
                            <button 
                              type="button"
                              onClick={handleTestHaptic}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#0066FF] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
                            >
                              Test
                            </button>
                          )}
                          <button 
                            type="button"
                            id="toggle-haptics-btn"
                            role="switch"
                            aria-checked={settings.hapticsEnabled && hapticsAvailable}
                            aria-label="Toggle Haptic Vibration"
                            disabled={!hapticsAvailable}
                            onClick={handleToggleHaptics}
                            className={`w-12 h-7 rounded-full transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
                              !hapticsAvailable
                                ? 'opacity-40 cursor-not-allowed bg-slate-200 border border-slate-300'
                                : settings.hapticsEnabled ? 'bg-[#0066FF] cursor-pointer' : 'bg-slate-200 border border-slate-300 cursor-pointer'
                            }`}
                          >
                            <span 
                              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform flex items-center justify-center text-[10px] font-bold ${
                                settings.hapticsEnabled && hapticsAvailable ? 'translate-x-5 text-[#0066FF]' : 'translate-x-0'
                              }`} 
                            >
                              {settings.hapticsEnabled && hapticsAvailable ? '✓' : ''}
                            </span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: SYSTEM (Matches Reference Image Exactly) */}
                  {activeTab === 'calibration' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      {/* Section Card 1: DISPLAY FRAME TIMING */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#EAF5FF] text-[#0066FF] flex items-center justify-center shrink-0">
                              <Monitor size={17} strokeWidth={2.2} />
                            </div>
                            <div>
                              <div className="font-mono font-bold text-xs sm:text-[13px] uppercase tracking-wider text-[#090D1A]">
                                DISPLAY FRAME TIMING
                              </div>
                              <div className="text-[11px] text-[#64748B]">
                                Display and timing diagnostics for precise measurement
                              </div>
                            </div>
                          </div>

                          <button 
                            type="button"
                            id="recalibrate-display-btn"
                            onClick={handleRecalibrateDisplay}
                            disabled={isRecalibrating}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-[#0066FF] text-xs font-semibold cursor-pointer transition-all disabled:opacity-50 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
                          >
                            <RefreshCw size={12} strokeWidth={2.4} className={isRecalibrating ? 'animate-spin' : ''} />
                            <span>{isRecalibrating ? 'Calibrating...' : 'Recalibrate'}</span>
                          </button>
                        </div>

                        {/* Two Diagnostic Metric Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                          {/* Sub-card 1: DISPLAY REFRESH RATE */}
                          <div className="p-3 rounded-2xl bg-[#F8FAFC]/90 border border-slate-100 flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-[#EAF5FF] text-[#0066FF] flex items-center justify-center shrink-0">
                              <Activity size={20} strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[9.5px] text-[#64748B] font-mono font-bold uppercase tracking-wider">
                                DISPLAY REFRESH RATE
                              </div>
                              <div className="text-xl font-extrabold text-[#0066FF] leading-tight mt-0.5">
                                {isRecalibrating || refreshInfo.status === 'detecting' ? (
                                  <span className="text-xs text-[#94A3B8]">Detecting…</span>
                                ) : (
                                  `${refreshInfo.hz} Hz`
                                )}
                              </div>
                              <div className="text-[10px] text-[#64748B] font-medium mt-0.5">
                                {isRecalibrating || refreshInfo.status === 'detecting'
                                  ? 'Measuring frames…'
                                  : refreshInfo.source === 'measured'
                                  ? 'Measured cadence'
                                  : refreshInfo.source === 'estimated'
                                  ? 'Calculated cadence'
                                  : 'Fallback default'}
                              </div>
                            </div>
                          </div>

                          {/* Sub-card 2: ESTIMATED DISPLAY MIDPOINT */}
                          <div className="p-3 rounded-2xl bg-[#F8FAFC]/90 border border-slate-100 flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-[#EAF5FF] text-[#0066FF] flex items-center justify-center shrink-0">
                              <Timer size={20} strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[9.5px] text-[#64748B] font-mono font-bold uppercase tracking-wider">
                                ESTIMATED DISPLAY MIDPOINT
                              </div>
                              <div className="text-xl font-extrabold text-[#00C2FF] leading-tight mt-0.5">
                                {isRecalibrating || refreshInfo.status === 'detecting' ? (
                                  <span className="text-xs text-[#94A3B8]">Computing…</span>
                                ) : (
                                  `~${refreshInfo.displayDelayOffsetMs} ms`
                                )}
                              </div>
                              <div className="text-[10px] text-[#64748B] font-medium mt-0.5">
                                Theoretical midpoint
                              </div>
                            </div>
                          </div>
                        </div>

                        {calibrationError && (
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-mono">
                            {calibrationError}
                          </div>
                        )}
                      </div>

                      {/* Row 1: Reduced Motion */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] text-[#0066FF] flex items-center justify-center shrink-0">
                            <Moon size={18} strokeWidth={2.2} />
                          </div>
                          <div>
                            <div className="text-xs sm:text-[13.5px] font-bold text-[#090D1A]">Reduced Motion</div>
                            <div className="text-[11px] sm:text-xs text-[#64748B]">
                              Disable animations, background particles, and transitions
                            </div>
                          </div>
                        </div>

                        <button 
                          type="button"
                          id="toggle-reduced-motion-btn"
                          role="switch"
                          aria-checked={settings.reducedMotionEnabled}
                          aria-label="Toggle Reduced Motion"
                          onClick={handleToggleReducedMotion}
                          className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
                            settings.reducedMotionEnabled ? 'bg-[#0066FF]' : 'bg-slate-200 border border-slate-300'
                          }`}
                        >
                          <span 
                            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform flex items-center justify-center text-[10px] font-bold ${
                              settings.reducedMotionEnabled ? 'translate-x-5 text-[#0066FF]' : 'translate-x-0'
                            }`} 
                          >
                            {settings.reducedMotionEnabled ? '✓' : ''}
                          </span>
                        </button>
                      </div>

                      {/* Row 2: Exhibition Kiosk Mode */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] text-[#0066FF] flex items-center justify-center shrink-0">
                            <Monitor size={18} strokeWidth={2.2} />
                          </div>
                          <div>
                            <div className="text-xs sm:text-[13.5px] font-bold text-[#090D1A]">Exhibition Kiosk Mode</div>
                            <div className="text-[11px] sm:text-xs text-[#64748B]">
                              Lock navigation for public terminals
                            </div>
                          </div>
                        </div>

                        <button 
                          type="button"
                          id="toggle-exhibition-btn"
                          role="switch"
                          aria-checked={settings.exhibitionModeEnabled}
                          aria-label="Toggle Exhibition Kiosk Mode"
                          onClick={handleToggleExhibition}
                          className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] ${
                            settings.exhibitionModeEnabled ? 'bg-[#0066FF]' : 'bg-slate-200 border border-slate-300'
                          }`}
                        >
                          <span 
                            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform flex items-center justify-center text-[10px] font-bold ${
                              settings.exhibitionModeEnabled ? 'translate-x-5 text-[#0066FF]' : 'translate-x-0'
                            }`} 
                          >
                            {settings.exhibitionModeEnabled ? '✓' : ''}
                          </span>
                        </button>
                      </div>

                      {/* Row 3: Clear Local Cache */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 border border-slate-100 shadow-[0_2px_8px_rgba(0,102,255,0.03)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#EF4444] flex items-center justify-center shrink-0">
                            <Trash2 size={18} strokeWidth={2.2} />
                          </div>
                          <div>
                            <div className="text-xs sm:text-[13.5px] font-bold text-[#090D1A]">Clear Local Cache</div>
                            <div className="text-[11px] sm:text-xs text-[#64748B]">
                              Reset stored preferences and unsynced data
                            </div>
                          </div>
                        </div>

                        <button 
                          type="button"
                          id="clear-session-cache-btn"
                          onClick={handleClearCache}
                          className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                        >
                          {clearedNotice ? (
                            <>
                              <Check size={13} strokeWidth={2.6} className="text-emerald-600" />
                              <span className="text-emerald-600">Done</span>
                            </>
                          ) : (
                            <>
                              <Trash2 size={13} strokeWidth={2.2} />
                              <span>Reset</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Footer: PULSE Latency Engine + Precision Calibration */}
                <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#090D1A] flex items-center justify-center text-[#00D2FF]">
                      <PulseLogo variant="mark" size={12} color="#00D2FF" />
                    </div>
                    <span className="font-heading font-extrabold text-[12px] text-[#090D1A] tracking-wider">
                      PULSE
                    </span>
                    <span className="text-[11px] font-mono text-[#64748B]">
                      Latency Engine
                    </span>
                  </div>

                  <span className="text-[11px] font-mono font-semibold text-[#0066FF] tracking-wider">
                    Precision Calibration
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Add to Home Screen Guided Modal */}
      <AddToHomeScreenModal
        isOpen={pwa.isGuideOpen}
        onClose={pwa.closeInstallGuide}
        isInstalled={pwa.isInstalled}
        isIos={pwa.isIos}
        isSafari={pwa.isSafari}
        isIosSafari={pwa.isIosSafari}
        isIosChrome={pwa.isIosChrome}
        isIosOtherBrowser={pwa.isIosOtherBrowser}
        isInstallable={pwa.isInstallable}
        hasNativePrompt={pwa.hasNativePrompt}
        isInstallPromptSupported={pwa.isInstallPromptSupported}
        isUnsupportedBrowser={pwa.isUnsupportedBrowser}
        isOffline={pwa.isOffline}
        onPromptInstall={pwa.promptInstall}
      />
    </>
  );
}
