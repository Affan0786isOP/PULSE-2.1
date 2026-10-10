import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Database, 
  BarChart2, 
  Info, 
  ArrowRight, 
  Globe, 
  ChevronDown, 
  Menu, 
  Download 
} from 'lucide-react';
import { triggerHaptic } from '../../lib/settingsStore';
import { useAuthoritativeStats } from '../../lib/useAuthoritativeStats';
import { NeuralGraphic } from './NeuralGraphic';
import { WaveGraphic } from './WaveGraphic';

interface MobileHeroProps {
  onOpenMenu: () => void;
  onExploreTests?: () => void;
  pwaInstallable?: boolean;
  onPromptInstall?: () => void;
}

export const MobileHero: React.FC<MobileHeroProps> = ({
  onOpenMenu,
  onExploreTests,
  pwaInstallable = false,
  onPromptInstall
}) => {
  const navigate = useNavigate();
  const { testsCount, resultsCount, isLoadingResults } = useAuthoritativeStats();

  const handleStartTesting = () => {
    triggerHaptic();
    navigate('/assessments');
  };

  const handleFeatureClick = (route: string) => {
    triggerHaptic();
    navigate(route);
  };

  const handleScrollToExplore = () => {
    triggerHaptic();
    if (onExploreTests) {
      onExploreTests();
    } else {
      const exploreTarget = document.getElementById('explore-tests-target');
      if (exploreTarget) {
        exploreTarget.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/assessments');
      }
    }
  };

  // Format verified result count safely (distinguishing actual count from fabricated defaults)
  const displayResults = isLoadingResults ? (
    <span role="status" aria-label="Loading result count" className="inline-block w-8 h-5 bg-sky-200/50 animate-pulse motion-reduce:animate-none rounded my-0.5" />
  ) : typeof resultsCount === 'number' ? (
    resultsCount >= 1000 ? `${Math.floor(resultsCount / 1000)}K+` : String(resultsCount)
  ) : (
    '—'
  );

  return (
    <section 
      aria-label="PULSE Mobile Hero"
      className="relative w-full min-h-[100dvh] flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#FFFFFF] via-[#F4F9FF] to-[#EAF3FD] text-[#090D1A] font-sans selection:bg-[#0066FF]/20"
    >
      {/* Background Neural Brain Graphic */}
      <NeuralGraphic />

      {/* Top Header */}
      <header className="relative z-30 w-full max-w-md mx-auto flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
        <button 
          onClick={() => { triggerHaptic(); navigate('/'); }}
          className="flex items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F9FF] group"
          aria-label="PULSE Home"
        >
          <span className="font-heading font-bold text-[19px] tracking-[0.26em] text-[#090D1A] group-active:opacity-80 transition-opacity">
            PULSE
          </span>
        </button>

        <div className="flex items-center gap-1">
          {pwaInstallable && onPromptInstall && (
            <button 
              onClick={() => { triggerHaptic(); onPromptInstall(); }}
              className="p-2 text-[#475569] hover:text-[#090D1A] rounded-full active:scale-95 transition-all"
              aria-label="Install App"
            >
              <Download size={20} strokeWidth={2} />
            </button>
          )}

          <button 
            onClick={() => { triggerHaptic(); onOpenMenu(); }}
            className="p-2 -mr-1.5 text-[#090D1A] hover:bg-black/5 rounded-full active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F9FF]"
            aria-label="Open settings"
          >
            <Menu size={24} strokeWidth={2.1} />
          </button>
        </div>
      </header>

      {/* Main Hero Content */}
      <div className="relative z-20 w-full max-w-md mx-auto px-6 pt-2 pb-2 flex-1 flex flex-col justify-center">
        
        {/* Eyebrow Badge */}
        <div className="mb-4">
          <div className="inline-flex items-center rounded-full bg-[#E0F2FE]/85 border border-[#BAE6FD]/80 px-3.5 py-1 backdrop-blur-sm shadow-[0_2px_8px_rgba(2,132,199,0.06)]">
            <span className="text-[10px] font-mono font-bold tracking-[0.18em] text-[#0369A1] uppercase">
              COGNITIVE BENCHMARKING
            </span>
          </div>
        </div>

        {/* Hero Headline */}
        <h1 className="font-heading font-extrabold text-[2.75rem] leading-[1.05] tracking-tight text-[#090D1A] mb-3 text-balance">
          Measure<br />
          your <span className="text-[#0066FF]">mind.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-[#475569] text-[14.5px] leading-[1.52] max-w-[330px] font-normal mb-7">
          Cognitive testing, research data, performance insights and the people behind PULSE.
        </p>

        {/* 4 Quick Navigation Shortcuts */}
        <div className="grid grid-cols-4 gap-2.5 mb-7">
          {/* Leaderboard */}
          <button 
            onClick={() => handleFeatureClick('/leaderboard')}
            className="flex flex-col items-center text-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F9FF] rounded-xl active:scale-95 transition-transform"
          >
            <div className="w-[54px] h-[54px] rounded-full bg-white shadow-[0_4px_14px_rgba(0,102,255,0.07),0_1px_3px_rgba(0,0,0,0.04)] border border-sky-100/90 flex items-center justify-center text-[#090D1A] group-hover:border-[#0066FF]/40 transition-colors">
              <Trophy size={22} strokeWidth={2.2} />
            </div>
            <span className="text-[11px] font-medium text-[#334155] leading-[1.2] mt-2 whitespace-pre-line">
              Leaderboard
            </span>
          </button>

          {/* Dataset */}
          <button 
            onClick={() => handleFeatureClick('/dataset')}
            className="flex flex-col items-center text-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F9FF] rounded-xl active:scale-95 transition-transform"
          >
            <div className="w-[54px] h-[54px] rounded-full bg-white shadow-[0_4px_14px_rgba(0,102,255,0.07),0_1px_3px_rgba(0,0,0,0.04)] border border-sky-100/90 flex items-center justify-center text-[#090D1A] group-hover:border-[#0066FF]/40 transition-colors">
              <Database size={22} strokeWidth={2.2} />
            </div>
            <span className="text-[11px] font-medium text-[#334155] leading-[1.2] mt-2">
              Dataset
            </span>
          </button>

          {/* Analytics */}
          <button 
            onClick={() => handleFeatureClick('/analytics')}
            className="flex flex-col items-center text-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F9FF] rounded-xl active:scale-95 transition-transform"
          >
            <div className="w-[54px] h-[54px] rounded-full bg-white shadow-[0_4px_14px_rgba(0,102,255,0.07),0_1px_3px_rgba(0,0,0,0.04)] border border-sky-100/90 flex items-center justify-center text-[#090D1A] group-hover:border-[#0066FF]/40 transition-colors">
              <BarChart2 size={22} strokeWidth={2.2} />
            </div>
            <span className="text-[11px] font-medium text-[#334155] leading-[1.2] mt-2">
              Analytics
            </span>
          </button>

          {/* About Us */}
          <button 
            onClick={() => handleFeatureClick('/about')}
            className="flex flex-col items-center text-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F9FF] rounded-xl active:scale-95 transition-transform"
          >
            <div className="w-[54px] h-[54px] rounded-full bg-white shadow-[0_4px_14px_rgba(0,102,255,0.07),0_1px_3px_rgba(0,0,0,0.04)] border border-sky-100/90 flex items-center justify-center text-[#090D1A] group-hover:border-[#0066FF]/40 transition-colors">
              <Info size={22} strokeWidth={2.2} />
            </div>
            <span className="text-[11px] font-medium text-[#334155] leading-[1.2] mt-2">
              About Us
            </span>
          </button>
        </div>

        {/* Primary CTA: Start Testing */}
        <button 
          onClick={handleStartTesting}
          className="w-full h-[54px] rounded-full bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:from-[#005FE6] hover:to-[#0047B3] text-white font-semibold text-[16px] shadow-[0_10px_25px_-5px_rgba(0,102,255,0.4),0_4px_10px_-2px_rgba(0,102,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 group mb-7"
        >
          <span>Start Testing</span>
          <ArrowRight size={19} className="group-active:translate-x-0.5 transition-transform" />
        </button>

        {/* Verified Statistics Section */}
        <div className="w-full grid grid-cols-3 items-center py-2 relative z-20">
          {/* Col 1: Canonical Tests */}
          <button 
            onClick={() => { triggerHaptic(); navigate('/assessments'); }}
            className="flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F9FF] rounded-lg active:opacity-75 transition-opacity"
            title={`${testsCount} available assessment batteries`}
          >
            <span className="font-heading font-bold text-[22px] leading-tight text-[#090D1A] tracking-tight">
              {testsCount}
            </span>
            <span className="text-[11px] font-medium text-[#64748B] mt-0.5">
              Tests
            </span>
          </button>

          {/* Divider */}
          <div className="absolute left-[33.33%] top-1/2 -translate-y-1/2 h-8 w-[1px] bg-[#CFE4F7]" />

          {/* Col 2: Authoritative Results Count */}
          <div
            className="flex flex-col items-center text-center"
            title="Count of public research result records in Firestore"
          >
            <span className="font-heading font-bold text-[22px] leading-tight text-[#090D1A] tracking-tight flex items-center justify-center">
              {displayResults}
            </span>
            <span className="text-[11px] font-medium text-[#64748B] mt-0.5">
              Results
            </span>
          </div>

          {/* Divider */}
          <div className="absolute left-[66.66%] top-1/2 -translate-y-1/2 h-8 w-[1px] bg-[#CFE4F7]" />

          {/* Col 3: Leaderboard */}
          <button 
            onClick={() => { triggerHaptic(); navigate('/leaderboard'); }}
            className="flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F9FF] rounded-lg active:opacity-75 transition-opacity"
            title="Public Leaderboard Rankings"
          >
            <div className="h-[26px] flex items-center justify-center">
              <Globe size={22} strokeWidth={2} className="text-[#090D1A]" />
            </div>
            <span className="text-[11px] font-medium text-[#64748B] mt-0.5 leading-tight">
              Leaderboard
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Wave Graphic */}
      <WaveGraphic />

      {/* Explore Tests Cue */}
      <div className="relative z-20 w-full pb-4 pt-1 flex justify-center shrink-0">
        <button 
          onClick={handleScrollToExplore}
          className="flex flex-col items-center gap-0.5 text-[#64748B] hover:text-[#090D1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F9FF] rounded-lg active:scale-95 transition-all p-2"
          aria-label="Explore Tests"
        >
          <ChevronDown size={19} className="animate-bounce motion-reduce:animate-none" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-[#64748B]">
            EXPLORE TESTS
          </span>
        </button>
      </div>
    </section>
  );
};
