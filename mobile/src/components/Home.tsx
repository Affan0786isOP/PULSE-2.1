import React, { useState } from 'react';
import { Activity, Database, ArrowRight, Zap, Trophy, Settings, Info, Download, Maximize2, Minimize2, ShieldCheck, AlertCircle, RefreshCw, ListChecks, BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import { usePwaInstall } from '../lib/usePwaInstall';
import { SettingsModal } from './SettingsModal';
import { WelcomeModal } from './WelcomeModal';
import { AddToHomeScreenModal } from './AddToHomeScreenModal';
import { triggerHaptic } from '../lib/settingsStore';
import { SEO } from './SEO';

export function Home({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { isReady, authError, retryAuth } = useAuth();
  const pwa = usePwaInstall();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);

  const handleToggleFullscreen = async () => {
    try {
      const doc = document as any;
      const docEl = document.documentElement as any;
      if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
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
    } catch (err) {
      console.log('Fullscreen toggle not supported in this frame', err);
    }
  };

  if (!isReady) {
    return (
      <div className="h-[100dvh] bg-transparent text-[var(--text-primary)] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mb-3" />
          <div className="text-sm font-semibold tracking-normal text-[var(--text-primary)]">PULSE Mobile</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">Initializing assessment environment...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-transparent text-[var(--text-primary)] font-sans relative flex flex-col justify-between">
      <SEO 
        title="PULSE Mobile — Precision User Latency & Stimulus Evaluator"
        description="Browser-based cognitive benchmarking suite optimized for mobile devices. Measure visual reaction times, directional choice speed, and working memory on the go."
      />
      {/* Top Header Minimal & Compact */}
      <header 
        className="w-full flex items-center justify-between px-4 py-2.5 z-20 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-0)]" 
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
      >
        <div className="flex items-center gap-2">
          <button type="button"
            id="mobile-home-logo-btn"
            onClick={() => { triggerHaptic('tap'); onNavigate('home'); }}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="PULSE Home"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--accent)] shadow-xs transition-transform group-hover:scale-105">
              <Activity size={18} className="stroke-[2.5]" />
            </div>
            <span className="font-heading font-extrabold text-base tracking-tight text-[var(--text-primary)] leading-none">
              PULSE
            </span>
          </button>
        </div>
        
        {/* Header Action Buttons (Install, Fullscreen, Info, Settings) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!pwa.isStandalone && !pwa.isInstalled && (
            <button type="button"
              id="mobile-install-btn"
              onClick={async () => {
                triggerHaptic('tap');
                await pwa.promptInstall();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer"
              title="Install App"
            >
              <Download size={12} />
              <span>Install</span>
            </button>
          )}

          {!pwa.isStandalone && (
            <button type="button"
              id="mobile-fullscreen-btn"
              onClick={() => { triggerHaptic('tap'); handleToggleFullscreen(); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer"
              title={pwa.isBrowserFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {pwa.isBrowserFullscreen ? <Minimize2 size={12} className="text-[var(--accent)]" /> : <Maximize2 size={12} />}
              <span>{pwa.isBrowserFullscreen ? "Exit" : "Fullscreen"}</span>
            </button>
          )}

          <button type="button"
            id="mobile-info-btn"
            onClick={() => {
              triggerHaptic('tap');
              setIsWelcomeOpen(true);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            aria-label="App Info"
            title="Welcome & Info"
          >
            <Info size={13} />
          </button>

          <button type="button"
            id="mobile-settings-btn"
            onClick={() => {
              triggerHaptic('tap');
              setIsSettingsOpen(true);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={13} />
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
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-md bg-[var(--surface-1)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
              <Activity className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <h1 className="text-base font-bold tracking-tight text-[var(--text-primary)] leading-none">
              PULSE
            </h1>
          </div>

          <p className="text-[var(--text-muted)] text-[11px] font-normal px-2 leading-tight">
            Precision User Latency &amp; Stimulus Evaluator
          </p>

          {authError && (
            <div className="w-full mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between gap-2 text-left">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-rose-400" />
                <div className="text-[10px] leading-tight">
                  <span className="font-semibold text-rose-200">Auth Error: </span>
                  <span>Server connection required for tests.</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { triggerHaptic('tap'); retryAuth(); }}
                className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-mono inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              >
                <RefreshCw size={10} />
                <span>Retry</span>
              </button>
            </div>
          )}
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
                Get your score instantly, compare with benchmarks, and track your progress over time.
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
            onClick={() => { triggerHaptic('tap'); onNavigate('assessments'); }}
            className="w-full rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-slate-950 font-medium py-3 px-4 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <span className="text-sm font-semibold">Start assessments</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>

          {/* Menu Grid - 2x2 with clear touch targets */}
          <div className="grid grid-cols-2 gap-2 w-full">
            <motion.button 
              type="button" 
              id="mobile-nav-leaderboard"
              whileTap={{ scale: 0.96 }}
              onClick={() => { triggerHaptic('tap'); onNavigate('leaderboard'); }}
              className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] rounded-md p-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[var(--text-primary)] font-medium text-xs truncate">Leaderboard</span>
                <span className="text-[var(--text-muted)] text-[10px] truncate">Top ranks</span>
              </div>
            </motion.button>

            <motion.button 
              type="button" 
              id="mobile-nav-dataset"
              whileTap={{ scale: 0.96 }}
              onClick={() => { triggerHaptic('tap'); onNavigate('dataset'); }}
              className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] rounded-md p-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[var(--text-primary)] font-medium text-xs truncate">Dataset</span>
                <span className="text-[var(--text-muted)] text-[10px] truncate">Telemetry</span>
              </div>
            </motion.button>

            <motion.button 
              type="button" 
              id="mobile-nav-improve"
              whileTap={{ scale: 0.96 }}
              onClick={() => { triggerHaptic('tap'); onNavigate('improve'); }}
              className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] rounded-md p-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[var(--text-primary)] font-medium text-xs truncate">Improve</span>
                <span className="text-[var(--text-muted)] text-[10px] truncate">Neural factors</span>
              </div>
            </motion.button>

            <motion.button 
              type="button" 
              id="mobile-nav-privacy"
              whileTap={{ scale: 0.96 }}
              onClick={() => { triggerHaptic('tap'); onNavigate('privacy'); }}
              className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] rounded-md p-2.5 flex items-center gap-2.5 text-left transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[var(--text-primary)] font-medium text-xs truncate">Privacy</span>
                <span className="text-[var(--text-muted)] text-[10px] truncate">Data ethics</span>
              </div>
            </motion.button>
          </div>
        </motion.div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
      />

      <AddToHomeScreenModal
        isOpen={pwa.isGuideOpen}
        onClose={pwa.closeInstallGuide}
        isInstalled={pwa.isInstalled}
        isIos={pwa.isIos}
        isSafari={pwa.isSafari}
        isInstallable={pwa.isInstallable}
        hasNativePrompt={pwa.hasNativePrompt}
        isSupportedBrowser={pwa.isSupportedBrowser}
        isOffline={pwa.isOffline}
        onPromptInstall={pwa.promptInstall}
      />
    </div>
  );
}
