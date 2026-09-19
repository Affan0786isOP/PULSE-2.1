import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Database, ArrowRight, Trophy, ShieldCheck } from 'lucide-react';
import { Navbar } from './Navbar';
import { SEO } from './SEO';
import { APP_VERSION } from '../lib/version';
import { useReducedMotionPreference } from '../lib/settingsStore';

const HOME_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "PULSE — Precision User Latency & Stimulus Evaluator",
  "url": "https://pulse-lab.in",
  "description": "An open-source, browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond precision."
};

const ROUTES = {
  ASSESSMENTS: '/assessments',
  LEADERBOARD: '/leaderboard',
  DATASET: '/dataset',
  IMPROVE: '/improve',
  PRIVACY: '/privacy',
} as const;

interface HomeNavCard {
  to: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const HOME_NAV_CARDS: readonly HomeNavCard[] = [
  {
    to: ROUTES.LEADERBOARD,
    label: 'Leaderboard',
    description: 'Verified cohort rankings',
    icon: Trophy,
  },
  {
    to: ROUTES.DATASET,
    label: 'Research Dataset',
    description: 'Population telemetry & observations',
    icon: Database,
  },
  {
    to: ROUTES.IMPROVE,
    label: 'Improve',
    description: 'Factors that can affect reaction performance',
    icon: Zap,
  },
  {
    to: ROUTES.PRIVACY,
    label: 'Privacy Policy',
    description: 'Research data ethics & anonymization',
    icon: ShieldCheck,
  },
];

export function Home() {
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <div className="min-h-[100dvh] bg-transparent text-[var(--text-main)] font-sans selection:bg-cyan-500/30 overflow-x-hidden relative flex flex-col justify-between">
      {/* Accessibility: Skip to main content link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-white dark:focus:text-slate-950 focus:font-semibold focus:text-xs focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      >
        Skip to main content
      </a>

      <SEO 
        title="PULSE — Precision User Latency & Stimulus Evaluator"
        description="An open-source, browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond precision."
        schema={HOME_SCHEMA}
      />
      {/* Top Navbar Header */}
      <Navbar currentView="home" />

      {/* Main Hero Section */}
      <main 
        id="main-content" 
        tabIndex={-1} 
        className="w-full max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-10 flex-1 flex flex-col justify-center py-8 lg:py-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg"
      >
        
        <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] items-center gap-10 lg:gap-14 my-auto">
          
          {/* Left Column: Tag, Headline, Description, Button */}
          <div className="w-full flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Top Tag */}
            <div className={`flex flex-wrap items-center justify-center lg:justify-start gap-2.5 mb-5 ${shouldReduceMotion ? '' : 'animate-home-fade'}`}>
              <div className="inline-flex items-center gap-2 px-3 min-h-[1.75rem] py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)] text-xs font-medium">
                <span>Cognitive reaction &amp; memory assessments</span>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className={`font-heading text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-[-0.03em] leading-[1.12] mb-5 text-[var(--text-primary)] break-words ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-1'}`}>
              Measure your reaction time and cognitive performance.
            </h1>

            {/* Description Paragraph - Aligned with actual protocols */}
            <p className={`text-[var(--text-secondary)] text-base sm:text-lg max-w-xl font-normal leading-relaxed text-center lg:text-left mb-8 ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-2'}`}>
              PULSE evaluates visual reaction latency, directional choice speed, and working memory through research-informed assessment protocols.
            </p>

            {/* Primary Action Button - Standard robust link supporting modifier clicks */}
            <div className={`flex items-center gap-3 ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-3'}`}>
              <Link 
                to={ROUTES.ASSESSMENTS}
                id="start-lab-btn"
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] text-white dark:text-slate-950 font-semibold text-sm px-6 py-3.5 rounded-md inline-flex items-center justify-center gap-2.5 cursor-pointer max-w-full transition-[background-color,transform,box-shadow] duration-150 motion-reduce:transition-none shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-0)]"
              >
                <span>Start assessments</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Right Column: Navigation Cards - Native accessible links */}
          <div className="w-full max-w-[360px] flex flex-col gap-2.5 shrink-0 mx-auto lg:mx-0">
            {HOME_NAV_CARDS.map((card, idx) => {
              const Icon = card.icon;
              const staggerClass = `home-stagger-${idx + 1}`;
              return (
                <div key={card.to} className={shouldReduceMotion ? '' : `animate-home-fade ${staggerClass}`}>
                  <Link
                    to={card.to}
                    className="w-full text-left bg-[var(--surface-1)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg p-3.5 sm:p-4 flex items-center justify-between transition-[background-color,border-color] duration-150 motion-reduce:transition-none group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-md bg-[var(--surface-2)] group-hover:bg-[var(--surface-3)] border border-[var(--border-subtle)] group-hover:border-[var(--accent)]/30 flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--accent)] shrink-0 transition-colors duration-150 motion-reduce:transition-none">
                        <Icon size={18} aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-[var(--text-primary)] leading-snug">
                          {card.label}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                          {card.description}
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={15} aria-hidden="true" className="text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-[color,transform] duration-150 motion-reduce:transition-none motion-reduce:transform-none shrink-0 ml-2" />
                  </Link>
                </div>
              );
            })}
          </div>

        </div>
      </main>

      {/* Minimal Footer */}
      <footer 
        className="w-full border-t border-[var(--border-subtle)] py-4 px-4 sm:px-6 lg:px-10 text-center text-xs text-[var(--text-secondary)] font-mono flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center gap-2">
          <span>PULSE v{APP_VERSION}</span>
          <span aria-hidden="true">•</span>
          <span>Open Cognitive Benchmark</span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to={ROUTES.PRIVACY}
            className="hover:text-[var(--text-primary)] active:text-[var(--accent)] active:opacity-80 transition-colors cursor-pointer rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Privacy
          </Link>
          <Link 
            to={ROUTES.DATASET}
            className="hover:text-[var(--text-primary)] active:text-[var(--accent)] active:opacity-80 transition-colors cursor-pointer rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Dataset
          </Link>
        </div>
      </footer>
    </div>
  );
}

