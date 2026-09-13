import React, { useState, useEffect } from 'react';
import { Activity, Menu, X, ArrowLeft, Settings, Info } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { SettingsModal } from './SettingsModal';
import { WelcomeModal, isWelcomeSeenInMemory } from './WelcomeModal';

export function Navbar({ onNavigate, currentView, onBack, title, rightContent }: { onNavigate: (view: string) => void, currentView: string, onBack?: () => void, title?: string, rightContent?: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const isPhone = typeof window !== 'undefined' && (
      window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent || '')
    );
    if (!isPhone && !isWelcomeSeenInMemory()) {
      setIsWelcomeOpen(true);
    }
  }, []);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'assessments', label: 'Assessments' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'dataset', label: 'Dataset' },
    { id: 'improve', label: 'Improve' },
    { id: 'privacy', label: 'Privacy' }
  ];

  const activeId = currentView || (isHome ? 'home' : '');

  return (
    <nav 
      className="min-h-[3.75rem] border-b border-[var(--border-subtle)] bg-[var(--surface-0)] sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 md:px-12 w-full shrink-0 pt-safe px-safe transition-colors duration-200"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))', paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))', paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))' }}
    >
      <div className="flex items-center gap-3">
        {!isHome && onBack && (
          <button type="button" 
            onClick={onBack}
            aria-label="Go Back"
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.97] transition-[color,background-color,border-color,transform] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        
        <button type="button" 
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 group cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="w-7 h-7 rounded-md bg-[var(--accent-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] transition-colors">
            <Activity size={16} className="stroke-[2.2]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-heading font-bold text-sm tracking-wider text-[var(--text-primary)] leading-none">
              PULSE
            </span>
          </div>
        </button>

        {title && (
          <>
            <div className="h-4 w-px bg-[var(--border-default)] hidden sm:block mx-2"></div>
            <span className="text-xs text-[var(--text-muted)] font-medium hidden sm:block">
              {title}
            </span>
          </>
        )}
      </div>

      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-6 lg:gap-8 h-full">
        {navItems.map(item => {
          const isActive = activeId === item.id;
          return (
            <button type="button"
              key={`desktop-nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`h-full relative py-4 flex items-center text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer active:scale-[0.97] ${
                isActive 
                  ? 'text-[var(--text-primary)] font-semibold' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {item.label}
              {isActive && (
                <motion.span 
                  layoutId="desktop-navbar-active"
                  className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--accent)]" 
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        {rightContent ? (
          <div className="hidden md:block">
            {rightContent}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2">
            <button type="button"
              id="navbar-settings-btn"
              aria-label="Settings"
              title="Settings & Calibration"
              onClick={() => { setIsSettingsOpen(true); if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pulse_settings_open')); }}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.97] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-[color,background-color,border-color,transform] cursor-pointer"
            >
              <Settings size={16} />
            </button>
            <button type="button"
              id="navbar-info-btn"
              aria-label="App Info"
              title="Welcome & Info"
              onClick={() => setIsWelcomeOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.97] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-[color,background-color,border-color,transform] cursor-pointer"
            >
              <Info size={16} />
            </button>
          </div>
        )}

        <button type="button" 
          aria-label="Toggle Menu"
          className="w-9 h-9 md:hidden flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.97] border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-[color,background-color,border-color,transform] cursor-pointer"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -6, scaleY: 0.96 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute top-full left-0 w-full bg-[var(--surface-1)] border-b border-[var(--border-subtle)] flex flex-col p-4 gap-1 md:hidden z-50 origin-top"
          >
            {navItems.map(item => (
              <button type="button"
                key={`mobile-nav-${item.id}`}
                onClick={() => {
                  onNavigate(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-md flex items-center text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer ${
                  activeId === item.id
                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-3 border-t border-[var(--border-subtle)] mt-2 flex items-center justify-between gap-2">
              <button type="button"
                id="mobile-menu-settings-btn"
                aria-label="Settings"
                onClick={() => { setIsMobileMenuOpen(false); setIsSettingsOpen(true); if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pulse_settings_open')); }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer"
              >
                <Settings size={14} />
                <span>Settings</span>
              </button>
              <button type="button"
                id="mobile-menu-info-btn"
                aria-label="Info"
                onClick={() => { setIsMobileMenuOpen(false); setIsWelcomeOpen(true); }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer"
              >
                <Info size={14} />
                <span>Info</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global System Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => { setIsSettingsOpen(false); if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pulse_settings_close')); }} 
      />

      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
      />
    </nav>
  );
}
