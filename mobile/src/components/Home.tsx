import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Database, ArrowRight, Zap, Trophy, Settings, Info, Download, Maximize2, Minimize2, ShieldCheck, AlertCircle, RefreshCw, ListChecks, BarChart2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { usePwaInstall } from '../lib/usePwaInstall';
import { isMobileWelcomeSeen } from '../lib/welcomeStore';
import { triggerHaptic } from '../lib/settingsStore';
import { SEO } from './SEO';

// Lazy load modals to optimize Home startup performance
const SettingsModal = React.lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const WelcomeModal = React.lazy(() => import('./WelcomeModal').then(m => ({ default: m.WelcomeModal })));
const AddToHomeScreenModal = React.lazy(() => import('./AddToHomeScreenModal').then(m => ({ default: m.AddToHomeScreenModal })));

// Non-blocking, minimal fallback when modal code chunks are loading
const ModalLoadingFallback = () => (
  <div 
    aria-hidden="true"
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs transition-opacity"
  >
    <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border-subtle)] shadow-xl flex items-center gap-2.5 text-xs text-[var(--text-secondary)] font-mono">
      <RefreshCw size={14} className="animate-spin text-[var(--accent)]" />
      <span>Loading...</span>
    </div>
  </div>
);

const prefetchModals = () => {
  if (typeof window === 'undefined') return;
  import('./SettingsModal').catch(() => {});
  import('./WelcomeModal').catch(() => {});
  import('./AddToHomeScreenModal').catch(() => {});
};

const ROUTES = {
  LEADERBOARD: '/leaderboard',
  DATASET: '/dataset',
  IMPROVE: '/improve',
  PRIVACY: '/privacy',
} as const;

interface MobileNavCard {
  id: string;
  to: string;
  label: string;
  sublabel: string;
  ariaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MOBILE_NAV_CARDS: readonly MobileNavCard[] = [
  {
    id: 'mobile-nav-leaderboard',
    to: ROUTES.LEADERBOARD,
    label: 'Leaderboard',
    sublabel: 'Top ranks',
    ariaLabel: 'View Leaderboard — Top ranks',
    icon: Trophy,
  },
  {
    id: 'mobile-nav-dataset',
    to: ROUTES.DATASET,
    label: 'Dataset',
    sublabel: 'Telemetry',
    ariaLabel: 'View Dataset — Telemetry',
    icon: Database,
  },
  {
    id: 'mobile-nav-improve',
    to: ROUTES.IMPROVE,
    label: 'Improve',
    sublabel: 'Performance factors',
    ariaLabel: 'View Improve — Factors that can affect reaction performance',
    icon: Zap,
  },
  {
    id: 'mobile-nav-privacy',
    to: ROUTES.PRIVACY,
    label: 'Privacy',
    sublabel: 'Data ethics',
    ariaLabel: 'View Privacy — Data ethics',
    icon: ShieldCheck,
  },
];

export function Home({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { isConnecting, authError, retryAuth } = useAuth();
  const pwa = usePwaInstall();
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Initialize synchronously from storage to prevent jarring post-mount pop-in
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => !isMobileWelcomeSeen());
  const [isNavigating, setIsNavigating] = useState(false);
  const [fullscreenNotice, setFullscreenNotice] = useState<string | null>(null);
  const fullscreenNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Idle prefetching for modal chunks to guarantee instant opening on user tap
  useEffect(() => {
    let idleId: number | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = (window as any).requestIdleCallback(() => {
        prefetchModals();
      }, { timeout: 2500 });
    } else {
      timerId = setTimeout(() => {
        prefetchModals();
      }, 1200);
    }

    return () => {
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      if (fullscreenNoticeTimerRef.current) {
        clearTimeout(fullscreenNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setIsNavigating(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isNavigating) return;
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 2500);
    const handleFocus = () => {
      setIsNavigating(false);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isNavigating]);

  const handleCloseSettings = React.useCallback(() => setIsSettingsOpen(false), []);
  const handleCloseWelcome = React.useCallback(() => setIsWelcomeOpen(false), []);

  useEffect(() => {
    if (authError) {
      console.warn('[PULSE Mobile Auth Notice]:', authError);
    }
  }, [authError]);

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

  // Synchronize browser fullscreen changes without polling
  useEffect(() => {
    const updateFs = () => {
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

    document.addEventListener('fullscreenchange', updateFs);
    document.addEventListener('webkitfullscreenchange', updateFs);
    return () => {
      document.removeEventListener('fullscreenchange', updateFs);
      document.removeEventListener('webkitfullscreenchange', updateFs);
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

  const handleToggleFullscreen = async () => {
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

      const nextFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(nextFs);
      if (!isCurrentlyFs && !nextFs) {
        showFullscreenFeedback('Fullscreen mode unavailable in this view');
      }
    } catch (err) {
      showFullscreenFeedback('Fullscreen unavailable or restricted by browser');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-transparent text-[var(--text-primary)] font-sans relative flex flex-col justify-between">
      <SEO 
        title="PULSE Mobile — Precision User Latency & Stimulus Evaluator"
        description="Browser-based cognitive benchmarking suite optimized for mobile devices. Measure visual reaction times, directional choice speed, and working memory on the go."
      />

      {/* Top Header Minimal & Responsive */}
      <header 
        className="w-full flex items-center justify-between px-2.5 sm:px-4 py-2 z-20 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-0)]" 
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button type="button"
            id="mobile-home-logo-btn"
            onClick={() => { triggerHaptic('tap'); onNavigate('home'); }}
            className="flex items-center gap-2 cursor-pointer group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-md"
            title="PULSE Home"
            aria-label="PULSE Home"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[var(--accent-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--accent)] shadow-xs transition-transform group-hover:scale-105">
              <Activity size={16} aria-hidden="true" className="stroke-[2.5]" />
            </div>
            <span className="font-heading font-extrabold text-sm sm:text-base tracking-tight text-[var(--text-primary)] leading-none">
              PULSE
            </span>
          </button>
        </div>
        
        {/* Header Action Controls - Symmetrically sized touch targets to prevent cramping on 320px-430px */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {pwa.isInstallable && !pwa.isStandalone && !pwa.isInstalled && (
            <button type="button"
              id="mobile-install-btn"
              onPointerEnter={prefetchModals}
              onTouchStart={prefetchModals}
              onClick={async () => {
                triggerHaptic('tap');
                await pwa.promptInstall();
              }}
              className="h-9 px-2.5 sm:h-10 sm:px-3 min-h-[36px] min-w-[36px] sm:min-h-[40px] flex items-center justify-center gap-1.5 rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              title="Install App"
              aria-label="Install App"
            >
              <Download size={14} aria-hidden="true" />
              <span className="hidden min-[420px]:inline">Install</span>
            </button>
          )}

          {!pwa.isStandalone && (
            <button type="button"
              id="mobile-fullscreen-btn"
              onClick={() => { triggerHaptic('tap'); handleToggleFullscreen(); }}
              className="h-9 px-2.5 sm:h-10 sm:px-3 min-h-[36px] min-w-[36px] sm:min-h-[40px] flex items-center justify-center gap-1.5 rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={14} aria-hidden="true" className="text-[var(--accent)]" /> : <Maximize2 size={14} aria-hidden="true" />}
              <span className="hidden min-[420px]:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
            </button>
          )}

          <button type="button"
            id="mobile-info-btn"
            onPointerEnter={prefetchModals}
            onTouchStart={prefetchModals}
            onClick={() => {
              triggerHaptic('tap');
              setIsWelcomeOpen(true);
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="App Info and Guide"
            title="Welcome & Info"
          >
            <Info size={15} aria-hidden="true" />
          </button>

          <button type="button"
            id="mobile-settings-btn"
            onPointerEnter={prefetchModals}
            onTouchStart={prefetchModals}
            onClick={() => {
              triggerHaptic('tap');
              setIsSettingsOpen(true);
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={15} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Fullscreen Feedback Notice */}
      <AnimatePresence>
        {fullscreenNotice && (
          <motion.div 
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            role="status"
            aria-live="polite"
            style={{ top: 'max(3.5rem, calc(env(safe-area-inset-top, 0px) + 3.5rem))' }}
            className="fixed left-4 right-4 z-40 max-w-sm mx-auto p-2.5 rounded-lg bg-[var(--surface-1)]/95 backdrop-blur-md border border-[var(--border-default)] shadow-xl text-[var(--text-primary)] flex items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle size={14} aria-hidden="true" className="shrink-0 text-[var(--accent)]" />
              <span className="truncate">{fullscreenNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setFullscreenNotice(null)}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer rounded shrink-0"
              aria-label="Dismiss message"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content - Natural document scrolling without nested overflow locks */}
      <main 
        className="w-full flex-1 flex flex-col items-center px-4 py-3 z-10 max-w-sm mx-auto gap-3.5"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col items-center text-center w-full pt-1"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--accent)] text-[10px] font-mono mb-1.5">
            <span>v2.1 · Cognitive Benchmark</span>
          </div>
          <h1 className="text-base font-bold tracking-tight text-[var(--text-primary)] leading-tight px-1">
            Precision Latency &amp; Cognitive Benchmarks
          </h1>

          <p className="text-[var(--text-secondary)] text-xs font-normal px-2 leading-relaxed mt-1">
            Research-informed sensory reaction and working memory evaluator
          </p>
        </motion.div>

        {/* How it Works - Middle Guide Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
          className="w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-xs text-left shrink-0"
        >
          <div className="border-b border-[var(--border-subtle)] pb-2.5">
            <h2 className="text-xs font-bold text-[var(--text-primary)]">Welcome to PULSE</h2>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
              PULSE is an open research tool to benchmark your sensory reaction times, directional choice speed, and working memory.
            </p>
            <div className="text-[10px] font-mono font-medium text-[var(--accent)] uppercase tracking-wider mt-2">How it works:</div>
          </div>

          <div className="flex gap-2.5 items-start">
            <div className="w-6 h-6 rounded-md bg-[var(--accent-subtle)] border border-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
              <ListChecks className="w-3.5 h-3.5 stroke-[2.2]" aria-hidden="true" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">
                Pick a test
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                Visual Reaction, Direction, Colour Recognition, Block Memory, or Number Memory.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5 items-start">
            <div className="w-6 h-6 rounded-md bg-[var(--accent-subtle)] border border-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-3.5 h-3.5 stroke-[2.2]" aria-hidden="true" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">
                Respond
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                Watch for the cue and answer as fast and accurately as you can.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5 items-start">
            <div className="w-6 h-6 rounded-md bg-[var(--accent-subtle)] border border-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
              <BarChart2 className="w-3.5 h-3.5 stroke-[2.2]" aria-hidden="true" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">
                Review
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                Get your score instantly, compare against verified cohort benchmarks, and track your personal bests.
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
            You can also check the Leaderboard, explore the open research Dataset, and learn about evidence-based habits in the Improve guide.
          </div>
        </motion.div>

        {/* Action & Navigation Area - Clean spacing with zero excessive dead space */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
          className="w-full flex flex-col gap-2.5 shrink-0 mb-2 sm:mb-3"
        >
          {/* Primary Action: START ASSESSMENT */}
          <motion.button 
            type="button" 
            id="mobile-start-session-btn"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              triggerHaptic('tap');
              setIsNavigating(true);
              onNavigate('assessments');
            }}
            className="w-full rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white dark:text-slate-950 font-semibold py-3.5 px-4 flex items-center justify-center gap-2 cursor-pointer transition-[background-color,transform] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <span className="text-sm font-semibold">Start assessments</span>
            {isNavigating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white dark:text-slate-950" aria-hidden="true" />
            ) : (
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            )}
          </motion.button>

          {/* Menu Grid - 2x2 with clear touch targets */}
          <div className="grid grid-cols-2 gap-2 w-full">
            {MOBILE_NAV_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <Link 
                  key={card.to}
                  to={card.to}
                  id={card.id}
                  onClick={() => triggerHaptic('tap')}
                  aria-label={card.ariaLabel}
                  className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.98] border border-[var(--border-subtle)] hover:border-[var(--border-default)] rounded-lg p-2.5 sm:p-3 flex items-center gap-2.5 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <div className="w-7 h-7 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0">
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[var(--text-primary)] font-semibold text-xs truncate">{card.label}</span>
                    <span className="text-[var(--text-secondary)] text-[10.5px] truncate mt-0.5">{card.sublabel}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </main>

      {isSettingsOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={handleCloseSettings} 
          />
        </Suspense>
      )}

      {isWelcomeOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <WelcomeModal
            isOpen={isWelcomeOpen}
            onClose={handleCloseWelcome}
            onNavigate={onNavigate}
          />
        </Suspense>
      )}

      {pwa.isGuideOpen && !isSettingsOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <AddToHomeScreenModal
            isOpen={pwa.isGuideOpen && !isSettingsOpen}
            onClose={pwa.closeInstallGuide}
            isInstalled={pwa.isInstalled}
            isIos={pwa.isIos}
            isSafari={pwa.isSafari}
            isIosSafari={pwa.isIosSafari}
            isIosOtherBrowser={pwa.isIosOtherBrowser}
            isInstallable={pwa.isInstallable}
            hasNativePrompt={pwa.hasNativePrompt}
            isInstallPromptSupported={pwa.isInstallPromptSupported}
            isUnsupportedBrowser={pwa.isUnsupportedBrowser}
            isOffline={pwa.isOffline}
            onPromptInstall={pwa.promptInstall}
          />
        </Suspense>
      )}

      {/* Floating Mobile Auth Notice: Non-disruptive, layout-stable connection notice with safe-area bottom offset */}
      <AnimatePresence>
        {authError && (
          <motion.div 
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="alert"
            aria-live="polite"
            style={{ bottom: 'max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))' }}
            className="fixed left-4 right-4 z-40 max-w-sm mx-auto p-2.5 rounded-lg bg-rose-50 dark:bg-[var(--surface-1)]/95 backdrop-blur-md border border-rose-300 dark:border-rose-500/40 shadow-2xl text-rose-900 dark:text-rose-200 flex items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={14} aria-hidden="true" className="shrink-0 text-rose-600 dark:text-rose-400" />
              <div className="text-[10px] leading-tight">
                <span className="font-semibold text-rose-950 dark:text-rose-100">Notice: </span>
                <span>{authError}</span>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => { triggerHaptic('tap'); retryAuth(); }}
              disabled={isConnecting}
              aria-label="Retry connection"
              className="px-2 py-1 rounded bg-rose-200 hover:bg-rose-300 active:bg-rose-400 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-950 dark:text-rose-200 text-[10px] font-mono inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:focus-visible:ring-rose-400"
            >
              <RefreshCw size={10} aria-hidden="true" className={isConnecting ? "animate-spin" : ""} />
              <span>{isConnecting ? "Retrying..." : "Retry"}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
