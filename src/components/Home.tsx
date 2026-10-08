import React, { useState, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ShieldCheck, Trophy, Folder, Activity, Settings, Info, RefreshCw, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';
import { SEO } from './SEO';
import { APP_VERSION } from '../lib/version';
import { useReducedMotionPreference } from '../lib/settingsStore';
import { AssessmentHero3D } from './ui/AssessmentHero3D';
import { WhatIsPulseScene } from './home/WhatIsPulseScene';
import { ProvenanceBadge } from './brand/ProvenanceBadge';
import { PulseLogo } from './brand';

const HOME_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://www.pulse-lab.in/#website",
      "url": "https://www.pulse-lab.in/",
      "name": "PULSE",
      "alternateName": "Precision User Latency & Stimulus Evaluator",
      "description": "An open-source, browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond precision."
    },
    {
      "@type": "Organization",
      "@id": "https://www.pulse-lab.in/#organization",
      "name": "PULSE",
      "alternateName": "Precision User Latency & Stimulus Evaluator",
      "url": "https://www.pulse-lab.in/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.pulse-lab.in/icon-512.png",
        "width": 512,
        "height": 512
      },
      "sameAs": ["https://github.com/Affan0786isOP/PULSE-2.1"]
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://www.pulse-lab.in/#software",
      "name": "PULSE",
      "description": "An open-source, browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond precision.",
      "url": "https://www.pulse-lab.in/",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "url": "https://www.pulse-lab.in/"
      },
      "featureList": [
        "Visual Reaction Test",
        "Directional Choice Test",
        "Colour Recognition Test",
        "Block Memory Test",
        "Number Memory Test"
      ]
    },
    {
      "@type": "WebPage",
      "@id": "https://www.pulse-lab.in/#webpage",
      "url": "https://www.pulse-lab.in/",
      "name": "PULSE — Precision User Latency & Stimulus Evaluator",
      "description": "An open-source, browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond precision.",
      "image": "https://www.pulse-lab.in/og-image.png",
      "isPartOf": { "@id": "https://www.pulse-lab.in/#website" },
      "about": { "@id": "https://www.pulse-lab.in/#organization" }
    }
  ]
};

const ROUTES = {
  ABOUT: '/about',
  ASSESSMENTS: '/assessments',
  LEADERBOARD: '/leaderboard',
  DATASET: '/dataset',
  IMPROVE: '/improve',
  PRIVACY: '/privacy',
} as const;

const SettingsModal = React.lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const WelcomeModal = React.lazy(() => import('./WelcomeModal').then(m => ({ default: m.WelcomeModal })));

const ModalLoadingFallback = () => (
  <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
    <div className="p-3 rounded-xl bg-[var(--surface-1)]/95 backdrop-blur-md border border-[var(--border-subtle)] flex items-center gap-2.5 text-xs text-[var(--text-secondary)] font-mono pointer-events-auto">
      <RefreshCw size={14} className="animate-spin text-[var(--accent)]" aria-hidden="true" />
      <span>Loading dialog...</span>
    </div>
  </div>
);

export function Home() {
  const shouldReduceMotion = useReducedMotionPreference();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-subtle)] overflow-x-hidden relative flex flex-col">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-slate-950 focus:font-semibold focus:text-xs focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
      >
        Skip to main content
      </a>

      <SEO 
        title="PULSE — Precision User Latency & Stimulus Evaluator"
        description="An open-source, browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond precision."
        schema={HOME_SCHEMA}
      />
      
      {/* Background Ambience Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute top-[15%] left-[25%] -translate-x-1/2 w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] bg-[var(--accent)] opacity-[0.03] rounded-full blur-[140px]" />
      </div>

      {/* Main Viewport Container */}
      <main 
        id="main-content" 
        tabIndex={-1} 
        className="w-full max-w-[1600px] mx-auto h-[100dvh] min-h-0 flex-none grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(240px,290px)] gap-8 lg:gap-12 focus-visible:outline-none py-6 sm:py-8 lg:py-10 px-6 sm:px-12 relative z-10 overflow-hidden"
      >
        {/* Left Column: Hero & Interactive Protocol Showcase */}
        <section aria-labelledby="hero-heading" className="flex flex-col w-full justify-between min-h-0">
          <div className="flex flex-col">
            <div className={`mb-5 sm:mb-6 ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-1'}`}>
              <ProvenanceBadge label="RESEARCH TELEMETRY" />
            </div>

            <h1 
              id="hero-heading"
              className={`font-heading text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.06] mb-4 text-[var(--text-primary)] max-w-4xl text-balance ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-2'}`}
            >
              PRECISION COGNITIVE BENCHMARKING.<br className="hidden sm:block"/>
              MILLISECOND LATENCY.<br className="hidden lg:block"/>
              STANDARDIZED TELEMETRY.
            </h1>

            <p className={`text-[var(--text-secondary)] text-xs sm:text-sm font-mono uppercase tracking-wider mb-8 sm:mb-10 max-w-2xl leading-relaxed ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-3'}`}>
              PULSE {APP_VERSION} &bull; Web Audio timestamp synchronization, input poll compensation &amp; anonymized open research dataset
            </p>
          </div>

          {/* 3D Protocol Carousel Stage */}
          <div className={`w-full z-10 flex-1 my-4 sm:my-6 flex flex-col justify-center ${shouldReduceMotion ? '' : 'animate-home-fade'}`}>
            <AssessmentHero3D />
          </div>

          {/* Fast Spec Callouts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 sm:pt-8 border-t border-[var(--border-subtle)] mt-6 sm:mt-8">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Timestamping</span>
              <span className="font-heading font-semibold text-sm sm:text-base text-[var(--text-primary)] mt-0.5">High-Res Monotonic</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Frame Alignment</span>
              <span className="font-heading font-semibold text-sm sm:text-base text-[var(--text-primary)] mt-0.5">Refresh Rate Calibrated</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Data Ethics</span>
              <span className="font-heading font-semibold text-sm sm:text-base text-[var(--text-primary)] mt-0.5">Zero PII Collected</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Test Battery</span>
              <span className="font-heading font-semibold text-sm sm:text-base text-[var(--text-primary)] mt-0.5">5 Standardized Tests</span>
            </div>
          </div>
        </section>

        {/* Right Column: Navigation Rail */}
        <aside 
          aria-label="Navigation and system rail"
          className="w-full flex flex-col pt-6 lg:pt-2 lg:pl-8 lg:border-l lg:border-[var(--border-subtle)] relative z-20"
        >
          {/* Brand Mark */}
          <div className="flex items-center gap-3 mb-8 sm:mb-10">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] transition-colors">
              <PulseLogo variant="mark" size={22} color="var(--accent)" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-xl tracking-widest text-[var(--text-primary)] leading-tight">
                PULSE
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                Benchmarking Lab
              </span>
            </div>
          </div>

          {/* Primary Modules */}
          <nav aria-label="Main Modules" className="flex flex-col gap-1.5 mb-10">
            <h3 className="text-[10.5px] font-mono font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-2 pl-2.5">
              Research Modules
            </h3>
            <Link 
              to={ROUTES.ABOUT} 
              className="group flex items-center justify-between p-3 rounded-xl bg-[var(--surface-1)]/60 hover:bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <div className="flex items-center gap-3">
                <Info size={17} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] tracking-wide">About Platform</span>
              </div>
              <ArrowRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link 
              to={ROUTES.ASSESSMENTS} 
              className="group flex items-center justify-between p-3 rounded-xl bg-[var(--surface-1)]/60 hover:bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <div className="flex items-center gap-3">
                <Activity size={17} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] tracking-wide">Assessments</span>
              </div>
              <ArrowRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link 
              to={ROUTES.LEADERBOARD} 
              className="group flex items-center justify-between p-3 rounded-xl bg-[var(--surface-1)]/60 hover:bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <div className="flex items-center gap-3">
                <Trophy size={17} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] tracking-wide">Leaderboard</span>
              </div>
              <ArrowRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link 
              to={ROUTES.DATASET} 
              className="group flex items-center justify-between p-3 rounded-xl bg-[var(--surface-1)]/60 hover:bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <div className="flex items-center gap-3">
                <Folder size={17} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] tracking-wide">Open Dataset</span>
              </div>
              <ArrowRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link 
              to={ROUTES.IMPROVE} 
              className="group flex items-center justify-between p-3 rounded-xl bg-[var(--surface-1)]/60 hover:bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <div className="flex items-center gap-3">
                <Zap size={17} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] tracking-wide">Performance Guide</span>
              </div>
              <ArrowRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link 
              to={ROUTES.PRIVACY} 
              className="group flex items-center justify-between p-3 rounded-xl bg-[var(--surface-1)]/60 hover:bg-[var(--surface-1)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={17} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] tracking-wide">Research Ethics</span>
              </div>
              <ArrowRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </nav>

          {/* System Calibration & Info */}
          <nav aria-label="System Tools" className="flex flex-col gap-1.5 mt-auto pt-6 border-t border-[var(--border-subtle)]">
            <h3 className="text-[10.5px] font-mono font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-2 pl-2.5">
              Instrumentation
            </h3>
            <button 
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="group flex items-center justify-between p-3 rounded-xl hover:bg-[var(--surface-1)] border border-transparent hover:border-[var(--border-subtle)] transition-all active:scale-[0.98] text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <div className="flex items-center gap-3">
                <Settings size={17} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  Settings &amp; Calibration
                </span>
              </div>
            </button>
            <button 
              type="button"
              onClick={() => setIsWelcomeOpen(true)}
              className="group flex items-center justify-between p-3 rounded-xl hover:bg-[var(--surface-1)] border border-transparent hover:border-[var(--border-subtle)] transition-all active:scale-[0.98] text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <div className="flex items-center gap-3">
                <Info size={17} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  Protocol Overview
                </span>
              </div>
            </button>
          </nav>
        </aside>
      </main>

      <WhatIsPulseScene />

      <Suspense fallback={<ModalLoadingFallback />}>
        {isSettingsOpen && <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
        {isWelcomeOpen && <WelcomeModal isOpen={isWelcomeOpen} onClose={() => setIsWelcomeOpen(false)} />}
      </Suspense>
    </div>
  );
}
