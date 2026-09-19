import React, { useState, useEffect, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Database, ArrowRight, Zap, Trophy, Settings, Info, Download, Maximize2, Minimize2, ShieldCheck, AlertCircle, RefreshCw, ListChecks, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { usePwaInstall } from '../lib/usePwaInstall';
import { isMobileWelcomeSeen } from '../lib/welcomeStore';
import { triggerHaptic } from '../lib/settingsStore';
import { SEO } from './SEO';

// Lazy load modals to eliminate Home startup costs
const SettingsModal = React.lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const WelcomeModal = React.lazy(() => import('./WelcomeModal').then(m => ({ default: m.WelcomeModal })));
const AddToHomeScreenModal = React.lazy(() => import('./AddToHomeScreenModal').then(m => ({ default: m.AddToHomeScreenModal })));

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
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [location.pathname]);

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

  // Respect saved welcome preference on initial visit
  useEffect(() => {
    if (!isMobileWelcomeSeen()) {
      setIsWelcomeOpen(true);
    }
  }, []);

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

  const handleToggleFullscreen = async () => {
    try {
      const doc = document as any;
      const docEl = document.documentElement as any;
      if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
        const requestFS =
          docEl.requestFullscreen ||
          docEl.webkitRequestFullscreen ||
          docEl.mozRequestFullScreen ||
          docEl.msRequestFullscreen;
        if (requestFS) await requestFS.call(docEl);
      } else {
        const exitFS =
          doc.exitFullscreen ||
          doc.webkitExitFullscreen ||
          doc.mozCancelFullScreen ||
          doc.msExitFullscreen;
        if (exitFS) await exitFS.call(doc);
      }
      setIsFullscreen(
        Boolean(
          doc.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.mozFullScreenElement ||
          doc.msFullscreenElement
        )
      );
    } catch (err) {
      console.log('Fullscreen toggle not supported in this frame', err);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-transparent text-[var(--text-primary)] font-sans relative flex flex-col justify-between">
      <SEO 
        title="PULSE Mobile — Precision User Latency & Stimulus Evaluator"
        description="Browser-based cognitive benchmarking suite optimized for mobile devices. Measure visual reaction times, directional choice speed, and working memory on the go."
      />
      {/* Top Header Minimal & Compact */}
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
              <Activity size={16} className="stroke-[2.5]" />
            </div>
            <span className="font-heading font-extrabold text-sm sm:text-base tracking-tight text-[var(--text-primary)] leading-none">
              PULSE
            </span>
          </button>
        </div>
        
        {/* Header Action Buttons (Install, Fullscreen, Info, Settings) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {pwa.isInstallable && !pwa.isStandalone && !pwa.isInstalled && (
            <button type="button"
              id="mobile-install-btn"
              onClick={async () => {
                triggerHaptic('tap');
                await pwa.promptInstall();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] sm:min-h-[40px] rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              title="Install App"
              aria-label="Install App"
            >
              <Download size={14} />
              <span className="hidden min-[360px]:inline">Install</span>
            </button>
          )}

          {!pwa.isStandalone && (
            <button type="button"
              id="mobile-fullscreen-btn"
              onClick={() => { triggerHaptic('tap'); handleToggleFullscreen(); }}
              className="flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] sm:min-h-[40px] rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={14} className="text-[var(--accent)]" /> : <Maximize2 size={14} />}
              <span className="hidden min-[360px]:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
            </button>
          )}

          <button type="button"
            id="mobile-info-btn"
            onClick={() => {
              triggerHaptic('tap');
              setIsWelcomeOpen(true);
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="App Info"
            title="Welcome & Info"
          >
            <Info size={15} />
          </button>

          <button type="button"
            id="mobile-settings-btn"
            onClick={() => {
              triggerHaptic('tap');
              setIsSettingsOpen(true);
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main 
        className="w-full flex-1 flex flex-col justify-between items-center px-4 py-3 overflow-y-auto z-10 max-w-sm mx-auto gap-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col items-center text-center w-full pt-1"
        >
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-[var(--text-primary)] leading-snug px-1">
            Precision Latency &amp; Cognitive Benchmarks
          </h1>

          <p className="text-[var(--text-muted)] text-[11px] font-normal px-2 leading-tight mt-0.5">
            Research-informed sensory reaction and working memory evaluator
          </p>
        </motion.div>

        {/* How it Works - Middle Guide Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
          className="w-full bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-xl p-3.5 flex flex-col gap-2.5 shadow-sm text-left shrink-0 my-auto"
        >
          <div className="border-b border-[var(--border-subtle)] pb-2">
            <h2 className="text-xs font-bold text-[var(--text-primary)]">Welcome to PULSE</h2>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-tight">
              PULSE is an open research tool to benchmark your sensory reaction times, directional choice speed, and working memory.
            </p>
            <div className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider mt-1.5">How it works:</div>
          </div>

          <div className="flex gap-2.5 items-start">
            <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
              <ListChecks className="w-3.5 h-3.5 stroke-[2.2]" />
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
            <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-3.5 h-3.5 stroke-[2.2]" />
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
            <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
              <BarChart2 className="w-3.5 h-3.5 stroke-[2.2]" />
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

          <div className="border-t border-[var(--border-subtle)] pt-2 text-[10.5px] text-[var(--text-secondary)] leading-tight">
            You can also check the Leaderboard, explore the open research Dataset, and learn about evidence-based habits in the Improve guide.
          </div>
        </motion.div>

        {/* Action & Navigation Area */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
          className="w-full flex flex-col gap-2.5 shrink-0 mb-16 sm:mb-20"
        >
          {/* Primary Action: START ASSESSMENT */}
          <motion.button 
            type="button" 
            id="mobile-start-session-btn"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              triggerHaptic('tap');
              setIsNavigating(true);
              onNavigate('assessments');
            }}
            className="w-full rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-slate-950 font-medium py-3 px-4 flex items-center justify-center gap-2 cursor-pointer transition-[background-color,transform] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <span className="text-sm font-semibold">Start assessments</span>
            {isNavigating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <ArrowRight className="w-4 h-4" />
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
                  className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.97] border border-[var(--border-subtle)] hover:border-[var(--border-default)] rounded-md p-2.5 flex items-center gap-2.5 text-left transition-[background-color,border-color,transform] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <div className="w-7 h-7 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[var(--text-primary)] font-medium text-xs truncate">{card.label}</span>
                    <span className="text-[var(--text-muted)] text-[10px] truncate">{card.sublabel}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </main>

      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={handleCloseSettings} 
          />
        </Suspense>
      )}

      {isWelcomeOpen && (
        <Suspense fallback={null}>
          <WelcomeModal
            isOpen={isWelcomeOpen}
            onClose={handleCloseWelcome}
            onNavigate={onNavigate}
          />
        </Suspense>
      )}

      {pwa.isGuideOpen && !isSettingsOpen && (
        <Suspense fallback={null}>
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

      {/* Floating Mobile Auth Notice: Non-disruptive, layout-stable connection notice */}
      <AnimatePresence>
        {authError && (
          <motion.div 
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="alert"
            aria-live="polite"
            className="fixed bottom-5 left-4 right-4 z-40 max-w-sm mx-auto p-2.5 rounded-lg bg-[var(--surface-1)]/95 backdrop-blur-md border border-rose-500/30 shadow-2xl text-rose-300 flex items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0 text-rose-400" />
              <div className="text-[10px] leading-tight">
                <span className="font-semibold text-rose-200">Notice: </span>
                <span>Session tracking is temporarily offline. Assessments continue locally.</span>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => { triggerHaptic('tap'); retryAuth(); }}
              disabled={isConnecting}
              aria-label="Retry connection"
              className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-mono inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <RefreshCw size={10} className={isConnecting ? "animate-spin" : ""} />
              <span>{isConnecting ? "Retrying..." : "Retry"}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
