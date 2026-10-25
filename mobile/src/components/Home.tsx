import React, { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePwaInstall } from '../lib/usePwaInstall';
import { isMobileWelcomeSeen } from '../lib/welcomeStore';
import { SEO } from './SEO';
import { MobileHero } from './hero/MobileHero';

// Mobile Narrative Scenes (Strict Order: 1. Social proof, 2. Explore tests, 3. Sample result, 4. Why PULSE, 5. Browser timing, 6. FAQ, 7. Final CTA, 8. Footer)
import { MobileProofScene } from './home/MobileProofScene';
import { MobileAssessmentsScene } from './home/MobileAssessmentsScene';
import { MobileResultScene } from './home/MobileResultScene';
import { MobileWhyPulseScene } from './home/MobileWhyPulseScene';
import { MobileProblemScene } from './home/MobileProblemScene';
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
    <div className="bg-transparent text-[var(--text-primary)] min-h-[100dvh] w-full flex flex-col font-sans overflow-x-hidden relative selection:bg-[#0066FF]/20 pb-safe">
      <SEO />

      {/* Complete Light Mobile Hero (Retained Intact) */}
      <MobileHero 
        onOpenMenu={() => setIsSettingsOpen(true)}
        pwaInstallable={pwa.isInstallable}
        onPromptInstall={() => pwa.promptInstall()}
        onExploreTests={() => navigate('/assessments')}
      />

      {/* Centered Mobile Content Column for Narrative Scenes */}
      <main
        id="main-content"
        className="w-full max-w-md mx-auto px-4 pb-6 flex flex-col relative z-10"
      >
        {/* 1. Social proof */}
        <MobileProofScene />

        {/* 2. Explore tests */}
        <MobileAssessmentsScene onNavigate={onNavigate} />

        {/* 3. Sample result */}
        <MobileResultScene />

        {/* 4. Why PULSE */}
        <MobileWhyPulseScene />

        {/* 5. Browser timing and its limits */}
        <MobileProblemScene />

        {/* 6. FAQ */}
        <MobileFAQScene />

        {/* 7. Final CTA */}
        <MobileFinalCTAScene onNavigate={onNavigate} />

        {/* 8. Footer */}
        <MobileHomeFooter onNavigate={onNavigate} />
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
