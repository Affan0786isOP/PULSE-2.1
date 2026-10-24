import React from 'react';
import { Activity } from 'lucide-react';

interface MobileHomeFooterProps {
  onNavigate?: (tab: string) => void;
}

export function MobileHomeFooter({ onNavigate }: MobileHomeFooterProps) {
  const currentYear = new Date().getFullYear();

  const handleNav = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  return (
    <footer 
      className="w-full border-t border-[var(--border-subtle)] bg-[var(--surface-1)] py-10 px-5 mt-4 text-center rounded-2xl shadow-sm"
      aria-label="Mobile Site Footer"
    >
      <div className="flex flex-col items-center mb-6">
        <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] mb-3">
          <Activity size={18} />
        </div>
        <span className="font-heading text-lg font-bold tracking-wider text-[var(--text-primary)]">
          PULSE <span className="text-xs font-mono text-[var(--accent)] font-normal">2.1</span>
        </span>
        <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-xs leading-relaxed">
          Short browser-based behavioral tests for personal tracking and open research.
        </p>
      </div>

      {/* Directory Links */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-6 text-xs text-[var(--text-secondary)]">
        <button
          type="button"
          onClick={() => handleNav('assessments')}
          className="hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] cursor-pointer"
        >
          Assessments
        </button>
        <button
          type="button"
          onClick={() => handleNav('leaderboard')}
          className="hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] cursor-pointer"
        >
          Leaderboard
        </button>
        <button
          type="button"
          onClick={() => handleNav('privacy')}
          className="hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] cursor-pointer"
        >
          Privacy Policy
        </button>
      </div>

      <span className="text-[10px] font-mono text-[var(--text-secondary)] block">
        © {currentYear} PULSE Engineering. All rights reserved.
      </span>
    </footer>
  );
}
