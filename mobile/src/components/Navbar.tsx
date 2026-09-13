import React, { useState } from 'react';
import { Activity, ArrowLeft, Settings } from 'lucide-react';
import { triggerHaptic } from '../lib/settingsStore';
import { SettingsModal } from './SettingsModal';

export function Navbar({ onNavigate, onBack, title, rightContent }: { onNavigate: (view: string) => void, currentView?: string, onBack?: () => void, title?: string | React.ReactNode, rightContent?: React.ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleBack = () => {
    triggerHaptic('tap');
    if (onBack) {
      onBack();
    } else {
      onNavigate('home');
    }
  };

  return (
    <>
      <nav 
        className="w-full shrink-0 flex items-center justify-between px-3.5 py-2.5 bg-[var(--surface-0)] z-40 relative pt-safe px-safe border-b border-[var(--border-subtle)]"
        style={{ 
          paddingTop: 'max(0.6rem, env(safe-area-inset-top, 0.6rem))', 
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))', 
          paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))' 
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" 
            onClick={handleBack}
            aria-label="Go Back"
            title="Go Back"
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          
          <button type="button" 
            onClick={() => onNavigate('home')}
            aria-label="PULSE Home"
            title="Go to Home"
            className="flex items-center cursor-pointer group p-0.5 shrink-0"
          >
            <div className="w-7 h-7 rounded-md bg-[var(--accent-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] transition-colors">
              <Activity size={15} className="stroke-[2.2]" />
            </div>
          </button>

          {title && (
            typeof title === 'string' ? (
              <span className="font-heading font-bold text-sm text-[var(--text-primary)] tracking-normal truncate ml-1">
                {title}
              </span>
            ) : (
              title
            )
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {rightContent}
          <button type="button"
            id="mobile-nav-settings-btn"
            onClick={() => {
              triggerHaptic('tap');
              setIsSettingsOpen(true);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('pulse_settings_open'));
              }
            }}
            aria-label="Settings"
            title="Settings"
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 cursor-pointer"
          >
            <Settings size={15} />
          </button>
        </div>
      </nav>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => {
          setIsSettingsOpen(false);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('pulse_settings_close'));
          }
        }} 
      />
    </>
  );
}

