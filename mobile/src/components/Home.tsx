import React, { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, 
  Trophy, BarChart2, Folder, Shield 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { usePwaInstall } from '../lib/usePwaInstall';
import { isMobileWelcomeSeen } from '../lib/welcomeStore';
import { triggerHaptic } from '../lib/settingsStore';
import { SEO } from './SEO';
import { CANONICAL_ASSESSMENT_IDS } from '@shared/contracts/common';
import { ASSESSMENT_DEFINITIONS } from '@shared/registries/assessmentRegistry';
import { HOMEPAGE_ASSESSMENT_PRESENTATION } from '@shared/homepage/assessmentPresentation';
import { MobileHeaderMenu } from './home/MobileHeaderMenu';

const TARGET_ROUTES: Record<string, string> = {
  'visual-reaction': '/reaction-test',
  'direction': '/direction-test',
  'color-recognition': '/colour-recognition',
  'block-memory': '/block-memory',
  'number-memory': '/number-memory',
};

const mobileAssessments = CANONICAL_ASSESSMENT_IDS.map((id) => {
  const def = ASSESSMENT_DEFINITIONS[id];
  const pres = HOMEPAGE_ASSESSMENT_PRESENTATION[id];
  return {
    id: pres.assessmentId,
    protocolNumber: pres.protocolNumber,
    category: pres.category,
    title: def.displayName,
    description: pres.heroDescription,
    targetRoute: TARGET_ROUTES[id] || '/assessments',
    logo: pres.logoPath,
  };
});

const SettingsModal = React.lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const WelcomeModal = React.lazy(() => import('./WelcomeModal').then(m => ({ default: m.WelcomeModal })));
const AddToHomeScreenModal = React.lazy(() => import('./AddToHomeScreenModal').then(m => ({ default: m.AddToHomeScreenModal })));

export function Home({ onNavigate }: { onNavigate: (view: string) => void }) {
  const navigate = useNavigate();
  const { isConnecting, authError, retryAuth } = useAuth();
  const pwa = usePwaInstall();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => !isMobileWelcomeSeen());

  // Carousel State
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = () => {
    triggerHaptic();
    setActiveIndex((prev) => (prev + 1) % mobileAssessments.length);
  };

  const handlePrev = () => {
    triggerHaptic();
    setActiveIndex((prev) => (prev - 1 + mobileAssessments.length) % mobileAssessments.length);
  };

  return (
    <div className="bg-[#0B0B0E] text-[#F8FAFC] min-h-screen w-full flex flex-col font-sans overflow-x-hidden relative selection:bg-white/30 pb-safe">
      <SEO title="Pulse Mobile" description="Precision telemetry. Zero latency insight." />

      {/* Mobile Header Menu with Drawer Navigation */}
      <MobileHeaderMenu 
        onNavigate={onNavigate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={() => setIsWelcomeOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full max-w-md mx-auto relative z-10 px-5 pt-2 pb-8">
        
        {/* Top Text / Hero Section */}
        <section id="hero" className="scroll-mt-20 mb-8">
          <div className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-3 py-1 mb-6">
            <span className="text-[10px] font-mono font-medium tracking-wide text-[#8A94A6] uppercase flex items-center gap-2">
              SYSTEM BENCHMARK v2.4 
              <span className="w-1 h-1 rounded-full bg-[#8A94A6] opacity-50"></span> 
              PRODUCTION READY
            </span>
          </div>
          
          <h1 className="font-heading font-bold text-[2.5rem] leading-[1.05] tracking-tight text-white mb-4">
            Precision telemetry.<br />
            Zero latency insight.
          </h1>
          
          <p className="text-[#8A94A6] text-base leading-relaxed pr-4">
            Run standardized cohort evaluations and audit high-throughput metrics across all systems.
          </p>
        </section>

        {/* Carousel Section Anchor */}
        <section id="assessments" className="scroll-mt-20 mb-8">
          <div className="relative w-full h-[280px] flex items-center justify-center">
            {/* Side Arrows */}
            <button 
              onClick={handlePrev} 
              className="absolute left-0 z-30 p-2 text-white/60 hover:text-white active:scale-90 transition-transform -translate-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] rounded-full"
              aria-label="Previous assessment"
            >
              <ChevronLeft size={32} strokeWidth={2} />
            </button>
            
            <button 
              onClick={handleNext} 
              className="absolute right-0 z-30 p-2 text-white/60 hover:text-white active:scale-90 transition-transform translate-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF] rounded-full"
              aria-label="Next assessment"
            >
              <ChevronRight size={32} strokeWidth={2} />
            </button>

            {/* Cards */}
            <div className="relative w-full max-w-[280px] h-full flex items-center justify-center pointer-events-none">
              <AnimatePresence initial={false} mode="popLayout">
                {mobileAssessments.map((assessment, index) => {
                  const isActive = index === activeIndex;
                  const isPrev = index === (activeIndex - 1 + mobileAssessments.length) % mobileAssessments.length;
                  const isNext = index === (activeIndex + 1) % mobileAssessments.length;
                  
                  if (!isActive && !isPrev && !isNext) return null;

                  let x = 0;
                  let scale = 1;
                  let opacity = 1;
                  let zIndex = 20;

                  if (isPrev) { x = -80; scale = 0.85; opacity = 0.4; zIndex = 10; }
                  if (isNext) { x = 80; scale = 0.85; opacity = 0.4; zIndex = 10; }

                  return (
                    <motion.div
                      key={assessment.id}
                      initial={{ x: isNext ? 100 : -100, scale: 0.8, opacity: 0 }}
                      animate={{ x, scale, opacity, zIndex }}
                      exit={{ x: isPrev ? -100 : 100, scale: 0.8, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="absolute w-full h-full rounded-2xl bg-[#12141A] border border-white/10 flex flex-col justify-end p-6 overflow-hidden pointer-events-auto shadow-2xl"
                      style={{
                        boxShadow: isActive ? '0 20px 60px -10px rgba(255,255,255,0.25), 0 0 40px rgba(255,255,255,0.1)' : 'none'
                      }}
                      onClick={() => {
                        if (isActive) {
                          triggerHaptic();
                          navigate(assessment.targetRoute);
                        } else if (isNext) {
                          handleNext();
                        } else if (isPrev) {
                          handlePrev();
                        }
                      }}
                    >
                      {/* Assessment Visual Graphic */}
                      <div className="absolute top-4 right-4 z-10">
                        <img 
                          src={assessment.logo} 
                          alt={assessment.title} 
                          className="w-16 h-16 object-contain rounded-lg drop-shadow-[0_0_12px_rgba(0,240,255,0.25)] border border-white/10"
                        />
                      </div>

                      {/* Dark gradient overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
                      
                      <div className="relative z-10 flex flex-col items-start text-left">
                        <div className="text-[10px] font-mono text-[#00F0FF] uppercase tracking-wider mb-1">
                          {assessment.protocolNumber}
                        </div>
                        <h2 className="font-heading text-xl font-bold text-white mb-1.5">{assessment.title}</h2>
                        <p className="text-[#8A94A6] text-[13px] leading-relaxed mb-3.5 pr-2">{assessment.description}</p>
                        
                        <div className="bg-[#052e16] border border-[#166534] px-2.5 py-1 rounded-md">
                          <span className="text-[10px] font-bold tracking-widest text-[#4ade80] uppercase">ACTIVE</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Pagination Dots */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {mobileAssessments.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeIndex ? 'w-1.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>
        </section>

        {/* Stable Section Anchor Targets for Future Redesign Scenes */}
        <div id="proof" className="scroll-mt-20 pointer-events-none" aria-hidden="true" />
        <div id="problem" className="scroll-mt-20 pointer-events-none" aria-hidden="true" />
        <div id="result" className="scroll-mt-20 pointer-events-none" aria-hidden="true" />
        <div id="why-pulse" className="scroll-mt-20 pointer-events-none" aria-hidden="true" />
        <div id="how-it-works" className="scroll-mt-20 pointer-events-none" aria-hidden="true" />
        <div id="faq" className="scroll-mt-20 pointer-events-none" aria-hidden="true" />
        <div id="cta" className="scroll-mt-20 pointer-events-none" aria-hidden="true" />

        {/* Directory Section */}
        <div className="mb-8">
          <h3 className="text-[11px] font-mono font-bold tracking-widest text-[#8A94A6] mb-4">DIRECTORY</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { triggerHaptic(); onNavigate('leaderboard'); }} className="flex items-center gap-3 bg-[#13161C] hover:bg-[#1A1D24] active:scale-[0.98] transition-all rounded-xl p-4 border border-white/5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]">
              <Trophy size={18} className="text-[#8A94A6]" />
              <span className="text-sm font-semibold text-white tracking-wide">Leaderboard</span>
            </button>
            <button onClick={() => { triggerHaptic(); onNavigate('analytics'); }} className="flex items-center gap-3 bg-[#13161C] hover:bg-[#1A1D24] active:scale-[0.98] transition-all rounded-xl p-4 border border-white/5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]">
              <BarChart2 size={18} className="text-[#8A94A6]" />
              <span className="text-sm font-semibold text-white tracking-wide">Analytics</span>
            </button>
            <button onClick={() => { triggerHaptic(); onNavigate('dataset'); }} className="flex items-center gap-3 bg-[#13161C] hover:bg-[#1A1D24] active:scale-[0.98] transition-all rounded-xl p-4 border border-white/5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]">
              <Folder size={18} className="text-[#8A94A6]" />
              <span className="text-sm font-semibold text-white tracking-wide">Dataset</span>
            </button>
            <button onClick={() => { triggerHaptic(); onNavigate('privacy'); }} className="flex items-center gap-3 bg-[#13161C] hover:bg-[#1A1D24] active:scale-[0.98] transition-all rounded-xl p-4 border border-white/5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]">
              <Shield size={18} className="text-[#8A94A6]" />
              <span className="text-sm font-semibold text-white tracking-wide">Privacy Policy</span>
            </button>
          </div>
        </div>

        <div className="text-center pb-4 mt-auto">
          <p className="text-[11px] text-[#8A94A6] font-medium">
            © 2026 Pulse Engineering • Built for scale
          </p>
        </div>
      </main>

      {/* Modals Container */}
      <Suspense fallback={null}>
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
