import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Menu, X, Settings, Info, RefreshCw, Download, ArrowLeft, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PulseLogo } from './brand';
import { usePwaInstall } from '../lib/usePwaInstall';
import { resolveActiveNavId } from '../lib/navigation';
export { resolveActiveNavId };

// Defer modal loading until user interaction
const SettingsModal = React.lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const WelcomeModal = React.lazy(() => import('./WelcomeModal').then(m => ({ default: m.WelcomeModal })));
const AddToHomeScreenModal = React.lazy(() => import('./AddToHomeScreenModal').then(m => ({ default: m.AddToHomeScreenModal })));

// Non-blocking, accessible fallback when modal code chunks are loading
const ModalLoadingFallback = () => (
  <div 
    role="status"
    aria-live="polite"
    className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
  >
    <div className="p-3 rounded-xl bg-[var(--surface-1)]/95 backdrop-blur-md border border-[var(--border-subtle)] flex items-center gap-2.5 text-xs text-[var(--text-secondary)] font-mono pointer-events-auto">
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
  isAssessmentActive = false,
  theme
}: { 
  onNavigate?: (view: string) => void;
  currentView: string;
  onBack?: () => void;
  title?: string;
  rightContent?: React.ReactNode;
  isAssessmentActive?: boolean;
  theme?: 'light' | 'dark';
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const wasMobileMenuOpen = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const pwa = usePwaInstall();
  const isHome = currentView === 'home' || location.pathname === '/' || location.pathname === '/index.html';

  const handleCloseSettings = React.useCallback(() => setIsSettingsOpen(false), []);
  const handleCloseWelcome = React.useCallback(() => setIsWelcomeOpen(false), []);

  // Defense-in-depth: Close mobile drawer whenever an assessment becomes active
  useEffect(() => {
    if (isAssessmentActive && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [isAssessmentActive, isMobileMenuOpen]);

  // Manage focus, scroll lock, and background inertness for mobile navigation drawer
  useEffect(() => {
    if (isMobileMenuOpen) {
      wasMobileMenuOpen.current = true;

      // 1. Lock background scroll while mobile drawer is open
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // 2. Make application content and header siblings outside the drawer inert while open
      const elementsToRestore: Array<{ el: HTMLElement; hadInert: boolean }> = [];

      const setInertSafely = (target: HTMLElement) => {
        const hadInert = target.hasAttribute('inert') || (target as HTMLElement & { inert?: boolean }).inert === true;
        elementsToRestore.push({ el: target, hadInert });
        if ('inert' in target) {
          (target as HTMLElement & { inert: boolean }).inert = true;
        }
        target.setAttribute('inert', '');
      };

      // A: Mark all direct children of the header EXCEPT the mobile drawer and its backdrop as inert
      if (navRef.current) {
        for (let i = 0; i < navRef.current.children.length; i++) {
          const child = navRef.current.children[i];
          if (
            child instanceof HTMLElement && 
            child !== drawerRef.current && 
            child !== backdropRef.current &&
            !child.hasAttribute('data-drawer-backdrop') &&
            !child.contains(drawerRef.current)
          ) {
            setInertSafely(child);
          }
        }
      }

      // B: Traverse up the tree from header and mark sibling containers inert
      let current: HTMLElement | null = navRef.current;
      while (current && current !== document.body) {
        const parent = current.parentElement;
        if (parent) {
          for (let i = 0; i < parent.children.length; i++) {
            const child = parent.children[i];
            if (child !== current && child instanceof HTMLElement && !child.contains(navRef.current)) {
              setInertSafely(child);
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
    { id: 'assessments', label: 'Assessments', to: '/assessments' },
    { id: 'leaderboard', label: 'Leaderboard', to: '/leaderboard' },
    { id: 'dataset', label: 'Dataset', to: '/dataset' },
    { id: 'analytics', label: 'Analytics', to: '/analytics' },
    { id: 'about', label: 'About', to: '/about' }
  ];

  const activeId = resolveActiveNavId(currentView, location.pathname);

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

  const isLight = theme !== 'dark';

  return (
    <header 
      ref={navRef}
      role="banner"
      aria-label="Global Navigation"
      className={`relative z-30 w-full max-w-[1440px] min-[2560px]:max-w-[1800px] mx-auto px-6 sm:px-10 lg:px-14 min-[2560px]:px-20 ${
        isLight ? 'h-14 sm:h-16 min-[2560px]:h-20' : 'h-16 sm:h-20'
      } flex items-center justify-between shrink-0 border-b border-transparent transition-colors duration-200`}
      style={{ 
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))', 
        paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))', 
        paddingRight: 'max(1.5rem, env(safe-area-inset-right, 0px))' 
      }}
    >
      {/* Brand Lockup & Back / Exit Navigation */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {(!isHome || onBack) && (
          <button
            type="button"
            onClick={handleBack}
            aria-label={isAssessmentActive ? "Exit assessment" : "Go back"}
            title={isAssessmentActive ? "Exit assessment" : "Go back"}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-medium transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 cursor-pointer shrink-0 ${
              isAssessmentActive
                ? 'border-red-200/90 bg-red-50/80 hover:bg-red-100 text-red-600 focus-visible:ring-red-500 shadow-xs'
                : (isLight
                    ? 'border-slate-200/90 bg-white/85 hover:bg-white text-slate-700 hover:text-[#090D1A] shadow-[0_2px_6px_rgba(0,0,0,0.03)] focus-visible:ring-[#0066FF]'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--accent)]')
            }`}
          >
            {isAssessmentActive ? (
              <>
                <LogOut size={13} strokeWidth={2.2} className="shrink-0" />
                <span className="hidden sm:inline font-semibold">Exit Test</span>
              </>
            ) : (
              <>
                <ArrowLeft size={14} strokeWidth={2.2} className="shrink-0" />
                <span className="hidden sm:inline">Back</span>
              </>
            )}
          </button>
        )}

        {isAssessmentActive ? (
          <span 
            className="flex items-center gap-3 opacity-50 cursor-not-allowed select-none"
            aria-label="PULSE Home (Disabled during active assessment)"
          >
            <PulseLogo 
              variant="horizontal" 
              size={30} 
              color={isLight ? '#0066FF' : 'var(--accent)'} 
              textColor={isLight ? '#090D1A' : 'var(--text-primary)'} 
            />
          </span>
        ) : (
          <Link 
            to="/"
            className={`flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 rounded-lg ${
              isLight ? 'focus-visible:ring-[#0066FF]' : 'focus-visible:ring-[var(--accent)]'
            }`}
            aria-label="PULSE Home"
          >
            <PulseLogo 
              variant="horizontal" 
              size={30} 
              color={isLight ? '#0066FF' : 'var(--accent)'} 
              textColor={isLight ? '#090D1A' : 'var(--text-primary)'} 
            />
          </Link>
        )}

        {title && (
          <>
            <div className={`h-4 w-px hidden sm:block mx-1 sm:mx-2 ${isLight ? 'bg-slate-200' : 'bg-[var(--border-subtle)]'}`} aria-hidden="true" />
            <span className={`text-xs font-medium hidden sm:block ${isLight ? 'text-slate-500' : 'text-[var(--text-secondary)]'}`}>
              {title}
            </span>
          </>
        )}
      </div>

      {/* Center Main Links */}
      <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-6 lg:gap-8 min-[2560px]:gap-10">
        {navItems.map(item => {
          const isActive = activeId === item.id;
          if (isAssessmentActive) {
            return (
              <span
                key={item.id}
                aria-disabled="true"
                className="text-[13.5px] lg:text-[14.5px] min-[2560px]:text-[16px] font-medium text-slate-400 opacity-50 cursor-not-allowed select-none"
              >
                {item.label}
              </span>
            );
          }
          return (
            <Link
              key={item.id}
              to={item.to}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                if (onNavigate) onNavigate(item.id);
              }}
              className={`relative text-[13.5px] lg:text-[14.5px] min-[2560px]:text-[16px] font-medium transition-colors ${
                isLight 
                  ? (isActive ? 'text-[#0066FF] font-semibold' : 'text-[#475569] hover:text-[#090D1A]')
                  : (isActive ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]')
              }`}
            >
              {item.label}
              {isActive && isLight && (
                <span className="absolute -bottom-1.5 left-0 right-0 h-[2.5px] bg-[#0066FF] rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right Info, Settings & Install Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {rightContent && (
          <div className="hidden sm:block">
            {rightContent}
          </div>
        )}

        {pwa.isInstallable && !isAssessmentActive && (
          <button
            type="button"
            id="desktop-install-app-btn"
            onClick={() => {
              if (pwa.hasNativePrompt) {
                pwa.promptInstall();
              } else {
                pwa.openInstallGuide();
              }
            }}
            aria-label="Install App"
            className={isLight
              ? "flex items-center gap-2 px-3 sm:px-3.5 min-[2560px]:px-4 py-1.5 sm:py-2 min-[2560px]:py-2.5 rounded-full border border-sky-200/90 bg-sky-50/70 hover:bg-sky-100/90 text-[#0066FF] text-xs sm:text-[13px] min-[2560px]:text-[14px] font-medium shadow-[0_2px_6px_rgba(0,102,255,0.06)] hover:shadow-sm active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] shrink-0"
              : "flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full border border-[var(--border-subtle)] bg-[var(--accent-subtle)] hover:bg-[var(--accent)]/15 text-[var(--accent)] text-xs sm:text-[13px] font-medium active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] shrink-0"
            }
          >
            <Download size={14} strokeWidth={2.4} className={isLight ? "text-[#0066FF] shrink-0" : "text-[var(--accent)] shrink-0"} />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        <button
          type="button"
          id="navbar-info-btn"
          disabled={isAssessmentActive}
          aria-disabled={isAssessmentActive}
          onClick={() => {
            if (!isAssessmentActive) setIsWelcomeOpen(true);
          }}
          aria-label="Platform Information"
          title={isAssessmentActive ? "Info unavailable during active assessment" : "Platform Information"}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 min-[2560px]:px-4 py-1.5 sm:py-2 min-[2560px]:py-2.5 rounded-full text-xs sm:text-[13px] min-[2560px]:text-[14px] font-medium active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 ${
            isLight 
              ? 'border border-slate-200/90 bg-white/85 hover:bg-white text-slate-700 hover:text-[#0066FF] shadow-[0_2px_6px_rgba(0,0,0,0.03)] hover:shadow-sm focus-visible:ring-[#0066FF]'
              : 'border border-[var(--border-subtle)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--accent)] focus-visible:ring-[var(--accent)]'
          } ${
            isAssessmentActive ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
          }`}
        >
          <Info size={15} strokeWidth={2.2} />
          <span className="hidden sm:inline">Info</span>
        </button>

        <button
          type="button"
          id="navbar-settings-btn"
          onClick={() => {
            if (!isAssessmentActive) setIsSettingsOpen(true);
          }}
          disabled={isAssessmentActive}
          aria-disabled={isAssessmentActive}
          aria-label="Settings"
          title={isAssessmentActive ? "Settings unavailable during active assessment" : "Application Settings"}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 min-[2560px]:px-4 py-1.5 sm:py-2 min-[2560px]:py-2.5 rounded-full text-xs sm:text-[13px] min-[2560px]:text-[14px] font-medium active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 ${
            isLight
              ? 'border border-slate-200/90 bg-white/85 hover:bg-white text-slate-700 hover:text-[#090D1A] shadow-[0_2px_6px_rgba(0,0,0,0.03)] hover:shadow-sm focus-visible:ring-[#0066FF]'
              : 'border border-[var(--border-subtle)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--accent)]'
          } ${
            isAssessmentActive ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
          }`}
        >
          <Settings size={15} strokeWidth={2.2} />
          <span>Settings</span>
        </button>

        {/* Hamburger Menu Toggle for mobile / tablets (< md) */}
        {!isAssessmentActive && (
          <button 
            type="button" 
            ref={mobileMenuTriggerRef}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="navbar-mobile-drawer"
            className={`w-9 h-9 sm:w-10 sm:h-10 md:hidden flex items-center justify-center rounded-full border active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
              isLight
                ? 'border-slate-200/90 bg-white/85 hover:bg-white text-slate-700 hover:text-[#090D1A] shadow-[0_2px_6px_rgba(0,0,0,0.03)] focus-visible:ring-[#0066FF]'
                : 'border-[var(--border-subtle)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--accent)] focus-visible:ring-[var(--accent)]'
            }`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && !isAssessmentActive && (
            <>
              {/* Backdrop click dismiss */}
              <div 
                ref={backdropRef}
                data-drawer-backdrop="true"
                data-testid="navbar-backdrop"
                className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden"
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
                className={`absolute top-full left-0 w-full border-b shadow-2xl flex flex-col p-4 gap-1 md:hidden z-50 origin-top ${
                  isLight 
                    ? 'bg-white/95 backdrop-blur-md border-slate-200' 
                    : 'bg-[var(--surface-1)] border-[var(--border-subtle)]'
                }`}
              >
                {navItems.map(item => (
                  <Link
                    key={`mobile-nav-${item.id}`}
                    to={item.to}
                    aria-current={activeId === item.id ? 'page' : undefined}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (onNavigate) onNavigate(item.id);
                    }}
                    className={`p-2.5 rounded-lg flex items-center text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
                      isLight
                        ? (activeId === item.id
                            ? 'bg-blue-50 text-[#0066FF] font-semibold focus-visible:ring-[#0066FF]'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-[#0066FF]')
                        : (activeId === item.id
                            ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold focus-visible:ring-[var(--accent)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--accent)]')
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className={`pt-3 border-t mt-2 flex items-center justify-between gap-2 ${
                  isLight ? 'border-slate-200' : 'border-[var(--border-subtle)]'
                }`}>
                  <button 
                    type="button" 
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
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:text-[#090D1A] focus-visible:ring-[#0066FF]'
                        : 'bg-[var(--surface-2)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--accent)]'
                    } ${
                      isAssessmentActive ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                    }`}
                  >
                    <Settings size={14} aria-hidden="true" />
                    <span>Settings</span>
                  </button>
                  <button 
                    type="button" 
                    id="mobile-menu-info-btn"
                    aria-label="Info"
                    disabled={isAssessmentActive}
                    aria-disabled={isAssessmentActive}
                    onClick={() => { 
                      if (!isAssessmentActive) {
                        mobileMenuTriggerRef.current?.focus();
                        setIsMobileMenuOpen(false); 
                        setIsWelcomeOpen(true); 
                      }
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:text-[#0066FF] focus-visible:ring-[#0066FF]'
                        : 'bg-[var(--surface-2)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--accent)]'
                    } ${
                      isAssessmentActive ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                    }`}
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

      {/* PWA Add to Home Screen Install Guide Modal */}
      {pwa.isGuideOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
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
        </Suspense>
      )}
    </header>
  );
}
