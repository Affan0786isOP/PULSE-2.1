import React, { useState, Suspense } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Activity, ArrowLeft, LogOut, Settings, Info, WifiOff, Sun, Moon } from 'lucide-react';
import { PulseLogo } from './brand';
import { triggerHaptic } from '../lib/settingsStore';
import { usePwaInstall } from '../lib/usePwaInstall';
import { useSystemTheme } from '../lib/useSystemTheme';

import { resolveActiveNavId } from '../lib/navigation';
export { resolveActiveNavId };

// Defer heavy modals until user interaction
const SettingsModal = React.lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const WelcomeModal = React.lazy(() => import('./WelcomeModal').then(m => ({ default: m.WelcomeModal })));

export function Navbar({
  onNavigate,
  currentView,
  onBack,
  title,
  rightContent,
  isAssessmentActive = false
}: {
  onNavigate: (view: string) => void;
  currentView?: string;
  onBack?: () => void;
  title?: string | React.ReactNode;
  rightContent?: React.ReactNode;
  isAssessmentActive?: boolean;
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const pwa = usePwaInstall();
  const navigate = useNavigate();
  const location = useLocation();

  const { activeTheme, isDarkApparatus: isRouteApparatus, toggleTheme } = useSystemTheme(location.pathname);
  const isDarkActive = activeTheme === 'dark';
  const showThemeToggle = !isAssessmentActive && !isRouteApparatus;

  const handleToggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    triggerHaptic('tap');
    let origin: { x: number; y: number } | undefined;
    if (e.clientX !== 0 || e.clientY !== 0) {
      origin = { x: e.clientX, y: e.clientY };
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    toggleTheme(origin);
  };

  const activeId = resolveActiveNavId(currentView, location.pathname);

  const performExit = () => {
    triggerHaptic('tap');
    setShowExitConfirm(false);
    if (onBack) {
      onBack();
      return;
    }

    // Real back behavior: check if previous in-app history exists
    if (typeof window !== 'undefined' && window.history.state && (window.history.state.idx > 0 || window.history.length > 1)) {
      navigate(-1);
    } else {
      onNavigate('home');
    }
  };

  const handleBack = () => {
    if (isAssessmentActive) {
      triggerHaptic('tap');
      setShowExitConfirm(true);
      return;
    }
    performExit();
  };

  const isHome = activeId === 'home' || location.pathname === '/' || location.pathname === '/mobile/' || location.pathname === '/mobile';

  const navSurfaceClass = isAssessmentActive
    ? 'bg-[#12161B] text-white border-b border-[#20262D]'
    : isDarkActive
      ? 'bg-[#0B0D10]/90 backdrop-blur-md text-[#F5F7FA] border-b border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.2)]'
      : 'bg-white/90 backdrop-blur-md text-[#090D1A] border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]';

  const iconBtnClass = isAssessmentActive
    ? 'w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 active:scale-[0.96] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer'
    : isDarkActive
      ? 'w-8 h-8 flex items-center justify-center rounded-lg bg-[#181D23] hover:bg-[#20262E] active:bg-[#28303A] active:scale-[0.96] border border-slate-700 text-slate-300 hover:text-white shadow-2xs transition-all cursor-pointer'
      : 'w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-slate-50 active:bg-slate-100 active:scale-[0.96] border border-slate-200/90 text-[#334155] hover:text-[#090D1A] shadow-2xs transition-all cursor-pointer';

  return (
    <>
      <nav 
        role="navigation"
        aria-label="Mobile Navigation"
        data-current-view={activeId || 'home'}
        className={`w-full shrink-0 flex items-center justify-between px-3.5 py-2.5 z-40 relative transition-colors ${navSurfaceClass}`}
        style={{ 
          paddingTop: 'max(0.6rem, env(safe-area-inset-top, 0.6rem))', 
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))', 
          paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))' 
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {!isHome && (
            <button 
              type="button" 
              onClick={handleBack}
              aria-label={isAssessmentActive ? "Exit assessment" : "Go Back"}
              title={isAssessmentActive ? "Exit assessment" : "Go Back"}
              className={isAssessmentActive 
                ? 'px-2.5 h-8 flex items-center gap-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/20 active:bg-red-500/25 active:scale-[0.96] border border-red-500/30 text-red-400 hover:text-red-300 transition-all cursor-pointer' 
                : iconBtnClass
              }
            >
              {isAssessmentActive ? (
                <>
                  <LogOut size={14} strokeWidth={2.2} className="shrink-0" />
                  <span className="text-xs font-semibold">Exit</span>
                </>
              ) : (
                <ArrowLeft size={16} strokeWidth={2.2} />
              )}
            </button>
          )}
          
          {isAssessmentActive ? (
            <span 
              aria-label="PULSE Home (Disabled during active assessment)"
              className="flex items-center opacity-40 cursor-not-allowed p-0.5 shrink-0 rounded-lg select-none"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 border border-white/15 text-[#0066FF]">
                <PulseLogo variant="mark" size={16} color={isDarkActive ? "var(--accent)" : "#0066FF"} />
              </div>
            </span>
          ) : (
            <Link 
              to="/"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                  onNavigate('home');
                }
              }}
              aria-label="PULSE Home"
              aria-current={isHome ? 'page' : undefined}
              title="Go to Home"
              className={`flex items-center cursor-pointer group p-0.5 shrink-0 rounded-lg ${isHome ? 'ring-1 ring-[#0066FF]/40' : ''}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                isDarkActive
                  ? 'bg-[#181D23] border border-slate-700 text-[#0066FF]'
                  : 'bg-sky-50 border border-sky-100/90 text-[#0066FF]'
              }`}>
                <PulseLogo variant="mark" size={16} color={isDarkActive ? "var(--accent)" : "#0066FF"} />
              </div>
            </Link>
          )}

          {title && (
            typeof title === 'string' ? (
              <span 
                className={`font-heading font-bold text-sm tracking-tight truncate ml-1 ${
                  isAssessmentActive ? 'text-white' : isDarkActive ? 'text-[#F5F7FA]' : 'text-[#090D1A]'
                }`}
                aria-current={!isHome ? 'page' : undefined}
              >
                {title}
              </span>
            ) : (
              <div className="min-w-0 truncate ml-1 flex items-center">
                {title}
              </div>
            )
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {rightContent}
          {showThemeToggle && (
            <button
              type="button"
              id="mobile-nav-theme-toggle-btn"
              onClick={handleToggleTheme}
              aria-label={isDarkActive ? "Switch to light theme" : "Switch to dark theme"}
              title={isDarkActive ? "Switch to light theme" : "Switch to dark theme"}
              className={iconBtnClass}
            >
              {isDarkActive ? <Sun size={15} strokeWidth={2.2} /> : <Moon size={15} strokeWidth={2.2} />}
            </button>
          )}
          {pwa.isOffline && (
            <button
              type="button"
              id="mobile-offline-status-btn"
              aria-label="Offline: cloud features and assessment start unavailable"
              title="Offline: cloud features and assessment start unavailable"
              tabIndex={0}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all cursor-default shrink-0 ${
                isAssessmentActive
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  : 'border-amber-200/90 bg-amber-50/80 text-amber-600 shadow-2xs'
              }`}
            >
              <WifiOff size={15} strokeWidth={2.2} aria-hidden="true" />
            </button>
          )}
          <button 
            type="button"
            id="mobile-nav-info-btn"
            disabled={isAssessmentActive}
            aria-disabled={isAssessmentActive}
            onClick={() => {
              if (!isAssessmentActive) {
                triggerHaptic('tap');
                setIsWelcomeOpen(true);
              }
            }}
            aria-label="App Info"
            title={isAssessmentActive ? "Info unavailable during active assessment" : "Welcome & Info"}
            className={`${iconBtnClass} ${
              isAssessmentActive ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''
            }`}
          >
            <Info size={15} strokeWidth={2.2} />
          </button>
          <button 
            type="button"
            id="mobile-nav-settings-btn"
            disabled={isAssessmentActive}
            aria-disabled={isAssessmentActive}
            title={isAssessmentActive ? "Settings unavailable during active assessment" : "Settings & System Controls"}
            onClick={() => {
              if (!isAssessmentActive) {
                triggerHaptic('tap');
                setIsSettingsOpen(true);
              }
            }}
            aria-label="Settings"
            className={`${iconBtnClass} ${
              isAssessmentActive ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''
            }`}
          >
            <Settings size={15} strokeWidth={2.2} />
          </button>
        </div>
      </nav>

      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
          />
        </Suspense>
      )}

      {isWelcomeOpen && (
        <Suspense fallback={null}>
          <WelcomeModal
            isOpen={isWelcomeOpen}
            onClose={() => setIsWelcomeOpen(false)}
          />
        </Suspense>
      )}

      {showExitConfirm && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="exit-assessment-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#181D23] border border-slate-700/80 p-5 shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <LogOut size={18} strokeWidth={2.4} />
              </div>
              <h2 id="exit-assessment-title" className="text-base font-bold text-white tracking-tight">
                Exit Assessment?
              </h2>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Your active test is currently in progress. Exiting now will discard this run and active trial data will not be recorded.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  setShowExitConfirm(false);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 transition-colors cursor-pointer"
              >
                Resume Test
              </button>
              <button
                type="button"
                onClick={performExit}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 shadow-xs transition-colors cursor-pointer"
              >
                Exit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
