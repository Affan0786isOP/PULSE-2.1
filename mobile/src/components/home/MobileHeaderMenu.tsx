import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, X, Download, Maximize2, Minimize2, 
  Activity, Trophy, Folder, Shield, Settings, Info, ChevronRight 
} from 'lucide-react';
import { PulseLogo } from '../brand';
import { usePwaInstall } from '../../lib/usePwaInstall';
import { triggerHaptic, useReducedMotionPreference } from '../../lib/settingsStore';

export interface MobileHeaderMenuProps {
  onNavigate?: (view: string) => void;
  onOpenSettings?: () => void;
  onOpenAbout?: () => void;
}

export function MobileHeaderMenu({
  onNavigate,
  onOpenSettings,
  onOpenAbout,
}: MobileHeaderMenuProps) {
  const pwa = usePwaInstall();
  const shouldReduceMotion = useReducedMotionPreference();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  // Fullscreen state listener
  useEffect(() => {
    const updateFs = () => {
      const doc = document as any;
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', updateFs);
    document.addEventListener('webkitfullscreenchange', updateFs);
    return () => {
      document.removeEventListener('fullscreenchange', updateFs);
      document.removeEventListener('webkitfullscreenchange', updateFs);
    };
  }, []);

  const toggleFullscreen = () => {
    triggerHaptic();
    const doc = document as any;
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (doc.documentElement.webkitRequestFullscreen) {
        doc.documentElement.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
    triggerButtonRef.current?.focus();
  };

  // Focus trap for drawer and Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    // Focus the first appropriate focusable control inside the drawer
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        return;
      }

      if (e.key === 'Tab') {
        if (!drawerRef.current) return;
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (!focusableElements.length) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

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
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      e.preventDefault();
      triggerHaptic();
      closeMenu();
      target.scrollIntoView({
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
      });
      window.history.pushState(null, '', `#${targetId}`);
    }
  };

  const handleRouteClick = (view: string) => {
    triggerHaptic();
    closeMenu();
    onNavigate?.(view);
  };

  return (
    <>
      <header className="sticky top-0 left-0 right-0 z-40 w-full max-w-md mx-auto bg-[#0B0B0E]/90 backdrop-blur-md flex items-center justify-between px-5 py-4 shrink-0 border-b border-white/5 transition-colors">
        <a
          href="#hero"
          onClick={(e) => handleAnchorClick(e, 'hero')}
          className="flex items-center gap-2.5 text-white rounded-lg p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          aria-label="Pulse Mobile Home"
        >
          <PulseLogo variant="mark" size={24} color="#00F0FF" />
          <span className="font-heading font-semibold text-lg tracking-wide text-white">
            Pulse
          </span>
        </a>

        <div className="flex items-center gap-1.5">
          {pwa.isInstallable && (
            <button
              onClick={() => {
                triggerHaptic();
                pwa.promptInstall();
              }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-[#8A94A6] hover:text-white rounded-full active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
              aria-label="Install App"
            >
              <Download size={20} />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-[#8A94A6] hover:text-white rounded-full active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>

          <button
            ref={triggerButtonRef}
            onClick={() => {
              triggerHaptic();
              setIsOpen(true);
            }}
            className="min-h-[44px] flex items-center gap-2 px-3.5 py-2 ml-1 rounded-full border border-white/10 text-white/90 hover:text-white hover:bg-white/5 active:scale-95 transition-all text-sm font-medium bg-[#10141B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
            aria-expanded={isOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label="Open Navigation Menu"
          >
            <span>Menu</span>
            <Menu size={16} />
          </button>
        </div>
      </header>

      {/* Accessible Navigation Drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
          onClick={() => {
            triggerHaptic();
            closeMenu();
          }}
        >
          <div
            ref={drawerRef}
            id="mobile-navigation-drawer"
            className="w-[85vw] max-w-sm h-full bg-[#10141B] border-l border-white/10 flex flex-col p-6 overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-6 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <PulseLogo variant="mark" size={20} color="#00F0FF" />
                <span className="font-heading font-bold text-base tracking-wider text-white">
                  PULSE MENU
                </span>
              </div>
              <button
                ref={closeButtonRef}
                onClick={() => {
                  triggerHaptic();
                  closeMenu();
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-[#8A94A6] hover:text-white rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Section Anchors */}
            <div className="py-6 border-b border-white/5">
              <h3 className="text-[10px] font-mono font-bold tracking-widest text-[#8A94A6] uppercase mb-3 pl-2">
                Sections
              </h3>
              <nav className="flex flex-col gap-1.5" aria-label="Page sections">
                <a
                  href="#hero"
                  onClick={(e) => handleAnchorClick(e, 'hero')}
                  className="min-h-[44px] flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                >
                  <span>Overview</span>
                  <ChevronRight size={16} className="text-[#8A94A6]" />
                </a>
                <a
                  href="#assessments"
                  onClick={(e) => handleAnchorClick(e, 'assessments')}
                  className="min-h-[44px] flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                >
                  <span>Assessments</span>
                  <ChevronRight size={16} className="text-[#8A94A6]" />
                </a>
                <a
                  href="#how-it-works"
                  onClick={(e) => handleAnchorClick(e, 'how-it-works')}
                  className="min-h-[44px] flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                >
                  <span>How It Works</span>
                  <ChevronRight size={16} className="text-[#8A94A6]" />
                </a>
                <a
                  href="#faq"
                  onClick={(e) => handleAnchorClick(e, 'faq')}
                  className="min-h-[44px] flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                >
                  <span>FAQ</span>
                  <ChevronRight size={16} className="text-[#8A94A6]" />
                </a>
              </nav>
            </div>

            {/* Application Modules */}
            <div className="py-6 border-b border-white/5">
              <h3 className="text-[10px] font-mono font-bold tracking-widest text-[#8A94A6] uppercase mb-3 pl-2">
                Modules
              </h3>
              <nav className="flex flex-col gap-1.5" aria-label="Module directory">
                <button
                  onClick={() => handleRouteClick('assessments')}
                  className="min-h-[44px] w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-sm font-semibold text-white text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                >
                  <div className="flex items-center gap-3">
                    <Activity size={18} className="text-[#00F0FF]" />
                    <span>Assessments Directory</span>
                  </div>
                  <ChevronRight size={16} className="text-[#8A94A6]" />
                </button>
                <button
                  onClick={() => handleRouteClick('leaderboard')}
                  className="min-h-[44px] w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-sm font-semibold text-white text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                >
                  <div className="flex items-center gap-3">
                    <Trophy size={18} className="text-[#8A94A6]" />
                    <span>Leaderboard</span>
                  </div>
                  <ChevronRight size={16} className="text-[#8A94A6]" />
                </button>
                <button
                  onClick={() => handleRouteClick('dataset')}
                  className="min-h-[44px] w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-sm font-semibold text-white text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                >
                  <div className="flex items-center gap-3">
                    <Folder size={18} className="text-[#8A94A6]" />
                    <span>Dataset</span>
                  </div>
                  <ChevronRight size={16} className="text-[#8A94A6]" />
                </button>
                <button
                  onClick={() => handleRouteClick('privacy')}
                  className="min-h-[44px] w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-sm font-semibold text-white text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                >
                  <div className="flex items-center gap-3">
                    <Shield size={18} className="text-[#8A94A6]" />
                    <span>Privacy Policy</span>
                  </div>
                  <ChevronRight size={16} className="text-[#8A94A6]" />
                </button>
              </nav>
            </div>

            {/* System Utilities */}
            <div className="mt-auto pt-6">
              <div className="flex flex-col gap-1.5">
                {onOpenSettings && (
                  <button
                    onClick={() => {
                      triggerHaptic();
                      closeMenu();
                      onOpenSettings();
                    }}
                    className="min-h-[44px] w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-sm font-medium text-[#8A94A6] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                  >
                    <Settings size={18} />
                    <span>Settings & Calibration</span>
                  </button>
                )}
                {onOpenAbout && (
                  <button
                    onClick={() => {
                      triggerHaptic();
                      closeMenu();
                      onOpenAbout();
                    }}
                    className="min-h-[44px] w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-sm font-medium text-[#8A94A6] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
                  >
                    <Info size={18} />
                    <span>About & Info</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
