import React, { useState, Suspense } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Activity, ArrowLeft, Settings, Info, WifiOff, Sun, Moon } from 'lucide-react';
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

  const handleBack = () => {
    triggerHaptic('tap');
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

  const isHome = activeId === 'home' || location.pathname === '/' || location.pathname === '/mobile/' || location.pathname === '/mobile';

  const navSurfaceClass = isAssessmentActive
    ? 'bg-[#12161B] text-white border-b border-[#20262D]'
    : 'bg-white/90 backdrop-blur-md text-[#090D1A] border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]';

  const iconBtnClass = isAssessmentActive
    ? 'w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 active:scale-[0.96] border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer'
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
              aria-label="Go Back"
              title="Go Back"
              className={iconBtnClass}
            >
              <ArrowLeft size={16} strokeWidth={2.2} />
            </button>
          )}
          
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
              isAssessmentActive 
                ? 'bg-white/10 border border-white/15 text-[#0066FF]' 
                : 'bg-sky-50 border border-sky-100/90 text-[#0066FF]'
            }`}>
              <PulseLogo variant="mark" size={16} color="#0066FF" />
            </div>
          </Link>

          {title && (
            typeof title === 'string' ? (
              <span 
                className={`font-heading font-bold text-sm tracking-tight truncate ml-1 ${
                  isAssessmentActive ? 'text-white' : 'text-[#090D1A]'
                }`}
                aria-current={!isHome ? 'page' : undefined}
              >
                {title}
              </span>
            ) : (
              title
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
              aria-label="Offline — cloud features and assessment start unavailable"
              title="Offline — cloud features and assessment start unavailable"
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
            onClick={() => {
              triggerHaptic('tap');
              setIsWelcomeOpen(true);
            }}
            aria-label="App Info"
            title="Welcome & Info"
            className={iconBtnClass}
          >
            <Info size={15} strokeWidth={2.2} />
          </button>
          <button 
            type="button"
            id="mobile-nav-settings-btn"
            disabled={isAssessmentActive}
            aria-disabled={isAssessmentActive}
            title={isAssessmentActive ? "Settings unavailable during active assessment" : "Settings & Calibration"}
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
    </>
  );
}
