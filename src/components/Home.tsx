import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight
} from 'lucide-react';
import { useReducedMotionPreference } from '../lib/settingsStore';
import { useAuthoritativeStats } from '../lib/useAuthoritativeStats';
import { useBaselineScale } from '../lib/useBaselineScale';
import { AssessmentHero3D } from './ui/AssessmentHero3D';
import { PageShell } from './layout/PageShell';

const HOME_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://pulse-lab.in/#website",
      "url": "https://pulse-lab.in/",
      "name": "PULSE",
      "alternateName": "Precision User Latency & Stimulus Evaluator",
      "description": "A browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond-resolution timing."
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
      "description": "A browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond-resolution timing.",
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
      "description": "A browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond-resolution timing.",
      "image": "https://pulse-lab.in/og-image.png",
      "isPartOf": { "@id": "https://pulse-lab.in/#website" },
      "about": { "@id": "https://pulse-lab.in/#organization" }
    }
  ]
};


export function Home() {
  const shouldReduceMotion = useReducedMotionPreference();
  const { testsCount, resultsCount, isLoadingResults } = useAuthoritativeStats();
  const { style: stageStyle } = useBaselineScale();

  // Format verified dynamic result count safely
  const displayResults = isLoadingResults ? (
    <span role="status" aria-label="Loading result count" className="inline-block w-8 h-5 bg-sky-200/50 animate-pulse motion-reduce:animate-none rounded my-0.5" />
  ) : typeof resultsCount === 'number' ? (
    resultsCount >= 1000 ? `${Math.floor(resultsCount / 1000)}K+` : String(resultsCount)
  ) : (
    '—'
  );

  return (
    <PageShell
      currentView="home"
      schema={HOME_SCHEMA}
      decorativeWaves="bottom"
      showFooter={false}
      style={stageStyle}
      contentClassName="h-[100dvh] overflow-x-hidden justify-center px-6 sm:px-8 xl:px-14 min-[2560px]:px-20 pb-4 sm:pb-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 xl:gap-10 min-[2560px]:gap-16 items-center w-full">
        {/* Left Column: Hero Copy, Shortcuts, CTA & Metrics */}
        <section aria-labelledby="hero-heading" className="flex flex-col justify-center w-full max-w-[420px] xl:max-w-[480px] min-[2560px]:max-w-[580px]">
          {/* Eyebrow Badge */}
          <div className={`mb-2.5 sm:mb-3 ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-1'}`}>
            <div className="inline-flex items-center rounded-full bg-[#E0F2FE] border border-[#7DD3FC] px-3.5 py-1 backdrop-blur-sm shadow-[0_2px_8px_rgba(2,132,199,0.08)]">
              <span className="text-[11px] sm:text-[11.5px] min-[2560px]:text-[12.5px] font-mono font-bold tracking-[0.2em] text-[#0284C7] uppercase">
                COGNITIVE BENCHMARKING
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 
            id="hero-heading"
            className={`font-heading text-3xl sm:text-4xl lg:text-[50px] min-[2560px]:text-[64px] font-extrabold tracking-tight leading-[1.08] min-[2560px]:leading-[1.05] mb-2 sm:mb-3 text-[#090D1A] text-balance ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-2'}`}
          >
            Measure<br />
            your <span className="text-[#0066FF]">mind.</span>
          </h1>

          {/* Subtitle */}
          <p className={`text-[#334155] text-xs sm:text-[13.5px] lg:text-[14px] min-[2560px]:text-[16.5px] font-medium leading-relaxed mb-5 sm:mb-6 max-w-[420px] min-[2560px]:max-w-[520px] ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-3'}`}>
            Test your reaction speed, memory and attention — right in your browser, with no account required.
          </p>

          {/* Primary CTA: Start Testing */}
          <div className="mb-5 sm:mb-6 flex flex-col items-start">
            <Link 
              to="/assessments"
              className="w-full max-w-[340px] sm:max-w-[360px] min-[2560px]:max-w-[420px] h-[50px] sm:h-[54px] min-[2560px]:h-[62px] rounded-full bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:from-[#005FE6] hover:to-[#0047B3] text-white font-semibold text-[15px] sm:text-[16px] min-[2560px]:text-[18px] shadow-[0_10px_25px_-5px_rgba(0,102,255,0.4),0_4px_10px_-2px_rgba(0,102,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]/60 focus-visible:ring-offset-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
            >
              <span>Start Testing</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Objection Remover Under CTA Button */}
            <div className="w-full max-w-[340px] sm:max-w-[360px] min-[2560px]:max-w-[420px] flex items-center justify-center gap-1.5 mt-2.5 text-[12px] sm:text-[12.5px] font-medium text-slate-600">
              <svg className="w-3.5 h-3.5 text-[#0066FF] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
              className="flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] rounded-lg active:opacity-75 transition-opacity"
              title={`${testsCount} available assessment batteries`}
            >
              <span className="font-heading font-extrabold text-[22px] sm:text-[24px] min-[2560px]:text-[28px] leading-tight text-[#090D1A] tracking-tight">
                {testsCount}
              </span>
              <span className="text-[12px] min-[2560px]:text-[13.5px] font-semibold text-[#1E293B] mt-0.5">
                Tests
              </span>
            </Link>

            {/* Divider */}
            <div className="absolute left-[33.33%] top-1/2 -translate-y-1/2 h-7 w-[1px] bg-[#BFDBFE]" aria-hidden="true" />

            {/* Col 2: Authoritative Dynamic Results Count */}
            <div
              className="flex flex-col items-center text-center"
              title="Count of public research result records in Firestore"
            >
              <span className="font-heading font-extrabold text-[22px] sm:text-[24px] min-[2560px]:text-[28px] leading-tight text-[#090D1A] tracking-tight flex items-center justify-center">
                {displayResults}
              </span>
              <span className="text-[12px] min-[2560px]:text-[13.5px] font-semibold text-[#1E293B] mt-0.5">
                Results
              </span>
            </div>

            {/* Divider */}
            <div className="absolute left-[66.66%] top-1/2 -translate-y-1/2 h-7 w-[1px] bg-[#BFDBFE]" aria-hidden="true" />

            {/* Col 3: Product-specific stat: Free / No sign-up */}
            <div
              className="flex flex-col items-center text-center"
              title="100% free with no account required"
            >
              <span className="font-heading font-extrabold text-[22px] sm:text-[24px] min-[2560px]:text-[28px] leading-tight text-[#090D1A] tracking-tight flex items-center justify-center">
                Free
              </span>
              <span className="text-[12px] min-[2560px]:text-[13.5px] font-semibold text-[#1E293B] mt-0.5 leading-tight">
                No sign-up
              </span>
            </div>
          </div>
        </section>

        {/* Right Column: 3D Protocol Carousel Stage */}
        <section aria-label="Assessment Protocols Showcase" className="w-full flex items-center justify-center min-h-0 py-2">
          <AssessmentHero3D />
        </section>
        </div>
    </PageShell>
  );
}
