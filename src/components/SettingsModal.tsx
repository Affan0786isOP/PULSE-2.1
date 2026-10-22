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

  Trash2, 
  Check,
  Download,
  Sliders,
  AlertCircle,
  Clock,
  Moon,
  Sun,

} from 'lucide-react';
import { PulseLogo } from './brand';
import { useSystemTheme } from '../lib/useSystemTheme';
import { 
  ThemeMode,
  useSettings, 
  playAudioCue, 
  triggerHaptic, 
  resetSettingsToDefaults,
  isHapticsSupported 
} from '../lib/settingsStore';
import { usePwaInstall } from '../lib/usePwaInstall';
import { AddToHomeScreenModal } from './AddToHomeScreenModal';
import { useModalAccessibility } from '../lib/modalAccessibility';
import { clearClientLeaderboardCache } from '../lib/firestore';
import { clearAuthoritativeStatsCache } from '../lib/useAuthoritativeStats';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'general' | 'feedback' | 'system';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const pwa = usePwaInstall();
  const [settings, updateSettingsState] = useSettings();
  const { activeTheme, setThemeMode } = useSystemTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const hapticsAvailable = isHapticsSupported();

  useEffect(() => {
    isMountedRef.current = true;
    setMounted(true);
    return () => {
      isMountedRef.current = false;
      if (fullscreenNoticeTimerRef.current) {
        clearTimeout(fullscreenNoticeTimerRef.current);
      }
    };
  }, []);

  // Single authoritative owner of settings-open / settings-close events
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      setActiveTab('general');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pulse_settings_open'));
      }
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
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
        // One-time cleanup of legacy offline leaderboard keys; public rankings are cloud-only.
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
        'pulse_authoritative_stats',
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
          document.cookie = "pulse_user_settings=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        } catch {}
      }

      resetSettingsToDefaults();
      clearClientLeaderboardCache();
      clearAuthoritativeStatsCache();

      if (typeof caches !== 'undefined') {
        try {
          caches.keys().then((keys) => {
            keys.forEach((key) => {
              const isAppShell = key.startsWith('pulse-pwa-') ||
                                key.startsWith('pulse-mobile-pwa-') ||
                                key.startsWith('pulse-fonts-');
              if (!isAppShell) {
                caches.delete(key);
              }
            });
          }).catch(() => {});
        } catch {}
      }

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
                className="relative z-10 w-full max-w-[550px] max-h-[min(690px,calc(100dvh-2rem))] bg-gradient-to-b from-[#FFFFFF] via-[#F9FBFF] to-[#F1F6FD] dark:from-[#12161B] dark:via-[#161B22] dark:to-[#0E1217] border border-sky-100 dark:border-slate-800 rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 flex flex-col font-sans text-[#090D1A] dark:text-white my-auto shadow-[0_24px_64px_rgba(0,102,255,0.14),0_8px_24px_rgba(0,0,0,0.05)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)] focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] outline-none overflow-hidden"
              >
                {/* Header: Title, Subtitle, and Close Control */}
                <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-[14px] bg-[#EAF5FF] dark:bg-[#181D23] text-[#0066FF] dark:text-[#22C7D6] flex items-center justify-center shrink-0 shadow-xs border border-transparent dark:border-slate-800">
                      <Settings size={22} strokeWidth={2.2} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h2 id="settings-modal-heading" className="font-heading font-extrabold text-[15px] sm:text-[16px] tracking-wide text-[#090D1A] dark:text-white uppercase leading-tight">
                        SYSTEM CONFIGURATION
                      </h2>
                      <p className="text-[11.5px] sm:text-[12px] text-[#64748B] dark:text-slate-400 font-medium tracking-tight">
                        Preferences &amp; System
                      </p>
                    </div>
                  </div>

                  <button 
                    ref={closeButtonRef}
                    type="button"
                    id="close-settings-modal-btn"
                    onClick={onClose}
                    aria-label="Close Settings"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#181D23] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
                  >
                    <X size={18} strokeWidth={2.2} />
                  </button>
                </div>

                {/* Segmented Pill Navigation Tabs */}
                <div className="mb-4 shrink-0">
                  <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-[#F0F5FA]/80 dark:bg-[#181D23] border border-slate-100 dark:border-slate-800 text-xs">
                    <button 
                      type="button"
                      onClick={() => { playAudioCue('click'); setActiveTab('general'); }}
                      className={`py-2 px-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] ${
                        activeTab === 'general'
                          ? 'bg-white dark:bg-[#12161B] text-[#0066FF] dark:text-[#22C7D6] shadow-[0_2px_8px_rgba(0,102,255,0.08)] border border-sky-100/60 dark:border-slate-700'
                          : 'text-[#64748B] dark:text-slate-400 hover:text-[#090D1A] dark:hover:text-white border border-transparent'
                      }`}
                    >
                      <Sliders size={14} strokeWidth={2.2} />
                      <span>General</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => { playAudioCue('click'); setActiveTab('feedback'); }}
                      className={`py-2 px-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] ${
                        activeTab === 'feedback'
                          ? 'bg-white dark:bg-[#12161B] text-[#0066FF] dark:text-[#22C7D6] shadow-[0_2px_8px_rgba(0,102,255,0.08)] border border-sky-100/60 dark:border-slate-700'
                          : 'text-[#64748B] dark:text-slate-400 hover:text-[#090D1A] dark:hover:text-white border border-transparent'
                      }`}
                    >
                      <Volume2 size={14} strokeWidth={2.2} />
                      <span>Feedback</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => { playAudioCue('click'); setActiveTab('system'); }}
                      className={`py-2 px-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] ${
                        activeTab === 'system'
                          ? 'bg-white dark:bg-[#12161B] text-[#0066FF] dark:text-[#22C7D6] shadow-[0_2px_8px_rgba(0,102,255,0.08)] border border-sky-100/60 dark:border-slate-700'
                          : 'text-[#64748B] dark:text-slate-400 hover:text-[#090D1A] dark:hover:text-white border border-transparent'
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
                      {/* Interface Theme Card */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#181D23] border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,102,255,0.03)] dark:shadow-none space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#090D1A] dark:text-white">
                              Interface Theme
                            </span>
                            <span className="font-mono text-[11px] text-[#64748B] dark:text-slate-400">
                              {settings.themeMode === 'system'
                                ? `System default (${activeTheme})`
                                : `${settings.themeMode === 'dark' ? 'Dark' : 'Light'} theme active`}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-[#64748B] dark:text-slate-400 font-medium uppercase">
                            {settings.themeMode}
                          </span>
                        </div>

                        <div 
                          role="radiogroup" 
                          aria-label="Theme preference"
                          className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#F0F5FA]/80 dark:bg-[#12161B] border border-slate-100 dark:border-slate-800"
                        >
                          {[
                            { label: 'Light', value: 'light' as ThemeMode, icon: Sun },
                            { label: 'Dark', value: 'dark' as ThemeMode, icon: Moon },
                            { label: 'System', value: 'system' as ThemeMode, icon: Monitor },
                          ].map(opt => {
                            const isSelected = settings.themeMode === opt.value;
                            const IconComp = opt.icon;
                            return (
                              <button
                                type="button"
                                key={`theme-mode-${opt.value}`}
                                id={`theme-mode-${opt.value}-btn`}
                                role="radio"
                                aria-checked={isSelected}
                                onClick={(e) => {
                                  playAudioCue('click');
                                  let origin: { x: number; y: number } | undefined;
                                  if (e.clientX !== 0 || e.clientY !== 0) {
                                    origin = { x: e.clientX, y: e.clientY };
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                                  }
                                  setThemeMode(opt.value, origin);
                                }}
                                className={`flex items-center justify-center gap-2 py-2 px-1 sm:px-2 rounded-lg font-mono text-xs transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-white dark:bg-[#181D23] border-sky-200 dark:border-[#22C7D6] text-[#0066FF] dark:text-[#22C7D6] font-bold shadow-xs'
                                    : 'border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#090D1A] dark:hover:text-white'
                                }`}
                                title={`${opt.label} theme mode`}
                              >
                                <IconComp size={14} strokeWidth={2.2} />
                                <span className="text-[11.5px] font-bold">{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Font Scale Card */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#181D23] border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,102,255,0.03)] dark:shadow-none space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#090D1A] dark:text-white">
                            Accessibility Text Scale
                          </span>
                          <span className="font-mono text-[11px] text-[#64748B] dark:text-slate-400 font-medium uppercase">
                            {Math.round((settings.fontScale || 1.0) * 100)}% ({
                              (settings.fontScale || 1.0) <= 0.9 ? 'Compact' :
                              (settings.fontScale || 1.0) <= 1.0 ? 'Default' :
                              (settings.fontScale || 1.0) <= 1.15 ? 'Large' : 'Max'
                            })
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#F0F5FA]/80 dark:bg-[#12161B] border border-slate-100 dark:border-slate-800">
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
                                    ? 'bg-white dark:bg-[#181D23] border-sky-200 dark:border-[#22C7D6] text-[#0066FF] dark:text-[#22C7D6] font-bold shadow-xs'
                                    : 'border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#090D1A] dark:hover:text-white'
                                }`}
                                title={`${opt.title} text scale (${opt.label})`}
                              >
                                <span className="text-[11.5px] font-bold">{opt.label}</span>
                                <span className="text-[9.5px] text-[#94A3B8] dark:text-slate-500">{opt.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Fullscreen Card */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#181D23] border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,102,255,0.03)] dark:shadow-none flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] dark:bg-[#12161B] text-[#0066FF] dark:text-[#22C7D6] flex items-center justify-center shrink-0 border border-transparent dark:border-slate-800">
                            {isFullscreen ? <Minimize2 size={18} strokeWidth={2.2} /> : <Maximize2 size={18} strokeWidth={2.2} />}
                          </div>
                          <div>
                            <div className="text-xs sm:text-[13.5px] font-bold text-[#090D1A] dark:text-white">Fullscreen Focus</div>
                            <div className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400">Run tests without browser distractions</div>
                          </div>
                        </div>

                        <button 
                          type="button"
                          id="toggle-fullscreen-btn"
                          onClick={handleToggleFullscreen}
                          className="px-3.5 py-1.5 rounded-xl border border-sky-200 dark:border-slate-700 bg-sky-50/70 dark:bg-[#12161B] hover:bg-sky-100 dark:hover:bg-slate-800 text-[#0066FF] dark:text-[#22C7D6] font-semibold text-xs cursor-pointer transition-colors shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
                        >
                          {isFullscreen ? 'Exit' : 'Enter'}
                        </button>
                      </div>

                      {fullscreenNotice && (
                        <div 
                          role="status"
                          aria-live="polite"
                          className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <AlertCircle size={14} className="shrink-0 text-rose-500 dark:text-rose-400" />
                            <span className="truncate">{fullscreenNotice}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFullscreenNotice(null)}
                            className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 cursor-pointer p-0.5 shrink-0"
                            aria-label="Dismiss message"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}

                      {/* Mobile Web App (PWA) Card */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#181D23] border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,102,255,0.03)] dark:shadow-none flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] dark:bg-[#12161B] text-[#0066FF] dark:text-[#22C7D6] flex items-center justify-center shrink-0 border border-transparent dark:border-slate-800">
                            <Smartphone size={18} strokeWidth={2.2} />
                          </div>
                          <div>
                            <div className="text-xs sm:text-[13.5px] font-bold text-[#090D1A] dark:text-white flex items-center gap-1.5">
                              <span>Mobile Web App</span>
                              {pwa.isInstalled && (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-mono text-[9.5px] font-bold">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400">
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
                          className="px-3.5 py-1.5 rounded-xl border border-sky-200 dark:border-slate-700 bg-sky-50/70 dark:bg-[#12161B] hover:bg-sky-100 dark:hover:bg-slate-800 text-[#0066FF] dark:text-[#22C7D6] font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
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
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#181D23] border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,102,255,0.03)] dark:shadow-none flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] dark:bg-[#12161B] text-[#0066FF] dark:text-[#22C7D6] flex items-center justify-center shrink-0 border border-transparent dark:border-slate-800">
                            {settings.soundEnabled ? <Volume2 size={18} strokeWidth={2.2} /> : <VolumeX size={18} strokeWidth={2.2} />}
                          </div>
                          <div>
                            <div className="text-xs sm:text-[13.5px] font-bold text-[#090D1A] dark:text-white">Audio Feedback</div>
                            <div className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400">Auditory beeps and click feedback</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2.5">
                          {settings.soundEnabled && (
                            <button 
                              type="button"
                              onClick={handleTestSound}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 dark:bg-[#12161B] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#0066FF] dark:text-[#22C7D6] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
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
                            className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] ${
                              settings.soundEnabled ? 'bg-[#0066FF] dark:bg-[#22C7D6]' : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            <span 
                              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white dark:bg-[#12161B] shadow-md transition-transform flex items-center justify-center text-[10px] font-bold ${
                                settings.soundEnabled ? 'translate-x-5 text-[#0066FF] dark:text-[#22C7D6]' : 'translate-x-0'
                              }`} 
                            >
                              {settings.soundEnabled ? '✓' : ''}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Haptic Vibration Card */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#181D23] border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,102,255,0.03)] dark:shadow-none flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] dark:bg-[#12161B] text-[#0066FF] dark:text-[#22C7D6] flex items-center justify-center shrink-0 border border-transparent dark:border-slate-800">
                            <Smartphone size={18} strokeWidth={2.2} />
                          </div>
                          <div>
                            <div className="text-xs sm:text-[13.5px] font-bold text-[#090D1A] dark:text-white">Haptic Vibration</div>
                            <div className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400">
                              {!hapticsAvailable ? 'Not supported on this device/browser' : 'Vibrate on button press'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2.5">
                          {settings.hapticsEnabled && hapticsAvailable && (
                            <button 
                              type="button"
                              onClick={handleTestHaptic}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 dark:bg-[#12161B] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#0066FF] dark:text-[#22C7D6] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
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
                            className={`w-12 h-7 rounded-full transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] ${
                              !hapticsAvailable
                                ? 'opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
                                : settings.hapticsEnabled ? 'bg-[#0066FF] dark:bg-[#22C7D6] cursor-pointer' : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer'
                            }`}
                          >
                            <span 
                              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white dark:bg-[#12161B] shadow-md transition-transform flex items-center justify-center text-[10px] font-bold ${
                                settings.hapticsEnabled && hapticsAvailable ? 'translate-x-5 text-[#0066FF] dark:text-[#22C7D6]' : 'translate-x-0'
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
                  {activeTab === 'system' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                    >
                      {/* Row 1: Reduced Motion */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#181D23] border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,102,255,0.03)] dark:shadow-none flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] dark:bg-[#12161B] text-[#0066FF] dark:text-[#22C7D6] flex items-center justify-center shrink-0 border border-transparent dark:border-slate-800">
                            <Moon size={18} strokeWidth={2.2} />
                          </div>
                          <div>
                            <div className="text-xs sm:text-[13.5px] font-bold text-[#090D1A] dark:text-white">Reduced Motion</div>
                            <div className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400">
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
                          className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] ${
                            settings.reducedMotionEnabled ? 'bg-[#0066FF] dark:bg-[#22C7D6]' : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <span 
                            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white dark:bg-[#12161B] shadow-md transition-transform flex items-center justify-center text-[10px] font-bold ${
                              settings.reducedMotionEnabled ? 'translate-x-5 text-[#0066FF] dark:text-[#22C7D6]' : 'translate-x-0'
                            }`} 
                          >
                            {settings.reducedMotionEnabled ? '✓' : ''}
                          </span>
                        </button>
                      </div>

                      {/* Row 2: Exhibition Kiosk Mode */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#181D23] border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,102,255,0.03)] dark:shadow-none flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] dark:bg-[#12161B] text-[#0066FF] dark:text-[#22C7D6] flex items-center justify-center shrink-0 border border-transparent dark:border-slate-800">
                            <Monitor size={18} strokeWidth={2.2} />
                          </div>
                          <div>
                            <div className="text-xs sm:text-[13.5px] font-bold text-[#090D1A] dark:text-white">Exhibition Kiosk Mode</div>
                            <div className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400">
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
                          className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] ${
                            settings.exhibitionModeEnabled ? 'bg-[#0066FF] dark:bg-[#22C7D6]' : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <span 
                            className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white dark:bg-[#12161B] shadow-md transition-transform flex items-center justify-center text-[10px] font-bold ${
                              settings.exhibitionModeEnabled ? 'translate-x-5 text-[#0066FF] dark:text-[#22C7D6]' : 'translate-x-0'
                            }`} 
                          >
                            {settings.exhibitionModeEnabled ? '✓' : ''}
                          </span>
                        </button>
                      </div>

                      {/* Row 3: Clear Local Cache */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#181D23] border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,102,255,0.03)] dark:shadow-none flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] dark:bg-rose-950/40 text-[#EF4444] dark:text-rose-400 flex items-center justify-center shrink-0 border border-transparent dark:border-rose-900/60">
                            <Trash2 size={18} strokeWidth={2.2} />
                          </div>
                          <div>
                            <div className="text-xs sm:text-[13.5px] font-bold text-[#090D1A] dark:text-white">Clear Local Cache</div>
                            <div className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400">
                              Reset stored preferences and unsynced data
                            </div>
                          </div>
                        </div>

                        <button 
                          type="button"
                          id="clear-session-cache-btn"
                          onClick={handleClearCache}
                          className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-300 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                        >
                          {clearedNotice ? (
                            <>
                              <Check size={13} strokeWidth={2.6} className="text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-600 dark:text-emerald-400">Done</span>
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
                <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#090D1A] dark:bg-[#181D23] border border-transparent dark:border-slate-700 flex items-center justify-center text-[#00D2FF]">
                      <PulseLogo variant="mark" size={12} color="#00D2FF" />
                    </div>
                    <span className="font-heading font-extrabold text-[12px] text-[#090D1A] dark:text-white tracking-wider">
                      PULSE
                    </span>
                    <span className="text-[11px] font-mono text-[#64748B] dark:text-slate-400">
                      Latency Engine
                    </span>
                  </div>

                  <span className="text-[11px] font-mono font-semibold text-[#0066FF] dark:text-[#22C7D6] tracking-wider">
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
