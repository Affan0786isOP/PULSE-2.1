import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight
} from 'lucide-react';
import { useReducedMotionPreference } from '../lib/settingsStore';
import { useAuthoritativeStats } from '../lib/useAuthoritativeStats';
import { useBaselineScale } from '../lib/useBaselineScale';
import { AnimatedResultCount } from './ui/AnimatedResultCount';
import { AssessmentHero3D } from './ui/AssessmentHero3D';
import { PageShell } from './layout/PageShell';

// Narrative Scenes below the fold
import { ResultScene } from './home/ResultScene';
import { ProblemScene } from './home/ProblemScene';
import { FAQScene } from './home/FAQScene';
import { FinalCTAScene } from './home/FinalCTAScene';
import { HomeFooter } from './home/HomeFooter';

const HOME_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://pulse-lab.in/#website",
      "url": "https://pulse-lab.in/",
      "name": "PULSE",
      "alternateName": "Precision User Latency & Stimulus Evaluator",
      "description": "A browser-based set of short behavioral tests for reaction speed, choice response, colour recognition, and memory. Results are descriptive, not diagnostic."
    },
    {
      "@type": "Organization",
      "@id": "https://pulse-lab.in/#organization",
      "name": "PULSE",
      "alternateName": "Precision User Latency & Stimulus Evaluator",
      "url": "https://pulse-lab.in/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://pulse-lab.in/icon-512.png",
        "width": 512,
        "height": 512
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://pulse-lab.in/#software",
      "name": "PULSE",
      "description": "A browser-based set of short behavioral tests for reaction speed, choice response, colour recognition, and memory. Results are descriptive, not diagnostic.",
      "url": "https://pulse-lab.in/",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "url": "https://pulse-lab.in/"
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
      "@id": "https://pulse-lab.in/#webpage",
      "url": "https://pulse-lab.in/",
      "name": "PULSE — Precision User Latency & Stimulus Evaluator",
      "description": "A browser-based set of short behavioral tests for reaction speed, choice response, colour recognition, and memory. Results are descriptive, not diagnostic.",
      "image": "https://pulse-lab.in/og-image.png",
      "isPartOf": { "@id": "https://pulse-lab.in/#website" },
      "about": { "@id": "https://pulse-lab.in/#organization" }
    }
  ]
};

export function Home() {
  const shouldReduceMotion = useReducedMotionPreference();
  const { testsCount, resultsCount, isLoadingResults } = useAuthoritativeStats();
  const { scale } = useBaselineScale();
  const [viewportHeight, setViewportHeight] = React.useState<number>(() => typeof window !== 'undefined' ? window.innerHeight : 900);

  React.useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const heroStyle: React.CSSProperties = typeof window !== 'undefined' && window.innerWidth >= 768
    ? {
        minHeight: `${(viewportHeight / scale) - 88}px`,
        height: `${(viewportHeight / scale) - 88}px`,
      }
    : {};

  return (
    <PageShell
      enableScaling
      currentView="home"
      schema={HOME_SCHEMA}
      decorativeWaves="bottom"
      showFooter={false}
      contentClassName="min-h-[100dvh] overflow-x-hidden justify-start px-6 sm:px-8 xl:px-14 min-[2560px]:px-20 pb-4 sm:pb-6"
    >
      {/* 01 — Hero Stage (Preserved Intact) */}
      <section 
        id="hero"
        aria-label="Homepage Hero"
        style={heroStyle}
        className="min-h-[calc(100dvh-5rem)] md:min-h-0 flex items-center w-full"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 xl:gap-10 min-[2560px]:gap-16 items-center w-full">
          {/* Left Column: Hero Copy, Shortcuts, CTA & Metrics */}
          <div aria-labelledby="hero-heading" className="flex flex-col justify-center w-full max-w-[420px] xl:max-w-[480px] min-[2560px]:max-w-[580px]">
            {/* Headline */}
            <h1 
              id="hero-heading"
              className={`font-heading text-3xl sm:text-4xl lg:text-[50px] min-[2560px]:text-[64px] font-extrabold tracking-tight leading-[1.08] min-[2560px]:leading-[1.05] mb-2 sm:mb-3 text-[#090D1A] dark:text-white text-balance ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-2'}`}
            >
              Measure<br />
              your <span className="text-[#0066FF] dark:text-[#22C7D6]">mind.</span>
            </h1>

            {/* Subtitle */}
            <p className={`text-[#334155] dark:text-slate-300 text-xs sm:text-[13.5px] lg:text-[14px] min-[2560px]:text-[16.5px] font-medium leading-relaxed mb-5 sm:mb-6 max-w-[420px] min-[2560px]:max-w-[520px] ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-3'}`}>
              Test your reaction speed, memory, and attention right in your browser, with no account required.
            </p>

            {/* Primary CTA: Start Testing */}
            <div className="mb-5 sm:mb-6 flex flex-col items-start">
              <Link 
                to="/assessments"
                className="w-full max-w-[340px] sm:max-w-[360px] min-[2560px]:max-w-[420px] h-[48px] sm:h-[50px] min-[2560px]:h-[56px] rounded-xl bg-[#090D1A] hover:bg-[#1E293B] dark:bg-white dark:hover:bg-slate-100 text-white dark:text-[#090D1A] font-semibold text-[14.5px] sm:text-[15px] min-[2560px]:text-[17px] border border-slate-900/10 dark:border-white/20 shadow-sm hover:shadow active:scale-[0.985] transition-all duration-200 flex items-center justify-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6]"
              >
                <span>Start Testing</span>
                <ArrowRight size={16} strokeWidth={2.2} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* Objection Remover Under CTA Button */}
              <div className="w-full max-w-[340px] sm:max-w-[360px] min-[2560px]:max-w-[420px] flex items-center justify-center gap-1.5 mt-2.5 text-[12px] sm:text-[12.5px] font-medium text-slate-600 dark:text-slate-400">
                <svg className="w-3.5 h-3.5 text-[#0066FF] dark:text-[#22C7D6] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Free, no sign-up required</span>
              </div>
            </div>

            {/* Metrics Row (3 Distinct Stats: Tests, Results, Free / No sign-up) */}
            <div className="w-full max-w-[340px] sm:max-w-[360px] min-[2560px]:max-w-[420px] grid grid-cols-3 items-center py-1.5 relative">
              {/* Col 1: Canonical Tests */}
              <Link 
                to="/assessments"
                aria-label={`View ${testsCount} available tests`}
                className="flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] dark:focus-visible:ring-[#22C7D6] rounded-lg active:opacity-75 transition-opacity"
                title={`${testsCount} available assessment batteries`}
              >
                <span className="font-heading font-extrabold text-[22px] sm:text-[24px] min-[2560px]:text-[28px] leading-tight text-[#090D1A] dark:text-white tracking-tight">
                  {testsCount}
                </span>
                <span className="text-[12px] min-[2560px]:text-[13.5px] font-semibold text-[#1E293B] dark:text-slate-300 mt-0.5">
                  Tests
                </span>
              </Link>

              {/* Divider */}
              <div className="absolute left-[33.33%] top-1/2 -translate-y-1/2 h-7 w-[1px] bg-[#BFDBFE] dark:bg-slate-700" aria-hidden="true" />

              {/* Col 2: Authoritative Dynamic Results Count */}
              <div
                className="flex flex-col items-center text-center"
                title="Count of public research result records in Firestore"
              >
                <span className="font-heading font-extrabold text-[22px] sm:text-[24px] min-[2560px]:text-[28px] leading-tight text-[#090D1A] dark:text-white tracking-tight flex items-center justify-center min-h-[28px]">
                  <AnimatedResultCount value={resultsCount} isLoading={isLoadingResults} />
                </span>
                <span className="text-[12px] min-[2560px]:text-[13.5px] font-semibold text-[#1E293B] dark:text-slate-300 mt-0.5">
                  Results
                </span>
              </div>

              {/* Divider */}
              <div className="absolute left-[66.66%] top-1/2 -translate-y-1/2 h-7 w-[1px] bg-[#BFDBFE] dark:bg-slate-700" aria-hidden="true" />

              {/* Col 3: Product-specific stat: Free / No sign-up */}
              <div
                className="flex flex-col items-center text-center"
                title="100% free with no account required"
              >
                <span className="font-heading font-extrabold text-[22px] sm:text-[24px] min-[2560px]:text-[28px] leading-tight text-[#090D1A] dark:text-white tracking-tight flex items-center justify-center">
                  Free
                </span>
                <span className="text-[12px] min-[2560px]:text-[13.5px] font-semibold text-[#1E293B] dark:text-slate-300 mt-0.5 leading-tight">
                  No sign-up
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Protocol Carousel Stage */}
          <section aria-label="Assessment Protocols Showcase" className="w-full flex items-center justify-center min-h-0 py-2">
            <AssessmentHero3D />
          </section>
        </div>
      </section>

      {/* 02 — See a sample result */}
      <ResultScene />

      {/* 03 — How it works, with concise measurement limits */}
      <ProblemScene />

      {/* 04 — Essential questions */}
      <FAQScene />

      {/* 05 — Final action */}
      <FinalCTAScene />

      {/* 06 — Footer and useful links */}
      <HomeFooter />
    </PageShell>
  );
}
