import React, { useState, useEffect } from 'react';
import { Activity, Menu, X, ArrowLeft, Settings, Info } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { SettingsModal } from './SettingsModal';
import { WelcomeModal, isWelcomeSeenInMemory } from './WelcomeModal';
import { GooeyNav } from './ui/gooey-nav';

export function Navbar({ 
  onNavigate, 
  currentView, 
  onBack, 
  title, 
  rightContent 
}: { 
  onNavigate: (view: string) => void;
  currentView: string;
  onBack?: () => void;
  title?: string;
  rightContent?: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
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

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'assessments', label: 'Assessments' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'dataset', label: 'Dataset' },
    { id: 'improve', label: 'Improve' },
    { id: 'privacy', label: 'Privacy' }
  ];

  const activeId = currentView || (isHome ? 'home' : '');

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof window !== 'undefined' && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      onNavigate('home');
    }
  };

  return (
    <nav 
      role="navigation"
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
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.97] transition-[color,background-color,border-color,transform] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        
        <button type="button" 
          onClick={() => onNavigate('home')}
          aria-label="PULSE Home"
          aria-current={isHome ? 'page' : undefined}
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

      {/* Central Desktop Navigation - lg:flex avoids collisions on tablet/small-desktop viewports */}
      <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center h-full">
        <GooeyNav
          items={navItems.map(item => item.label)}
          value={navItems.findIndex(i => i.id === activeId) >= 0 ? navItems.findIndex(i => i.id === activeId) : 0}
          onChange={(index) => onNavigate(navItems[index].id)}
          size="sm"
          activeColor="var(--accent)"
          activeLabelColor="white"
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
            title="Settings & Calibration"
            onClick={() => setIsSettingsOpen(true)}
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

        {/* Hamburger Menu Toggle for screens < lg (tablets & phones) */}
        <button type="button" 
          aria-label="Toggle Menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="navbar-mobile-drawer"
          className="w-9 h-9 lg:hidden flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] active:scale-[0.97] border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-[color,background-color,border-color,transform] cursor-pointer"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop click dismiss */}
            <div 
              className="fixed inset-0 top-[3.75rem] bg-black/50 backdrop-blur-xs z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div 
              id="navbar-mobile-drawer"
              role="region"
              aria-label="Mobile Navigation Menu"
              initial={{ opacity: 0, y: -6, scaleY: 0.96 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -6, scaleY: 0.96 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="absolute top-full left-0 w-full bg-[var(--surface-1)] border-b border-[var(--border-subtle)] flex flex-col p-4 gap-1 lg:hidden z-50 origin-top shadow-xl"
            >
              {navItems.map(item => (
                <button type="button"
                  key={`mobile-nav-${item.id}`}
                  aria-current={activeId === item.id ? 'page' : undefined}
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
                  onClick={() => { setIsMobileMenuOpen(false); setIsSettingsOpen(true); }}
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
          </>
        )}
      </AnimatePresence>

      {/* Global System Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
      />
    </nav>
  );
}
