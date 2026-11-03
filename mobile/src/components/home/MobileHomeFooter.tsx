import React from 'react';
import { useNavigate } from 'react-router-dom';
import { triggerHaptic } from '../../lib/settingsStore';

interface MobileHomeFooterProps {
  onNavigate?: (view: string) => void;
}

export function MobileHomeFooter({ onNavigate }: MobileHomeFooterProps) {
  const navigate = useNavigate();

  const handleLink = (path: string) => {
    triggerHaptic('tap');
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  return (
    <footer
      aria-label="Mobile Navigation and Legal Footer"
      className="w-full pt-6 pb-2 flex flex-col items-center text-center"
    >
      <nav
        aria-label="Footer Quick Links"
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-4"
      >
        <button
          type="button"
          onClick={() => handleLink('/assessments')}
          className="min-h-[44px] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg"
        >
          Assessments
        </button>
        <button
          type="button"
          onClick={() => handleLink('/leaderboard')}
          className="min-h-[44px] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg"
        >
          Leaderboard
        </button>
        <button
          type="button"
          onClick={() => handleLink('/dataset')}
          className="min-h-[44px] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg"
        >
          Dataset
        </button>
        <button
          type="button"
          onClick={() => handleLink('/about')}
          className="min-h-[44px] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg"
        >
          About & Privacy
        </button>
      </nav>

      <p className="text-[10px] text-[var(--text-secondary)]/70 font-mono tracking-wider">
        © {new Date().getFullYear()} PULSE · Descriptive Cognitive Benchmarking
      </p>
    </footer>
  );
}
