import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, Menu, ChevronLeft, ChevronRight, 
  Trophy, BarChart2, Folder, Shield, Download, Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { usePwaInstall } from '../lib/usePwaInstall';
import { isMobileWelcomeSeen } from '../lib/welcomeStore';
import { triggerHaptic } from '../lib/settingsStore';
import { SEO } from './SEO';

export interface HeroAssessment {
  id: string;
  protocolNumber: string;
  category: string;
  title: string;
  description: string;
  targetRoute: string;
  logo: string;
}

export const HERO_ASSESSMENTS: HeroAssessment[] = [
  {
    id: 'reaction',
    protocolNumber: 'PROTOCOL 01',
    category: 'LATENCY TELEMETRY',
    title: 'Visual Reaction Test',
    description: 'Measure speed of eye-brain coordination with a rapid flash-to-tap test.',
    targetRoute: '/reaction-test',
    logo: '/brand/assessments/reaction.png',
  },
  {
    id: 'direction',
    protocolNumber: 'PROTOCOL 02',
    category: 'CHOICE COORDINATION',
    title: 'Directional Choice',
    description: 'Evaluate cognitive bifurcation speed and motor execution under choice conditions.',
    targetRoute: '/direction-test',
    logo: '/brand/assessments/direction.png',
  },
  {
    id: 'color',
    protocolNumber: 'PROTOCOL 03',
    category: 'COGNITIVE CONFLICT',
    title: 'Color Recognition',
    description: 'Assess semantic inhibitory control and selective attention thresholds.',
    targetRoute: '/colour-recognition',
    logo: '/brand/assessments/color.jpg',
  },
  {
    id: 'block',
    protocolNumber: 'PROTOCOL 04',
    category: 'SPATIAL WORKING MEMORY',
    title: 'Block Memory',
    description: 'Benchmark visuospatial memory span through progressive serial recall.',
    targetRoute: '/block-memory',
    logo: '/brand/assessments/block.jpg',
  },
  {
    id: 'number',
    protocolNumber: 'PROTOCOL 05',
    category: 'DIGIT SPAN MEMORY',
    title: 'Number Memory',
    description: 'Test phonological working memory limit with adaptive digit length scaling.',
    targetRoute: '/number-memory',
    logo: '/brand/assessments/number.png',
  },
];

const SettingsModal = React.lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const WelcomeModal = React.lazy(() => import('./WelcomeModal').then(m => ({ default: m.WelcomeModal })));
const AddToHomeScreenModal = React.lazy(() => import('./AddToHomeScreenModal').then(m => ({ default: m.AddToHomeScreenModal })));

export function Home({ onNavigate }: { onNavigate: (view: string) => void }) {
  const navigate = useNavigate();
  const { isConnecting, authError, retryAuth } = useAuth();
  const pwa = usePwaInstall();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => !isMobileWelcomeSeen());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateFs = () => {
      const doc = document as any;
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', updateFs);
    document.addEventListener('webkitfullscreenchange', updateFs);
    return () => {
      document.removeEventListener('fullscreenchange', updateFs);
      document.removeEventListener('webkitfullscreenchange', updateFs);
    };
  }, []);

  const toggleFullscreen = () => {
    triggerHaptic();
    const doc = document as any;
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
      else if (doc.documentElement.webkitRequestFullscreen) doc.documentElement.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    }
  };

  // Carousel State
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = () => {
    triggerHaptic();
    setActiveIndex((prev) => (prev + 1) % HERO_ASSESSMENTS.length);
  };

  const handlePrev = () => {
    triggerHaptic();
    setActiveIndex((prev) => (prev - 1 + HERO_ASSESSMENTS.length) % HERO_ASSESSMENTS.length);
  };

  return (
    <div className="bg-[#0B0B0E] text-[#F8FAFC] min-h-[100dvh] w-full flex flex-col font-sans overflow-x-hidden relative selection:bg-white/30 pb-safe">
      <SEO title="Pulse Mobile" description="Precision telemetry. Zero latency insight." />

      {/* Header */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between px-5 py-5 z-40 shrink-0">
        <div className="flex items-center gap-2 text-white">
          <img src="/brand/pulse-reticle-logo.svg" alt="PULSE" className="w-6 h-6" />
          <span className="font-heading font-semibold text-lg tracking-wide text-white">Pulse</span>
        </div>
        <div className="flex items-center gap-1.5">
          {pwa.isInstallable && (
            <button onClick={() => { triggerHaptic(); pwa.promptInstall(); }} className="p-2 text-[#8A94A6] hover:text-white rounded-full active:scale-95 transition-all" aria-label="Install App">
              <Download size={20} />
            </button>
          )}
          <button onClick={toggleFullscreen} className="p-2 text-[#8A94A6] hover:text-white rounded-full active:scale-95 transition-all" aria-label="Toggle Fullscreen">
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          <button 
            onClick={() => { triggerHaptic(); setIsSettingsOpen(true); }} 
            className="flex items-center gap-2 px-3 py-1.5 ml-1 rounded-full border border-white/10 text-white/80 hover:text-white hover:bg-white/5 active:scale-95 transition-all text-sm font-medium bg-[#10141B]"
          >
            Menu
            <Menu size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full max-w-md mx-auto relative z-10 px-5 pt-2 pb-8">
        
        {/* Top Text Section */}
        <div className="mb-8">
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
        </div>

        {/* Carousel Section */}
        <div className="relative w-full h-[280px] flex items-center justify-center mb-8">
          {/* Side Arrows */}
          <button 
            onClick={handlePrev} 
            className="absolute left-0 z-30 p-2 text-white/60 hover:text-white active:scale-90 transition-transform -translate-x-2"
          >
            <ChevronLeft size={32} strokeWidth={2} />
          </button>
          
          <button 
            onClick={handleNext} 
            className="absolute right-0 z-30 p-2 text-white/60 hover:text-white active:scale-90 transition-transform translate-x-2"
          >
            <ChevronRight size={32} strokeWidth={2} />
          </button>

          {/* Cards */}
          <div className="relative w-full max-w-[280px] h-full flex items-center justify-center pointer-events-none">
            <AnimatePresence initial={false} mode="popLayout">
              {HERO_ASSESSMENTS.map((assessment, index) => {
                const isActive = index === activeIndex;
                const isPrev = index === (activeIndex - 1 + HERO_ASSESSMENTS.length) % HERO_ASSESSMENTS.length;
                const isNext = index === (activeIndex + 1) % HERO_ASSESSMENTS.length;
                
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
        <div className="flex items-center justify-center gap-2 mb-10">
          {HERO_ASSESSMENTS.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === activeIndex ? 'w-1.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Directory Section */}
        <div className="mb-8">
          <h3 className="text-[11px] font-mono font-bold tracking-widest text-[#8A94A6] mb-4">DIRECTORY</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { triggerHaptic(); onNavigate('/leaderboard'); }} className="flex items-center gap-3 bg-[#13161C] hover:bg-[#1A1D24] active:scale-[0.98] transition-all rounded-xl p-4 border border-white/5 shadow-sm">
              <Trophy size={18} className="text-[#8A94A6]" />
              <span className="text-sm font-semibold text-white tracking-wide">Leaderboard</span>
            </button>
            <button onClick={() => { triggerHaptic(); navigate('/dashboard'); }} className="flex items-center gap-3 bg-[#13161C] hover:bg-[#1A1D24] active:scale-[0.98] transition-all rounded-xl p-4 border border-white/5 shadow-sm">
              <BarChart2 size={18} className="text-[#8A94A6]" />
              <span className="text-sm font-semibold text-white tracking-wide">Analytics</span>
            </button>
            <button onClick={() => { triggerHaptic(); navigate('/dataset'); }} className="flex items-center gap-3 bg-[#13161C] hover:bg-[#1A1D24] active:scale-[0.98] transition-all rounded-xl p-4 border border-white/5 shadow-sm">
              <Folder size={18} className="text-[#8A94A6]" />
              <span className="text-sm font-semibold text-white tracking-wide">Dataset</span>
            </button>
            <button onClick={() => { triggerHaptic(); navigate('/privacy'); }} className="flex items-center gap-3 bg-[#13161C] hover:bg-[#1A1D24] active:scale-[0.98] transition-all rounded-xl p-4 border border-white/5 shadow-sm">
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
