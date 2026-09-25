import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Database, ArrowRight, ShieldCheck } from 'lucide-react';
import { Navbar } from './Navbar';
import { SEO } from './SEO';
import { APP_VERSION } from '../lib/version';
import { useReducedMotionPreference } from '../lib/settingsStore';
import { AssessmentHero3D } from './ui/AssessmentHero3D';
import { ProvenanceBadge } from './brand/ProvenanceBadge';

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

export function Home() {
  const shouldReduceMotion = useReducedMotionPreference();
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-[#08080A] text-[#F8FAFC] font-sans selection:bg-[#00F0FF]/30 overflow-x-hidden relative flex flex-col justify-between">
      {/* Accessibility: Skip to main content link */}
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
      
      {/* Top Navbar Header */}
      <Navbar currentView="home" />

      {/* Atmospheric Background Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Radial Ambient Glow */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] max-w-[1200px] max-h-[1200px] bg-[#00F0FF] opacity-[0.03] rounded-full blur-[120px]" />
        
        {/* Architectural Grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22%3E%3Cpath d=%22M0 30h60M30 0v60M0 0h60v60H0%22 stroke=%22rgba(255,255,255,0.02)%22 stroke-width=%221%22 fill=%22none%22/%3E%3C/svg%3E')] opacity-70" style={{ maskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)', WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)' }} />
      </div>

      {/* Main Hero Section */}
      <main 
        id="main-content" 
        tabIndex={-1} 
        className="w-full mx-auto flex-1 flex flex-col justify-center focus-visible:outline-none pt-8 pb-12"
      >
        {/* Top Typographic Section */}
        <div className="w-full max-w-5xl mx-auto px-6 flex flex-col items-center text-center z-20 pt-4 pb-2">
          <div className={`mb-6 ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-1'}`}>
             <ProvenanceBadge />
          </div>

          <h1 className={`font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-5 text-[#F8FAFC] max-w-4xl text-balance ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-2'}`}>
            PRECISION COGNITIVE BENCHMARKING.<br className="hidden sm:block"/> MILLISECOND LATENCY. STANDARDIZED TELEMETRY.
          </h1>

          <p className={`text-[#8A94A6] text-sm sm:text-base font-mono uppercase tracking-wider mb-2 ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-3'}`}>
            PULSE {APP_VERSION} / RESEARCH-GRADE NEURAL TELEMETRY
          </p>
        </div>

        {/* 3D Assessment Carousel */}
        <div className={`w-full z-10 ${shouldReduceMotion ? '' : 'animate-home-fade'}`}>
          <AssessmentHero3D />
        </div>

        {/* Bottom Action Section */}
        <div className="w-full max-w-5xl mx-auto px-6 flex flex-col items-center text-center z-20">
          <div className={shouldReduceMotion ? '' : 'animate-home-fade home-stagger-3'}>
            <button 
              onClick={() => navigate(ROUTES.ASSESSMENTS)}
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#00F0FF]/40 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00F0FF]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
              <span className="relative z-10 text-sm font-semibold tracking-wide text-white group-hover:text-[#00F0FF] transition-colors">
                EXPLORE ALL PROTOCOLS
              </span>
              <ArrowRight size={16} className="relative z-10 text-[#8A94A6] group-hover:text-[#00F0FF] group-hover:translate-x-1 transition-all duration-300" />
            </button>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer 
        className="w-full border-t border-[rgba(255,255,255,0.08)] bg-[#08080A]/80 backdrop-blur-md py-4 px-6 text-center text-xs text-[#525E70] font-mono flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 relative z-30"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center gap-2">
          <span>PULSE v{APP_VERSION}</span>
          <span aria-hidden="true">•</span>
          <span>Open Cognitive Benchmark</span>
        </div>
        <div className="flex items-center gap-6">
          <Link 
            to={ROUTES.PRIVACY}
            className="hover:text-[#F8FAFC] active:text-[#00F0FF] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00F0FF]"
          >
            Privacy
          </Link>
          <Link 
            to={ROUTES.DATASET}
            className="hover:text-[#F8FAFC] active:text-[#00F0FF] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00F0FF]"
          >
            Dataset
          </Link>
          <Link 
            to={ROUTES.IMPROVE}
            className="hover:text-[#F8FAFC] active:text-[#00F0FF] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00F0FF]"
          >
            Improve
          </Link>
        </div>
      </footer>
    </div>
  );
}
