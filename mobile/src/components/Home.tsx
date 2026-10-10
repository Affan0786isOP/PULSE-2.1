import React, { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, BarChart2, Folder, Shield } from 'lucide-react';
import { usePwaInstall } from '../lib/usePwaInstall';
import { isMobileWelcomeSeen } from '../lib/welcomeStore';
import { triggerHaptic } from '../lib/settingsStore';
import { SEO } from './SEO';
import { MobileHero } from './hero/MobileHero';

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
        "priceCurrency": "USD"
      }
    }
  ]
};

const SettingsModal = React.lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const WelcomeModal = React.lazy(() => import('./WelcomeModal').then(m => ({ default: m.WelcomeModal })));
const AddToHomeScreenModal = React.lazy(() => import('./AddToHomeScreenModal').then(m => ({ default: m.AddToHomeScreenModal })));

export function Home({ onNavigate }: { onNavigate: (view: string) => void }) {
  const navigate = useNavigate();
  const pwa = usePwaInstall();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => !isMobileWelcomeSeen());

  return (
    <div className="bg-[#0B0B0E] text-[#F8FAFC] min-h-[100dvh] w-full flex flex-col font-sans overflow-x-hidden relative selection:bg-white/30 pb-safe">
      <SEO
      title="PULSE — Precision User Latency & Stimulus Evaluator"
      description="A browser-based cognitive benchmarking suite measuring visual reaction latency, directional choice speed, and working memory with millisecond-resolution timing."
      schema={HOME_SCHEMA}
    />

      {/* Current mobile hero */}
      <MobileHero 
        onOpenMenu={() => setIsSettingsOpen(true)}
        pwaInstallable={pwa.isInstallable}
        onPromptInstall={() => pwa.promptInstall()}
        onExploreTests={() => navigate('/assessments')}
      />

      {/* Mobile navigation directory */}
      <main className="flex-1 flex flex-col w-full max-w-md mx-auto relative z-10 px-5 pt-8 pb-8">


        {/* Directory Section */}
        <div className="mb-8">
          <h3 className="text-[11px] font-mono font-bold tracking-widest text-[#8A94A6] mb-4">DIRECTORY</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { triggerHaptic(); onNavigate('leaderboard'); }} className="flex items-center gap-3 bg-[#13161C] hover:bg-[#1A1D24] active:scale-[0.98] transition-all rounded-xl p-4 border border-white/5 shadow-sm">
              <Trophy size={18} className="text-[#8A94A6]" />
              <span className="text-sm font-semibold text-white tracking-wide">Leaderboard</span>
            </button>
            <button onClick={() => { triggerHaptic(); onNavigate('analytics'); }} className="flex items-center gap-3 bg-[#13161C] hover:bg-[#1A1D24] active:scale-[0.98] transition-all rounded-xl p-4 border border-white/5 shadow-sm">
              <BarChart2 size={18} className="text-[#8A94A6]" />
              <span className="text-sm font-semibold text-white tracking-wide">Analytics</span>
            </button>
            <button onClick={() => { triggerHaptic(); onNavigate('dataset'); }} className="flex items-center gap-3 bg-[#13161C] hover:bg-[#1A1D24] active:scale-[0.98] transition-all rounded-xl p-4 border border-white/5 shadow-sm">
              <Folder size={18} className="text-[#8A94A6]" />
              <span className="text-sm font-semibold text-white tracking-wide">Dataset</span>
            </button>
            <button onClick={() => { triggerHaptic(); onNavigate('privacy'); }} className="flex items-center gap-3 bg-[#13161C] hover:bg-[#1A1D24] active:scale-[0.98] transition-all rounded-xl p-4 border border-white/5 shadow-sm">
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
