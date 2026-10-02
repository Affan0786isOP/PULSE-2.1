import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, Info } from 'lucide-react';
import { PulseLogo } from '../brand';
import { useReducedMotionPreference } from '../../lib/settingsStore';

export interface DesktopPersistentNavigationProps {
  onOpenSettings?: () => void;
  onOpenAbout?: () => void;
}

export function DesktopPersistentNavigation({
  onOpenSettings,
  onOpenAbout,
}: DesktopPersistentNavigationProps) {
  const shouldReduceMotion = useReducedMotionPreference();

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      e.preventDefault();
      targetElement.scrollIntoView({
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
      });
      window.history.pushState(null, '', `#${targetId}`);
    }
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-50 w-full bg-[#08080A]/90 backdrop-blur-md border-b border-white/5 transition-colors">
      <div className="max-w-[1600px] mx-auto px-6 sm:px-12 h-16 flex items-center justify-between gap-6">
        {/* Brand / Logo */}
        <a
          href="#hero"
          onClick={(e) => handleAnchorClick(e, 'hero')}
          className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A] rounded-lg p-1.5"
          aria-label="PULSE Home"
        >
          <div className="w-8 h-8 rounded-md bg-[var(--accent-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] group-hover:border-[var(--accent)] transition-colors">
            <PulseLogo variant="mark" size={18} color="var(--accent)" />
          </div>
          <span className="font-heading font-bold text-xl tracking-widest text-[#F8FAFC]">
            PULSE
          </span>
        </a>

        {/* Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-1 sm:gap-2 text-xs font-mono tracking-wider uppercase"
          aria-label="Homepage navigation"
        >
          {/* Section Anchors */}
          <a
            href="#hero"
            onClick={(e) => handleAnchorClick(e, 'hero')}
            className="px-3 py-2 text-[#8A94A6] hover:text-[#F8FAFC] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            Overview
          </a>
          <a
            href="#assessments"
            onClick={(e) => handleAnchorClick(e, 'assessments')}
            className="px-3 py-2 text-[#8A94A6] hover:text-[#F8FAFC] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            Assessments
          </a>
          <a
            href="#how-it-works"
            onClick={(e) => handleAnchorClick(e, 'how-it-works')}
            className="px-3 py-2 text-[#8A94A6] hover:text-[#F8FAFC] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            How It Works
          </a>
          <a
            href="#faq"
            onClick={(e) => handleAnchorClick(e, 'faq')}
            className="px-3 py-2 text-[#8A94A6] hover:text-[#F8FAFC] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            FAQ
          </a>

          <div className="w-px h-4 bg-white/10 mx-1" aria-hidden="true" />

          {/* Module Routes */}
          <Link
            to="/assessments"
            className="px-3 py-2 text-[#8A94A6] hover:text-[#00F0FF] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            Directory
          </Link>
          <Link
            to="/leaderboard"
            className="px-3 py-2 text-[#8A94A6] hover:text-[#00F0FF] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            Leaderboard
          </Link>
          <Link
            to="/dataset"
            className="px-3 py-2 text-[#8A94A6] hover:text-[#00F0FF] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            Dataset
          </Link>
          <Link
            to="/privacy"
            className="px-3 py-2 text-[#8A94A6] hover:text-[#00F0FF] transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
          >
            Privacy
          </Link>
        </nav>

        {/* Right side utility actions */}
        <div className="flex items-center gap-2">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-2 text-[#8A94A6] hover:text-[#F8FAFC] hover:bg-white/5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
              aria-label="Open settings"
            >
              <Settings size={18} />
            </button>
          )}
          {onOpenAbout && (
            <button
              onClick={onOpenAbout}
              className="p-2 text-[#8A94A6] hover:text-[#F8FAFC] hover:bg-white/5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]"
              aria-label="About & Information"
            >
              <Info size={18} />
            </button>
          )}
          <a
            href="#assessments"
            onClick={(e) => handleAnchorClick(e, 'assessments')}
            className="hidden sm:inline-flex items-center justify-center px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md bg-[#00F0FF] text-[#08080A] hover:bg-[#33F3FF] transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A]"
          >
            Launch Test
          </a>
        </div>
      </div>
    </header>
  );
}
