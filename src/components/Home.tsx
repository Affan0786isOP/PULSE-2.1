import React, { useState, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { 
  Info, 
  Settings, 
  ArrowRight, 
  RefreshCw,
  Download
} from 'lucide-react';
import { SEO } from './SEO';
import { useReducedMotionPreference } from '../lib/settingsStore';
import { usePwaInstall } from '../lib/usePwaInstall';
import { useAuthoritativeStats } from '../lib/useAuthoritativeStats';
import { AssessmentHero3D } from './ui/AssessmentHero3D';
import { DesktopWaveGraphic } from './home/DesktopWaveGraphic';
import { PulseLogo } from './brand';

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

const SettingsModal = React.lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const WelcomeModal = React.lazy(() => import('./WelcomeModal').then(m => ({ default: m.WelcomeModal })));
const AddToHomeScreenModal = React.lazy(() => import('./AddToHomeScreenModal').then(m => ({ default: m.AddToHomeScreenModal })));

const ModalLoadingFallback = () => (
  <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
    <div className="p-3 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 flex items-center gap-2.5 text-xs text-slate-700 font-mono pointer-events-auto shadow-lg">
      <RefreshCw size={14} className="animate-spin text-[#0066FF]" aria-hidden="true" />
      <span>Loading dialog...</span>
    </div>
  </div>
);

export function Home() {
  const shouldReduceMotion = useReducedMotionPreference();
  const pwa = usePwaInstall();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const { testsCount, resultsCount, isLoadingResults } = useAuthoritativeStats();

  // Pixel-perfect uniform scaling based on 1280x720 baseline for screens >= 768px
  const [desktopScale, setDesktopScale] = useState(1);

  React.useEffect(() => {
    const updateScale = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w >= 768) {
        // Uniform aspect scaling to ensure exact 720p visual proportion fits perfectly on any screen
        const scale = Math.min(w / 1280, h / 720);
        setDesktopScale(scale);
      } else {
        setDesktopScale(1);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale, { passive: true });
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Format verified dynamic result count safely
  const displayResults = isLoadingResults ? (
    <span role="status" aria-label="Loading result count" className="inline-block w-8 h-5 bg-sky-200/50 animate-pulse motion-reduce:animate-none rounded my-0.5" />
  ) : typeof resultsCount === 'number' ? (
    resultsCount >= 1000 ? `${Math.floor(resultsCount / 1000)}K+` : String(resultsCount)
  ) : (
    '—'
  );

  return (
    <div 
      style={desktopScale !== 1 ? { zoom: desktopScale, minHeight: `calc(100dvh / ${desktopScale})` } : undefined}
      className="min-h-[100dvh] w-full bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD] text-[#090D1A] font-sans selection:bg-[#0066FF]/20 overflow-x-hidden relative flex flex-col justify-between"
    >
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:bg-[#0066FF] focus:text-white focus:font-semibold focus:text-xs focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0066FF]/60"
      >
        Skip to main content
      </a>

      <SEO 
        title="PULSE — Precision User Latency & Stimulus Evaluator"
        description="A browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond-resolution timing."
        schema={HOME_SCHEMA}
      />
      
      {/* Background Subtle Dot-Matrix Grid */}
      <div 
        className="absolute inset-0 pointer-events-none select-none z-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(rgba(0, 102, 255, 0.12) 1.2px, transparent 1.2px)',
          backgroundSize: '36px 36px',
        }}
        aria-hidden="true"
      />

      {/* Top Navigation Bar */}
      <header className="relative z-30 w-full max-w-[1440px] min-[2560px]:max-w-[1800px] mx-auto px-6 sm:px-10 lg:px-14 min-[2560px]:px-20 h-14 sm:h-16 min-[2560px]:h-20 flex items-center justify-between shrink-0">
        {/* Brand Lockup */}
        <Link 
          to="/"
          className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] rounded-lg"
          aria-label="PULSE Home"
        >
          <PulseLogo variant="horizontal" size={30} color="#0066FF" textColor="#090D1A" />
        </Link>

        {/* Center Main Links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-6 lg:gap-8 min-[2560px]:gap-10">
          <Link 
            to="/assessments" 
            className="text-[13.5px] lg:text-[14.5px] min-[2560px]:text-[16px] font-medium text-[#475569] hover:text-[#090D1A] transition-colors"
          >
            Assessments
          </Link>
          <Link 
            to="/leaderboard" 
            className="text-[13.5px] lg:text-[14.5px] min-[2560px]:text-[16px] font-medium text-[#475569] hover:text-[#090D1A] transition-colors"
          >
            Leaderboard
          </Link>
          <Link 
            to="/dataset" 
            className="text-[13.5px] lg:text-[14.5px] min-[2560px]:text-[16px] font-medium text-[#475569] hover:text-[#090D1A] transition-colors"
          >
            Dataset
          </Link>
          <Link 
            to="/analytics" 
            className="text-[13.5px] lg:text-[14.5px] min-[2560px]:text-[16px] font-medium text-[#475569] hover:text-[#090D1A] transition-colors"
          >
            Analytics
          </Link>
          <Link 
            to="/about" 
            className="text-[13.5px] lg:text-[14.5px] min-[2560px]:text-[16px] font-medium text-[#475569] hover:text-[#090D1A] transition-colors"
          >
            About
          </Link>
        </nav>

        {/* Right Info, Settings & Install Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {pwa.isInstallable && (
            <button
              type="button"
              id="desktop-install-app-btn"
              onClick={() => {
                if (pwa.hasNativePrompt) {
                  pwa.promptInstall();
                } else {
                  pwa.openInstallGuide();
                }
              }}
              aria-label="Install App"
              className="flex items-center gap-2 px-3 sm:px-3.5 min-[2560px]:px-4 py-1.5 sm:py-2 min-[2560px]:py-2.5 rounded-full border border-sky-200/90 bg-sky-50/70 hover:bg-sky-100/90 text-[#0066FF] text-xs sm:text-[13px] min-[2560px]:text-[14px] font-medium shadow-[0_2px_6px_rgba(0,102,255,0.06)] hover:shadow-sm active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] shrink-0"
            >
              <Download size={14} strokeWidth={2.4} className="text-[#0066FF] shrink-0" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsWelcomeOpen(true)}
            aria-label="Platform Information"
            title="Platform Information"
            className="flex items-center gap-1.5 px-3 sm:px-3.5 min-[2560px]:px-4 py-1.5 sm:py-2 min-[2560px]:py-2.5 rounded-full border border-slate-200/90 bg-white/85 hover:bg-white text-slate-700 hover:text-[#0066FF] text-xs sm:text-[13px] min-[2560px]:text-[14px] font-medium shadow-[0_2px_6px_rgba(0,0,0,0.03)] hover:shadow-sm active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
          >
            <Info size={15} strokeWidth={2.2} />
            <span className="hidden sm:inline">Info</span>
          </button>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
            title="Application Settings"
            className="flex items-center gap-1.5 px-3 sm:px-3.5 min-[2560px]:px-4 py-1.5 sm:py-2 min-[2560px]:py-2.5 rounded-full border border-slate-200/90 bg-white/85 hover:bg-white text-slate-700 hover:text-[#090D1A] text-xs sm:text-[13px] min-[2560px]:text-[14px] font-medium shadow-[0_2px_6px_rgba(0,0,0,0.03)] hover:shadow-sm active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]"
          >
            <Settings size={15} strokeWidth={2.2} />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main 
        id="main-content" 
        tabIndex={-1} 
        className="w-full max-w-[1440px] min-[2560px]:max-w-[1800px] mx-auto flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 xl:gap-10 min-[2560px]:gap-16 items-center px-6 sm:px-8 xl:px-14 min-[2560px]:px-20 relative z-10 focus-visible:outline-none my-auto pb-2 sm:pb-4"
      >
        {/* Left Column: Hero Copy, Shortcuts, CTA & Metrics */}
        <section aria-labelledby="hero-heading" className="flex flex-col justify-center w-full max-w-[420px] xl:max-w-[480px] min-[2560px]:max-w-[580px]">
          {/* Eyebrow Badge */}
          <div className={`mb-2.5 sm:mb-3 ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-1'}`}>
            <div className="inline-flex items-center rounded-full bg-[#E0F2FE] border border-[#7DD3FC] px-3.5 py-1 backdrop-blur-sm shadow-[0_2px_8px_rgba(2,132,199,0.08)]">
              <span className="text-[10px] sm:text-[10.5px] min-[2560px]:text-[11.5px] font-mono font-bold tracking-[0.18em] text-[#0369A1] uppercase">
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
          <p className={`text-[#334155] text-xs sm:text-[13.5px] lg:text-[14px] min-[2560px]:text-[16.5px] font-medium leading-relaxed mb-6 sm:mb-7 max-w-[420px] min-[2560px]:max-w-[520px] ${shouldReduceMotion ? '' : 'animate-home-fade home-stagger-3'}`}>
            Test your reaction speed, memory and attention — right in your browser, with no account required.
          </p>

          {/* Primary CTA: Start Testing */}
          <Link 
            to="/assessments"
            className="w-full max-w-[340px] sm:max-w-[360px] min-[2560px]:max-w-[420px] h-[50px] sm:h-[54px] min-[2560px]:h-[62px] rounded-full bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:from-[#005FE6] hover:to-[#0047B3] text-white font-semibold text-[15px] sm:text-[16px] min-[2560px]:text-[18px] shadow-[0_10px_25px_-5px_rgba(0,102,255,0.4),0_4px_10px_-2px_rgba(0,102,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]/60 focus-visible:ring-offset-2 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group mb-6 sm:mb-7"
          >
            <span>Start Testing</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Metrics Row (3 Distinct Stats: Tests, Results, No Sign-up Required) */}
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
              <span className="text-[11.5px] min-[2560px]:text-[13px] font-semibold text-[#1E293B] mt-0.5">
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
              <span className="text-[11.5px] min-[2560px]:text-[13px] font-semibold text-[#1E293B] mt-0.5">
                Results
              </span>
            </div>

            {/* Divider */}
            <div className="absolute left-[66.66%] top-1/2 -translate-y-1/2 h-7 w-[1px] bg-[#BFDBFE]" aria-hidden="true" />

            {/* Col 3: Available 24/7 */}
            <div
              className="flex flex-col items-center text-center"
              title="Assessments are open and available 24/7"
            >
              <span className="font-heading font-extrabold text-[22px] sm:text-[24px] min-[2560px]:text-[28px] leading-tight text-[#090D1A] tracking-tight flex items-center justify-center">
                24/7
              </span>
              <span className="text-[11.5px] min-[2560px]:text-[13px] font-semibold text-[#1E293B] mt-0.5 leading-tight">
                Available
              </span>
            </div>
          </div>
        </section>

        {/* Right Column: 3D Protocol Carousel Stage */}
        <section aria-label="Assessment Protocols Showcase" className="w-full flex items-center justify-center min-h-0 py-2">
          <AssessmentHero3D />
        </section>
      </main>

      {/* Flowing Layered Wave Graphic along lower edge */}
      <DesktopWaveGraphic />

      {/* Modals Container */}
      <Suspense fallback={<ModalLoadingFallback />}>
        {isSettingsOpen && <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
        {isWelcomeOpen && <WelcomeModal isOpen={isWelcomeOpen} onClose={() => setIsWelcomeOpen(false)} />}
        {pwa.isGuideOpen && (
          <AddToHomeScreenModal
            isOpen={pwa.isGuideOpen}
            onClose={pwa.closeInstallGuide}
            isInstalled={pwa.isInstalled}
            isIos={pwa.isIos}
            isSafari={pwa.isSafari}
            isIosSafari={pwa.isIosSafari}
            isIosChrome={pwa.isIosChrome}
            isIosOtherBrowser={pwa.isIosOtherBrowser}
            isInstallable={pwa.isInstallable}
            hasNativePrompt={pwa.hasNativePrompt}
            isInstallPromptSupported={pwa.isInstallPromptSupported}
            isUnsupportedBrowser={pwa.isUnsupportedBrowser}
            isOffline={pwa.isOffline}
            onPromptInstall={pwa.promptInstall}
          />
        )}
      </Suspense>
    </div>
  );
}
