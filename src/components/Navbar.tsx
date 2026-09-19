import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Activity, Menu, X, ArrowLeft, Settings, Info, RefreshCw } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { GooeyNav } from './ui/gooey-nav';

import { resolveActiveNavId } from '../lib/navigation';
export { resolveActiveNavId };

// Defer modal loading until user interaction
const SettingsModal = React.lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const WelcomeModal = React.lazy(() => import('./WelcomeModal').then(m => ({ default: m.WelcomeModal })));

// Non-blocking, accessible fallback when modal code chunks are loading
const ModalLoadingFallback = () => (
  <div 
    role="status"
    aria-live="polite"
    className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
  >
    <div className="p-3 rounded-xl bg-[var(--surface-1)]/95 backdrop-blur-md border border-[var(--border-subtle)] shadow-xl flex items-center gap-2.5 text-xs text-[var(--text-secondary)] font-mono pointer-events-auto">
      <RefreshCw size={14} className="animate-spin text-[var(--accent)]" aria-hidden="true" />
      <span>Loading dialog...</span>
    </div>
  </div>
);

export function Navbar({ 
  onNavigate, 
  currentView, 
  onBack, 
  title, 
  rightContent,
  isAssessmentActive = false
}: { 
  onNavigate?: (view: string) => void;
  currentView: string;
  onBack?: () => void;
  title?: string;
  rightContent?: React.ReactNode;
  isAssessmentActive?: boolean;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const wasMobileMenuOpen = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = currentView === 'home' || location.pathname === '/' || location.pathname === '/index.html';

  const handleCloseSettings = React.useCallback(() => setIsSettingsOpen(false), []);
  const handleCloseWelcome = React.useCallback(() => setIsWelcomeOpen(false), []);

  // Manage focus, scroll lock, and background inertness for mobile navigation drawer
  useEffect(() => {
    if (isMobileMenuOpen) {
      wasMobileMenuOpen.current = true;

      // 1. Lock background scroll while mobile drawer is open
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // 2. Make application content outside the drawer inert while open
      const elementsToRestore: Array<{ el: HTMLElement; hadInert: boolean }> = [];
      let current: HTMLElement | null = navRef.current;
      while (current && current !== document.body) {
        const parent = current.parentElement;
        if (parent) {
          for (let i = 0; i < parent.children.length; i++) {
            const child = parent.children[i];
            if (child !== current && child instanceof HTMLElement && !child.contains(navRef.current)) {
              const hadInert = child.hasAttribute('inert') || (child as HTMLElement & { inert?: boolean }).inert === true;
              elementsToRestore.push({ el: child, hadInert });
              if ('inert' in child) {
                (child as HTMLElement & { inert: boolean }).inert = true;
              }
              child.setAttribute('inert', '');
            }
          }
        }
        current = parent;
      }

      // Focus the active nav element (or first interactive element) inside the drawer
      const timer = setTimeout(() => {
        if (!drawerRef.current) return;
        const focusables = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length > 0) {
          const activeBtn = focusables.find(el => el.getAttribute('aria-current') === 'page');
          (activeBtn || focusables[0]).focus();
        }
      }, 30);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsMobileMenuOpen(false);
          return;
        }

        if (e.key === 'Tab') {
          if (!drawerRef.current) return;
          const focusables = Array.from(
            drawerRef.current.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          );
          if (focusables.length === 0) {
            e.preventDefault();
            return;
          }

          const firstElement = focusables[0];
          const lastElement = focusables[focusables.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement || !drawerRef.current.contains(document.activeElement)) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement || !drawerRef.current.contains(document.activeElement)) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);

        // Restore body overflow
        document.body.style.overflow = previousOverflow;

        // Restore inert state
        for (const item of elementsToRestore) {
          if (!item.hadInert) {
            if ('inert' in item.el) {
              (item.el as HTMLElement & { inert: boolean }).inert = false;
            }
            item.el.removeAttribute('inert');
          }
        }
      };
    } else if (wasMobileMenuOpen.current) {
      wasMobileMenuOpen.current = false;
      mobileMenuTriggerRef.current?.focus();
    }
  }, [isMobileMenuOpen]);

  const navItems = [
    { id: 'home', label: 'Home', to: '/' },
    { id: 'assessments', label: 'Assessments', to: '/assessments' },
    { id: 'leaderboard', label: 'Leaderboard', to: '/leaderboard' },
    { id: 'dataset', label: 'Dataset', to: '/dataset' },
    { id: 'improve', label: 'Improve', to: '/improve' },
    { id: 'privacy', label: 'Privacy', to: '/privacy' }
  ];

  const activeId = resolveActiveNavId(currentView, location.pathname);
  const activeIndex = navItems.findIndex(i => i.id === activeId);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    const historyIdx = typeof window !== 'undefined' ? (window.history.state as { idx?: number } | null)?.idx : undefined;
    if (typeof historyIdx === 'number' && historyIdx > 0) {
      navigate(-1);
    } else if (onNavigate) {
      onNavigate('home');
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <nav 
      ref={navRef}
      aria-label="Global Navigation"
      className="min-h-[3.75rem] border-b border-[var(--border-subtle)] bg-[var(--surface-0)] sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 md:px-12 w-full shrink-0 transition-colors duration-200"
      style={{ 
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))', 
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))', 
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))' 
      }}
    >
      <div className="flex items-center gap-3">
        {!isHome && (
          <button type="button" 
            onClick={handleBack}
            aria-label="Go Back"
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.97] transition-[color,background-color,border-color,transform] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </button>
        )}
        
        <Link 
          to="/"
          aria-label="PULSE Home"
          className="flex items-center gap-2.5 group cursor-pointer active:scale-[0.98] transition-transform rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <div className="w-7 h-7 rounded-md bg-[var(--accent-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] transition-colors">
            <Activity size={16} aria-hidden="true" className="stroke-[2.2]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-heading font-bold text-sm tracking-wider text-[var(--text-primary)] leading-none">
              PULSE
            </span>
          </div>
        </Link>

        {title && (
          <>
            <div className="h-4 w-px bg-[var(--border-default)] hidden sm:block mx-2" aria-hidden="true"></div>
            <span className="text-xs text-[var(--text-secondary)] font-medium hidden sm:block">
              {title}
            </span>
          </>
        )}
      </div>

      {/* Central Desktop Navigation - lg:flex avoids collisions on tablet/small-desktop viewports */}
      <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center h-full">
        <GooeyNav
          items={navItems.map(item => ({ label: item.label, to: item.to }))}
          value={activeIndex >= 0 ? activeIndex : -1}
          onChange={(index) => {
            const item = navItems[index];
            if (onNavigate) {
              onNavigate(item.id);
            } else {
              navigate(item.to);
            }
          }}
          activeColor="var(--accent)"
        />
      </div>

      <div className="flex items-center gap-2">
        {rightContent && (
          <div className="hidden sm:block">
            {rightContent}
          </div>
        )}

        {/* Global Controls preserved alongside rightContent */}
        <div className="hidden lg:flex items-center gap-2">
          <button type="button"
            id="navbar-settings-btn"
            aria-label="Settings"
            disabled={isAssessmentActive}
            aria-disabled={isAssessmentActive}
            title={isAssessmentActive ? "Settings unavailable during active assessment" : "Settings & Calibration"}
            onClick={() => {
              if (!isAssessmentActive) setIsSettingsOpen(true);
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.97] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-[color,background-color,border-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              isAssessmentActive ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
            }`}
          >
            <Settings size={16} aria-hidden="true" />
          </button>
          <button type="button"
            id="navbar-info-btn"
            aria-label="App Info"
            title="Welcome & Info"
            onClick={() => setIsWelcomeOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.97] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-[color,background-color,border-color,transform] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Info size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Hamburger Menu Toggle for screens < lg (tablets & phones) */}
        <button type="button" 
          ref={mobileMenuTriggerRef}
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="navbar-mobile-drawer"
          className="w-9 h-9 lg:hidden flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.97] border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-[color,background-color,border-color,transform] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop click dismiss seamlessly covering behind safe-area */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
              aria-hidden="true"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div 
              ref={drawerRef}
              id="navbar-mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation Menu"
              initial={{ opacity: 0, y: -6, scaleY: 0.96 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -6, scaleY: 0.96 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="absolute top-full left-0 w-full bg-[var(--surface-1)] border-b border-[var(--border-subtle)] flex flex-col p-4 gap-1 lg:hidden z-50 origin-top shadow-xl"
            >
              {navItems.map(item => (
                <Link
                  key={`mobile-nav-${item.id}`}
                  to={item.to}
                  aria-current={activeId === item.id ? 'page' : undefined}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-md flex items-center text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    activeId === item.id
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-[var(--border-subtle)] mt-2 flex items-center justify-between gap-2">
                <button type="button"
                  id="mobile-menu-settings-btn"
                  aria-label="Settings"
                  disabled={isAssessmentActive}
                  aria-disabled={isAssessmentActive}
                  title={isAssessmentActive ? "Settings unavailable during active assessment" : "Settings"}
                  onClick={() => { 
                    if (!isAssessmentActive) {
                      mobileMenuTriggerRef.current?.focus();
                      setIsMobileMenuOpen(false); 
                      setIsSettingsOpen(true); 
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    isAssessmentActive ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                  }`}
                >
                  <Settings size={14} aria-hidden="true" />
                  <span>Settings</span>
                </button>
                <button type="button"
                  id="mobile-menu-info-btn"
                  aria-label="Info"
                  onClick={() => {
                    mobileMenuTriggerRef.current?.focus();
                    setIsMobileMenuOpen(false); 
                    setIsWelcomeOpen(true); 
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <Info size={14} aria-hidden="true" />
                  <span>Info</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global System Settings Modal (Loaded on demand) */}
      {isSettingsOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={handleCloseSettings} 
          />
        </Suspense>
      )}

      {/* Welcome Modal (Loaded on demand) */}
      {isWelcomeOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <WelcomeModal
            isOpen={isWelcomeOpen}
            onClose={handleCloseWelcome}
            onNavigate={onNavigate}
          />
        </Suspense>
      )}
    </nav>
  );
}
