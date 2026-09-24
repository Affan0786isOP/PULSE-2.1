import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, Info, Maximize2, Minimize2, AlertCircle, RefreshCw, X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { PulseLogo } from './brand';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
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
}

export const HERO_ASSESSMENTS: HeroAssessment[] = [
  {
    id: 'reaction',
    protocolNumber: 'PROTOCOL 01',
    category: 'LATENCY TELEMETRY',
    title: 'VISUAL REACTION',
    description: 'Measures pure somatic visual response latency with sub-millisecond precision.',
    targetRoute: '/reaction-test',
  },
  {
    id: 'direction',
    protocolNumber: 'PROTOCOL 02',
    category: 'CHOICE COORDINATION',
    title: 'DIRECTIONAL CHOICE',
    description: 'Evaluates cognitive bifurcation speed and motor execution under choice conditions.',
    targetRoute: '/direction-test',
  },
  {
    id: 'color',
    protocolNumber: 'PROTOCOL 03',
    category: 'COGNITIVE CONFLICT',
    title: 'COLOR RECOGNITION',
    description: 'Assesses semantic inhibitory control and selective attention thresholds.',
    targetRoute: '/colour-recognition',
  },
  {
    id: 'block',
    protocolNumber: 'PROTOCOL 04',
    category: 'SPATIAL WORKING MEMORY',
    title: 'BLOCK MEMORY',
    description: 'Benchmarks visuospatial memory span through progressive serial recall.',
    targetRoute: '/block-memory',
  },
  {
    id: 'number',
    protocolNumber: 'PROTOCOL 05',
    category: 'DIGIT SPAN MEMORY',
    title: 'NUMBER MEMORY',
    description: 'Tests phonological working memory limit with adaptive digit length scaling.',
    targetRoute: '/number-memory',
  },
];

const SettingsModal = React.lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const WelcomeModal = React.lazy(() => import('./WelcomeModal').then(m => ({ default: m.WelcomeModal })));
const AddToHomeScreenModal = React.lazy(() => import('./AddToHomeScreenModal').then(m => ({ default: m.AddToHomeScreenModal })));

const ModalLoadingFallback = () => (
  <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
    <div className="p-3 rounded-xl bg-[#12161B]/95 backdrop-blur-md border border-[rgba(255,255,255,0.08)] flex items-center gap-2.5 text-xs text-[#8A94A6] font-mono pointer-events-auto">
      <RefreshCw size={14} className="animate-spin text-[#00F0FF]" aria-hidden="true" />
      <span>Loading dialog...</span>
    </div>
  </div>
);

export function Home({ onNavigate }: { onNavigate: (view: string) => void }) {
  const navigate = useNavigate();
  const { isConnecting, authError, retryAuth } = useAuth();
  const [displayedError, setDisplayedError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const pwa = usePwaInstall();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => !isMobileWelcomeSeen());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Carousel State
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const dragControls = useDragControls();
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoPlaying && !isSettingsOpen && !isWelcomeOpen) {
      interval = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % HERO_ASSESSMENTS.length);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, isSettingsOpen, isWelcomeOpen]);

  const handleNext = () => {
    triggerHaptic();
    setActiveIndex((prev) => (prev + 1) % HERO_ASSESSMENTS.length);
    setIsAutoPlaying(false);
  };

  const handlePrev = () => {
    triggerHaptic();
    setActiveIndex((prev) => (prev - 1 + HERO_ASSESSMENTS.length) % HERO_ASSESSMENTS.length);
    setIsAutoPlaying(false);
  };

  const activeAssessment = HERO_ASSESSMENTS[activeIndex];

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

  return (
    <div className="bg-[#08080A] text-[#F8FAFC] min-h-[100dvh] w-full flex flex-col font-sans overflow-x-hidden relative selection:bg-[#00F0FF]/30 pb-safe">
      <SEO title="PULSE Mobile" description="Measure your cognitive latency and memory precision on the go." />
      
      {/* Auth Error Banner */}
      <AnimatePresence>
        {displayedError && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#EF4444]/10 border-b border-[#EF4444]/20 overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between text-[#EF4444] text-xs font-mono">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} />
                <span>Sync Error: Offline</span>
              </div>
              <button onClick={() => { setIsRetrying(true); retryAuth().finally(() => setIsRetrying(false)); }} className="underline decoration-dashed underline-offset-2">Retry</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <header className="w-full flex items-center justify-between px-5 py-4 z-40 shrink-0">
        <div className="flex items-center gap-2 text-white">
          <img src="/brand/pulse-reticle-logo.svg" alt="PULSE" className="w-6 h-6 text-[#00F0FF]" />
          <span className="font-heading font-bold tracking-widest text-sm uppercase text-[#F8FAFC]">PULSE</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleFullscreen} className="p-2 text-[#8A94A6] hover:text-white rounded-full">
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          <button onClick={() => { triggerHaptic(); setIsSettingsOpen(true); }} className="p-2 text-[#8A94A6] hover:text-[#00F0FF] rounded-full">
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content - Asymmetric Monolithic Stack */}
      <main className="flex-1 flex flex-col px-5 pb-6 justify-between w-full max-w-md mx-auto">
        
        {/* Towering Headline */}
        <div className="pt-2 pb-6">
          <h1 className="font-heading font-bold text-[3rem] leading-[0.88] tracking-[-0.04em] text-[#F8FAFC] text-balance uppercase">
            SHAPING<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#8A94A6]">COGNITION</span>
          </h1>
        </div>

        {/* Carousel / Card Stack */}
        <div className="relative w-full aspect-[4/5] rounded-[24px] bg-[#10141B] border border-[rgba(255,255,255,0.08)] shadow-2xl shadow-black overflow-hidden flex flex-col group touch-pan-y"
             onTouchStart={() => setIsAutoPlaying(false)}>
          
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#08080A]/90 z-10 pointer-events-none" />
          
          {/* Card Visual Content */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <AnimatePresence mode="popLayout">
              <motion.div 
                key={activeIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="w-32 h-32 opacity-40 flex items-center justify-center mix-blend-screen"
              >
                 <img src="/brand/pulse-reticle-logo.svg" alt="" className="w-full h-full text-[#00F0FF] drop-shadow-[0_0_20px_rgba(0,240,255,0.5)]" />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls Overlay */}
          <div className="absolute inset-x-0 top-0 p-5 flex items-center justify-between z-20 pointer-events-none">
            <div className="text-[10px] font-mono tracking-widest text-[#00F0FF] px-3 py-1 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 uppercase backdrop-blur-md">
              {activeAssessment.protocolNumber}
            </div>
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button onClick={handlePrev} className="p-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white active:scale-95 transition-transform"><ChevronLeft size={16}/></button>
              <button onClick={handleNext} className="p-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white active:scale-95 transition-transform"><ChevronRight size={16}/></button>
            </div>
          </div>

          {/* Bottom Card Content */}
          <div className="absolute inset-x-0 bottom-0 p-6 z-20 flex flex-col justify-end">
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeIndex}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="font-heading text-2xl font-bold text-white mb-2">{activeAssessment.title}</h2>
                <p className="text-[#8A94A6] text-sm leading-relaxed mb-5 line-clamp-2">{activeAssessment.description}</p>
                <button 
                  onClick={() => { triggerHaptic(); navigate(activeAssessment.targetRoute); }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-white text-black font-semibold text-sm active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                >
                  <Play size={16} fill="black" />
                  PLAY ASSESSMENT
                </button>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Global CTA and Subtext */}
        <div className="mt-8">
          <p className="text-[#8A94A6] text-sm leading-relaxed mb-6">
            PULSE evaluates visual latency, directional CRT, and working memory with research-grade millisecond precision.
          </p>
          <button 
            onClick={() => { triggerHaptic(); onNavigate('/assessments'); }}
            className="w-full flex items-center justify-center bg-gradient-to-r from-[#00F0FF]/10 to-[#00F0FF]/5 border border-[#00F0FF]/30 text-[#00F0FF] py-4 rounded-full font-bold text-sm tracking-wide active:scale-[0.98] transition-transform"
          >
            EXPLORE ALL PROTOCOLS
          </button>
        </div>
        
      </main>

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
