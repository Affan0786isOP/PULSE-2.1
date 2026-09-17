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
  Sliders
} from 'lucide-react';
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
import { acquireScrollLock } from '../lib/modalScrollLock';
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
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(typeof document !== 'undefined' && document.fullscreenElement));
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
      cancelRefreshRateDetection();
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
      cancelRefreshRateDetection();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pulse_settings_close'));
      }
    }
  }, [isOpen]);

  const { zIndex } = useModalAccessibility({
    isOpen,
    onClose,
    dialogRef,
    initialFocusRef: closeButtonRef,
    modalId: 'mobile-settings-modal'
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen not permitted in some iframe environments
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
        'pulse_force_desktop',
        'pulse_force_mobile',
        'pulse_refresh_rate_cached',
        'pulse_refresh_rate_fp',
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
            <motion.div
              key="mobile-settings-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ zIndex }}
              className="fixed inset-0 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
            >
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) onClose();
                }}
                className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
              />

              {/* Modal Card */}
              <motion.div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-settings-modal-heading"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl shadow-2xl overflow-hidden flex flex-col z-10 my-auto max-h-[calc(100dvh-2rem)] sm:max-h-[85dvh] outline-none"
              >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-1)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
                  <Settings size={15} />
                </div>
                <div>
                  <h2 id="mobile-settings-modal-heading" className="text-xs font-bold tracking-wider uppercase text-[var(--text-primary)] font-mono">
                    System Configuration
                  </h2>
                  <p className="text-[10px] text-[var(--text-muted)] font-mono">
                    Preferences &amp; Timing Hardware
                  </p>
                </div>
              </div>

              <button 
                ref={closeButtonRef}
                type="button"
                id="close-settings-modal-btn"
                onClick={onClose}
                aria-label="Close Settings"
                className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--surface-2)] hover:bg-[var(--surface-3)] active:bg-[var(--surface-3)] active:scale-[0.96] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-[background-color,color,border-color,transform] cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Segmented Navigation Tabs */}
            <div className="px-5 pt-3 pb-2 border-b border-[var(--border-subtle)] bg-[var(--surface-1)] shrink-0">
              <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--surface-2)] rounded-lg border border-[var(--border-subtle)] text-xs font-mono">
                <button type="button"
                  onClick={() => { playAudioCue('click'); setActiveTab('general'); }}
                  className={`py-1.5 px-2 rounded-md font-medium flex items-center justify-center gap-1.5 transition-[background-color,color,border-color,transform] cursor-pointer active:scale-[0.98] ${
                    activeTab === 'general'
                      ? 'bg-[var(--surface-1)] text-[var(--accent)] border border-[var(--border-default)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] active:bg-[var(--surface-3)]'
                  }`}
                >
                  <Sliders size={13} />
                  <span>General</span>
                </button>

                <button type="button"
                  onClick={() => { playAudioCue('click'); setActiveTab('feedback'); }}
                  className={`py-1.5 px-2 rounded-md font-medium flex items-center justify-center gap-1.5 transition-[background-color,color,border-color,transform] cursor-pointer active:scale-[0.98] ${
                    activeTab === 'feedback'
                      ? 'bg-[var(--surface-1)] text-[var(--accent)] border border-[var(--border-default)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] active:bg-[var(--surface-3)]'
                  }`}
                >
                  <Volume2 size={13} />
                  <span>Feedback</span>
                </button>

                <button type="button"
                  onClick={() => { playAudioCue('click'); setActiveTab('calibration'); }}
                  className={`py-1.5 px-2 rounded-md font-medium flex items-center justify-center gap-1.5 transition-[background-color,color,border-color,transform] cursor-pointer active:scale-[0.98] ${
                    activeTab === 'calibration'
                      ? 'bg-[var(--surface-1)] text-[var(--accent)] border border-[var(--border-default)] shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] active:bg-[var(--surface-3)]'
                  }`}
                >
                  <Monitor size={13} />
                  <span>System</span>
                </button>
              </div>
            </div>

            {/* Body content */}
            <div className="p-5 overflow-y-auto text-xs space-y-4 flex-1 min-h-[260px]">
              
              {/* TAB 1: GENERAL */}
              {activeTab === 'general' && (
                <motion.div 
                   initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-3.5"
                >
                  {/* Font Scale / Text Density Segment */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                        Text Scale / Density
                      </span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase">
                        {Math.round((settings.fontScale || 1.0) * 100)}% ({
                          (settings.fontScale || 1.0) <= 0.9 ? 'Compact' :
                          (settings.fontScale || 1.0) <= 1.0 ? 'Default' :
                          (settings.fontScale || 1.0) <= 1.15 ? 'Large' : 'Extra Large'
                        })
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)]">
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
                            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-md font-mono text-xs transition-colors cursor-pointer border ${
                              isSelected
                                ? 'bg-[var(--surface-1)] border-[var(--border-default)] text-[var(--accent)] font-semibold shadow-xs'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                            title={`${opt.title} text density (${opt.label})`}
                          >
                            <span className="text-[11px]">{opt.label}</span>
                            <span className="text-[9px] text-[var(--text-muted)]">{opt.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clean Setting Rows container */}
                  <div className="rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
                    {/* Fullscreen Atmospheric Mode */}
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
                          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[var(--text-primary)]">Fullscreen Focus</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Distraction-free assessment atmosphere</div>
                        </div>
                      </div>

                      <button type="button"
                        id="toggle-fullscreen-btn"
                        onClick={handleToggleFullscreen}
                        className="px-2.5 py-1 rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--accent)] font-mono text-xs font-medium cursor-pointer transition-colors"
                      >
                        {isFullscreen ? 'Exit' : 'Enter'}
                      </button>
                    </div>

                    {/* PWA / App Launcher */}
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
                          <Smartphone size={14} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                            <span>Mobile Web App</span>
                            {pwa.isInstalled && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-bold">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            {pwa.isInstalled ? 'Zero-latency home screen mode active' : 'Install for direct 1-tap mobile launch'}
                          </div>
                        </div>
                      </div>

                      <button type="button"
                        id="open-a2hs-guide-btn"
                        onClick={async () => {
                          playAudioCue('click');
                          if (pwa.isInstalled) {
                            pwa.openInstallGuide();
                          } else {
                            await pwa.promptInstall();
                          }
                        }}
                        className="px-2.5 py-1 rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--accent)] font-mono text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <Download size={12} />
                        <span>{pwa.isInstalled ? 'Details' : 'Install'}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: SENSORY & FEEDBACK */}
              {activeTab === 'feedback' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-3.5"
                >
                  <div className="rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
                    {/* Sound FX Toggle */}
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
                          {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[var(--text-primary)]">Auditory Stimuli &amp; Sound FX</div>
                          <div className="text-[10px] text-[var(--text-muted)]">Audio beeps and click feedback</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {settings.soundEnabled && (
                          <button type="button"
                            onClick={handleTestSound}
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                          >
                            Test
                          </button>
                        )}
                        <button type="button"
                          id="toggle-sound-btn"
                          role="switch"
                          aria-checked={settings.soundEnabled}
                          aria-label="Toggle Auditory Stimuli & Sound FX"
                          onClick={handleToggleSound}
                          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                            settings.soundEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)] border border-[var(--border-subtle)]'
                          }`}
                        >
                          <span 
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white dark:bg-black transition-transform flex items-center justify-center text-[8px] font-bold ${
                              settings.soundEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`} 
                          >
                            {settings.soundEnabled ? '✓' : ''}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Haptic Vibration Toggle */}
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
                          <Smartphone size={14} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[var(--text-primary)]">Haptic Vibration</div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            {!hapticsAvailable ? 'Not supported on this device/browser' : 'Tactile pulse on button inputs'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {settings.hapticsEnabled && hapticsAvailable && (
                          <button type="button"
                            onClick={handleTestHaptic}
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                          >
                            Test
                          </button>
                        )}
                        <button type="button"
                          id="toggle-haptics-btn"
                          role="switch"
                          aria-checked={settings.hapticsEnabled && hapticsAvailable}
                          aria-label="Toggle Haptic Vibration"
                          disabled={!hapticsAvailable}
                          onClick={handleToggleHaptics}
                          className={`w-9 h-5 rounded-full transition-colors relative ${
                            !hapticsAvailable
                              ? 'opacity-40 cursor-not-allowed bg-[var(--surface-3)] border border-[var(--border-subtle)]'
                              : settings.hapticsEnabled ? 'bg-[var(--accent)] cursor-pointer' : 'bg-[var(--surface-3)] border border-[var(--border-subtle)] cursor-pointer'
                          }`}
                        >
                          <span 
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white dark:bg-black transition-transform flex items-center justify-center text-[8px] font-bold ${
                              settings.hapticsEnabled && hapticsAvailable ? 'translate-x-4' : 'translate-x-0'
                            }`} 
                          >
                            {settings.hapticsEnabled && hapticsAvailable ? '✓' : ''}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: CALIBRATION & SYSTEM */}
              {activeTab === 'calibration' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-3.5"
                >
                  {/* Display Hardware Calibration Card */}
                  <div className="p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor size={14} className="text-[var(--accent)]" />
                        <span className="font-mono font-bold text-xs uppercase tracking-wider text-[var(--text-primary)]">
                          Display Frame Timing
                        </span>
                      </div>
                      <button type="button"
                        id="recalibrate-display-btn"
                        onClick={handleRecalibrateDisplay}
                        disabled={isRecalibrating}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--accent)] font-mono text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={11} className={isRecalibrating ? 'animate-spin' : ''} />
                        <span>{isRecalibrating ? 'Calibrating...' : 'Recalibrate'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="p-2.5 rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] text-center">
                        <div className="text-[10px] text-[var(--text-muted)] font-mono uppercase">Estimated Refresh Rate</div>
                        <div className="text-base font-mono font-bold text-[var(--accent)] mt-0.5">{refreshInfo.hz} Hz</div>
                        <div className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5">
                          {refreshInfo.source === 'measured' ? 'Exact timing' : refreshInfo.source === 'estimated' ? 'Calculated' : 'Fallback baseline'}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] text-center">
                        <div className="text-[10px] text-[var(--text-muted)] font-mono uppercase">Estimated Frame Offset</div>
                        <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">+{refreshInfo.displayDelayOffsetMs} ms</div>
                        <div className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5">Nominal midpoint</div>
                      </div>
                    </div>

                    {calibrationError && (
                      <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-mono">
                        {calibrationError}
                      </div>
                    )}
                  </div>

                  {/* System Toggles */}
                  <div className="rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
                    {/* Reduced Motion */}
                    <div className="p-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">Reduced Motion</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Suppresses application animations, background particles, and UI transitions</div>
                      </div>
                      <button type="button"
                        id="toggle-reduced-motion-btn"
                        role="switch"
                        aria-checked={settings.reducedMotionEnabled}
                        aria-label="Toggle Reduced Motion"
                        onClick={handleToggleReducedMotion}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          settings.reducedMotionEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)] border border-[var(--border-subtle)]'
                        }`}
                      >
                        <span 
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white dark:bg-black transition-transform flex items-center justify-center text-[8px] font-bold ${
                            settings.reducedMotionEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`} 
                        >
                          {settings.reducedMotionEnabled ? '✓' : ''}
                        </span>
                      </button>
                    </div>

                    {/* Exhibition Mode */}
                    <div className="p-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">Exhibition Kiosk Mode</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Locks navigation for public testing terminals</div>
                      </div>
                      <button type="button"
                        id="toggle-exhibition-btn"
                        role="switch"
                        aria-checked={settings.exhibitionModeEnabled}
                        aria-label="Toggle Exhibition Kiosk Mode"
                        onClick={handleToggleExhibition}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          settings.exhibitionModeEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)] border border-[var(--border-subtle)]'
                        }`}
                      >
                        <span 
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white dark:bg-black transition-transform flex items-center justify-center text-[8px] font-bold ${
                            settings.exhibitionModeEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`} 
                        >
                          {settings.exhibitionModeEnabled ? '✓' : ''}
                        </span>
                      </button>
                    </div>

                    {/* Reset Cache */}
                    <div className="p-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">Clear Local Cache</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Resets client state, pending sync, and stored preferences</div>
                      </div>
                      <button type="button"
                        id="clear-session-cache-btn"
                        onClick={handleClearCache}
                        className="px-2.5 py-1 rounded-md bg-[var(--surface-1)] hover:bg-rose-500/10 border border-[var(--border-subtle)] hover:border-rose-500/30 text-[var(--text-secondary)] hover:text-rose-500 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        {clearedNotice ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-emerald-400">Done</span>
                          </>
                        ) : (
                          <>
                            <Trash2 size={12} />
                            <span>Reset</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--surface-1)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] shrink-0">
              <span>PULSE Latency Engine</span>
              <span className="text-[var(--accent)]">Precision Calibration</span>
            </div>

          </motion.div>
        </motion.div>
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
        isInstallable={pwa.isInstallable}
        onPromptInstall={pwa.promptInstall}
      />
    </>
  );
}
