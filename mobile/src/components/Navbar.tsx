import React, { useState, Suspense } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Activity, ArrowLeft, Settings, Info } from 'lucide-react';
import { PulseLogo } from './brand';
import { triggerHaptic } from '../lib/settingsStore';

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
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <>
      <nav 
        role="navigation"
        aria-label="Mobile Navigation"
        data-current-view={activeId || 'home'}
        className="w-full shrink-0 flex items-center justify-between px-3.5 py-2.5 bg-[var(--surface-0)] z-40 relative border-b border-[var(--border-subtle)]"
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
              className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.97] transition-colors border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer"
            >
              <ArrowLeft size={16} />
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
            className={`flex items-center cursor-pointer group p-0.5 shrink-0 rounded-md ${isHome ? 'ring-1 ring-[var(--accent)]/40' : ''}`}
          >
            <div className="w-7 h-7 rounded-md bg-[var(--accent-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] transition-colors">
              <PulseLogo variant="mark" size={16} color="var(--accent)" />
            </div>
          </Link>

          {title && (
            typeof title === 'string' ? (
              <span 
                className="font-heading font-bold text-sm text-[var(--text-primary)] tracking-normal truncate ml-1"
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
          <button 
            type="button"
            id="mobile-nav-info-btn"
            onClick={() => {
              triggerHaptic('tap');
              setIsWelcomeOpen(true);
            }}
            aria-label="App Info"
            title="Welcome & Info"
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.97] transition-colors border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer"
          >
            <Info size={15} />
          </button>
          <button 
            type="button"
            id="mobile-nav-settings-btn"
            disabled={isAssessmentActive}
            aria-disabled={isAssessmentActive}
            title={isAssessmentActive ? "Settings unavailable during active assessment" : "Settings"}
            onClick={() => {
              if (!isAssessmentActive) {
                triggerHaptic('tap');
                setIsSettingsOpen(true);
              }
            }}
            aria-label="Settings"
            className={`w-8 h-8 flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.97] transition-colors border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 ${
              isAssessmentActive ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
            }`}
          >
            <Settings size={15} />
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
