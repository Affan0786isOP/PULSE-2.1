import React, { useState, Suspense } from 'react';
import { 
  Trophy, BarChart2, Folder, Shield 
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { usePwaInstall } from '../lib/usePwaInstall';
import { isMobileWelcomeSeen } from '../lib/welcomeStore';
import { triggerHaptic } from '../lib/settingsStore';
import { SEO } from './SEO';
import { MobileHeaderMenu } from './home/MobileHeaderMenu';
import { MobileHeroScene } from './home/MobileHeroScene';
import { MobileProofScene } from './home/MobileProofScene';
import { MobileAssessmentsScene } from './home/MobileAssessmentsScene';
import { MobileProblemScene } from './home/MobileProblemScene';
import { MobileResultScene } from './home/MobileResultScene';

const SettingsModal = React.lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const WelcomeModal = React.lazy(() => import('./WelcomeModal').then(m => ({ default: m.WelcomeModal })));
const AddToHomeScreenModal = React.lazy(() => import('./AddToHomeScreenModal').then(m => ({ default: m.AddToHomeScreenModal })));

export function Home({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { isConnecting, authError, retryAuth } = useAuth();
  const pwa = usePwaInstall();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => !isMobileWelcomeSeen());

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
        
        {/* Wave 2 Scene 1: Mobile Hero */}
        <MobileHeroScene />

        {/* Wave 2 Scene 2: Mobile Proof */}
        <MobileProofScene />

        {/* Wave 3 Scene 1: Mobile Assessments Discovery */}
        <MobileAssessmentsScene />

        {/* Wave 3 Scene 2: Mobile Problem Contrast */}
        <MobileProblemScene />

        {/* Wave 3 Scene 3: Mobile Result Telemetry */}
        <MobileResultScene />

        {/* Stable Section Anchor Targets for Future Redesign Scenes */}
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
