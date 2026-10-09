import React from 'react';
import { Link } from 'react-router-dom';
import { PulseLogo } from './brand';
import { ShieldCheck, Activity, Terminal, GitBranch, Heart } from 'lucide-react';
import { APP_VERSION } from '../lib/version';

interface FooterProps {
  onOpenSettings?: () => void;
  onOpenWelcome?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSettings, onOpenWelcome }) => {
  return (
    <footer 
      aria-label="PULSE Platform Footer"
      className="w-full border-t border-[var(--border-subtle)] bg-[var(--surface-0)]/90 text-[var(--text-secondary)] font-sans relative z-20 backdrop-blur-md shrink-0"
    >
      <div className="max-w-[1600px] mx-auto px-6 sm:px-12 py-10 sm:py-12 flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Mission */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)]">
                <PulseLogo variant="mark" size={18} color="var(--accent)" />
              </div>
              <span className="font-heading font-bold text-lg tracking-widest text-[var(--text-primary)]">
                PULSE
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-muted)] uppercase">
                {APP_VERSION}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-md">
              Precision User Latency &amp; Stimulus Evaluator. A telemetry engine that benchmarks sensory reaction, cognitive conflict, and working memory in modern browsers with sub-millisecond precision.
            </p>
            <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-muted)] pt-1">
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Telemetric Engine Active
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={13} className="text-[var(--accent)]" />
                Sub-Frame Delta Sync
              </span>
            </div>
          </div>

          {/* Protocols Navigation */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Protocols &amp; Data
            </h4>
            <nav className="flex flex-col gap-2 text-xs">
              <Link to="/about" className="hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] rounded-xs w-fit">
                About PULSE
              </Link>
              <Link to="/assessments" className="hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] rounded-xs w-fit">
                Cognitive Battery
              </Link>
              <Link to="/leaderboard" className="hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] rounded-xs w-fit">
                Global Leaderboard
              </Link>
              <Link to="/dataset" className="hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] rounded-xs w-fit">
                Open Telemetry Dataset
              </Link>
              <Link to="/improve" className="hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] rounded-xs w-fit">
                Optimization Guide
              </Link>
            </nav>
          </div>

          {/* Scientific Transparency & System */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
              System &amp; Ethics
            </h4>
            <nav className="flex flex-col gap-2 text-xs">
              <Link to="/privacy" className="hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] rounded-xs w-fit">
                Research Ethics &amp; Privacy
              </Link>
              {onOpenSettings && (
                <button 
                  type="button" 
                  onClick={onOpenSettings}
                  className="text-left hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] rounded-xs w-fit cursor-pointer"
                >
                  Hardware Calibration
                </button>
              )}
              {onOpenWelcome && (
                <button 
                  type="button" 
                  onClick={onOpenWelcome}
                  className="text-left hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] rounded-xs w-fit cursor-pointer"
                >
                  Architecture Overview
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[var(--border-subtle)]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[var(--text-muted)] font-mono">
          <div>
            &copy; {new Date().getFullYear()} PULSE Research Initiative. No ads or data sales.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              Standardized Open Science
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
