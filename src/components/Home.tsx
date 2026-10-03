import React, { useState, Suspense } from 'react';
import { RefreshCw } from 'lucide-react';
import { SEO } from './SEO';
import { APP_VERSION } from '../lib/version';
import { useReducedMotionPreference } from '../lib/settingsStore';
import { AssessmentHero3D } from './ui/AssessmentHero3D';
import { ProvenanceBadge } from './brand/ProvenanceBadge';
import { DesktopPersistentNavigation } from './home/DesktopPersistentNavigation';

const HOME_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "PULSE — Precision User Latency & Stimulus Evaluator",
  "url": "https://pulse-lab.in",
  "description": "An open-source, browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond precision."
};

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
    <div className="min-h-screen bg-[#08080A] text-[#F8FAFC] font-sans selection:bg-[#00F0FF]/30 relative flex flex-col">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:bg-[#00F0FF] focus:text-black focus:font-semibold focus:text-xs focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
      >
        Skip to main content
      </a>

      <SEO 
        title="PULSE — Precision User Latency & Stimulus Evaluator"
        description="An open-source, browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond precision."
        schema={HOME_SCHEMA}
      />

      {/* Desktop Persistent Navigation */}
      <DesktopPersistentNavigation 
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={() => setIsWelcomeOpen(true)}
      />
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute top-[20%] left-[30%] -translate-x-1/2 w-[80vw] h-[80vw] max-w-[1200px] max-h-[1200px] bg-[#00F0FF] opacity-[0.03] rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22%3E%3Cpath d=%22M0 30h60M30 0v60M0 0h60v60H0%22 stroke=%22rgba(255,255,255,0.02)%22 stroke-width=%221%22 fill=%22none%22/%3E%3C/svg%3E')] opacity-70" style={{ maskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)', WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)' }} />
      </div>

      <main 
        id="main-content" 
        tabIndex={-1} 
        className="w-full max-w-[1600px] mx-auto flex-1 flex flex-col focus-visible:outline-none py-6 lg:py-8 px-6 sm:px-12 relative z-10"
      >
        <div className="flex flex-col w-full justify-center">
          <section id="hero" className="scroll-mt-24 pt-4 pb-6">
            <div className={`mb-6 ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-1'}`}>
               <ProvenanceBadge />
            </div>

            <h1 className={`font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-5 text-[#F8FAFC] max-w-4xl text-balance ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-2'}`}>
              PRECISION COGNITIVE BENCHMARKING.<br className="hidden sm:block"/> MILLISECOND LATENCY.<br className="hidden lg:block"/> STANDARDIZED TELEMETRY.
            </h1>

            <p className={`text-[#8A94A6] text-sm sm:text-base font-mono uppercase tracking-wider mb-8 ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-3'}`}>
              PULSE {APP_VERSION} / RESEARCH-GRADE NEURAL TELEMETRY
            </p>
          </section>

          {/* Dedicated Assessments Scene Anchor */}
          <section id="assessments" className="scroll-mt-24 w-full z-10 flex-1 min-h-[300px] flex flex-col py-4">
            <div className={`w-full flex-1 flex flex-col ${shouldReduceMotion ? '' : 'animate-home-fade'}`}>
              <AssessmentHero3D />
            </div>
          </section>

          {/* Stable Section Anchor Targets for Future Redesign Scenes */}
          <div id="proof" className="scroll-mt-24 pointer-events-none" aria-hidden="true" />
          <div id="problem" className="scroll-mt-24 pointer-events-none" aria-hidden="true" />
          <div id="result" className="scroll-mt-24 pointer-events-none" aria-hidden="true" />
          <div id="why-pulse" className="scroll-mt-24 pointer-events-none" aria-hidden="true" />
          <div id="how-it-works" className="scroll-mt-24 pointer-events-none" aria-hidden="true" />
          <div id="faq" className="scroll-mt-24 pointer-events-none" aria-hidden="true" />
          <div id="cta" className="scroll-mt-24 pointer-events-none" aria-hidden="true" />
        </div>
      </main>

      <Suspense fallback={<ModalLoadingFallback />}>
        {isSettingsOpen && <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
        {isWelcomeOpen && <WelcomeModal isOpen={isWelcomeOpen} onClose={() => setIsWelcomeOpen(false)} />}
      </Suspense>
    </div>
  );
}
