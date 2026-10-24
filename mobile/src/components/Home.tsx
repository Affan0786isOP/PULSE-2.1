import React, { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePwaInstall } from '../lib/usePwaInstall';
import { isMobileWelcomeSeen } from '../lib/welcomeStore';
import { SEO } from './SEO';
import { MobileHero } from './hero/MobileHero';

// Mobile Narrative Scenes
import { MobileAssessmentsScene } from './home/MobileAssessmentsScene';
import { MobileProblemScene } from './home/MobileProblemScene';
import { MobileResultScene } from './home/MobileResultScene';
import { MobileFAQScene } from './home/MobileFAQScene';
import { MobileFinalCTAScene } from './home/MobileFinalCTAScene';
import { MobileHomeFooter } from './home/MobileHomeFooter';

const SettingsModal = React.lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));
const WelcomeModal = React.lazy(() => import('./WelcomeModal').then(m => ({ default: m.WelcomeModal })));
const AddToHomeScreenModal = React.lazy(() => import('./AddToHomeScreenModal').then(m => ({ default: m.AddToHomeScreenModal })));

export function Home({ onNavigate }: { onNavigate: (view: string) => void }) {
  const navigate = useNavigate();
  const pwa = usePwaInstall();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => !isMobileWelcomeSeen());

  return (
    <div className="bg-transparent text-[#090D1A] dark:text-[#F5F7FA] min-h-[100dvh] w-full flex flex-col font-sans overflow-x-hidden relative selection:bg-[#0066FF]/20 pb-safe">
      <SEO />

      {/* 01 — Complete Live Mobile Hero (Retained Intact) */}
      <MobileHero 
        onOpenMenu={() => setIsSettingsOpen(true)}
        pwaInstallable={pwa.isInstallable}
        onPromptInstall={() => pwa.promptInstall()}
        onExploreTests={() => navigate('/assessments')}
      />

      {/* Main Narrative Content Container */}
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto relative z-10 px-5 pt-2 pb-8">
        {/* 02 — Explore the tests */}
        <MobileAssessmentsScene />

        {/* 03 — See a sample result */}
        <MobileResultScene />

        {/* 04 — How it works, with concise measurement limits */}
        <MobileProblemScene />

        {/* 05 — Essential questions */}
        <MobileFAQScene onNavigate={onNavigate} />

        {/* 06 — Final action */}
        <MobileFinalCTAScene onNavigate={onNavigate} />

        {/* 07 — Useful links */}
        <MobileHomeFooter onNavigate={onNavigate} />
      </div>

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
